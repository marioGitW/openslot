# OpenSlot

OpenSlot lets a single host publish office-hour slots that anyone can book in a few clicks,
without double bookings.

Live app: TODO
API: TODO

Built with React, NestJS and PostgreSQL for the TeamLift Product Engineer internship
challenge.

## Features

- **Booking page:** browse open times by week and day, then book with name, email and an
  optional note. Booked or moved slots disappear without a reload, and the confirmation
  offers an `.ics` file for your calendar.
- **Host view** (`/host`): create, edit and delete slots; filter by date range and by status
  (open, booked, calendar conflicts); see booker details, notes and an AI prep agenda.
  Filters live in the URL, so a filtered view survives a refresh.
- **Custom durations:** presets of 15, 30, 45 and 60 minutes, or any length from 5 to 240
  minutes in steps of 5.
- **Dark mode** that follows the system setting and can be switched by hand.
- **Double-booking protection** enforced by the database, not by a check in code.
- **Google Calendar conflicts:** slots that clash with the host's calendar are hidden from
  bookers and flagged in the host view.
- **AI confirmation and prep agenda:** Gemini writes a short confirmation for the booker
  and three prep points for the host.

## Stack and architecture

```
web/  React SPA ──HTTPS/JSON──▶  api/  NestJS ──Prisma──▶  Supabase Postgres
                                   │
                                   ├──▶ Google Calendar API (free/busy only)
                                   └──▶ Gemini API (booking texts)
```

- **web/:** React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook
  Form + Zod, date-fns. A static single-page app.
- **api/:** NestJS, Prisma ORM with the `pg` driver adapter, class-validator DTOs. One module
  per domain: `slots`, `bookings`, `calendar`, `ai`, `health`, `prisma`.
- **Database:** PostgreSQL on Supabase. Two tables, `Slot` and `Booking`.
- **Hosting:** two Vercel projects. The web app is static files; the API runs as a single
  Vercel Function.

### API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/slots` | Open future slots, minus Google Calendar clashes (`?status=all` for the host view, with bookings and conflicts) |
| `POST` | `/slots` | Create a slot: `{ topic, startsAt, durationMin }` |
| `PUT` | `/slots/:id` | Edit an open slot |
| `DELETE` | `/slots/:id` | Delete an open slot |
| `POST` | `/slots/:id/bookings` | Book a slot: `{ name, email, note?, startsAt?, durationMin? }` |
| `GET` | `/bookings/:id` | One booking |
| `POST` | `/bookings/:id/ai-message` | AI confirmation and host agenda for a booking |
| `GET` | `/calendar/status` | `{ enabled, ok }` for the Google Calendar check |
| `GET` | `/health` | Database check |

Errors use standard status codes with a readable `message`: `400` for validation, `404`,
`409` for conflicts, `413` for bodies over 10 kB and `429` for rate limits.

## Key decisions

- **The database prevents double bookings.** `Booking.slotId` has a unique constraint. The
  booking service inserts straight away and turns Prisma error `P2002` into `409`. There
  is no "is it booked?" check first, since two requests could both pass it. `npm run
  test:race` proves it: it fires two bookings for the same slot at the same moment and
  expects exactly one `201` and one `409`.
- **Slot status is derived, not stored.** A slot is booked when a `Booking` row exists, so
  the status can never drift out of sync.
- **UTC in the database, Skopje time on screen.** Times are stored as `timestamptz` in UTC.
  Everything people see is in `Europe/Skopje`, including across daylight-saving changes.
  The API rejects slot times that have no explicit offset.
- **The database isn't public.** Row Level Security is on for both tables and Supabase's
  Data API is disabled, so the only way in is the API. Prisma connects as the table owner.
- **Input is validated twice, and requests are rate-limited.** Zod checks the forms in the
  browser and class-validator DTOs check them again on the server, rejecting unknown
  fields. The API also sends security headers (helmet), caps bodies at 10 kB and limits
  each IP to 100 requests a minute, or 10 a minute on endpoints that write.
- **Calendar and AI fail open.** If Google Calendar or Gemini is not configured, errors or
  times out, booking still works: slots are shown as if there were no conflicts, and the
  confirmation falls back to a template. Neither ever blocks a booking.

## Run locally

You need Node 24 and npm.

1. Clone and enable the commit hook:

   ```bash
   git clone https://github.com/marioGitW/openslot.git
   cd openslot
   git config core.hooksPath .githooks
   ```

2. Get a database, either:
   - **Supabase:** create a project, then copy the transaction pooler URL (port 6543,
     add `?pgbouncer=true`) and the session pooler URL (port 5432); or
   - **Docker:** run `docker compose up -d` and use
     `postgresql://openslot:openslot@localhost:5432/openslot` for both URLs.

3. Create the env files from the examples:

   ```bash
   cp api/.env.example api/.env   # set DATABASE_URL and DIRECT_URL
   cp web/.env.example web/.env   # VITE_API_URL=http://localhost:3000
   ```

   Google Calendar and Gemini are optional; see their sections below.

4. Install, migrate and seed the API:

   ```bash
   cd api
   npm install                # also generates the Prisma client
   npx prisma migrate deploy
   npm run db:seed            # demo slots and bookings over the next 14 days
   npm run ai:backfill        # optional, needs the Gemini variables
   npm run start:dev
   ```

5. In a second terminal, start the web app:

   ```bash
   cd web
   npm install
   npm run dev
   ```

6. Open <http://localhost:5173> to book, or <http://localhost:5173/host> for the host
   view. The API runs on <http://localhost:3000>.

## Scripts and tests

Run from `api/`:

| Script | What it does |
|---|---|
| `npm run start:dev` | API with reload on save |
| `npm run lint` / `npm run build` | oxlint / compile to `dist/` |
| `npm run test` | Unit tests (database mocked) |
| `npm run test:e2e` | Boots the app against the real database and checks `/health` |
| `npm run test:race` | Two simultaneous bookings for one slot, against the running API; expects one `201` and one `409`, then cleans up |
| `npm run db:seed` | Wipes all slots and bookings and creates demo data |
| `npm run ai:backfill` | Writes AI texts for bookings that don't have them yet |

Run from `web/`: `npm run dev`, `npm run lint`, `npm run build` (needs `VITE_API_URL`) and
`npm run preview`.

CI (GitHub Actions) runs lint, build and unit tests for both apps on every push to `dev` or
`main` and on pull requests. It needs no secrets.

## Deploying to Vercel

Create two Vercel projects from this repository. Both use Node 24 (set by `engines`).

| | API project | Web project |
|---|---|---|
| Root directory | `api` | `web` |
| Framework | NestJS (detected from `src/main.ts`) | Vite |
| Environment variables | `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`, plus optional `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` | `VITE_API_URL` (the API project's URL, no trailing slash) |

- **CORS:** `CORS_ORIGIN` is required in production and lists exact origins, comma-separated
  (e.g. `https://openslot.vercel.app`). Preview deployments get their own URLs; add one
  there if you want a preview to work.
- **API URL:** a production build of the web app fails if `VITE_API_URL` is missing, so it
  can never point at localhost by accident.
- **Migrations run from a local machine,** never in the Vercel build. With `DIRECT_URL`
  pointing at production, run `npx prisma migrate deploy` in `api/` before deploying a
  change that needs one.
- **Health cron:** `api/vercel.json` calls `GET /health` daily at 06:00 UTC, the one daily
  run that Vercel Hobby allows. The query keeps the free Supabase project from pausing
  after 7 days without activity.
- `web/vercel.json` sends every route to `index.html` (so `/host` survives a refresh) and
  adds `nosniff`, `Referrer-Policy` and `X-Frame-Options: DENY` headers.

## AI feature

After a booking, one Gemini call writes:

- a **confirmation** for the booker (2–3 sentences about the topic, the time and what to
  prepare), shown with a small "Written with AI" label; and
- a **3-point prep agenda** for the host, shown under the booking in the host view.

How it works:

- **Booking never waits for AI.** `POST /slots/:id/bookings` knows nothing about Gemini.
  The confirmation screen appears at once, then calls `POST /bookings/:id/ai-message` and
  shows "Writing a note for you…" until the text arrives.
- **One successful call per booking.** A success is stored on the booking and returned
  from then on. Concurrent requests share one call, and the first write wins.
- **Fallback.** If Gemini isn't configured, fails, takes longer than 6 seconds or returns
  invalid output, the endpoint returns a template ("You're booked for {topic} on {day} at
  {time}.") with `"source": "fallback"`. The fallback isn't stored, so a later call can
  still succeed.
- **Privacy:** Gemini sees only the booker's first name, the topic, the Skopje day and
  time, and the note. It never sees the email or last name. The API key stays on the
  server and is never logged or sent to the browser.
- **Prompt injection:** the note is untrusted data. It sits between
  `<<<BOOKER_NOTE>>>` delimiters, with any `<<<`/`>>>` stripped from it first, and the
  system instruction says to ignore instructions inside it. The reply must match a JSON
  schema (`{ message, agenda[3] }`). It is then stripped of markdown and emoji and
  length-checked before anyone sees it.
- **Cost:** the key comes from Google AI Studio's free tier with no billing account
  linked. When the quota runs out, Gemini returns `429` and bookers get the template.

**Setup (optional):** set `GEMINI_API_KEY` and `GEMINI_MODEL` (e.g.
`gemini-3.5-flash-lite`) in `api/.env`. After `npm run db:seed`, run `npm run ai:backfill`
to give the demo bookings an agenda. It is safe to re-run.

## Google Calendar

The API checks the host's Google Calendar so that slots clashing with a meeting aren't
offered:

- **Free/busy only:** a service account reads busy times with the `calendar.freebusy`
  scope. It never sees event titles or details.
- **Bookers don't see clashing slots:** `GET /slots` leaves them out.
- **The host does:** the host view marks them "Calendar conflict" and links to that day
  in Google Calendar.
- **Writes are checked too:** publishing or moving a slot onto a busy time returns `409`,
  and booking checks the calendar again just before saving.
- **Caching and timeouts:** Google's answers are cached for 60 seconds, and each call
  times out after 4 seconds.
- **Fail open:** if Google is unreachable, slots are shown and bookings allowed, and the
  host view says the calendar couldn't be checked.

**Setup (optional; off unless all three variables are set):**

1. In Google Cloud, enable the **Google Calendar API**, create a **service account** and
   add a JSON key.
2. In Google Calendar → *Settings and sharing* → *Share with specific people*, add the
   service account's email with **See only free/busy (hide details)**.
3. In `api/.env` set:
   - `GOOGLE_CALENDAR_ID`: for your main calendar, your Gmail address.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from the key.
   - `GOOGLE_PRIVATE_KEY`: only the `private_key` value, in double quotes, with `\n`
     kept as written.

   Never commit the JSON key.
4. Restart the API. `GET /calendar/status` should return `{ "enabled": true, "ok": true }`.

**Try it:** the demo calendar has "Team standup" at 10:00–10:30 and "Lunch" at 12:00–13:00
every weekday. After `npm run db:seed`, a few open slots overlap them: they show as
conflicts in the host view and are missing from the booking page. Publishing a slot at
10:15 on the next weekday is refused with "This overlaps an event in your Google Calendar
(10:00–10:30)."

**Why a service account rather than OAuth:** there is one host, so one shared calendar is
enough. OAuth with a calendar scope needs Google's app verification, and until then only
listed test users could connect.

## AI tools I used

TODO

## What I'd improve with more time

- **Host authentication.** The host view and the slot endpoints are open, as the brief has
  no login.
- **Protect booker details.** They are readable through `GET /slots?status=all` without
  authentication; with host auth, that view would require it.
- **A Postgres exclusion constraint against overlapping slots.** It would cover overlaps
  the way the unique constraint covers double bookings, instead of a check in code.
- **Email confirmations** for bookers and the host.
- **Server-side filtering and pagination** for the host view, once there are many slots.
- **A shared rate-limit store** (e.g. Redis). The current limits are in memory per
  serverless instance, so they are basic abuse protection, not a guarantee.
- **OAuth so each host connects their own calendar,** once there are several hosts.
