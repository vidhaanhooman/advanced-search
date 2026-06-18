# Conversation Logs — Filtering Prototype

A front-end-only prototype of a **Conversation logs** page with a two-tier advanced
filtering toolbar. Built with **Next.js (App Router) + TypeScript + Tailwind CSS**.
All data is mocked (`lib/mockConversations.ts`) — there is no backend.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Deploy to Vercel

Zero-config — Vercel auto-detects Next.js.

**Option A — Git (recommended)**

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In the Vercel dashboard: **Add New… → Project → Import** the repo.
3. Accept defaults and **Deploy**.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel          # preview deployment (first run links/creates the project)
vercel --prod   # production deployment
```

No `vercel.json`, environment variables, or build overrides are required.

## Architecture

### Filter model

**Always-visible toolbar** (`components/Toolbar.tsx`)

- **Scoped search** — input with a leading field dropdown (Conversation ID /
  Provider call ID). Contains-match on the chosen field only.
- **Type segmented control** — All / Call / Web / Chat.
- **Date** — popover with preset pills (Last 24 hours, Today, Yesterday, Last
  7/30 days, This quarter) plus an **interactive time-selection chart**
  (`components/TimeRangeFilter.tsx`): a daily histogram with a draggable brush +
  edge handles, hover tooltip, and From/To inputs.
- **Filter** — opens the filter dropdown; badge shows the active count.

**Filter dropdown — single scroll** (`components/FilterPopup.tsx`)

A draggable dropdown anchored under the Filter button (drag the header grip;
dismiss on outside-click / Escape). Every filter is visible at once in one
scroll, grouped into sections, with a top "Search filters…" box and a live
"X of Y conversations match" count:

- **Agent** — agent multi-select with versions, plus agent-gated **Post call
  analysis** and **Context variables** inputs (locked until an agent is chosen).
- **Type** — Web / Chat / Inbound / Outbound icon chips (a combined
  channel+direction filter on the `channel` condition field).
- **Outcome & status** — Outcome, Call status, End reason chip multi-selects.
- **Metrics** — Call duration, Turns, Turn latency range sliders + Attempt pills.
- **Identity** — Caller (from), Callee (to), Campaign ID, Task ID (contains text).

Under the hood the state stays condition-based: a control lazily creates its
condition on first interaction (idempotent `ADD_CONDITION` + the mutation), so
chips, the active count, and serialization are unchanged. Each filter renders the
purpose-built control for its type (see below).

### Reusable components

- `components/RangeFilter.tsx` — distribution **histogram + dual-handle slider +
  Min/Max inputs** (Airbnb "Price Range" pattern). Bars inside the selection are
  highlighted. Reused by Call duration, Turns, Turn latency. Stored as an
  `op:"between"` range with open (null) bounds.
- `components/PillGroup.tsx` — `Any · 1 · 2 · 3 · 4 · 5 · 6+` segmented count
  pills (Airbnb "Rooms and Beds" pattern). Used by Attempt.
- `components/TimeRangeFilter.tsx` — interactive date-range chart: daily
  histogram + brush + edge handles + From/To inputs. Used by the toolbar Date
  popover.
- `components/MultiSelect.tsx` — menu-item / command-item multi-select with
  optional leading status dot + trailing count. Reused by Agent, Outcome, Call
  status, End reason.
- `components/FilterChip.tsx` — removable active-filter chip (dot + dim key /
  bright value).
- `components/Popover.tsx` — click-outside / Escape dismiss wrapper for toolbar
  dropdowns.

### State

All filter state lives in one serializable shape, `FilterState` (`lib/types.ts`) —
`search`, segmented `type`, `date`, and an ordered `conditions[]` list — driven by a
reducer (`lib/useFilters.ts`). The pure predicate `applyFilters` (`lib/filters.ts`)
maps that state to filtered rows, and `activeChips` derives the removable chip row.
The field catalog lives in `lib/catalog.ts`. Because each condition carries an
explicit field key whose paths mirror the backend document shape (e.g.
`callInfo.campaign`, `stats.latency.turn.avg`), the whole state can later be
serialized into query params and swapped onto a real API with no UI changes.

### Theming

Dark theme by default via CSS variables in `app/globals.css`. The variables hold
**`R G B` channel triplets** (e.g. `--surface: 20 20 20`) and are surfaced as
Tailwind tokens with `rgb(var(--x) / <alpha-value>)` in `tailwind.config.ts`, so
opacity modifiers like `bg-surface-2/60` work correctly. A `[data-theme="light"]`
override block shows how it could be re-themed.

> Note: editing `tailwind.config.ts` requires restarting the dev server to take
> effect. And don't run `next build` against the default `.next` while `next dev`
> is serving the preview — use `BUILD_DIR=.next-verify npm run build` instead, or
> the running dev server will 404 its CSS.
