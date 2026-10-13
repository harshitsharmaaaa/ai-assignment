# 001 — LeadFlow Implementation Log

What was implemented, phase by phase, against the spec in `implementation.md`
(sections referenced as §N). Covers the pre-existing scaffold plus spec phases 1–11.
Every phase ended green (`typecheck` + `lint` + `build`, plus `test` from phase 9)
with one Conventional Commit.

## 0. Starting point (already done, commits 1–7)

Monorepo scaffold, verified green before feature work:

| Commit | Content |
|---|---|
| `dec2df1` chore | Turborepo + Bun workspaces, root `package.json`/`turbo.json`, shared `tsconfig`/`eslint-config`, Prettier |
| `14ed359` chore(shared) | Initial Zod schemas + lead status constants |
| `8882599` feat(db) | Prisma 7 schema, `init` migration, docker-compose postgres:16 |
| `5c4351c` feat(backend) | Express 5 skeleton: Zod env, `GET /health`, stub routes, `validate()`, error handler, 404 handler |
| `5a56d7d` feat(frontend) | Next.js 15 App Router + Tailwind v4 + shadcn (7 components), Query provider, typed api-client, placeholder page |
| `3ac742c` docs | Scaffold README + `.env.example` |
| `8bc85df` chore | Ignore `*.tsbuildinfo` |

Ports: frontend `3000`, backend `4000`. Single root `.env` as source of truth.

## Phase 1 — Shared schemas (§6.1) → `1b418d5`

Rewrote `packages/shared/src/` to the contract:

- `schemas.ts` — `createLeadSchema` (name trim 1–120, company trim ≤120, loose phone
  `^[0-9+().\-\s]+$` 5–30 chars, empty→`undefined`), `updateLeadSchema` (status/name/
  company/phone/`nextFollowUpAt` ISO-string-or-null, ≥1 field required, empty→`null`),
  `createDiscussionSchema` (note trim 1–2000, optional `followUpAt` ISO string),
  `listLeadsQuerySchema` (status, search trim ≤100, empty→`undefined`), `idParamSchema`
  (uuid), plus inferred input types.
- `responses.ts` — `leadResponseSchema`, `leadListItemSchema`
  (`Lead & { lastDiscussion: { note, createdAt } | null }`), `discussionItemSchema`,
  all timestamps ISO strings, plus inferred types.
- Verified: shared `typecheck` + `lint` pass.

## Phase 2 — Backend API (§6, §7) → `40dc647`

`apps/backend/src/` now layered routes → controllers → services → `@leadflow/db`:

- `services/leads.service.ts` — `listLeads` (status filter + case-insensitive
  name/company search, `take: 1` latest-discussion include, activity-desc sort in
  service), `createLead` (201 shape), `getLead`/`updateLead` (404 `NOT_FOUND`
  "Lead not found"), `listDiscussions` (lead-exists check, newest first),
  `addDiscussion` (`prisma.$transaction`: insert + §4.2 follow-up rule, returns
  `{ discussion, lead }`), single `toLeadListItem()` mapper reused everywhere.
  Plain `async` handlers, no try/catch (Express 5 forwarding).
- `controllers/leads.controller.ts` — HTTP shaping only, no Prisma.
- `routes/leads.routes.ts` — all 6 endpoints with `validate()`; nested
  `/:id/discussions`; stub `discussions.routes.ts` deleted.
- `middleware/validate.ts` — details flattened to `[{ path, message }]`
  (`body.name`-style paths), forwarded as `AppError`; safe-assign helper for
  Express 5 getter-only `req.query`.
- `middleware/error-handler.ts` — Zod→400 `VALIDATION_ERROR`, P2025→404,
  P2002→409, body-parser failures→400 `INVALID_JSON`, generic 500
  (logs server-side, no stack in responses).
- `middleware/not-found.ts` → 404 `ROUTE_NOT_FOUND`; `app.ts` uses
  `express.json({ limit: "100kb" })` + tiny dev request logger.
- `config/dotenv.ts` — first-imported side-effect module loading root `.env`
  (fixes ESM-hoisting bug where the Prisma adapter was built with undefined
  `DATABASE_URL`).
- Follow-up: `@leadflow/shared` switched from source-only to a tsup `dist`
  build — production `node dist` cannot load workspace `.ts` sources.
- Verified live: 201 create (trim + `""`→null), discussion set/clear, PATCH,
  search, and all error shapes (400 details list, 400 bad uuid, 404, `INVALID_JSON`);
  production `node dist/index.js` start works.

## Phase 3 — Seed (§9) → `a9199ca`

`packages/db/prisma/seed.ts`: wipes discussions+leads first (idempotent), builds
7 leads with dates relative to now — CONTACTED now+3h (pinned), QUALIFIED now−2h
(pinned+overdue), PROPOSAL_SENT −3d (main-list overdue), NEW tomorrow (future),
WON none, LOST old date (never pins/red), NEW with zero discussions — 20
discussions total with sales-flavored notes spread over past days, summary log.
Ran twice to prove idempotency.

## Phase 4 — Frontend foundations (§8.1–8.2, §4.1) → `8f63b80`

- `lib/lead-status.ts` — labels + badge color classes per status in one constant.
- `lib/lead-utils.ts` — pure `isDueToday` (`isSameDay`, local tz),
  `isOverdue`/`isPinned` (exclude WON/LOST), `partitionLeads` (pinned by
  follow-up asc; others by activity desc; no duplication).
- `lib/query-keys.ts` — `leadsKeys`, `discussionsKey`, `LeadFilters`.
- `lib/api-client.ts` — typed `listLeads/createLead/updateLead/listDiscussions/addDiscussion`
  + `apiErrorMessage`.
- `hooks/` — `useLeads` (`keepPreviousData`), `useUpdateLead`/`useCreateLead`
  (cache patch + invalidate + error toasts), `useDiscussions`/`useAddDiscussion`
  (timeline prepend + lead patch + invalidate), `use-now` (60s tick),
  `use-debounced-value` (300ms).
- Installed `sonner`, added `<Toaster>` to layout.

## Phase 5 — Lead list (§8.3) → `9c438d3`

`leads-screen.tsx` (filter/search state), `status-badge/`, `filters/`
(status buttons with `aria-pressed`, search input), `lead-list/` (pinned +
main sections with counts, skeleton loaders, contextual empty states, error +
Retry), `lead-row.tsx` (button row: name/company/badge, line-clamp-2 last note
or "No discussions yet", time-ago with absolute title, follow-up chip,
red left border for overdue). `page.tsx` renders only `<LeadsScreen/>`.

## Phase 6 — Timeline dialog (§8.3) → `37e4f20`

`lead-timeline-dialog/`: shadcn `Dialog` (no navigation); header reads the lead
from the live list cache; status `Select` PATCHes immediately with toast;
follow-up line with Clear action; scrollable newest-first timeline
(`timeline-item.tsx`: relative + absolute timestamps); `add-discussion-form.tsx`
(note 2000-char counter, optional `datetime-local` min=now → ISO, client +
server-details inline errors, spinner Save, form resets but dialog stays open,
new item prepends, list behind updates).

## Phase 7 — Add Lead dialog (§8.3) → `9d3014a`

`add-lead-dialog/`: Name (required) / Company / Phone, shared-schema client
validation + server-details inline errors, Cancel/Create actions; on success
toasts, closes, and opens the new lead's timeline. Header `Add Lead` button wired.

## Phase 8 — Polish (§8.3, §4.3) → `ef462b3`

Overdue red border + red chip text (LOST keeps distinct muted rose), "Clear
filters" empty-state action, `icon.svg` favicon (kills dev 404 noise), responsive
to 360px, labels on all inputs, focus rings, button rows, text+color overdue
signal. Verified with scripted Chromium runs: pinned order, add-note +
follow-up auto-clear, status change, add-lead, WON filter, search, no-match +
clear, zero JS errors.

## Phase 9 — Tests (§12) → `35f2471`

`bun test` via `node:test` (zero new deps): `lead-utils.test.ts` (11 tests —
later/earlier-today, previous day, tomorrow, null, WON/LOST, partition order +
no-duplication) and `leads.service.test.ts` (6 tests — set/clear/leave-unchanged
follow-up rules, newest-first, 404s, PATCH-clear with `__test__` cleanup).
Root `test` script + Turbo `test` task (`^build` + `^db:generate`, uncached).
`bun run test` → 17/17 pass (needs postgres up + migrated).

## Phase 10 — Docker (§10) → `ee32e88`

`apps/backend/Dockerfile` + `entrypoint.sh` (install → build → `migrate deploy`
→ optional `SEED=true` seed → `node dist`), `apps/frontend/Dockerfile`
(`NEXT_PUBLIC_API_URL` build arg, default `http://localhost:4000`), compose adds
`backend` (healthy, `postgres:5432` URL) + `frontend` services, root
`.dockerignore`. Verified: `docker compose up --build` → all healthy,
`{"status":"ok"}`, 7 seeded leads, frontend 200. (Mid-phase Docker Desktop's
WSL disk died — recovered via `wsl --unregister docker-desktop`, data volume
survived; the `bun install` integrity failures during the outage were the dying
disk, not the registry.)

## Phase 11 — Docs (§11) → `e3b74be`

README rewritten in the required 13-section order (overview + screenshot,
features, stack + Express-over-FastAPI rationale, prerequisites, both quick
starts, env table, structure, API table + curl, decisions, testing, AI
disclosure, demo). `.env.example` audited (added `SEED`). `docs/` holds 6
Playwright screenshots: list-pinned, filter, timeline, add-lead, overdue,
mobile (390px).

## Deviations from `implementation.md`

1. `@leadflow/shared` builds to `dist` (spec §3 says source-only) — production
   `node` cannot import workspace `.ts`; plain tsup bundle, no behavior change.
2. `isDueToday` uses `isSameDay(date, now)` instead of `isToday(date)` —
   identical in production, injectable for tests.
3. New files not in the §8.1 tree: `config/dotenv.ts` (ESM-hoisting fix),
   `lib/validation.ts` (details formatter), `middleware/request-logger.ts`,
   `app/icon.svg`. No `components/providers` change; no `useLead` single query
   (dialog header reads the live list cache instead, per §8.3).
4. `docs/` has 6 screenshots (adds mobile) and no video.

## Phase 10 follow-up — Docker install retries

`docker compose up --build` failed twice at `bun install --frozen-lockfile`
with `IntegrityCheckFailed` / tarball-extraction errors on random large
packages (different set each run; one earlier build had succeeded). Cause:
flaky tarball downloads inside the Docker VM, worsened by a nearly-full VM
disk (21 GB of other projects' dangling images; pruned) and an actual Docker
Desktop WSL-disk crash in between. Fix: both Dockerfiles now retry
`bun install` up to 5 times with a BuildKit cache mount on Bun's install cache
(`BUN_INSTALL_CACHE_DIR`), so retries only re-fetch the missing packages.
Verified: attempt 1 fetched 1292 packages with 1 failure, attempt 2 fetched
just the missing ones and completed; all 3 services healthy afterwards.

## How to run (final state)

```bash
bun install
cp .env.example .env
bun run db:up && bun run db:migrate && bun run db:seed
bun run dev            # :3000 + :4000
bun run test           # 17 tests (needs DB up)
docker compose up --build   # full stack (SEED=true for demo data)
```

Acceptance (§15): all functional/API items verified live except clean-clone
from a remote (no remote configured) and video (screenshots instead).
`typecheck` + `lint` + `build` + `test` all green; tree clean apart from
untracked environment-owned `AGENTS.md` and the `implementation.md` brief.
