# LeadFlow

LeadFlow is a single-screen lead management tool (a lightweight CRM) built as a take-home assessment. A sales rep tracks leads on one page: the list shows each lead's name, status badge, last discussion note and relative time, follow-ups due today are pinned on top, clicking a lead opens its timeline dialog to read history, log notes, set follow-ups and change status, and a dialog adds new leads.

![Lead list with pinned follow-ups](docs/list-pinned.png)

## How to run this project

Everything runs from the **repo root** — there is no per-app setup. Pick one of the three paths below, then use the **Verification** and **Commands** sections.

### What you need installed first

| Tool | Version | Why | Install |
|---|---|---|---|
| Bun | 1.3.9 (repo pins it via `packageManager`) | Package manager + scripts + test runner for the whole monorepo | <https://bun.sh> (or `npm install -g bun`) |
| Node.js | 20+ | Required by Next.js / tooling | <https://nodejs.org> |
| Docker Desktop | current stable | Runs Postgres (Path A) or the whole stack (Path B) | <https://www.docker.com/products/docker-desktop/> |

Run `bun --version` and `docker --version` first — both should print versions before you continue.

### Path A — local dev: Bun toolchain + Postgres in Docker (recommended)

You build and run the frontend/backend yourself; only the database runs in Docker. This gives you hot-reload on both apps and is the fastest daily loop.

```powershell
bun install                              # install all workspace dependencies
Copy-Item .env.example .env              # create the env file (already filled with working defaults)
bun run db:up                            # start Postgres 16 in Docker on localhost:5432
bun run db:migrate                       # create the database tables (first run only)
bun run db:seed                          # load 7 demo leads with discussions (idempotent)
bun run dev                              # start frontend (:3000) + backend (:4000)
```

On macOS/Linux the same commands work in bash (`cp .env.example .env`, etc.).

### Path B — everything in Docker Compose

One command builds and runs Postgres + backend + frontend as containers. No local Bun toolchain needed beyond Docker.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

To also load the demo data on first start:

```powershell
$env:SEED = "true"; docker compose up --build
```

(bash: `SEED=true docker compose up --build`)

### Path C — no Docker at all

Install Postgres 16 locally, create a database and user, point `.env` at it, then run the same commands as Path A from step 3 onward (`db:migrate`, `db:seed`, `dev`). In `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/leadflow
```

### Verify it is running

| Check | Expected |
|---|---|
| Open <http://localhost:3000> in the browser | Lead list loads; seeded leads show with the pinned "Today's follow-ups" section on top |
| `curl http://localhost:4000/health` (bash) | `{"status":"ok"}` |
| Open a lead, add a note with a follow-up | Timeline updates instantly; the lead's follow-up chip appears in the list behind |
| Press `N` in the browser | Add Lead dialog opens |

Ports: frontend **3000**, backend **4000**, Postgres **5432** (Path A/C only). If a port is taken, change it in `.env` (see the env table below) and restart.

### Common commands (run from the repo root)

| Command | What it does | When |
|---|---|---|
| `bun install` | Install/refresh all workspace dependencies | once, after clone; again after pulling dependency changes |
| `bun run dev` | Start frontend + backend with hot reload | daily development |
| `bun run build` | Production build of every package | before commits / CI |
| `bun run start` | Serve the production build on :3000 | after `bun run build` |
| `bun run lint` | ESLint across all packages | before commits |
| `bun run typecheck` | TypeScript check across all packages | before commits |
| `bun run test` | All tests (frontend unit + backend API) | needs Postgres up + migrated |
| `bun test` (inside `apps/frontend`) | Frontend unit tests only — no database needed | quick UI-logic check |
| `bun run db:up` / `bun run db:down` | Start / stop the Postgres container | Path A |
| `bun run db:migrate` | Create/apply database migrations | first run, or after schema changes |
| `bun run db:seed` | Wipe + reload the 7 demo leads (idempotent) | whenever you want fresh demo data |
| `bun run db:studio` | Prisma Studio GUI on the database | inspecting data |
| `docker compose down` | Stop everything (Path B) | finishing a session |

`dev`, `build`, `lint`, `typecheck`, `test` are Turborepo tasks: they run in every workspace that defines them, cache results, and can be filtered, e.g. `bunx turbo run dev --filter=@leadflow/frontend`.

### Troubleshooting

**Docker Desktop fails with `request returned Internal Server Error ... dockerDesktopLinuxEngine`** (Windows): the Linux engine is wedged, not the repo. Quit Docker Desktop from the tray, run `wsl --shutdown`, start Docker Desktop again, wait for the green whale, retry. If it persists: free disk space (engine builds need a few GB), then update Docker Desktop; last resort `wsl --unregister docker-desktop` (Docker recreates the distro; local DB data is expendable — re-seed afterwards).

**Port already in use** (`EADDRINUSE 3000/4000/5432`): stop the conflicting process or change `PORT` / `NEXT_PUBLIC_API_URL` / `POSTGRES_*` in `.env`.

**Frontend shows "Could not load leads"**: backend not running or `NEXT_PUBLIC_API_URL` wrong — check `GET http://localhost:4000/health`.

**Migrations fail**: make sure Postgres is reachable (`bun run db:up` healthy) before `db:migrate`.

## Features

- Lead list with name, company, status badge, last note (line-clamped) and "time ago"
- Today's follow-ups pinned in their own section, sorted by due time
- Overdue follow-ups highlighted red (except on closed leads)
- Status filter (All + 6 statuses) and debounced name/company search
- Timeline dialog: newest-first history, status change, clear follow-up, add-note form with optional follow-up and character counter
- Add Lead dialog with client + server validation
- Dark mode (system default, header toggle, no flash) with WCAG-AA-tuned tokens
- Pipeline summary strip with live per-status counts + Today/Overdue shortcuts
- One-click follow-up snooze (+1h / Tomorrow 9am / Next week / Clear) with undo
- Follow-up presets (Tomorrow 9am / In 3 days / Next Monday) in the note form
- Sort (recent activity / name / next follow-up), density toggle, overdue-only filter, all remembered in localStorage
- Keyboard shortcuts (`/` search, `N` new lead, `J`/`K` move, `Enter` open, `?` help)
- Undo toasts for status changes and follow-up clears; `tel:` + copy-phone row actions
- REST API with Zod validation and a consistent `{ error: { code, message, details } }` shape
- Idempotent seed (7 leads covering pinned, overdue, future, won, lost, empty-history)
- Full-stack Docker Compose plus local-dev flow
- Unit + API tests (`bun run test`)

## UI/UX v2

A frontend-only polish pass (see `002_impl.md` for the audit, decisions and
per-phase log). No API, schema or contract changes: every feature above runs
on the existing endpoints. Theme direction is **Linear Dark** (near-black
neutrals, indigo accent, hairline borders, dot status badges) — picked from
a shortlist of four researched CRM styles.

- Design tokens (CSS variables) for color/radius/shadow, light + dark themes,
  Inter typeface with tabular numerals, 180 ms motion gated on
  `prefers-reduced-motion`, responsive from 360 px (max content width on large
  screens).
- Lead rows with avatar/initials chip, follow-up chips (Today / Overdue /
  Upcoming), sticky header + filter bar, day-grouped timeline with an anchored
  note form, row-shaped skeletons and friendly empty/error states.
- Before shots: `docs/ui-v2/before/`. After shots: `docs/ui-v2/after/`
  (pending a live run — Docker was down when this pass was built; the v1
  shots in `docs/` still show the core flow).

### Keyboard shortcuts

| Keys | Action |
|---|---|
| `/` | Focus search |
| `N` | New lead |
| `J` / `K` | Move between leads |
| `Enter` | Open the focused lead |
| `Ctrl`/`Cmd`+`Enter` | Save the note (inside the timeline) |
| `Esc` | Close the dialog |
| `?` | Shortcut help |

## Tech stack and why

| Choice | Why |
|---|---|
| Bun + Turborepo monorepo | One toolchain for workspaces, scripts and caching; `bun run dev/build/test` from the root |
| Next.js 15 (App Router) + Tailwind v4 + shadcn/ui | Single-screen app, server components by default, accessible primitives via the shadcn CLI |
| Express 5 + TypeScript | The prompt preferred FastAPI, but Express was chosen deliberately: TypeScript end-to-end with Zod schemas shared between frontend and backend, one language across the repo |
| Prisma 7 + Postgres 16 | Typed ORM with migrations; the `db` package owns schema, client and seed |
| TanStack Query | List/timeline caching with instant cache updates on mutation |
| Zod in `@leadflow/shared` | One validation source for API and forms |
| `bun test` + `node:test` | Zero-dependency tests that typecheck with the existing `@types/node` |

## Environment variables

Single root `.env` is the source of truth (see `.env.example`). All defaults work out of the box for Path A and B — you only need to edit values to change ports or credentials.

| Name | Example | Used by | Description |
|---|---|---|---|
| `POSTGRES_USER` | `leadflow` | compose | Postgres superuser for local dev |
| `POSTGRES_PASSWORD` | `leadflow_dev_pw` | compose | Placeholder only — change for real use |
| `POSTGRES_DB` | `leadflow` | compose | Database name |
| `DATABASE_URL` | `postgresql://leadflow:leadflow_dev_pw@localhost:5432/leadflow` | db, backend, Prisma CLI | Connection string (in compose the backend uses the `postgres` hostname variant) |
| `PORT` | `4000` | backend | Backend listen port |
| `WEB_ORIGIN` | `http://localhost:3000` | backend | CORS allowlist (frontend origin) |
| `NODE_ENV` | `development` | backend | `development` \| `test` \| `production` (controls stack-trace leaking) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | frontend | Backend base URL, inlined at Next.js build time (compose passes it as a build arg) |
| `SEED` | `false` | backend container | Seed demo data on container start when `"true"` |

## Project structure

```
leadflow/
  apps/
    backend/    Express 5 API: routes -> controllers -> services -> @leadflow/db.
                Zod env, validate() middleware, AppError + central error handler,
                404 handler, dev request logger. No Prisma schema/client setup here.
    frontend/   Next.js App Router: leads-screen, lead-list, lead-timeline-dialog,
                add-lead-dialog, status-badge, filters, hooks (TanStack Query),
                lib (api-client, lead-status, lead-utils, query-keys). Never imports @leadflow/db.
  packages/
    db/         Prisma 7 schema, migrations, generated client, seed. Exports prisma,
                PrismaClient, LeadStatus, types and the Prisma namespace (dist via tsup + tsc).
    shared/     Zod request/response schemas + inferred types + lead status constants.
    tsconfig/ / eslint-config/   Shared strict TS and flat ESLint configs.
  docs/         Screenshots of the working flow.
  docker-compose.yml   postgres + backend + frontend (postgres-only dev still works).
  turbo.json   Turborepo pipeline; root package.json exposes dev/build/lint/typecheck/test + db:* scripts.
```

## API reference

Base path `/api`. JSON in/out. Timestamps are ISO 8601 UTC strings.

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | | 200 `{status:"ok"}` | |
| GET | `/api/leads` | `?status=&search=` | 200 `{ data: LeadListItem[] }` | 400 invalid query |
| POST | `/api/leads` | createLeadSchema | **201** `{ data: Lead }` | 400 |
| GET | `/api/leads/:id` | | 200 `{ data: Lead }` | 400 bad id, 404 |
| PATCH | `/api/leads/:id` | updateLeadSchema | 200 `{ data: LeadListItem }` | 400, 404 |
| GET | `/api/leads/:id/discussions` | | 200 `{ data: DiscussionItem[] }` newest first | 400, 404 |
| POST | `/api/leads/:id/discussions` | createDiscussionSchema | **201** `{ data: { discussion, lead } }` | 400, 404 |

`LeadListItem = Lead & { lastDiscussion: { note, createdAt } | null }`. List is activity-ordered (section split is a frontend concern). PATCH/POST-discussion return the updated `LeadListItem` for instant cache updates. Error codes: `VALIDATION_ERROR` (400, `details` = `[{path, message}]`), `NOT_FOUND` (404), `ROUTE_NOT_FOUND` (404), `CONFLICT` (409), `INVALID_JSON` (400), `INTERNAL_ERROR` (500, generic message).

```bash
curl -s http://localhost:4000/api/leads | head -c 300
curl -s -X POST http://localhost:4000/api/leads \
  -H 'content-type: application/json' \
  -d '{"name":"Priya Nair","company":"Example Foods"}'
curl -s -X POST http://localhost:4000/api/leads/<id>/discussions \
  -H 'content-type: application/json' \
  -d '{"note":"Called back, no answer","followUpAt":"2026-10-14T10:00:00.000Z"}'
curl -s -X PATCH http://localhost:4000/api/leads/<id> \
  -H 'content-type: application/json' \
  -d '{"status":"CONTACTED"}'
```

## Decisions and trade-offs

- **Follow-up rule (4.2):** a discussion with `followUpAt` sets `nextFollowUpAt` in the same transaction; without it, a due/overdue (`<= now`) follow-up is cleared (it was just acted on), a future one is left alone. PATCH accepts a date or `null` ("Clear follow-up").
- **"Today" is evaluated in the browser's local timezone** (`date-fns`), so pinning follows the rep's calendar day. The helper uses `isSameDay(date, now)` instead of `isToday(date)` — identical in production, but injectable-`now` makes it unit-testable.
- **WON/LOST never pin and never show the overdue style.** `isDueToday` stays a pure date check; `isOverdue`/`isPinned` exclude closed leads.
- **`@leadflow/db` builds to `dist` with tsup (JS bundle) + tsc (per-file `.d.ts`).** tsup's rolled-up DTS dropped the `Prisma` namespace value members (`PrismaClientKnownRequestError`); tsc declarations preserve them exactly. Consequence: backend typecheck/dev/build wait on `^build` + `^db:generate` in Turbo.
- **`@leadflow/shared` also builds to `dist`** (deviation from the "source-only" scaffold): production `node apps/backend/dist` cannot load workspace `.ts` sources, so shared ships a tsup bundle.
- **Prisma 7 notes:** `prisma-client` generator (old `prisma-client-js` is deprecated), `datasource.url` and `migrations.seed` live in `prisma.config.ts` (which loads the root `.env` explicitly since the CLI runs from `packages/db`), `PrismaClient` requires the `@prisma/adapter-pg` adapter, `importFileExtension = "ts"` for tsx, and `migrate dev` no longer auto-generates (Turbo `^db:generate` + `postinstall: prisma generate` cover it; postinstall tolerates a missing `.env` via a dummy-URL fallback).
- **Backend env loading:** ESM imports hoist, so `dotenv.config()` statements in `index.ts` ran *after* `@leadflow/db` created its client (undefined `DATABASE_URL` → SASL error). Fixed with a first-imported `src/config/dotenv.ts` side-effect module (works from both `src/` and `dist/`).
- **Express 5 `req.query` is getter-only:** `validate()` assigns via a safe helper (direct assign with `defineProperty` fallback) instead of crashing in strict mode.
- **Frontend reads the dialog header from the live list cache** (`useLeads` in `LeadsScreen`), so status/follow-up edits reflect instantly; mutations update cached lists then invalidate to reconcile.
- **Seed uses dates relative to now** (e.g. now+3h, now−2h) so pinned/overdue states are always demonstrable; it wipes first (idempotent).
- **No auth, no pagination, no discussion edit/delete** — out of scope per spec.
- **Docker:** build context is the repo root (workspace builds need all packages); backend entrypoint runs `migrate deploy`, optional `SEED=true` seed, then `node dist`. Verified with `docker compose up --build` (healthchecks green, 7 leads served).

## Testing

```bash
bun run test        # turbo: 11 lead-utils unit tests + 6 API follow-up-rule tests (17 total)
bunx --filter @leadflow/frontend bun test   # + 17 UI-logic tests (presets, sort, grouping, prefs) — no DB needed
```

- `apps/frontend/lib/lead-utils.test.ts`: `isDueToday`/`isOverdue`/`isPinned`/`partitionLeads` with a fixed `now` (due later/earlier today, previous day, tomorrow, null, WON/LOST, ordering, no duplication).
- `apps/frontend/lib/{followup-presets,lead-sort,timeline-group,view-prefs}.test.ts`: pure helpers for the v2 UI (preset math, sorting, day grouping, prefs sanitization). These run without a database.
- `apps/backend/src/services/leads.service.test.ts`: 4.2 rules (set/clear/leave-unchanged), newest-first timeline, 404s, PATCH-clear. Needs postgres up and migrated (`bun run db:up && bun run db:migrate`); tests create `__test__`-tagged leads and delete them afterwards.
- Manual smoke test: scripted Chromium run covered pinned section, dialog open, add-note (with/without follow-up + clearing), status change, add-lead, filter, search, empty state + retry paths — see `docs/`.

## AI usage disclosure

This repo was built with AI assistance and every step was verified by running the code.

- **Tools used:** OpenCode coding agent powered by Muse Spark (model `muse-spark`), plus web docs (Prisma, shadcn/ui, Turbo) for version-specific setup.
- **What the AI generated:** the monorepo scaffold, all backend/frontend/package code, seed data, tests, Dockerfiles, this README, and the screenshots script — working from the task brief (`implementation.md`, kept untracked at the repo root) and the reviewer's spec.
- **What was reviewed/modified by hand:** each phase ended with `bun run typecheck && bun run lint && bun run build` (plus `bun run test` from phase 9), real HTTP checks of every endpoint and error shape, scripted browser runs for the full UI flow, and a from-scratch `docker compose up --build` verification.
- **Surprises worth knowing:** the ESM dotenv-hoisting SASL failure, Express 5 getter-only `req.query`, tsup DTS dropping Prisma namespace values, `@radix-ui/react-label@^1.1.0` not existing, and a Docker Desktop WSL-disk crash mid-project (recovered via `wsl --unregister docker-desktop`; data volume survived).
- **UI/UX v2 pass (this change):** the AI audited the UI (15 bugs + 10 design issues in `002_impl.md`), fixed the high/medium bugs, added the token layer + dark mode (`next-themes`), redesigned rows/timeline/states, and designed + implemented 6 frontend-only features (snooze + undo, presets, pipeline summary + overdue filter, sort + density + persisted prefs, shortcuts + help, tel:/copy actions) with 17 new unit tests. `bun run typecheck && bun run lint && bun run build` green; frontend tests 28/28. No backend/schema/API change. Docker was down during this pass, so the live browser audit, after-screenshots and full-DB test run are owed once Docker is back.

Author checklist ("Reviewed and verified by me"):
- [ ] I ran the Quick start steps verbatim on a clean machine
- [ ] I watched the demo flow (screenshots in `docs/`)
- [ ] I reviewed the git history and the Decisions section above

## Demo

No video recorded; the scripted flow is captured in `docs/`:

- ![Lead list with pinned follow-ups](docs/list-pinned.png) — list with pinned section
- ![Status filter applied](docs/filter.png) — Won filter
- ![Lead timeline dialog](docs/timeline.png) — timeline dialog
- ![Add lead dialog](docs/add-lead.png) — add lead dialog
- ![Overdue lead](docs/overdue.png) — overdue state
- ![Mobile layout](docs/mobile.png) — 390px layout
