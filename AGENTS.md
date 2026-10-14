# OpenSlot

Scheduling app where a single host publishes office-hour slots and others book them.
Built for the TeamLift Product Engineer internship challenge. The full PRD is the source of
truth for scope; this file covers how to work in the repo.

## Scope and priorities

- **P0 – MVP (current focus):** create slots, list available slots, book a slot (name, email,
  note), no double bookings, host overview, persistence, deployment, README.
- **P1 – AI:** Gemini confirmation message + host prep agenda. Do not start until P0 is done.
- **P2 – Google Calendar:** hide/block slots that clash with the host's calendar. After P1.
- No login, no multiple hosts, one time zone (`Europe/Skopje`). Do not add these.

## Stack

- `web/` – React + Vite + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query,
  React Hook Form + Zod, date-fns.
- `api/` – NestJS (TypeScript, CommonJS), Prisma ORM, PostgreSQL on Supabase.
- Hosting: Vercel (two projects: `web/` and `api/`). Database: Supabase.

## Commands

Run each from its own folder.

| Task | `web/` | `api/` |
|---|---|---|
| Install | `npm install` | `npm install` |
| Dev server | `npm run dev` (port 5173) | `npm run start:dev` (port 3000) |
| Build | `npm run build` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Test | – | `npm run test` |
| DB migration | – | `npx prisma migrate dev --name <name>` |
| Regenerate client | – | `npx prisma generate` |

## Code conventions

- TypeScript strict everywhere. No `any` unless there is a comment explaining why.
- **api:** one NestJS module per domain (`slots`, `bookings`, `calendar`, `health`, `prisma`).
  Controllers stay thin; logic lives in services. Validate input with DTOs and
  `class-validator`. Return errors as Nest HTTP exceptions (`ConflictException`, etc.).
- **web:** small function components, one component per file. Server state via TanStack Query
  hooks in `src/api/`. Forms use React Hook Form + Zod. Use shadcn/ui components before
  writing custom ones.
- Every async UI action needs loading, success and error states.
- Names: `camelCase` for variables/functions, `PascalCase` for components/classes/types,
  `kebab-case` for file names in `api/`, `PascalCase.tsx` for React components.

## Rules that must not break

- **No double bookings.** `Booking.slotId` is `@unique`. The booking service inserts and
  catches Prisma error `P2002`, returning 409. Never replace this with a "check then insert".
- **Slot status is derived**, not stored: booked = a Booking row exists.
- **Times:** store UTC (`timestamptz`), display in `Europe/Skopje`.
- **Slots** cannot be in the past and cannot overlap another slot (409).
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
- **Secrets** stay in `.env` files, which are never committed. Keep `.env.example` updated
  with every new variable (names only, no values).
- **Database URLs:** `DATABASE_URL` = Supabase pooled connection (port 6543,
  `?pgbouncer=true&connection_limit=1`); `DIRECT_URL` = direct connection, for migrations.
- Do not add new dependencies without asking first.

## Git workflow

Two branches only:

- `dev` – all day-to-day work happens here. Commit directly to `dev`.
- `main` – production, deployed to Vercel. Never commit directly to `main`.
- When a milestone works on `dev`, merge `dev` into `main` with `git merge --no-ff dev`.
  That merge is a release.
- Do not create feature, fix or other branches unless asked.

## Commit messages

Conventional Commits, one line only:

```
<type>(<scope>): <short summary>
```

- Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`.
- Scopes: `web`, `api`, `db`, `repo`.
- Imperative, lowercase, no period, max 60 characters.
- Examples: `feat(api): add slot creation endpoint`, `fix(web): refetch slots after 409`,
  `chore(db): add booking unique constraint`.
- **No commit body, no trailers.** Never add `Co-Authored-By`, "Generated with", or any
  AI/tool attribution to commits, PR titles or PR descriptions. Do not list an AI tool as a
  contributor anywhere in the repo.
- Never commit or push unless explicitly asked. Never force-push.
