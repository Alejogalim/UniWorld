# 33 — Finder glass dock: smaller, translucent, responsive inside

Branch: `feat/finder-glass-dock` (from main `ff41004`). Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ.

## Goal (one slice, demoable)
The Finder dock stays exactly what it is: the same bottom-right floating box, the same tabs at the bottom, the same hover-open / auto-collapse / pill, the same globe framing. It only gets **smaller**, becomes a **proper glass panel**, and every tab inside it **adapts to the dock's width** through container queries.

On 1920x1080 today the dock is about 920x540 and covers half the globe. After this plan it is 600x475 (about 43% less area).

## Do NOT (plan 32 was rejected for these)
- Do not move the dock: no right-docked full-height column, no tabs at the top, no change to the `px-4 py-6 sm:px-6` gap around it.
- Do not change open/close behaviour: no edits to the mouse/focus handlers, `AUTO_COLLAPSE_MS`, the motion props, `AnimatePresence`, the pill button.
- Do not touch the globe (`src/ui/globe/**`, the `globe` JSX, `GlobeView` props).
- No new strings, no i18n changes, no logic changes.

## Builder rules
- Touch ONLY these files: `src/ui/screens/Finder.tsx`, `src/ui/screens/finder/CountryPicker.tsx`, `src/ui/screens/finder/ScopePicker.tsx`, `src/ui/screens/finder/ResultRow.tsx`, `src/index.css`, `DESIGN.md` (owner-approved for this plan only), and this plan file (checkboxes + Builder notes).
- Minimal diff: change only the class strings named below. Another dev (Quan) edits these files: do not reformat, reorder imports, re-indent or "tidy" anything else. Every step is an exact string replacement.
- No commits, no branch switches. No `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- If a replacement's "old" text is not found exactly once, stop and write it under Builder notes; do not guess.

## Sizes (decided)
| | Today | After |
|---|---|---|
| Width | `min(92vw, 920px)` | `clamp(min(100%,320px), 32vw, 600px)` |
| Height | `clamp(300px, 54vh, 540px)` | `clamp(300px, 44vh, 480px)` |
| < 640px viewport (`max-sm:`) | 92vw wide | full width of the padded row (`w-full`), `h-[50vh]` |

Why: 32vw caps at 600px from a 1875px-wide window, so 1920x1080 gives 600x475 and the globe's centre stays clear. 1440x900 gives 461x396; 1280x800 gives 410x352; 1024 wide hits the 328px floor. The 320px floor keeps three tab labels and a country row legible; `min(100%, …)` stops the floor from overflowing a narrow parent. 480px cap / 300px floor keep a usable list + tab bar on tall and short windows. Under 640px the box spans the row (the row already has the 16px side gap) at half the screen height.

Container breakpoints used inside the dock (the frame is the `@container`; width = dock width):
- `@min-[480px]`: content padding goes from 12px to 16px.
- `@min-[560px]`: country list 2 columns (1 below); ResultRow puts the fit badges in a right column (stacked below).
- `@min-[680px]` (unchanged): Countries list/side-column split, Search filters/ember split. At the new max of 600px these always stack (side column under the list), which is what we want.
- `@max-[419px]`: tab icons hide so the three labels fit.

## Steps

### 1. `src/index.css` — the glass surface
- [x] Append this block at the very end of the file (after the last `}`), nothing else in the file changes:

```css
/* Finder dock glass (plan 33): a translucent panel over the globe. Static (no animated blur), so it is
   cheap under WebKitGTK software rendering. The edge is a hairline-based stroke plus a 1px top highlight;
   the shadow is the existing float shadow. No gradient. */
@layer components {
  .finder-glass {
    background-color: color-mix(in srgb, var(--panel) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--hairline) 70%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--panel) 85%, transparent),
      var(--shadow-float);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    backdrop-filter: blur(18px) saturate(1.4);
  }
  .dark .finder-glass {
    background-color: color-mix(in srgb, var(--panel) 58%, transparent);
    border-color: color-mix(in srgb, var(--hairline) 80%, transparent);
    box-shadow:
      inset 0 1px 0 var(--rim-top),
      var(--shadow-float);
  }
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .finder-glass { background-color: color-mix(in srgb, var(--panel) 94%, transparent); }
  }
}
```
Light: white at 60% over the warm paper/globe, a 70% hairline stroke, a white inner top line and the warm float shadow. Dark: `#0c0c0d` at 58%, the dark rim-top (16% white) as the inner top line.

### 2. `src/ui/screens/Finder.tsx`
- [x] 2a. `DOCK_FRAME` (line 43). Old:
  `'@container relative h-[clamp(300px,54vh,540px)] w-[min(92vw,920px)] max-w-full';`
  New:
  `'@container relative h-[clamp(300px,44vh,480px)] w-[clamp(min(100%,320px),32vw,600px)] max-w-full max-sm:h-[50vh] max-sm:w-full';`
- [x] 2b. `DOCK_PANEL` (line 47). Old:
  `'pointer-events-auto absolute inset-0 flex origin-bottom-right flex-col overflow-hidden rounded-lg border border-hairline bg-panel/85 shadow-float backdrop-blur-md';`
  New:
  `'finder-glass pointer-events-auto absolute inset-0 flex origin-bottom-right flex-col overflow-hidden rounded-lg';`
- [x] 2c. Update the comment on line 41 to: `/** The dock keeps a compact bottom-right footprint (plan 33); the panel scales inside it. */`
- [x] 2d. `searchControls` wrapper (line 236). Old: `className="flex h-full flex-col gap-4 overflow-y-auto p-4"` New: `className="flex h-full flex-col gap-4 overflow-y-auto p-3 @min-[480px]:p-4"`
- [x] 2e. `resultsPanel` wrapper (line 270). Old: `className="flex min-h-0 flex-1 flex-col overflow-hidden p-4"` New: `className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 @min-[480px]:p-4"`
- [x] 2f. Careers tab wrapper (line 418, the `<div>` directly inside `{tab === 'careers' && (`). Old: `className="min-h-0 flex-1 overflow-hidden p-4"` New: `className="min-h-0 flex-1 overflow-y-auto p-3 @min-[480px]:p-4"` (it must scroll now that the dock is shorter; many saved careers would otherwise be clipped).
- [x] 2g. Countries tab wrapper (line 429, the `<div>` directly inside `{tab === 'countries' && (`). Old: `className="min-h-0 flex-1 overflow-hidden p-4"` New: `className="min-h-0 flex-1 overflow-hidden p-3 @min-[480px]:p-4"`
  Note: 2f and 2g share the same old string; edit them one at a time by their surrounding lines.
- [x] 2h. Tab bar (line 456). Old: `className="grid shrink-0 grid-cols-3 gap-1 border-t border-hairline bg-panel/70 p-2"` New: `className="grid shrink-0 grid-cols-3 gap-1 border-t border-hairline p-2"` (the glass is one surface; the strip keeps its hairline).
- [x] 2i. Tab icon (line 482). Old: `<Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />` New: `<Icon className="size-4 @max-[419px]:hidden" strokeWidth={1.75} aria-hidden="true" />`
- Nothing else in Finder.tsx changes (not the pill, not the handlers, not the motion props, not the globe).

### 3. `src/ui/screens/finder/ScopePicker.tsx`
- [x] Line 32 (the root `<div>` in the return). Old:
  `className="grid h-full min-h-0 overflow-hidden @max-[679px]:overflow-y-auto @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)] @min-[680px]:gap-4"`
  New:
  `className="grid h-full min-h-0 gap-4 overflow-hidden @max-[679px]:overflow-y-auto @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]"`
  (Below 680px the chips + Selected column stack under the list; the gap now separates them in both layouts. The pane scrolls inside the dock.)

### 4. `src/ui/screens/finder/CountryPicker.tsx`
- [x] Line 118. Old: `'grid min-h-0 grid-cols-1 gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[520px]:grid-cols-2',` New: `'grid min-h-0 grid-cols-1 gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[560px]:grid-cols-2',`
- [x] Line 120. Old: `? 'flex-1 @max-[679px]:max-h-[38vh] @max-[679px]:flex-none'` New: `? 'flex-1 @max-[679px]:max-h-[clamp(160px,24vh,260px)] @max-[679px]:flex-none'`
  (38vh was taller than the whole content area of the new dock; with 24vh the list shows ~7 rows at 1080 and the region chips start just below it.)

### 5. `src/ui/screens/finder/ResultRow.tsx` — viewport breakpoints to container breakpoints
ResultRow is rendered only inside the dock (UniDetail imports only `factValue`), so `@min-` queries resolve against the dock.
- [x] Line 92 (row grid): replace `min-[720px]:grid-cols-[2.25rem_minmax(0,1fr)_11rem]` with `@min-[560px]:grid-cols-[2.25rem_minmax(0,1fr)_11rem]`.
- [x] Line 135 (badge column): replace each of `min-[720px]:col-span-1 min-[720px]:col-start-3 min-[720px]:row-start-1 min-[720px]:flex-col min-[720px]:items-end` with `@min-[560px]:col-span-1 @min-[560px]:col-start-3 @min-[560px]:row-start-1 @min-[560px]:flex-col @min-[560px]:items-end`.
- [x] Line 136: replace `min-[720px]:justify-end` with `@min-[560px]:justify-end`.
- After this, `grep -n "min-\[720px\]" src/ui/screens/finder/ResultRow.tsx` must print nothing.

### 6. Detail view
No change. `UniDetailView embedded` already wraps (`flex-wrap` header, scrolling body, `FactLine` uses `minmax(0,11rem)`), so it fits the 320px floor. Do not edit `UniDetail.tsx`.

### 7. `DESIGN.md` — Finder text
- [x] Replace the paragraph on line 297 (starts `The Finder is the one two-region screen:`) with:

  `The Finder is a full-bleed globe with one floating glass dock in the bottom-right corner. The dock is a container (`@container`) sized clamp(min(100%, 320px), 32vw, 600px) wide and clamp(300px, 44vh, 480px) tall, with the page's 24px gap (16px under 640px, where it spans the row and takes half the screen height). Its tabs (Careers, Countries, Search) sit along the bottom; it opens on hover or focus from a pill and folds back into the pill 900ms after the pointer leaves. The surface is `.finder-glass`: the panel colour at about 60% over an 18px backdrop blur with 1.4 saturation, a hairline stroke, a 1px inner top highlight and the float shadow; no gradient and nothing animated on the blur. Every tab adapts to the dock's width with container queries, never viewport breakpoints: 12px padding below 480px, a two-column country list and a right-hand fit column on result rows from 560px, and the region chips and Selected summary stack under the country list below 680px. Content scrolls inside the dock; nothing scrolls sideways. Results are a ranked column of rows, not a grid.`

- [x] On line 247 (`- **Shadow:** …`), change `is for popovers and dialogs.` to `is for popovers, dialogs and the Finder dock.`

## Verify
```bash
bun run build
bun run check:i18n
bun test
grep -n "min-\[720px\]" src/ui/screens/finder/ResultRow.tsx   # must print nothing
grep -n "finder-glass" src/index.css src/ui/screens/Finder.tsx # class defined + used
git diff --stat                                                 # only the 6 listed files + this plan
```
Paste the short results below. Then the orchestrator reads the diff and checks visually at 1920x1080 and at a narrow window (dark and light): same position/tabs/pill/behaviour, ~600x475 glass box, no horizontal overflow in any tab at the 320px floor.

## Builder notes
- Applied all steps 1-7 as exact string replacements (each old string matched exactly once). Steps 5 and DESIGN.md paragraph taken verbatim from this plan.
- `bun run build`: exit 0 (tsc + vite build; only the pre-existing chunk-size warning).
- `bun run check:i18n`: passed (en/es/vi match).
- `bun test`: 254 pass, 0 fail (26 files).
- `grep -n "min-\[720px\]" src/ui/screens/finder/ResultRow.tsx`: no output.
- `grep -n "finder-glass"`: defined in src/index.css (line 602), used in src/ui/screens/Finder.tsx (line 47).
- `git diff --stat`: DESIGN.md, src/index.css, Finder.tsx, CountryPicker.tsx, ResultRow.tsx, ScopePicker.tsx (plus this plan file). No other files touched.
- Not run (per plan): cargo check, `tauri dev`, visual check. The app was not started.
- Deviations: none.
