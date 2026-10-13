# LeadFlow

Single-screen lead management tool (lightweight CRM) — take-home assessment scaffolding.

> Scope of this repo state: **skeleton only, green build**. No lead list UI, no business logic yet. Just a clean Turborepo + Bun monorepo with a running Next.js frontend and Express backend, Prisma/Postgres wiring, shared Zod schemas, and tooling.

## Stack

- **Monorepo:** Turborepo, **Bun** as package manager / workspace manager (`packageManager` field), Node 20+ runtime
- **Language:** TypeScript everywhere (strict mode)
- **apps/frontend:** Next.js (App Router) + Tailwind CSS + shadcn/ui (`dialog`, `button`, `badge`, `input`, `select`, `textarea`, `label`) + TanStack Query + date-fns
- **apps/backend:** Express 5 + TypeScript (`tsx watch` dev, `tsc` build)
- **packages/db:** PostgreSQL + Prisma ORM (latest stable, v7 pattern) + Prisma Migrate. Owns schema, migrations, generated client, seed.
- **Validation:** Zod, schemas shared between frontend and backend
- **packages/shared:** Zod schemas, inferred TS types, constants (lead statuses)
- **packages/tsconfig / packages/eslint-config:** shared configs
- **Infra:** docker-compose postgres:16, ESLint + Prettier, single root `.env` source of truth

## Prerequisites

- Bun (pinned via `packageManager`, tested with 1.3.9)
- Node 20+
- Docker + Docker Compose (tested with Docker 26.1.4 / Compose v2.27.1)
- Git

## Quickstart (exact setup steps)

```bash
# 1. Install (also generates Prisma client via postinstall)
bun install

# 2. Env (single source of truth at root)
cp .env.example .env

# 3. Start DB
docker compose up -d postgres

# 4. Migrate (creates `init` migration on first run, then applies)
bun run db:migrate

# 5. Seed (stub for now — real 5+ leads data comes later)
bun run db:seed

# 6. Run dev (frontend :3000, backend :4000)
bun run dev
```

Verify:

- `GET http://localhost:4000/health` → `{ "status": "ok" }`
- `GET http://localhost:3000` renders placeholder `LeadFlow` heading

Other useful commands:

```bash
bun run build      # turbo build (db:generate runs first)
bun run lint       # turbo lint
bun run typecheck  # turbo typecheck (db:generate runs first)
docker compose up -d postgres   # via bun run db:up
docker compose down             # via bun run db:down
bun run db:generate  # prisma generate
bun run db:studio    # prisma studio
```

## Project structure

```text
leadflow/
  apps/
    frontend/   # Next.js App Router, single page at app/page.tsx ("LeadFlow" heading)
            # components/{lead-list,lead-timeline-dialog,add-lead-dialog,status-badge}/
            # lib/api-client.ts, lib/utils.ts, hooks/ — ready, filled later
            # Depends on @leadflow/shared only (never @leadflow/db)
    backend/   # Express 5 API. Only GET /health now; /api/leads + /api/discussions stub routers
            # src/{index.ts,app.ts,config/env.ts,lib/app-error.ts}
            # src/{routes,controllers,services,middleware} — controllers/services .gitkeep for later
            # Imports prisma ONLY from @leadflow/db (no schema/migrations/client here)
  packages/
    db/        # @leadflow/db — owns Prisma schema, migrations, generated client, seed
               # prisma/schema.prisma, prisma/migrations/, prisma/seed.ts (stub)
               # src/client.ts (singleton), src/index.ts (re-exports)
    shared/    # @leadflow/shared — Zod schemas, inferred types, lead status constants
    tsconfig/  # @leadflow/tsconfig — shared base/nextjs/node configs
    eslint-config/ # @leadflow/eslint-config — shared base/next/node configs
  docker-compose.yml  # postgres:16 + named volume + healthcheck (+ commented backend/frontend for later)
  turbo.json
  package.json
  .env.example
  README.md
```

What each app/package is for:

| Path | Purpose |
|------|---------|
| `apps/frontend` | User-facing single-screen CRM. TanStack Query provider + typed `api-client.ts` (`NEXT_PUBLIC_API_URL`) ready for list/timeline caching later. |
| `apps/backend` | REST API. Zod-validated env, `validate({body,query,params})` middleware, `AppError` + central error handler (Zod→400, P2025→404, P2002→409), 404 handler, CORS via `WEB_ORIGIN`. Express 5 native async forwarding. |
| `packages/db` | DB ownership boundary. Backend never touches Prisma CLI directly. |
| `packages/shared` | Single source for `LeadStatus` + Lead/Discussion Zod shapes used by both ends. |
| `packages/tsconfig`, `packages/eslint-config` | DRY strict TS + lint. |

## Domain model (Prisma + Zod mirror)

- enum `LeadStatus`: `NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, WON, LOST`
- `Lead`: `id` String uuid default, `name` required, `company?`, `phone?`, `status` default `NEW`, `nextFollowUpAt?`, `createdAt` now, `updatedAt` auto, `discussions[]`
- `Discussion`: `id` uuid default, `leadId` FK → Lead cascade, `note` required, `createdAt` now
- Indexes: `@@index([leadId, createdAt(sort: Desc)])` on Discussion, `@@index([nextFollowUpAt])` on Lead
- `@@map("leads")` / `@@map("discussions")` + `@map` snake_case columns

## Scripts table

### Root

| Script | What it does |
|--------|--------------|
| `bun run dev` | `turbo dev` — frontend + backend |
| `bun run build` | `turbo build` |
| `bun run lint` | `turbo lint` |
| `bun run typecheck` | `turbo typecheck` |
| `bun run db:up` | `docker compose up -d postgres` |
| `bun run db:down` | `docker compose down` |
| `bun run db:generate` | `turbo run --filter=@leadflow/db db:generate` |
| `bun run db:migrate` | `turbo run --filter=@leadflow/db db:migrate` (`prisma migrate dev`) |
| `bun run db:seed` | `turbo run --filter=@leadflow/db db:seed` (`prisma db seed`) |
| `bun run db:studio` | `turbo run --filter=@leadflow/db db:studio` |

### packages/db

| Script | Command |
|--------|---------|
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:deploy` | `prisma migrate deploy` |
| `db:seed` | `prisma db seed` |
| `db:studio` | `prisma studio` |
| `build` | `tsup` (js bundle) + `tsc -p tsconfig.build.json` (per-file `.d.ts`) → `dist/` |
| `typecheck` | `tsc --noEmit` |

### apps/backend

| Script | Command |
|--------|---------|
| `dev` | `tsx watch src/index.ts` |
| `build` | `tsc -p tsconfig.json` |
| `start` | `node dist/index.js` |
| `typecheck` | `tsc --noEmit` |

## Env variables (root `.env`, see `.env.example`)

| Var | Used by | Example |
|-----|---------|---------|
| `POSTGRES_USER` | compose | `leadflow` |
| `POSTGRES_PASSWORD` | compose | `leadflow_dev_pw` (placeholder only) |
| `POSTGRES_DB` | compose | `leadflow` |
| `DATABASE_URL` | db + backend + prisma CLI | `postgresql://leadflow:leadflow_dev_pw@localhost:5432/leadflow` |
| `PORT` | backend | `4000` |
| `WEB_ORIGIN` | backend CORS | `http://localhost:3000` |
| `NODE_ENV` | backend error handler | `development` |
| `NEXT_PUBLIC_API_URL` | frontend api-client | `http://localhost:4000` |

## Implementation plan (scaffolding steps)

Planned Conventional Commits:

1. `chore: initialize turborepo with bun workspaces` — root `package.json`/`turbo.json`/tsconfig/eslint/prettier/`.gitignore`/compose/`.env.example`
2. `chore(shared): add zod schemas and lead status constants` — `packages/shared`
3. `feat(db): add prisma schema, initial migration, and docker-compose postgres` — `packages/db` + `init` migration + stub `seed.ts`
4. `feat(backend): scaffold express server with env validation and error handling` — `apps/backend` per folder layout + `/health`
5. `feat(frontend): scaffold next.js app with tailwind, shadcn, and query provider` — `apps/frontend` + 7 shadcn components + Query provider + api-client
6. `docs: add readme and env example` — this file

Turbo wiring: `build`/`typecheck`/`dev` all `dependsOn: ["^build", "^db:generate"]` (`dev`/`typecheck` need `^build` too because the backend resolves `@leadflow/db` via its `dist` output), plus `@leadflow/db#build` depends on its own `db:generate`, and `globalEnv` includes `DATABASE_URL` etc. In Prisma v7 `migrate dev` no longer auto-generates, so explicit `db:generate` + `postinstall: prisma generate` covers clean clones. (`postinstall` tolerates a missing `.env` via a dummy-URL fallback in `prisma.config.ts` — generate works offline; migrate/seed still need the real DB.)

Definition of done: `bun install` ✓ → `docker compose up -d postgres` + `bun run db:migrate` ✓ → `bun run dev` (3000 ok, 4000 `/health` ok) ✓ → `bun run build/lint/typecheck` ✓ → backend imports `prisma` from `@leadflow/db` (trivial typed import check proves wiring) ✓.

## Decisions / deviations

- **Prisma v7 (`prisma-client` generator, `prisma.config.ts`, driver adapter).** Spec says latest stable + current docs → v7. Old `prisma-client-js` is deprecated; `datasource url` moves from `schema.prisma` to `prisma.config.ts` (`datasource: { url: env("DATABASE_URL") }`); seed moves from `package.json#prisma` to `migrations: { seed: "tsx prisma/seed.ts" }`; `PrismaClient` requires `@prisma/adapter-pg` + `pg`; generator needs explicit `output` (`../src/generated/prisma`) + `importFileExtension = "ts"` for `tsx`.
- **How `@leadflow/db` is exported: built `dist` via `tsup` (JS bundle) + `tsc` (per-file `.d.ts`) — chosen.** Alternative was exporting TS source directly (`exports: ./src/index.ts`). Rejected because `apps/backend` production `node dist/index.js` cannot load workspace `.ts` at runtime. The split build exists because `tsup`'s rolled-up DTS dropped the `Prisma` namespace value members (`PrismaClientKnownRequestError`), while `tsc --emitDeclarationOnly` preserves them exactly; runtime comes from the `tsup` bundle, types from the `tsc` declarations. Trade-off: `backend#build/typecheck/dev` must wait on `^build` + `^db:generate` via Turbo.
- **Root `.env` loading from `packages/db`.** `dotenv/config` alone resolves relative to CWD (`packages/db`), not root. Fix: `prisma.config.ts` explicitly loads `../../.env` via `dotenv` + `path.resolve`, no `dotenv-cli` needed. Turbo `globalEnv` passes vars through.
- **ID default: `@default(uuid(7))`** (portable, no `pgcrypto` extension needed vs `gen_random_uuid()`).
- **Tailwind v4 + shadcn `new-york/neutral` + CSS vars**, `@/*` alias, per current `create-next-app`/`shadcn init` defaults.
- **ESLint 9 flat config** shared via `packages/eslint-config`.
- **Ports:** frontend 3000, backend 4000. Next.js `app/` at repo root of `apps/frontend` (spec-literal `app/page.tsx`, no `src/` dir).

## AI usage disclosure

<!-- Placeholder — fill in before submission: tools used, what was generated vs written by hand, verification steps. -->
- Tool(s):
- Scope of AI assistance:
- Verification (build/lint/typecheck/migrate/dev + manual checks):
