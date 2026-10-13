# LeadFlow: Implementation Spec

> Read this whole file before writing code. It is the single source of truth for what to build.
> The repo skeleton already exists and is green. Your job is to implement the features on top of it, in the order given in section 14.

---

## 0. Rules for the AI agent

1. Do not re-scaffold. Build on the existing monorepo. Do not rename apps or packages.
2. Do not touch `AGENTS.md` (environment-owned, untracked).
3. Keep scope tight. This is a take-home assessment sized at about 8 hours. Do not add auth, pagination, websockets, i18n, or anything not listed here.
4. After each phase in section 14: run `bun run typecheck && bun run lint && bun run build`, fix failures, then commit with a Conventional Commit message.
5. Never leave placeholder or fake data in the UI. Everything shown must come from the API.
6. Keep a running list of AI-assisted decisions and anything surprising. It feeds the "AI usage disclosure" section of the README (section 11).
7. If this spec is ambiguous or contradicts the repo, make the simplest reasonable choice, note it in the README under "Decisions", and continue. Do not stop to ask.

---

## 1. Project context

**Product:** LeadFlow, a single-screen lead management tool (a lightweight CRM). A sales rep tracks leads, logs every discussion, and sets follow-up reminders.

**Why it exists:** a coding assessment for PravarAI (AI-smart fullstack intern). Reviewers will evaluate:

| Area | What they check |
|---|---|
| Functional | Lead list shows name, status, last note, time ago. Today's follow-ups are pinned. Timeline dialog loads discussions in order. Adding a discussion updates the list immediately. Add new lead works. Status update from the dialog persists. |
| Code quality | Clean frontend component structure. API uses correct status codes and clean error handling. |
| Delivery | README with working setup steps. Meaningful git commit history. |
| Bonus | Search by name, overdue follow-ups in red, Docker Compose, seed script (5+ leads with discussions), filters. |

**Submission requires:** public GitHub repo, `.env.example` with all variables, README with setup, and a video or screenshots of the working flow.

---

## 2. Scope

**In scope**
- One screen with a lead list, a status filter, a name search, and today's follow-ups pinned on top.
- Lead timeline dialog (a dialog, not a page): history, add-note form with optional follow-up, status change.
- Add Lead dialog.
- REST API with validation and consistent errors.
- Seed script, Docker Compose, README, screenshots/video.

**Out of scope:** authentication, multi-user, roles, pagination, editing or deleting discussions, deleting leads, email or push reminders, i18n.

---

## 3. Current repo state (already done)

```
leadflow/
  apps/
    backend/    Express 5 + TS, Zod env, GET /health, stub /api/leads + /api/discussions,
                validate() middleware, error handler, 404 handler, src/lib/db.ts wiring check
    frontend/   Next.js 15 App Router, Tailwind v4, shadcn (dialog button badge input select
                textarea label), TanStack Query provider, typed api-client.ts, placeholder page
  packages/
    db/         Prisma 7 schema, prisma.config.ts, singleton client (PrismaPg adapter),
                init migration, stub seed.ts. Built to dist via tsup + tsc declarations
    shared/     LEAD_STATUSES, leadStatusSchema, Lead/Discussion Zod schemas + types (source-only)
    tsconfig/   shared TS configs
    eslint-config/
  docker-compose.yml   postgres:16 only
  turbo.json, package.json (Bun workspaces, bun@1.3.9), .env.example, README.md
```

Ports: frontend `3000`, backend `4000`. Commands: `bun install`, `bun run db:up`, `bun run db:migrate`, `bun run db:seed`, `bun run dev`.

Notes that matter:
- Prisma 7 with the `prisma-client` generator and `@prisma/adapter-pg`. Import from `@leadflow/db`. Do not create Prisma code in the backend.
- Prisma enum values are uppercase (`PROPOSAL_SENT`). The UI maps them to display labels.
- `@leadflow/shared` is source-only. The frontend must depend on it but never on `@leadflow/db`.
- If you change `packages/db` (schema or exports), rebuild it (`bun run build` handles this via turbo `dependsOn`).

---

## 4. Domain rules (business logic)

These rules are the heart of the evaluation. Implement them exactly.

### 4.1 Statuses
`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `WON`, `LOST`.

| Enum | Label | Badge color |
|---|---|---|
| NEW | New | slate / gray |
| CONTACTED | Contacted | blue |
| QUALIFIED | Qualified | violet |
| PROPOSAL_SENT | Proposal Sent | amber |
| WON | Won | green |
| LOST | Lost | red-muted (not the same red as overdue) |

Put the label map and colors in one frontend constant (`lib/lead-status.ts`) and reuse it everywhere (badge, filter, select).

### 4.2 Follow-up field
- `Lead.nextFollowUpAt` is a nullable timestamp (UTC in DB).
- Saving a discussion **with** `followUpAt` sets `lead.nextFollowUpAt = followUpAt`, in the same transaction as the discussion insert.
- Saving a discussion **without** `followUpAt`:
  - if the lead's current `nextFollowUpAt` is not null and is `<= now`, clear it (set to null), because the follow-up was just acted on;
  - otherwise leave it unchanged.
- Document this rule in the README under "Decisions".
- `PATCH /api/leads/:id` may also set `nextFollowUpAt` to a date or `null` (null is the "Clear follow-up" action in the dialog).

### 4.3 "Today", "overdue", "pinned" (all evaluated on the frontend, in the user's local timezone)
- **Due today:** `nextFollowUpAt` falls within the local calendar day (use date-fns `isToday`).
- **Overdue:** `nextFollowUpAt < now` and the lead status is not `WON` or `LOST`.
- **Pinned:** the lead is due today AND status is not `WON`/`LOST`. This includes follow-ups earlier today that have already passed (they are pinned AND shown as overdue).
- Leads with an overdue follow-up from a previous day are not pinned, but are highlighted red in the main list (bonus).
- `WON` and `LOST` leads never pin and never show the overdue style.

### 4.4 List ordering
1. **Pinned section** ("Today's follow-ups"): sorted by `nextFollowUpAt` ascending.
2. **All other leads:** sorted by most recent activity, descending, where activity = last discussion time, falling back to `createdAt`.

A lead appears in exactly one section (never duplicated).

### 4.5 Last note and "time ago"
- Last note = the most recent discussion's note, truncated visually to one or two lines (CSS line-clamp).
- Time ago = `formatDistanceToNowStrict(lastDiscussion.createdAt, { addSuffix: true })`, for example "3 days ago".
- No discussions: show "No discussions yet" in muted text, and no time-ago.
- Re-render the relative times every 60 seconds (a small `useNow` hook).

---

## 5. Data model

Already migrated. Do not change it unless a requirement here cannot be met. If you must change it, add a new migration (never edit the init migration).

- `Lead`: `id` (uuid v7), `name`, `company?`, `phone?`, `status` (default NEW), `nextFollowUpAt?`, `createdAt`, `updatedAt`, `discussions[]`
- `Discussion`: `id`, `leadId` (cascade delete), `note`, `createdAt`
- Indexes: `Discussion(leadId, createdAt desc)`, `Lead(nextFollowUpAt)`

---

## 6. API contract

Base path `/api`. JSON in, JSON out. All timestamps are ISO 8601 strings (UTC).

### 6.1 Shared Zod schemas (in `packages/shared`, used by both apps)

```ts
createLeadSchema    = { name: string trim 1..120, company?: string trim max 120, phone?: string trim max 30 }
updateLeadSchema    = { status?: LeadStatus, name?, company?: string|null, phone?: string|null,
                        nextFollowUpAt?: ISO datetime string | null }   // at least one field required
createDiscussionSchema = { note: string trim 1..2000, followUpAt?: ISO datetime string }
listLeadsQuerySchema   = { status?: LeadStatus, search?: string trim max 100 }
idParamSchema          = { id: uuid }
```

Empty-string `company`/`phone` should be normalized to `null` (or undefined on create). Phone validation: loose, digits plus `+ - ( ) space`, 5 to 30 chars. Do not over-validate.

Also export response types:

```ts
LeadListItem = Lead & { lastDiscussion: { note: string; createdAt: string } | null }
DiscussionItem = { id; leadId; note; createdAt }
```

### 6.2 Endpoints

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | | 200 `{status:"ok"}` | |
| GET | `/api/leads` | `?status=&search=` | 200 `{ data: LeadListItem[] }` | 400 invalid query |
| POST | `/api/leads` | createLeadSchema | **201** `{ data: Lead }` | 400 |
| GET | `/api/leads/:id` | | 200 `{ data: Lead }` | 400 bad id, 404 |
| PATCH | `/api/leads/:id` | updateLeadSchema | 200 `{ data: LeadListItem }` | 400, 404 |
| GET | `/api/leads/:id/discussions` | | 200 `{ data: DiscussionItem[] }` newest first | 400, 404 |
| POST | `/api/leads/:id/discussions` | createDiscussionSchema | **201** `{ data: { discussion: DiscussionItem, lead: LeadListItem } }` | 400, 404 |

Notes:
- `GET /api/leads`: `search` is a case-insensitive `contains` on `name` (also match `company`). Include `lastDiscussion` via a Prisma `discussions: { orderBy: { createdAt: 'desc' }, take: 1 }` include and map it. Return the unsorted-by-section list ordered by activity desc (section partitioning is a frontend concern per 4.3/4.4).
- `PATCH` and `POST discussion` return the updated `LeadListItem` so the client can update its cache instantly.
- Discussions are nested under leads. Remove or repurpose the stub `/api/discussions` route so there is no dead route. Use `Router({ mergeParams: true })` or define the nested paths in `leads.routes.ts`.

### 6.3 Error format and status codes

Always:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [ ... ] } }
```

| Situation | Status | code |
|---|---|---|
| Zod validation failure (body, query, params) | 400 | `VALIDATION_ERROR` (details = list of `{ path, message }`) |
| Lead not found (also Prisma P2025) | 404 | `NOT_FOUND` |
| Unknown route | 404 | `ROUTE_NOT_FOUND` |
| Unique conflict (P2002) | 409 | `CONFLICT` |
| Malformed JSON body | 400 | `INVALID_JSON` |
| Anything else | 500 | `INTERNAL_ERROR` (generic message, log the real error server-side, no stack trace in responses) |

---

## 7. Backend implementation guide (`apps/backend`)

Keep the existing layering: **routes -> controllers -> services -> `@leadflow/db`**.

- `routes/leads.routes.ts`: wiring only. Attach `validate({ params, body, query })` and the controller.
- `controllers/leads.controller.ts`: parse request, call a service, shape the HTTP response and status. No Prisma here.
- `services/leads.service.ts`: all Prisma access and business rules:
  - `listLeads({ status, search })`
  - `createLead(input)`
  - `getLead(id)`: throws `AppError(404, 'NOT_FOUND')`
  - `updateLead(id, input)`
  - `listDiscussions(leadId)`: verify the lead exists first (404 otherwise)
  - `addDiscussion(leadId, input)`: uses `prisma.$transaction` to insert the discussion and apply the follow-up rule from 4.2, then returns `{ discussion, lead }`
- A single `toLeadListItem()` mapper function converts a Prisma lead (with the included discussion) to the API shape. Reuse it everywhere.
- Handlers are plain `async` functions. Express 5 forwards rejections to the error handler. No try/catch boilerplate.
- Use the existing `AppError`, `validate()`, and error handler. Extend the error handler for `INVALID_JSON` (body-parser `entity.parse.failed`).
- Keep `express.json({ limit: '100kb' })`.
- Log requests in dev with a tiny logger middleware (method, path, status, ms). No heavy dependency needed.

---

## 8. Frontend implementation guide (`apps/frontend`)

### 8.1 Structure

```
app/
  layout.tsx, page.tsx            # page.tsx renders <LeadsScreen />, nothing else
components/
  leads-screen.tsx                # owns filter/search state, composes the pieces below
  lead-list/
    lead-list.tsx                 # renders pinned section + main section, loading/empty/error states
    lead-row.tsx                  # one lead: name, company, badge, last note, time ago, follow-up chip
  lead-timeline-dialog/
    lead-timeline-dialog.tsx      # shadcn Dialog; header (name/company/phone), status select, timeline, form
    timeline-item.tsx
    add-discussion-form.tsx
  add-lead-dialog/
    add-lead-dialog.tsx
  status-badge/
    status-badge.tsx
  filters/
    status-filter.tsx             # All + 6 statuses (tabs or select)
    search-input.tsx              # debounced 300 ms
  ui/                             # shadcn (existing)
hooks/
  use-leads.ts                    # useLeads(filters), useLead keys, mutations
  use-discussions.ts
  use-now.ts                      # ticks every 60 s for relative times
  use-debounced-value.ts
lib/
  api-client.ts                   # existing, extend with typed functions
  lead-status.ts                  # labels + colors (see 4.1)
  lead-utils.ts                   # partitionLeads(), isOverdue(), isDueToday() (pure, unit-testable)
  query-keys.ts
```

Install `sonner` via shadcn for toasts (success and error messages).

### 8.2 Data fetching with TanStack Query

Query keys:
- `['leads', { status, search }]` for the list
- `['discussions', leadId]` for the timeline

Behavior:
- `useLeads(filters)` uses `placeholderData: keepPreviousData` so filtering does not flash empty.
- **Add discussion** mutation: on success, `setQueryData` for `['discussions', leadId]` (prepend the new item), update the lead inside every cached `['leads', ...]` list with the returned `lead` (so last note, time ago, and follow-up change instantly), then `invalidateQueries({ queryKey: ['leads'] })` to reconcile with the server.
- **Update status / clear follow-up** mutation: same pattern using the returned `LeadListItem`. Optimistic update with rollback on error is a nice touch but not required.
- **Create lead** mutation: invalidate `['leads']`, close the dialog, toast, and optionally open the new lead's timeline.
- Every error surfaces as a toast (API error message) and, for forms, inline field errors from `details`.

### 8.3 Screen behavior

**Header:** app name "LeadFlow", the `Add Lead` button, and the search + status filter row.

**Lead list**
- Section 1: **Today's follow-ups** (only rendered if there are pinned leads), with a count and a subtle highlighted background.
- Section 2: **All leads** (or "Leads" when a filter is active).
- Each row shows: name (bold), company (muted, optional), status badge, last note (line-clamp-2), time ago, and a follow-up chip when `nextFollowUpAt` exists (for example "Follow up Today, 4:30 PM" or "Overdue: 2 days ago"). Overdue (4.3) rows get a red left border plus red chip text.
- The whole row is a button (keyboard accessible) that opens the timeline dialog for that lead.
- States: skeleton loading rows, empty state ("No leads yet. Add your first lead."; with a filter active: "No leads match your filters"), and an error state with a Retry button.

**Lead timeline dialog**
- Opens as a shadcn `Dialog` on top of the list (no navigation). Store `selectedLeadId` in `LeadsScreen` state. The lead object shown in the header is always read from the live list cache so edits reflect instantly.
- Header: name, company, phone (all optional ones only if present). Status `Select` (changing it calls PATCH immediately and toasts). Current follow-up shown, with a "Clear" action when set.
- Body: the timeline, newest first. Each item shows the note and a timestamp (absolute plus relative on hover or as a secondary line). Scrollable with a max height. Empty state: "No discussions yet."
- Footer form (always visible at the bottom): `Textarea` for the note (required, max 2000, with a character counter), an optional `datetime-local` input "Follow-up date & time" (min = now), and a `Save` button (disabled and showing a spinner while submitting). Convert the `datetime-local` value to an ISO string via `new Date(value).toISOString()`.
- After a successful save: clear the form, keep the dialog open, new item appears at the top of the timeline, and the list behind updates.

**Add lead dialog**
- Fields: Name (required), Company, Phone. Status is not editable here, since it defaults to NEW.
- Client-side validation uses the shared Zod schema (`react-hook-form` + `@hookform/resolvers/zod`, or plain controlled state if you prefer fewer deps). Show server `details` errors inline too.

**Responsiveness:** works from 360 px wide up. Rows stack vertically on mobile; the dialog is near full-width on small screens.

**Accessibility basics:** labels on all inputs, focus management via the shadcn Dialog, visible focus rings, buttons rather than clickable divs, and color is never the only signal (the overdue chip also has text).

### 8.4 Pure helpers (`lib/lead-utils.ts`)
Implement as pure functions so they are easy to test:
- `isDueToday(lead, now)`, `isOverdue(lead, now)`, `isPinned(lead, now)`
- `partitionLeads(leads, now) -> { pinned: LeadListItem[], others: LeadListItem[] }` implementing 4.3 and 4.4

---

## 9. Seed script (`packages/db/prisma/seed.ts`)

Run via `bun run db:seed`. Must be **idempotent** (delete all discussions and leads first, then insert) and use dates **relative to now** so the pinned/overdue states are always demonstrable.

Create at least 7 leads with 2 to 5 discussions each (except one):

| Lead | Status | Follow-up | Purpose |
|---|---|---|---|
| a | CONTACTED | today, later than now (e.g. now + 3h) | pinned |
| b | QUALIFIED | today, earlier than now (e.g. now - 2h) | pinned and overdue |
| c | PROPOSAL_SENT | 3 days ago | overdue in the main list (red) |
| d | NEW | tomorrow | future follow-up, not pinned |
| e | WON | none | closed won |
| f | LOST | an old date | proves WON/LOST never pin or go red |
| g | NEW | none, **zero discussions** | tests the empty "No discussions yet" state |

Use realistic names, companies, phone numbers, and notes (a sales conversation feel). Spread discussion `createdAt` over the past several days so "time ago" varies ("2 hours ago", "3 days ago"...). Log a summary of what was created at the end.

---

## 10. Docker Compose (bonus)

Goal: `docker compose up --build` starts everything from a clean clone.

- Services: `postgres` (existing), `backend`, `frontend`.
- `backend`: Dockerfile in `apps/backend`. Build context is the repo root (it needs workspace packages). It must generate the Prisma client, build `@leadflow/db`, build the backend, run `prisma migrate deploy` on start, then start the server. `depends_on: postgres` with `condition: service_healthy`.
- `frontend`: Dockerfile in `apps/frontend`. `NEXT_PUBLIC_API_URL` is inlined at build time, so pass it as a **build arg** (default `http://localhost:4000`, the URL the browser uses).
- Optional: an `ENV SEED=true` flag so the backend container seeds on first start. If you add it, document it.
- Add a root `.dockerignore` (node_modules, .next, dist, .env, .git, .turbo).
- Keep a second path working: local dev with only `postgres` in Docker (`bun run db:up`), as now.
- Verify with `docker compose up --build`, then open `localhost:3000`, and confirm the list loads.
- If Docker proves too time-consuming, leave the dev-only compose intact and say so in the README. Do not leave a broken compose file.

---

## 11. README and documentation

`README.md` must contain, in this order:
1. **LeadFlow**: one paragraph overview and a screenshot or GIF.
2. **Features**: bullets mapped to the assessment.
3. **Tech stack** and why (Bun + Turborepo, Next.js, Express 5, Prisma 7 + Postgres, TanStack Query, shadcn/ui, Zod shared package). Mention that the prompt preferred FastAPI and that Express was chosen deliberately for TypeScript end-to-end shared validation.
4. **Prerequisites**: Bun, Node 20+, Docker.
5. **Quick start (local dev)**: exact commands, verified from a clean clone.
6. **Quick start (Docker Compose)**.
7. **Environment variables**: table (name, example, used by, description), matching `.env.example`.
8. **Project structure**: what each app and package is for.
9. **API reference**: the table from 6.2 plus example requests (curl).
10. **Decisions and trade-offs**: follow-up clearing rule (4.2), "today" evaluated in the browser's timezone, WON/LOST never pinned, the `@leadflow/db` build approach, Prisma 7 notes, no auth, etc.
11. **Testing**: how to run tests (if any).
12. **AI usage disclosure**: be explicit and honest. State which tools were used (for example Claude / Claude Code), what they generated (scaffold, spec, implementation, README), and what was reviewed or modified by hand. Leave a short "Reviewed and verified by me" list for the author to fill in. Do not claim anything that did not happen.
13. **Demo**: link to the video, plus a `docs/` folder with screenshots of: list with pinned section, filter applied, timeline dialog, add lead dialog, overdue state.

`.env.example` must list every variable used anywhere (root, backend, frontend, docker), each with a comment.

---

## 12. Testing and verification

Minimal but meaningful, time-boxed:
- **Unit tests** (Vitest or `bun test`) for `partitionLeads` / `isOverdue` / `isDueToday` using a fixed `now`. Cover: due later today, due earlier today, previous day, tomorrow, null, WON/LOST.
- **API tests** (optional but valuable): `addDiscussion` follow-up rules from 4.2 (sets, clears when due, leaves unchanged when in the future) and 404 / 400 responses.
- **Manual smoke test**: run through the full flow in the browser and take the screenshots for the README.

Add a root `test` script and wire it into `turbo.json`.

---

## 13. Quality bar

- TypeScript strict, no `any` unless justified in a comment.
- No unused code, console logs, or commented-out blocks in the final tree.
- Consistent naming, small focused components, no business logic in JSX beyond rendering.
- Frontend never imports from `@leadflow/db`. Backend never contains Prisma schema or client setup.
- All inputs validated with the shared Zod schemas. No unvalidated `req.body` use.
- `bun run typecheck`, `lint`, `build` pass at every commit.

---

## 14. Order of work and commit plan

Do the phases in order. Each phase ends with a green check and a commit.

| # | Phase | Commit message |
|---|---|---|
| 1 | Shared Zod schemas and response types (6.1) | `feat(shared): add lead and discussion request/response schemas` |
| 2 | Backend services + controllers + routes + error handler additions (sections 6, 7) | `feat(backend): implement leads and discussions API` |
| 3 | Seed script (section 9) | `feat(db): add idempotent seed with realistic leads and discussions` |
| 4 | Frontend foundations: query keys, api-client functions, hooks, lead-status, lead-utils (+ unit tests) | `feat(frontend): add api hooks and lead utilities` |
| 5 | Lead list, status badge, filters, search, pinned section, states | `feat(frontend): add lead list with filters, search and pinned follow-ups` |
| 6 | Timeline dialog: history, status change, add discussion form | `feat(frontend): add lead timeline dialog` |
| 7 | Add Lead dialog and toasts | `feat(frontend): add new lead dialog` |
| 8 | Overdue styling, responsive polish, accessibility pass | `style(frontend): overdue highlighting and responsive polish` |
| 9 | Tests (section 12) | `test: cover follow-up rules and lead partitioning` |
| 10 | Docker Compose for the full stack (section 10) | `chore(docker): add full-stack compose setup` |
| 11 | README, `.env.example` audit, screenshots in `docs/` | `docs: complete readme, env example and screenshots` |

---

## 15. Final acceptance checklist

Verify each item from a **clean clone** (`git clone`, then follow the README only):

**Functional**
- [ ] List shows name, status badge, last note, and time ago for every lead
- [ ] Leads with a follow-up today appear in the pinned section, above everything else
- [ ] Clicking a lead opens a dialog (URL does not change)
- [ ] Timeline is newest-first
- [ ] Adding a note (with and without follow-up) updates the dialog and the list immediately
- [ ] A follow-up date on a note appears on the lead in the list
- [ ] Changing status in the dialog persists after a page refresh
- [ ] Add Lead works (name required; company and phone optional; status defaults to New)
- [ ] Status filter works for all six statuses plus All
- [ ] Search by name works (debounced)
- [ ] Overdue follow-ups are red; WON/LOST never are
- [ ] Empty, loading, and error states look right

**API**
- [ ] Correct status codes: 200, 201, 400, 404, 409, 500
- [ ] Error shape is always `{ error: { code, message, details? } }`
- [ ] Invalid UUID, invalid body, and unknown lead all behave correctly

**Delivery**
- [ ] `.env.example` complete; README steps work verbatim
- [ ] `docker compose up --build` works (or the README honestly says what is not covered)
- [ ] Seed gives 7 leads with a mix of pinned, overdue, future, won, lost, and empty-history states
- [ ] Git history shows the commits from section 14, with no stray files committed (`.env`, build output, tsbuildinfo)
- [ ] Screenshots or a video of the full flow are in the repo
- [ ] README AI-disclosure section is accurate and complete

When everything above is true, print a final summary: what was built, how to run it, deviations from this spec, and anything left undone.