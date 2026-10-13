# 002 — LeadFlow UI/UX v2 Log

Frontend-only pass (no DB / backend / API-contract changes). Assessment-required
behavior from `001_impl.md` is preserved; follow-up / partition rules (§4.2–§4.4)
are unchanged. Work is in `apps/frontend` (+ purely additive UI-side pure
helpers; no `packages/shared` changes were needed).

## 1. Summary

- Audited the app by static review (Docker daemon was down, so no live
  seed/dev/Playwright run — see §7 deviations); logged 15 bugs + 10 design
  issues with severities and fixes.
- Fixed all high/medium bugs: dialog-header fallback when the filter no longer
  matches, draft leaking between leads, stale/inconsistent "time ago" (`now`
  passed everywhere), long-text overflow (`break-words`/`min-w-0`), dialog
  small-screen/`dvh` overflow, Select-inside-Dialog z-index, Enter/double-submit
  handling, and layout-shift hardening.
- Established a token layer (CSS variables, light/dark), system-default
  `next-themes` toggle with no flash, tuned type scale + tabular numbers,
  redesigned rows (avatar chip, status badge, follow-up variants), sticky
  header/filter bar, day-grouped timeline with anchored form footer, matching
  skeletons, friendly empty/error states, 150–250 ms motion gated on
  `prefers-reduced-motion`, responsive 360→1920 px with max content width.
- Shipped 5 new frontend-only features on the existing API: quick follow-up
  actions, follow-up presets, pipeline summary + counts + overdue toggle, sort +
  density + persisted prefs, keyboard shortcuts + help dialog (plus undo toasts
  and row tel:/copy actions bundled into the row/dialog work).
- Parked backend-dependent ideas separately; `typecheck`/`lint`/`build` green,
  frontend unit tests green (17-test suite needs postgres, untouched backend).

## 2. Audit

Method: static review of every frontend file + `typecheck`/`lint` green
baseline; live Chromium run was impossible (Docker Desktop Linux engine
`Internal Server Error`, no postgres). Before screenshots are the v1 `docs/`
shots copied to `docs/ui-v2/before/`.

| ID | Where | What is wrong | Severity | Planned fix |
|---|---|---|---|---|
| B1 | `leads-screen.tsx` + `lead-timeline-dialog.tsx` (header reads live filtered list) | When the active filter/search no longer matches the open lead (or a mutation moves it out), `selectedLead` becomes `null`: header falls back to blank "Lead"/"Lead timeline", status + clear controls vanish mid-dialog, no crash but loss of context | high | Keep last-known lead snapshot as fallback header source; fetch single lead via existing `GET /api/leads/:id` for truth; show "outside current filter" hint, keep controls working |
| B2 | `add-discussion-form.tsx` (mounted per dialog, keyed only by `leadId` prop) | `note`/`followUp`/`errors` state persists when opening a different lead (draft leaks); same for AddLeadDialog Cancel path (resets, ok) vs timeline form (never resets on `leadId` change) | high | Key the form by `leadId` (`key={leadId}`) + reset effect on `leadId` change; same for timeline query |
| B3 | `add-discussion-form.tsx` `toLocalInputMin()` + ISO conversion | `min` recomputed every render (drifts while typing); `new Date(followUp)` on empty/invalid string yields `Invalid Date` → `toISOString()` throws inside `safeParse` path; past dates blocked by `min` but backend allows them (immediately overdue — legit for a rep) | med | Memoize `min` once per mount; guard invalid dates into field errors; keep `min` as hint only, allow manual past entry |
| B4 | `add-discussion-form.tsx`, status `Select`, Clear button | Double-submit race only guarded by `isPending` on Save; `Enter` in textarea correctly inserts newline but no `Cmd/Ctrl+Enter` shortcut; status `Select` + Clear have no undo | low/med | Disable all submit paths while pending; add `Cmd/Ctrl+Enter` to save; undo toasts for status + clear (Phase D) |
| B5 | `leads-screen.tsx` (two `useLeads` subscriptions) + `lead-list.tsx` pinned section | Header and list each subscribe `useLeads(filters)` (duplicate queries, flicker on filter change despite `keepPreviousData`); pinned section mount/unmount shifts layout; `aria-busy` with no skeleton | med | Lift to single query (pass data down) or accept TanStack dedup; reserve section space, sticky section headers, skeleton that matches row layout |
| B6 | `status-filter.tsx` (`flex flex-wrap gap-1.5`, 7 buttons) | On 360 px the 7 filter buttons wrap into 3–4 rows pushing the list far down; no horizontal-scroll alternative; search + filters not sticky | med | Horizontally scrollable chip row on mobile (`overflow-x-auto`, `scrollbar-none`), sticky filter bar under header |
| B7 | `select.tsx` (`SelectContent` `z-50`) inside `dialog.tsx` (`z-50`) | Select dropdown portals at the same z as the dialog overlay/content — can render under the overlay depending on DOM order; status change becomes unusable in the dialog | med | Bump dialog-scoped `SelectContent` to `z-[70]` (overlay stays `z-50`) |
| B8 | `lead-row.tsx` `followUpLabel(lead)` (no `now`) vs `isOverdue(lead, now)`; `use-now.ts` (`new Date()` initial) | Same row can show "Today" chip + overdue border (or vice versa) — two different "now"s; SSR initial `new Date()` differs server/client → hydration mismatch on "time ago"/"Today" | high | Pass the single ticking `now` into every helper; render relative times only after mount (or `suppressHydrationWarning` on time nodes) |
| B9 | `lead-row.tsx` (name/company `flex-wrap`, last-note `line-clamp-2`), `timeline-item.tsx` (`whitespace-pre-wrap`) | 120-char name pushes badge off-row; 2000-char no-spaces note overflows (no `break-words`/`overflow-wrap:anywhere`); no-spaces company/phone breaks layout; dialog title overflows | high | `min-w-0` + `break-words`/`overflow-wrap:anywhere` on name/note/company/phone/title; clamp + `truncate` discipline |
| B10 | `lead-timeline-dialog.tsx` (`max-h-[90vh]`, `flex-1 overflow-y-auto` body, footer form) | On small screens / with mobile keyboard the footer form can be pushed out of view; `90vh` (not `dvh`) mis-sizes on mobile Chrome; very long headers squeeze the timeline to zero height | med | `max-h-[92dvh]`, `min-h-0` discipline, scrollable middle + anchored footer, responsive padding, `inputMode`/`scrollIntoView` care |
| B11 | Focus management (Radix default) + rows as `<button>` | `Esc` closes (Radix ok), `Enter`/`Space` opens (native button ok), but focus does not reliably return to the clicked row after close (row may have re-sorted/unmounted); no arrow-key/`/`/`N` navigation | med | Persist last-trigger ref, restore focus on close; add `J`/`K` + `/` + `N` + `?` shortcuts with help dialog (Phase D); roving `tabIndex` not needed (buttons already tabbable) |
| B12 | `layout.tsx` `<Toaster richColors closeButton />` (default bottom) | Toasts cover the dialog footer form on mobile; success/error toasts stack over the Save button | low | Move toaster to `top-center` on small screens (or `top-center` globally), offset from header |
| B13 | Spacing/radii/shadow discipline | `rounded-lg` everywhere, `shadow-xs` only on rows, amber-50 pinned wash vs card borders — no token layer, ad-hoc values | med | Token layer (`--radius-*`, `--shadow-*`, `--space-*`) + consistent application (Phase C) |
| B14 | `lead-status.ts` badge colors + overdue `text-red-600` | Amber/violet/blue `100`-on-`800` pairs are close in lightness; dark-mode `950`-on-`200` unverified for AA; overdue red relies on border + text (good — not color-only) but `LOST` rose vs overdue red may look alike | med | Keep text+icon+words (never color-only); tune tokens for AA in both themes; `LOST` stays muted rose with distinct label |
| B15 | Loading/empty/error copy + skeleton fidelity | Skeletons are generic blocks (not row-shaped); empty states terse; error shows raw API message; no live-region announcement for list updates | low | Row-shaped skeletons, friendly microcopy, `role="status"`/`role="alert"` discipline (Phase C) |
| D1 | No dark mode / theme system | Light-only gray theme; `.dark` CSS exists but nothing toggles it | high | `next-themes` (system default) + header toggle, no flash (`suppressHydrationWarning` + script) |
| D2 | Typography | Default system stack, no scale, proportional figures in counts/times (jitter) | med | Tuned stack (system + `next/font` avoided — offline build risk), explicit scale, `tabular-nums` on counts/times |
| D3 | Lead rows | Flat button-cards; name/company/badge hierarchy weak; no avatar; meta line cramped | med | Avatar/initials chip, clearer hierarchy, tidy meta line, follow-up chip variants (Today/Overdue/Upcoming) |
| D4 | Header + filter/search area | Plain title + button; filter/search stack unaligned, not sticky | med | Sticky header bar, aligned search + filter + sort + density row, pipeline summary strip |
| D5 | Filter chips | No live counts; active state only `default` vs `outline` | med | Counts on chips (from unfiltered cache), active ring, scrollable row |
| D6 | Timeline | Plain bordered boxes, no vertical rail/dots, no day grouping | med | Vertical rail + dots, sticky day labels, grouped newest-first |
| D7 | Empty/loading/error states | Generic; skeletons mismatch | low/med | Matching skeletons, friendly copy, Retry |
| D8 | Motion | Only `animate-pulse`; no dialog/list/item transitions | low | 150–250 ms transitions, `prefers-reduced-motion` off-switch |
| D9 | Content width | `max-w-3xl` wastes 1280/1920 px | low/med | `max-w-5xl` (list) with comfortable measure, dialog `sm:max-w-xl` |
| D10 | Microcopy | "Lead timeline", "No discussions yet." — terse | low | Rep-flavored copy ("Log a call", "No activity yet — log the first touch") |

Before screenshots: `docs/ui-v2/before/` (copies of v1 `docs/*.png`).
Console/hydration: no live run possible; B8 mitigates the known `useNow`
SSR/`time-ago` mismatch by construction (single `now`, mount-guarded times).

## 3. Design direction

Calm, rep-first, "inbox for follow-ups": soft neutral surfaces with one warm
amber accent reserved for *today*, one unambiguous red reserved for *overdue*,
status hues kept muted so follow-up state always wins. Type scale
12/14/16/20/24 with 16 px base and 20 px semibold titles; tabular numerals for
every count and timestamp; 4 pt spacing rhythm (`space-1…6` only) and 8 px
card padding on mobile / 16 px on desktop. Color tokens as CSS variables
(`--background/foreground/card/muted/border/ring`, `--followup-today`,
`--followup-overdue`, `--shadow-sm/md`, `--radius-sm/md/lg: 6/10/14 px`);
light and dark palettes both tuned for WCAG AA (no color-only signals —
every state also has icon + words). Radius 10 px cards / 999 px pills,
`shadow-sm` resting / `shadow-md` dialogs, sticky header + filter bar with
`backdrop-blur`, 180 ms ease-out transitions for dialog/list/new-item,
fully disabled under `prefers-reduced-motion`.

## 4. Phase-by-phase log

### Phase A — Audit → (this file; no code changes)

- Files read: `README.md`, `implementation.md`, `001_impl.md`, every file under
  `apps/frontend/{app,components,hooks,lib}` + `packages/shared/src/schemas.ts`.
- Verified: `bun run typecheck` green, `bun run lint` green (13.6 s).
  Live `db:seed`/`dev`/Playwright skipped — Docker Desktop Linux engine
  returns `Internal Server Error` (`docker ps` fails), so no postgres.
- Wrote this audit table; copied v1 shots to `docs/ui-v2/before/`.
- How verified: `git status` clean apart from `docs/ui-v2/before/` +
  `002_impl.md`; typecheck + lint replayed green.

### Phase B — Fix UI bugs → `6edf285` (+ `8e9d302` helpers)

**`8e9d302` feat(frontend): add follow-up presets, sorting, grouping and view-prefs helpers**
Pure-logic groundwork with 17 unit tests (no UI change):
`lib/followup-presets.ts` (tomorrow/in-3-days/next-Monday 9am, +1h, +7d,
`datetime-local` round-trip), `lib/lead-sort.ts` (`activity|name|followup`,
pinned ordering untouched), `lib/timeline-group.ts` (day grouping with
Today/Yesterday labels), `lib/view-prefs.ts` (sanitizing parser + localStorage).
Verified: `tsc` clean, `eslint` clean, `bun test` 28/28.

**`6edf285` fix(frontend): dialog header fallback, form reset, timestamp consistency, overflow**
- B1: snapshot fallback + new `useLead` (`GET /api/leads/:id` via new
  `getLead` api-client fn) + "outside current filter" hint; status/clear keep working.
- B2: `AddDiscussionForm` keyed by `leadId` so drafts never leak between leads.
- B3: `min` hint memoized per mount; invalid dates become field errors (no throw).
- B4: double-submit guard + `Ctrl/Cmd+Enter` to save (plain Enter still newlines).
- B7: dialog `SelectContent` bumped to `z-[70]`.
- B8: single ticking `now` passed into every helper; new `TimeAgo` renders
  absolute pre-mount (no hydration mismatch) then relative.
- B9: `min-w-0` + `break-words`/`break-anywhere` on name/note/company/phone/title.
- B10: dialog `max-h-[92dvh]`, `min-h-0` scroll region, anchored form footer.
- B5/B11/B12/B13–B15 groundwork: row-shaped skeletons, `role="status"`/`alert`,
  toaster moved to `top-center`, `tabular-nums`, `animate-enter`.
Verified: `tsc` + `eslint` clean, `bun test` 28/28 (existing 11 untouched).

### Phase C — Visual elevation → `0fc44f0` (tokens/chrome) + `6edf285` (row/timeline visuals)

**`0fc44f0` style(frontend): tokens, dark theme, header, pipeline summary and view controls**
- Token layer in `app/globals.css` (color/radius/shadow vars, light + dark AA
  palettes, focus-visible ring, `scrollbar-none`, 180 ms `animate-enter`,
  `prefers-reduced-motion` kill-switch); `next-themes` provider (system
  default, `suppressHydrationWarning`, no flash) + header `ThemeToggle`.
- Sticky blurred header with live "N due today · M overdue" subtitle, `max-w-5xl`
  content, scrollable filter-chip row with live counts, sort `Select`, density
  segmented control, overdue toggle; `docs/ui-v2/before/` seeded from v1 shots.
- New: `theme-provider/toggle`, `pipeline-summary`, `quick-followup`,
  `shortcuts-dialog`; `next-themes@0.4.6` added to `apps/frontend`
  (a `bun add --filter` mishap briefly put it in the root `package.json` —
  caught in review, moved before committing).
Verified: `tsc` + `eslint` clean; `next build` compiles (21.7 s) and
prerenders 5/5 static pages.

Row/timeline visuals (shipped in `6edf285`): avatar/initials chip, hierarchy
(name + badge / company·phone meta / clamped note / time + follow-up chip
variants Today-amber / Overdue-red / Upcoming-muted), `tel:` + copy-phone
hover actions (separate tab stops, not nested in the row button), day-grouped
timeline with rail + dots + sticky day labels, dashed "No activity yet" empty
state, friendly list empty/error copy.

### Phase D — New features → `8e9d302` (logic) + `6edf285`/`0fc44f0` (UI)

Feature→commit map (one logical group per commit; shared files made per-feature
commits impractical — see §7):
- F1 snooze + F6 undo: `quick-followup.tsx` + dialog Clear/status undo toasts
  (`0fc44f0`, `6edf285`); PATCH-only, previous-value restore.
- F2 presets: `FOLLOW_UP_PRESETS` row in the note form (`6edf285`).
- F3 pipeline + F12 overdue: `pipeline-summary.tsx` + counts query + chips
  (`0fc44f0`); counts from cached unfiltered list, client-side only.
- F4 sort + F7 density/prefs: `lead-sort` + toolbar + `view-prefs`
  (`8e9d302`, `0fc44f0`); sort applies to non-pinned only (§4.4 preserved).
- F5 shortcuts: key handler + `shortcuts-dialog.tsx` (`0fc44f0`).
- F8 tel:/copy: row corner actions (`6edf285`).
Each has empty/loading/error coverage (inherited list/dialog states),
keyboard access (buttons/selects/shortcuts), mobile layout (stacked toolbar,
scrollable chips), and README bullets. New pure logic covered by the 17 tests.
Verified: required flows re-checked by code path (pinned order, add note ±
follow-up, status persistence, add lead, filters, search, overdue red —
all on unchanged endpoints/rules), `tsc`/`eslint`/`build` green.

### Phase E — QA + docs → `cc9d1b1` (log) + follow-ups below

### Follow-up 1 — Timeline rail fix → `79205ec`

User screenshot showed the rail floating left of the dots: the rail was a
`border-l` on the `<ul>` (x 0–2 px) while dots sat at x 5 px and cards at
x 24 px — rail | gap | dot | gap | card. Fix: per-item rail segments
(`left-[9px] w-[2px]`, center x = 10 px = dot center) with `pb-2 last:pb-0`
so segments join into one continuous line; the `<ul>` border was removed.
Verified: `tsc` + `eslint` clean, `bun test` 28/28.

### Follow-up 2 — Approved theme: Linear Dark → `5bf71cf`

User picked **Linear Dark** from 4 researched options (Linear Dark, Attio
Light, Stripe Clean, Pipeline Green; grounded in a web round-up of
Linear/Attio/Stripe/Pipedrive/HubSpot CRM patterns). Applied:
- Inter Variable via `@fontsource-variable/inter` (self-hosted woff2, no
  build-time network fetch — keeps the offline-safe decision), 14 px base,
  `cv11`/`ss01` features, tabular numerals on counts/times.
- Near-black neutrals, single indigo accent (`oklch(0.53 0.15 277)` light /
  `oklch(0.65 0.14 277)` dark) for interactive elements, hairline borders
  instead of shadows for layering (dark `shadow-sm` removed), tight 4/6/8 px
  radii via the existing token vars (no component changes needed).
- Status badges restyled to dot + translucent tint (no saturated fills), so
  amber-today / red-overdue always win; text tones kept at AA.
- Amber/red follow-up semantics unchanged. Both light and dark palettes ship;
  toggle stays in the header.
Verified: `tsc` + `eslint` clean, `bun test` 28/28, `next build` 5/5 static
pages (font bundles locally).

- Re-audit disposition: B1–B10 Fixed; B11 partially (focus restore + J/K done,
  full roving-tabindex not needed — native buttons suffice); B12–B15 Fixed;
  D1–D10 Fixed.
- Required-flow re-verification is static (no live DB): every flow traces to
  an unchanged endpoint + preserved partition code; `lead-utils` tests still 11/11.
- `bun run typecheck` ✅ (7 tasks), `bun run lint` ✅ (4 tasks),
  `bun run build` ✅ (5 tasks, 5/5 static pages), frontend `bun test` ✅ 28/28.
  Full `bun run test` (backend 6) and `docker compose up --build` skipped —
  Docker daemon down (see §7).
- `docs/ui-v2/after/`: no live captures possible; v1 `docs/*.png` still depict
  the core flow; refresh owed with Docker back.
- README: features list, "UI/UX v2" section, shortcuts table, testing note,
  AI-disclosure v2 paragraph.

## 5. Feature candidates, scoring, picks

| # | Candidate | Value (sales rep) | Existing-API only? | Effort | Risk | Verdict |
|---|---|---|---|---|---|---|
| F1 | Quick follow-up actions on row/dialog: Snooze +1h / Tomorrow 9am / Next week / Clear (PATCH `nextFollowUpAt`) | High — the core daily loop, one click | Yes | Low | Low | **PICK** |
| F2 | Follow-up presets in the note form (Tomorrow, In 3 days, Next Monday) next to the date picker | High — removes date-picker friction when logging | Yes | Low | Low | **PICK** |
| F3 | Status filter chips with live counts + pipeline summary strip (counts/status, today, overdue) doubling as filter | High — glanceable pipeline, faster triage | Yes (counts computed client-side from cached lists) | Med | Low | **PICK** |
| F4 | Sort control (Recent activity, Name, Next follow-up) within the non-pinned section | Med-high — 30-lead list needs ordering | Yes (pure) | Low | Low | **PICK** |
| F5 | Keyboard shortcuts (`/` search, `N` new, `J`/`K` move, `Enter` open, `Esc` close) + `?` help dialog | Med-high — speed for heavy users | Yes | Med | Low | **PICK** |
| F6 | Undo toast for status change + clear follow-up (PATCH back previous value) | Med — safety net for mis-clicks | Yes | Low-med | Low | **PICK (bundled)** |
| F7 | Density toggle (comfortable/compact, `localStorage`) + persisted view prefs (filter/sort/density/theme in URL + `localStorage`) | Med — personal fit, survives refresh | Yes | Low | Low | **PICK (bundled with F4)** |
| F8 | Row quick actions: `tel:` link + copy-phone on hover/focus | Med — one-tap calling from list | Yes (no API use) | Low | Low | **PICK (bundled into row polish)** |
| F9 | Inline editing of name/company/phone in dialog header (PATCH) | Med — fixes typos without leaving context | Yes | Med | Low-med | REJECT (time; PATCH shape allows it but header-edit UI + validation doubles dialog scope — park as follow-up) |
| F10 | Board (kanban) view with drag → PATCH status | Med — nice overview, but list already triages by follow-up; drag needs keyboard alternative | Yes | High | Med (regression risk on pinned/partition rules) | REJECT (effort + risk; list + pipeline strip covers triage) |
| F11 | Relative/absolute time toggle + day-grouped timeline + char-counter color | Low-med — polish, grouping already planned in C | Yes | Low | Low | REJECT as standalone (day grouping + counter color folded into Phase C; toggle adds prefs surface for little gain) |
| F12 | Overdue-only quick filter toggle | Med — "what needs me now" in one tap | Yes (pure client filter) | Trivial | Low | **PICK (bundled with F3)** |

Picks: F1, F2, F3 (+F12), F4 (+F7), F5, F6/F8 bundled. Rejections: F9 (scope),
F10 (effort/risk), F11 standalone (folded into C).

## 6. Parked ideas (need backend)

- Server-side pagination / virtualized list (30+ leads fine today; 1000+ needs `?limit=&cursor=`).
- Full-text search across notes (today `search` covers name/company only).
- Discussion edit/delete (spec out-of-scope; needs `PATCH/DELETE /discussions/:id`).
- Real reminder notifications (email/push) for follow-ups.
- Multi-user assignment + activity feed (needs auth/users).
- Follow-up time-of-day defaults per rep (needs user settings storage).
- Duplicate-lead detection on create (needs server-side fuzzy match).

## 7. Deviations from these instructions

- **Feature commits share files:** the brief asks one `feat(frontend)` commit
  per feature, but snooze/presets/pipeline/sort/shortcuts all touch the same
  screen/dialog/row files as the bug-fix + redesign passes. Splitting them
  would have meant artificial intermediate states; instead features landed in
  three truthful Conventional Commits (`8e9d302` logic, `6edf285` dialog/rows,
  `0fc44f0` chrome) with the feature→commit map in §4.
- **No live app run / Playwright screenshots:** Docker Desktop's Linux engine
  is down (`Internal Server Error` on `docker ps`), so `db:up`/`db:seed`/`dev`
  and scripted Chromium (360/390/768/1280/1920, hostile data, keyboard,
  console checks) were impossible. Audit is static + baseline green
  (`typecheck`, `lint`); before-shots reuse v1 `docs/*.png`; after-shots,
  the `docker compose up --build` check and the full 17-test DB run are owed
  once Docker is back (recorded in §9).
- **`@leadflow/shared` untouched:** no additive UI-side type was needed; all
  new logic lives in `apps/frontend/lib/`.
- **Font:** single tuned system stack instead of `next/font` webfont — avoids a
  network fetch at build time (offline-safe) with an explicit scale +
  `tabular-nums`; documented as a decision, not a regression.
- **`test` without postgres:** backend API tests need a live DB; with Docker
  down only frontend unit tests run (28/28). Backend code is untouched so its
  6 tests are unaffected by construction.

## 8. New dependencies added

| Name | Why |
|---|---|
| `next-themes` | Light/dark/system theme with no-flash SSR support + header toggle (Phase C requirement) |
| `@fontsource-variable/inter` | Self-hosted Inter Variable (approved Linear-Dark theme); woff2 bundled at install time, no build-time network fetch |

(`cmdk` deliberately NOT added — shortcuts are a lightweight key handler +
`?` dialog; no palette ranking needed. No animation library — CSS
transitions only.)

## 9. Known issues left

- Live-browser verification owed (Docker down): scripted Chromium widths,
  hostile-data layout, keyboard-only walkthrough, console/hydration check,
  `docs/ui-v2/after/` captures, `docker compose up --build`, full `bun run test`.
- Counts query adds one cached `GET /api/leads` (ALL/empty) alongside the
  filtered list — cheap and deduped by TanStack, but two list requests exist.
- `J`/`K` navigation drives real DOM focus (good for screen readers) but has no
  visible "position" indicator beyond the focused ring + `aria-current`.
- Quick-action phone buttons appear on hover/focus; on touch devices they are
  always reachable by tapping the row open first (phone also in dialog header
  as a `tel:` link) — acceptable, flagged for a tap-target review on device.

## 10. How to verify

```bash
bun install
bun run typecheck
bun run lint
bun run build
bunx --filter @leadflow/frontend bun test   # pure-logic tests, no DB needed
# Full suite (needs postgres — Docker down in this env, skipped here):
# bun run db:up && bun run db:migrate && bun run db:seed && bun run test
```

Manual script (reviewer): open the app, confirm pinned-on-top + overdue-red
(except WON/LOST), open a timeline (dialog, newest-first), add a note with
and without follow-up (list updates instantly), change status (persists after
refresh), Add Lead, filter each status + search, clear filters, toggle theme,
sort, density, snooze actions, presets, shortcuts (`/`, `N`, `J`/`K`,
`Enter`, `?`), undo toasts, 360 px mobile layout, dark mode. Zero console
errors expected.

Before: `docs/ui-v2/before/` · After: `docs/ui-v2/after/` (Phase E).
