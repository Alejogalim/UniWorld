# 27 — My universities: calm list grouped by what's next, editing in a side panel

Rules: Haiku builds, no commits, no pkill/killall, don't start the app. Touch only: `src/ui/screens/MyUnis.tsx` (may split into `src/ui/screens/myUnis/*.tsx`), `src/ui/screens/myUnis/deadline.ts` (+ its test if helpers change), `src/i18n/locales/{en,es,vi}/myUnis.json`, `DESIGN.md` (Uni Manager / My universities section). Keep `useTracked`, `TrackedPatch`, `sortByDeadline` (exported; keep it working), the empty/load/error states, and `openDetail` navigation. Do not change the global `.screen-title`.

## Why (current problems)
Eight equal columns; every cell is a permanent form control (date box, status select, chips, Edit, Remove on every row); program/language/name all underlined; status has no visual meaning (Admitted looks like Rejected); a generic KPI strip; mm/dd dates. It reads like an admin spreadsheet.

## 1. Layout: three groups, no table
Replace the `<table>` and the stat strip with sections, each a `<section>` with a small heading (`text-xs font-medium uppercase tracking-wide text-chart-grey`, count after it in tabular nums, e.g. "Due soon · 2") and a ruled list (`<ul>`, rows separated by `border-b border-hairline`):
- **Due soon**: deadline ahead and < 30 days (use existing `isUrgent`/`daysUntil`), status not admitted/rejected.
- **In progress**: every other non-decided row (no deadline, deadline ≥ 30 days, or passed but not decided).
- **Decided**: status `admitted` or `rejected`.
Within each group sort with `sortByDeadline`. Hide empty groups.

Above the groups, one line instead of the stat strip (only if a Due-soon row exists): `text-sm text-chart-grey` "Next: **{{name}}** closes in {{count}} days" (name in foreground, the days in `text-signal`). Key `next.line` with plural `_one/_other`; use the `<Trans>` component or split keys so the name can be bold.

## 2. One row = three zones (CSS grid `grid-cols-[minmax(0,1fr)_10rem_9rem]`, gap-6, py-4, items-start; whole row is a `<button>` that opens the panel, full width, text-left, `hover:bg-shoal/50 rounded-control -mx-3 px-3`, focus-visible outline signal; `aria-label` "Edit {{name}}" — new key `row.edit`)
- **Left**: line 1: `Flag` + name (`text-base font-semibold text-foreground`, NO underline). Line 2 (`text-sm text-chart-grey`, truncate): `program · city · language` (skip missing parts; language via `languageName`). Line 3 only if exams exist (`text-xs text-chart-grey`): exams joined with " · ". Line 4 only if notes (`text-xs text-chart-grey italic? no — plain`, `line-clamp-1`).
- **Middle (deadline)**: primary = relative: "in N days" (`text-sm font-medium`, `text-signal` when urgent, else foreground), "Today", or "Closed" (muted) when passed, or "No deadline" (muted, `text-chart-grey`). Secondary (`text-xs text-chart-grey tabular-nums`): the date formatted with `Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })` (e.g. "1 Dec 2026"). Keys: `deadline.inDays_one/_other`, `deadline.today`, `deadline.closed`, keep `deadline.none`.
- **Right (status)**: a dot (`size-2 rounded-full`) + label `text-sm`. Dot colours: admitted `bg-evidence`; rejected `bg-chart-grey`, label muted; waiting/waitlisted `bg-[var(--ember-2)]`; applied `bg-foreground`; considering/preparing `bg-hairline`. Not a select.
- Remove the Remove button, Edit links, chips, the Actions/Notes/Language/Exams columns and all underlines.

## 3. Side panel (editing)
New component `UniPanel` (in `src/ui/screens/myUnis/UniPanel.tsx`): a right drawer `fixed inset-y-0 right-0 z-50 w-full max-w-[26rem] bg-panel border-l border-hairline shadow-xl p-6 overflow-y-auto`, plus a backdrop `fixed inset-0 z-40 bg-black/30`. `role="dialog" aria-modal="true" aria-labelledby` the uni name heading. Escape and backdrop click close it; focus moves to the close button on open and returns to the row on close; simple focus trap (Tab cycles within). Fade/slide 180ms, none under reduced motion (framer-motion `useReducedMotion`, already used in the app).
Contents, top to bottom, each with a small label (`text-xs text-chart-grey`):
- Header: Flag + name (`type-title` or `text-xl font-semibold`), city, a close button (lucide `X`, aria-label new key `panel.close`), and a quiet link button "Open university page" (reuse `open` key) calling `openDetail`.
- Program (Input), Language (Input), Deadline (`<Input type="date">`), Status (existing `Select` with all 7 statuses), Required exams (Input, comma separated, reuse `exams.placeholder`/`exams.hint`), Notes (Textarea).
- Saving: same behaviour as today — each field saves on blur / change via `save(id, patch)` (reuse the existing save/parse logic from the current inline editors; read them before deleting).
- Footer: Remove (destructive quiet button) with the existing two-step confirm (`remove.confirm`, `remove.confirmButton`, `remove.keep`); after removing, close the panel.
Only one panel open at a time (`selectedId` state in the screen).

## 4. i18n
Add keys (en; translate es/vi naturally): `groups.dueSoon` "Due soon", `groups.inProgress` "In progress", `groups.decided` "Decided", `next.line_one/_other`, `deadline.inDays_one` "in {{count}} day", `deadline.inDays_other` "in {{count}} days", `deadline.today` "Today", `deadline.closed` "Closed", `row.edit` "Edit {{name}}", `panel.close` "Close", `panel.program` "Program", `panel.language` "Language", `panel.deadline` "Deadline", `panel.status` "Status", `panel.exams` "Required exams", `panel.notes` "Notes". Remove keys that become unused (`columns.*`, `summary.*`, `exams.edit`, `inline.*`, `notes.done` etc.) only if nothing references them (grep).

## 5. DESIGN.md
Rewrite the My universities / Uni Manager section to describe: grouped list (Due soon / In progress / Decided), three-zone rows, relative deadlines with ember only for < 30 days, status dots and their colours, side-panel editing, no underlines, no KPI strip.

## Verify (report output)
`bun run build`, `bun run check:i18n`, `bun test`. Grep that `<table` no longer appears in MyUnis.tsx.
