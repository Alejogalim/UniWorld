# 07 — University detail page, "Add to my list", Uni Manager (Design §7.3 detail, §7.4)

Read first: `.plans/A-build-conventions.md`, `DESIGN.md` (Fact Line, Panels & Rows, Inputs), `Design.md` §7.3 ("Detail page", "Add to my list") and §7.4, `src/core/contracts.ts` (`UniDetail`, `UniResult`, `Fact`, `TrackedStatus`), `src/ui/components/FactLine.tsx`, `src/ui/screens/finder/ResultRow.tsx` (route state shape), `src/app/router.tsx`.

## DB
- [x] 1. `tracked_uni` has no name/city columns. Add `src/db/migrations/002_tracked_names.sql`: `ALTER TABLE tracked_uni ADD COLUMN name TEXT;` and `ALTER TABLE tracked_uni ADD COLUMN city TEXT;`. Register it in `src-tauri/src/lib.rs` as `Migration { version: 2, description: "tracked_names", … }` after version 1 (do not modify migration 1 or `001_init.sql`).
- [x] 2. `src/store/tracked.ts` (A owns): type `TrackedUni { id, rorId, name, city, countryCode, programName, status: TrackedStatus, deadline: string | null /* YYYY-MM-DD */, requiredExams: string[], language: string | null, notes: string, addedAt, updatedAt }` and a Zustand store `useTracked` with `load()`, `add(input)`, `update(id, patch)`, `remove(id)`, `find(rorId, programName)`. All through `getDb()` with `$n` params; `updated_at` set on every change. `add` is idempotent per (rorId, programName case-insensitive): returns the existing row instead of duplicating.
- [x] 3. `src/ui/screens/myUnis/deadline.ts`: `parseDeadline(text: string | null): string | null` → first unambiguous date in the text as `YYYY-MM-DD` (handle ISO, "15 January 2027", "January 15, 2027", "15/01/2027" only when day > 12 makes it unambiguous; otherwise null). `daysUntil(iso, today)`. Unit tests in `deadline.test.ts`.

## Detail page (`src/ui/screens/UniDetail.tsx`, route `/finder/uni/:rorId`, replacing the placeholder)
- [x] 4. Inputs: `rorId` param; `location.state` may carry `{ uni: UniResult }` (from Finder) or `{ tracked: TrackedUni }` (from My Unis). Name/city/country/program come from whichever is present; if neither, show the rorId and program from `?program=` (Finder and My Unis must also put `?program=<programName>` in the URL so the page works without state).
- [x] 5. Load: `core.finder.detail(rorId, program)` (served from the 30-day cache when present); while loading show a `ProgressLine` "Reading the university's own pages…" — this can take 10–40s on a cold cache. **Refresh** (secondary, with icon) → `detail(rorId, program, { refresh: true })`. Errors → `ErrorNote` + "Try again"; `MissingKeyError` → key message + Settings button.
- [x] 6. Layout (page wrapper `px-12`, max 1120px, prose max 68ch): header = `Flag`, name (Headline), city + country (chart-grey), program (Title), "Last checked {{date}}" in mono using `detail.checkedAt` (localized date via `Intl.DateTimeFormat(uiLang)`). Actions top-right: Refresh (secondary) and **Add to my list** (primary). When already tracked: replace the primary with a quiet "In your list" + a link-style button to `/my-unis`.
      Sections separated by `Rule`s (no cards): Overview (prose), Program, Language of instruction, Tuition, Scholarships, Application deadlines (full text) + Next deadline, Required exams (`string[]` → list), Entry requirements (prose), How to apply (`applyUrl.value` rendered as an external link via `openUrl`, still with its source marker). **Every fact uses `FactLine`** so it carries its official/third-party tag, quote and link, and nulls read "Not found — check official site". Number the source markers sequentially down the page.
      A back control at the top-left (quiet, "Back") → `navigate(-1)`.
- [x] 7. **Add to my list**: `useTracked.add({ rorId, name, city, countryCode, programName: detail.program, deadline: parseDeadline(detail.nextDeadline.value), requiredExams: detail.exams.value ?? [], language: detail.languages.value?.join(', ') ?? null, status: 'considering', notes: '' })`, then show the "In your list" state (180ms swap, no toast library). Only sourced values are copied (if a fact's `sourceUrl` is null treat its value as null).

## Uni Manager (`src/ui/screens/MyUnis.tsx` + `src/ui/screens/myUnis/`)
- [x] 8. Dense table (DESIGN.md: rules, not cards), page wrapper `px-12`, scroll horizontally inside its own container if narrow. Columns: University (`Flag` + name Title + city/country chart-grey), Program, Language, Deadline, Exams, Status, Notes, actions.
      - **Sorted by nearest upcoming deadline** (soonest first; no deadline after those; past deadlines last).
      - Deadline cell: date `<input type="date">` styled like `Input`, plus a mono "in 12 days" / "passed" line. **Deadlines < 30 days away show a signal (magenta) badge** "12 days left" — the only magenta mark in the row.
      - Exams: `Badge`s + a quiet "Edit" turning them into a comma-separated input (Enter saves, Escape cancels).
      - Status: native `Select` with the 7 statuses in order Considering → Preparing → Applied → Waiting → Admitted / Waitlisted / Rejected (translated).
      - Language and program: inline editable text on click (same Enter/Escape behaviour).
      - Notes: a one-line preview; click expands an auto-growing `Textarea` that saves on blur.
      - Remove: quiet button with inline confirm ("Remove from your list?" Remove / Keep).
      - Clicking the university name opens `/finder/uni/<rorId>?program=<programName>` with `state: { tracked }` (detail comes from the cache).
      - Edits save immediately (optimistic update; on failure revert and show an `ErrorNote`).
- [x] 9. Empty state: "Your list is empty" + one line ("Open a university in the Finder and add it to your list.") + secondary button to `/finder`.
- [x] 10. i18n: new `myUnis` namespace and `detail` strings (put detail strings in `finder`), registered in `src/i18n/index.ts` and `scripts/check-i18n.ts`; all strings en/es/vi. Status names translated.
- [x] 11. Make sure Finder result rows navigate with `?program=` too (small edit in `ResultRow.tsx`).

## Slice checks
- Conventions' Verify passes, including `deadline.test.ts`.
- `cargo check` passes with migration 2; on a fresh launch of `tauri dev`, `sqlite3 ~/.config/com.uniworld.app/uniworld.db "PRAGMA table_info(tracked_uni)"` lists `name` and `city`.

## Builder notes
- Checks: `bun run build` passes; `bun run check:i18n` passes (5 namespaces, es and vi match en); `bun test` 138 pass, 0 fail (includes `deadline.test.ts`, 7 tests); `cd src-tauri && cargo check` passes.
- `tauri dev` (90s, WEBKIT_DISABLE_DMABUF_RENDERER=1): built and ran, no panic. Console errors were `__TAURI_INTERNALS__` undefined (plain-browser noise, expected). Startup DB shows `tracked_uni` with `name` and `city`.
- Not done: no click-through of the detail page or Uni Manager in a running window. Only launch and build were verified. Detail-page behaviour against a real `core.finder.detail` call (cold cache, missing key) is unexercised here.
- Deviations:
  - Step 6: no separate "Program" section. The program is a user-chosen string, not a sourced Fact, so it sits under the name in the header. All sourced facts use FactLine.
  - Step 6: Overview and Entry requirements are FactLine rows (label column plus value), not a wider prose block.
  - Step 4: if neither `uni` nor `tracked` is in router state, the name falls back to the rorId. Adding from that state would store the rorId as the name.
  - Step 8: the notes preview clamps to two lines. The table has min-width 56rem inside its own overflow-x container.
  - Step 2: `find` reads the in-memory list (synchronous). The detail and Uni Manager screens call `load()` on mount.
- Files: `src/db/migrations/002_tracked_names.sql`, `src-tauri/src/lib.rs` (migration 2), `src/store/tracked.ts`, `src/ui/screens/myUnis/deadline.ts` and `deadline.test.ts`, `src/ui/screens/UniDetail.tsx`, `src/ui/screens/MyUnis.tsx`, `src/app/router.tsx`, `src/ui/screens/finder/ResultRow.tsx`, `src/i18n/index.ts`, `src/i18n/locales/{en,es,vi}/{finder,myUnis}.json`, `scripts/check-i18n.ts`.
