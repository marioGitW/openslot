# OpenSlot

Scheduling app where a single host publishes office-hour slots and others book them.
Built for the TeamLift Product Engineer internship challenge. The full PRD is the source of
truth for scope; this file covers how to work in the repo.

## Scope and priorities

All three phases are done (v1.0.0). New work is fixes and polish unless agreed otherwise.

- **P0 – MVP:** create, edit and delete slots, list available slots, book a slot (name,
  email, note), no double bookings, host overview, persistence, deployment, README.
- **P1 – AI:** Gemini confirmation message + host prep agenda.
- **P2 – Google Calendar:** hide/block slots that clash with the host's calendar.
- No login, no multiple hosts, one time zone (`Europe/Skopje`). Do not add these.

## Stack

- `web/` – React + Vite + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query,
  React Hook Form + Zod, date-fns.
- `api/` – NestJS (TypeScript, native ESM), Prisma ORM, PostgreSQL on Supabase.
- Hosting: Vercel (two projects: `web/` and `api/`). Database: Supabase.
- Node 24 (`engines` in both `package.json` files; CI and Vercel use the same major).

## Commands

Run each from its own folder.

| Task | `web/` | `api/` |
|---|---|---|
| Install | `npm install` | `npm install` (runs `prisma generate`) |
| Dev server | `npm run dev` (port 5173) | `npm run start:dev` (port 3000) |
| Build | `npm run build` (needs `VITE_API_URL`) | `npm run build` |
| Lint | `npm run lint` (ESLint) | `npm run lint` (oxlint, `.oxlintrc.json`) |
| Unit tests | – | `npm run test` (database mocked) |
| E2E test | – | `npm run test:e2e` (needs the database) |
| Race test | – | `npm run test:race` (tsx; needs the API running) |
| New migration | – | `npx prisma migrate dev --name <name>` |
| Apply migrations | – | `npx prisma migrate deploy` (from a local machine, never in the Vercel build) |
| Regenerate client | – | `npx prisma generate` |
| Demo data | – | `npm run db:seed` (tsx; wipes all slots and bookings) |
| AI text for demo data | – | `npm run ai:backfill` (compiles to `dist/backfill/`, then runs) |

CI (`.github/workflows/ci.yml`) runs lint, build and unit tests for both apps on pushes to
`dev` and `main` and on pull requests. For the API it also imports `dist/app.module.js` and
runs the unit tests with require(esm) disabled (`--no-experimental-require-module`), as
Vercel does. Keep it green.

## Code conventions

- TypeScript strict everywhere. No `any` unless there is a comment explaining why.
- **api is native ESM** (`"type": "module"`). NestJS 12 is ESM-only and Vercel can't
  `require()` ES modules, so:
  - Relative imports end in `.js` (`./app.module.js`, `../generated/prisma/client.js`).
  - No `require`, `module.exports`, `__dirname` or `__filename`.
  - No CommonJS package that `require()`s `@nestjs/*` (why `@nestjs/throttler` was
    replaced). CI catches this.
  - Specs import `jest` from `@jest/globals`. To mock a package, call
    `jest.unstable_mockModule(...)`, then `await import(...)` the code under test.
  - Scripts: `db:seed` and `test:race` run with `tsx`. `ai:backfill` boots Nest DI, which
    needs decorator metadata that tsx (esbuild) doesn't emit, so it runs from `tsc` output.
- **api:** one NestJS module per domain (`slots`, `bookings`, `ai`, `calendar`, `health`, `prisma`).
  Controllers stay thin; logic lives in services. Validate input with DTOs and
  `class-validator`. Return errors as Nest HTTP exceptions (`ConflictException`, etc.).
- **web:** small function components, one component per file. Server state via TanStack Query
  hooks in `src/hooks/`, all requests through `src/lib/api.ts` (which also turns every API
  error into a readable message). Forms use React Hook Form + Zod. Use shadcn/ui components before
  writing custom ones.
- Every async UI action needs loading, success and error states.
- Names: `camelCase` for variables/functions, `PascalCase` for components/classes/types,
  `kebab-case` for file names in `api/`, `PascalCase.tsx` for React components.

## Rules that must not break

- **No double bookings.** `Booking.slotId` is `@unique`. The booking service inserts and
  catches Prisma error `P2002`, returning 409. Never replace this with a "check then insert".
- **Slot status is derived**, not stored: booked = a Booking row exists.
- **Times:** store UTC (`timestamptz`), display in `Europe/Skopje`.
- **Slots** cannot be in the past and cannot overlap another slot (409). Duration is 5–240
  minutes in steps of 5 (`api/src/slots/slot-duration.ts`, mirrored in `web/src/lib/slots.ts`).
- **Editing:** open slots can be edited (`PUT /slots/:id`) with the same time rules,
  which only run when the time changes. Booked slots can't be edited or deleted. Bookings
  send the time the booker saw, and a mismatch returns 409.
- **Overlap** is checked with `api/src/common/intervals.ts` everywhere (slots and calendar).
  Touching end-to-start is not an overlap.
- **Google Calendar** (`api/src/calendar/`):
  - Free/busy only: the service account uses the `calendar.freebusy` scope and never
    reads event titles or details. Don't widen the scope without asking.
  - Fail open: when the env vars are missing the feature is off, and when Google errors
    or times out, slots are shown and bookings allowed as if there were no conflicts.
    The calendar must never break booking.
  - Never log credentials, the private key or raw Google client errors (they carry the
    request headers). Log only the error message, once per failure streak.
- **AI (Gemini)** (`api/src/ai/`):
  - Booking never depends on AI. `POST /slots/:id/bookings` must not call Gemini; the
    text comes from `POST /bookings/:id/ai-message` afterwards. On a missing config,
    error, timeout or invalid output it returns the template message, never an error.
  - Generated once per booking: store a success (`aiGeneratedAt`), return the stored
    text after that, and never store a fallback.
  - Never put the email (or other contact details) in a prompt. Send only first name,
    topic, Skopje day/time and the note.
  - The note is data, not instructions: keep it inside the delimiters, strip delimiter
    look-alikes, and keep the structured output and validation.
  - Never log the API key, prompts or raw Gemini errors; log only the failure type.
    The key stays on the server and must never reach `web/`.
- **Security** (`api/src/main.ts`, `api/src/app.module.ts`): helmet headers, a 10 kB body
  limit, `trust proxy` for Vercel, and rate limits (`ThrottleGuard` in `api/src/common/`:
  100 requests/min per IP per route, 10/min on writes via `@WriteThrottle()`, none on
  `/health` via `@SkipThrottle()`). Add `@WriteThrottle()` to
  every new write endpoint. Error responses never include stack traces or raw
  Prisma/Google/Gemini errors.
- **Config:** `CORS_ORIGIN` is a comma-separated list of exact origins, required in
  production (`NODE_ENV=production` or `VERCEL_ENV` set); localhost is only the
  development default. The API refuses to start without `DATABASE_URL`. The web's only
  env var is `VITE_API_URL`, and a production build fails without it.
- **Secrets** stay in `.env` files, which are never committed. Keep `.env.example` updated
  with every new variable, with placeholder values only, never real ones.
- **Database URLs:** `DATABASE_URL` = Supabase transaction pooler (port 6543,
  `?pgbouncer=true`), used at runtime with a small pool (`max: 3`, set in
  `prisma.service.ts`); `DIRECT_URL` = Supabase session pooler (port 5432), used by the
  Prisma CLI for migrations.
- Do not add new dependencies without asking first.

## Git workflow

Two branches only:

- `dev` – all day-to-day work happens here. Commit directly to `dev`.
- `main` – production, deployed to Vercel. Never commit directly to `main`.
- When a milestone works on `dev`, merge `dev` into `main` with `git merge --no-ff dev`.
  That merge is a release.
- Do not create feature, fix or other branches unless asked.
- Once per clone: `git config core.hooksPath .githooks` (the hook strips attribution
  trailers from commit messages).

## Commit messages

Conventional Commits, one line only:

```
<type>(<scope>): <short summary>
```

- Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `ci`.
- Scopes: `web`, `api`, `db`, `repo`.
- Imperative, lowercase, no period, max 60 characters.
- Examples: `feat(api): add slot creation endpoint`, `fix(web): refetch slots after 409`,
  `chore(db): add booking unique constraint`.
- **No commit body, no trailers.** Never add `Co-Authored-By`, "Generated with", or any
  AI/tool attribution to commits, PR titles or PR descriptions. Do not list an AI tool as a
  contributor anywhere in the repo.
- Never commit or push unless explicitly asked. Never force-push.
