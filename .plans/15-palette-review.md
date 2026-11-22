# 15 — Review of plan 14 (Ember palette), uncommitted working tree on feat/a-ui

## Summary

The palette lands cleanly. Tokens in `src/index.css` match the plan (one documented deviation: light hairline `#c2c2c2`). There are no old-palette literals left, no hard-coded colors in `src/**/*.ts(x)` beyond the two allowed globe literals, and every gradient or glow is in a place the plan allows. Globe re-skin on theme switch is correct and cannot hit the oklch/color-mix conversion problem, because every token the globe reads is now a plain hex value (the canvas conversion is a no-op round trip). DESIGN.md matches the CSS values and names.

Verification: `bun run build` passes, `bun run check:i18n` passes, `bun test` 159 pass / 0 fail, `cargo check --offline` passes.

Real problems are small: one contrast miss (light `--signal` as 12px text on the page background, 4.46:1), dark hairline on `--shoal` at 1.46:1, a `--shoal` step that is almost invisible against panel/background, a few plan deviations that are documented in Builder notes but should be acknowledged, and a visual check still owed for the welcome glow. No blockers.

Counts: 0 blocker, 2 important, 7 minor.

## Independent contrast measurements

Script: `/tmp/claude-1000-contrast.mjs` (WCAG 2.x, values read from `src/index.css`). All numbers agree with the builder's table; the extra pairs below are the ones the builder did not list.

| pair | ratio | target | result |
|---|---|---|---|
| light ink / chart-grey on background and panel | 17.22 / 19.80, 5.21 / 5.99 | 4.5 | pass |
| dark ink / chart-grey on background and panel | 21.00 / 19.55, 6.44 / 6.00 | 4.5 | pass |
| light text on signal (white on #c93a05) | 5.13 (hover 6.83) | 4.5 | pass |
| dark text on signal (black on #ff6a2b) | 7.35 (hover 8.99) | 4.5 | pass |
| light signal on panel / **background** | 5.13 / **4.46** | 3 (non-text), 4.5 (text) | passes 3, **fails 4.5 for text on background** |
| light signal on shoal | 4.67 | 4.5 | pass |
| dark signal on panel / background | 6.84 / 7.35 | 3 | pass |
| light evidence on panel / background / shoal | 5.20 / 4.52 / 4.73 | 4.5 | pass (background is tight) |
| dark evidence on panel / background | 8.69 / 9.34 | 4.5 | pass |
| light hairline on background / panel / shoal | 1.55 / 1.78 / 1.62 | 1.5 | pass |
| dark hairline on background / panel / **shoal** | 1.69 / 1.58 / **1.46** | 1.5 | **fails on shoal** |
| shoal vs panel (light / dark) | 1.10 / 1.08 | "distinguishable" | pass by plan, visually weak |
| shoal vs background (light / dark) | 1.05 / 1.16 | n/a | light is nearly identical |
| chip tick: signal on ink fill (light / dark) | 3.86 / 2.86 | 3 (graphical) | dark is under 3, decorative, label still reads |
| chart-grey on land (light / dark) | 4.24 / 4.63 | n/a | no text sits on land |
| welcome glow (opacity .35 over black): chart-grey on ember-1 mix / ember-2 mix | 3.94 / 3.04 | 4.5 | would fail if chart-grey text sat there; see finding 5 |

## Findings

### 1. [important] Light `--signal` as small text on the page background is 4.46:1
- File: `src/index.css:90` (`--signal: #c93a05` in `:root`).
- Problem: `text-xs text-signal` error lines render directly on `--background` in onboarding (`src/ui/screens/onboarding/ProgramStep.tsx:47`, `src/ui/screens/onboarding/StepParts.tsx:31`, `src/ui/screens/onboarding/AiKeyStep.tsx:169`). 12px text needs 4.5:1; `#c93a05` on `#efefef` is 4.46:1. It passes on panel (5.13).
- Fix: set light `--signal` to `#c53805` (4.63 on background, 5.33 on panel, white-on-signal 5.33). Keep `--signal-deep: #a82f03` (still darker than signal). Update the same value in `DESIGN.md` (frontmatter `signal`, the "Ember Signal" prose line, and the "Measured contrast" table rows: white on signal 5.3, signal on panel 5.3). Re-run the script.

### 2. [important] Dark hairline on `--shoal` is 1.46:1
- File: `src/index.css:145` (`--hairline: #343437` in `.dark`).
- Problem: borders drawn on shoal surfaces fall under the 1.5 target: `Panel inset` (`bg-shoal` with `border-hairline`), the disabled `Input`, the off `Toggle` track (`border-hairline bg-shoal`). On the page and panel it is fine (1.69, 1.58).
- Fix: set dark `--hairline: #39393c` (1.57 on shoal, 1.70 on panel, 1.82 on background). Update `DESIGN.md` frontmatter `hairline-dark`, the Hairline prose line, and the "hairline on panel (dark)" row (1.70).

### 3. [minor] `--shoal` is almost indistinguishable from panel and (light) from background
- File: `src/index.css:86` and `:144`.
- Problem: shoal/panel is 1.10 (light) and 1.08 (dark); light shoal/background is 1.05. `Badge` (`src/ui/components/Chip.tsx:53-65`, used for the result-row fit chips in `src/ui/screens/finder/ResultRow.tsx:130,133`) has `bg-shoal` and no border, so on a panel it reads as plain text with a barely visible fill. Hover rows (`hover:bg-shoal`) are equally faint in dark mode. Text stays legible, but the chip affordance is lost.
- Fix: in `Badge`, add `border border-hairline` to the class string (keep `bg-shoal`). Do not change the token values (plan targets). Optional, if the owner finds hover too faint in dark: dark `--shoal: #1a1a1c` (still below hairline lightness).

### 4. [minor] Chip selected tick is under 3:1 in dark
- File: `src/ui/components/Chip.tsx:29`.
- Problem: selected chip is `bg-foreground` (white in dark) with a 2px `bg-signal` leading tick; `#ff6a2b` on white is 2.86:1. Decorative and the label contrasts at 19.55:1, so this is cosmetic.
- Fix (optional): none required. If wanted, use `before:bg-signal-deep` only in light and `dark:before:bg-primary-foreground`-style neutral in dark. Acceptable to leave and note in DESIGN.md.

### 5. [minor] Welcome glow: owed visual check, rectangular footprint, text over amber
- File: `src/ui/screens/Onboarding.tsx:153-159`.
- What was verified: it is `aria-hidden`, `pointer-events-none`, `hidden dark:block` (the `dark` variant is `&:is(.dark *)`, so light mode shows nothing), no animation (reduced motion unaffected), `-z-10` inside an `isolate` root so it paints below all content and cannot capture clicks. It exists only at step 0. Content on step 0 is white text and chips (opaque panel fill), which keep 9.9:1 or better over the brightest glow stop.
- Problems: (a) the div is `inset-x-0` inside the 640px column, not the full sheet width, so even with 60px blur the glow reads as a column-wide mound rather than the reference's edge-to-edge rise; (b) `h-1/2` of a `min-h-full` column means on short windows the amber top stop (ember-2) sits behind the subtitle and the language chips. White text is fine (9.9:1), but any `text-chart-grey` placed there would be 3.0 to 3.9:1.
- Fix: no code change required for contrast today (no chart-grey text on step 0). To make it match the reference, move the div to the outermost sheet wrapper, or give it `-inset-x-24` so the blur edge falls outside the column, and reduce height to `h-2/5`. Take a dark screenshot at 1280x800 and 1024x600 before accepting. If any chart-grey text is added to step 0 later, reduce opacity to .25.

### 6. [minor] Light-mode ember gradient on the ProgressLine dot
- File: `src/ui/components/ProgressLine.tsx:10`, `src/index.css:331-333`.
- Problem: plan says light mode keeps gradient minimal and the ember appears as flat `--signal`. `.ember-fill` applies the full gradient in both themes, so in light the dot's top half is peach `#f7b267` (about 1.9:1 on white). It is an 8px decorative dot next to text, so this is allowed by rule 2 ("ProgressLine dot uses `--ember-gradient`"), but the dot reads washed out on light.
- Fix: in `src/index.css` change to `.ember-fill { background: var(--signal); } .dark .ember-fill { background-image: var(--ember-gradient); }` (or keep as is if the owner wants the gradient in both). Also note the plan's "thin 2px progress bar" was not built (documented deviation); leave unless the owner wants it.

### 7. [minor] `cssToHex` fallback is dead weight and wrong if ever reached
- File: `src/ui/globe/Globe.tsx:30-40`.
- Problem: every token the globe reads (`--land`, `--background`, `--hairline`, `--foreground`, `--signal`, `--ember-1`, `--chart-grey`) is now a literal hex, so the canvas round trip is unnecessary. `getPropertyValue` returns the hex as authored, which the canvas normalises correctly. The only risk is the `'#000000'` fallback when no 2D context exists: that would make the light-mode ocean black. It is only reachable in a headless or broken webview.
- Fix: replace the body of `cssToHex` with a hex passthrough: `return /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : fallbackViaCanvas(color)`, or simply return `color.trim()` and delete the canvas code (all tokens are 6-digit hex; `shade` and `mix` already assume `#rrggbb`). If a token ever becomes a 3-digit hex, `parseInt(hex.slice(1), 16)` in `shade`/`mix` breaks, so keep tokens at 6 digits (note that in a CSS comment above the token blocks).

### 8. [minor] Globe: selected glow and light atmosphere not verified
- File: `src/ui/globe/Globe.tsx:236-257`.
- Checked and correct: palette is read per theme change (`readPalette(theme)` in the `[countries, theme]` effect; `theme.ts` toggles the `.dark` class before updating the store, so computed styles are fresh when the effect runs); ocean = `--background`, land = `--land`, side = 0.82 shade, stroke = `--hairline`, hover = ink outline and 0.03 altitude, selected = `--signal` cap and outline; atmosphere = 25% `--ember-1` on black (dark) and 50% `--chart-grey` on ground (light); the graticule is a direct `LineSegments` child of the scene in three-globe (`state.scene.add(state.graticulesObj)`), so the lookup works. `--ember-1` is read without a theme guard but only used in dark. No stale colors found.
- Plan deviation: no selected-country glow in dark (globe.gl has no per-polygon glow). Accept; DESIGN.md "The Globe" already says selected is "filled and outlined in ember" and does not promise glow.
- Open point: three-globe draws the atmosphere with additive blending, so on the light ground a mid-grey haze will look like a faint pale halo, not a grey one. Screenshot both themes; if the light halo looks off, set the light atmosphere to `p.ocean` blended 0.25 toward `--foreground` or reduce `atmosphereAltitude`.

### 9. [minor] DESIGN.md small inconsistencies
- File: `DESIGN.md:215, 273, 338` and `.plans/A-build-conventions.md:4`.
- Values and names match `src/index.css` exactly (frontmatter hex values, ember tokens, shoal/hairline/land, primary text). No stale mentions of magenta, buff, sea or Night Watch in `DESIGN.md` or `src/`. Remaining items:
  - Line 273 says "no glass, no blur on panels" while the welcome glow uses `blur(60px)`. Add "(the welcome glow is a background layer, not a panel)" or "except the dark welcome glow".
  - The Ember Rule (line 215) says the ember gradient is "limited to the two places listed above"; add that the globe atmosphere tint and the dark primary-button glow are the other two ember effects, so the "nothing else glows" claim on line 197 is consistent with the globe section.
  - `--panel-rim` (the dark inner top highlight) is not named in an Elevation section; add one sentence stating it applies to `Panel`, the FactLine popover and the Combobox list only, via `inset-shadow-(--panel-rim)`.
  - `.plans/A-build-conventions.md:4` still says "The Corrected Chart"; change to "The Ember Chart".
  - Result-row panels: plan step 7 listed "result rows panels" but rows are not given the rim; the builder noted this. Leave as is, and say so in DESIGN.md if rows are described as panels anywhere.

## Leftover grep (item 2)

- Old hues (355, 205/206/210/215/220/245/250, buff 85) and `#d97757`: none in `src/` or `DESIGN.md`. The only oklch values left in `src/index.css` are `--chart-1..5` (neutral greys, chroma 0, lines 122-126) and `color-mix(in oklch, ...)` blends of existing tokens (lines 155, 206, 236, 263, 289, 292). These are fine; only color-mix on tokens, no new hue.
- Hard-coded colors in `src/**/*.ts(x)`: only `Globe.tsx:158` (`rgba(0,0,0,0)`) and `Globe.tsx:36` (`'#000000'` fallback). Both allowed by the plan (see finding 7 for the second).
- Component meaning check (all by token, all sensible): Chip selected = ink fill, panel text, signal tick; Toggle on = signal track, panel knob (6.84 dark / 5.13 light vs track); Slider uses ink/hairline tokens, no signal dependency; Combobox selected rule = signal; FactLine official tag = `text-evidence`, popover has rim; ErrorNote = signal left rule; EmptyState = ink and chart-grey only; Badge = shoal and ink (see finding 3); nav active mark = `bg-signal`; onboarding radio rows (`ProgramStep.tsx:30`) = shoal + signal rule; My Unis urgent badge (`MyUnis.tsx:320`) = `bg-signal text-primary-foreground`, still the ember, 5.13 light / 7.35 dark; result row fit chips = `Badge` (finding 3); rail is flat with a light-only hairline.

## Ember usage rule (item 3)

- Gradient: `ember-gradient` is used only in `ProgressLine` (`.ember-fill`) and the step-0 welcome glow (`Onboarding.tsx:157`). No other `gradient`, `drop-shadow`, `blur` or glow in `src/**/*.tsx|css` beyond these. The old `.app-rail` gradient is gone.
- Glow: `--ember-glow` is applied only on the primary button hover and focus-visible and is `0 0 #0000` in light (invisible). Built CSS confirms `.hover\:shadow-(--ember-glow):hover` and the focus-visible twin resolve correctly, and `inset-shadow-(--panel-rim)` compiles to `inset var(--panel-rim)` without breaking the `shadow-float` combined box-shadow list.
- Welcome glow: see finding 5. Does not show in light, does not capture pointer events, is not animated.

## Verification commands

- `bun run build`: pass (existing chunk size warning for the Globe chunk only).
- `bun run check:i18n`: pass.
- `bun test`: 159 pass, 0 fail.
- `(cd src-tauri && cargo check --offline)`: pass.

## Suggested order for the fixer

1. Finding 1 and 2 (token values plus DESIGN.md numbers), re-run `/tmp/claude-1000-contrast.mjs` after editing its token table.
2. Finding 3 (Badge border).
3. Findings 6, 7, 9 (small CSS, Globe cleanup, doc edits).
4. Findings 4, 5, 8 are visual checks; take dark and light screenshots at the onboarding step 0 and the Finder before deciding.

## Fixes applied

Applied on the working tree (uncommitted). Contrast re-measured with the script after the token edits; every pair meets its target.

1. Light `--signal` is now `#c53805` (`src/index.css`). Light signal on background 4.63 (was 4.46), on panel 5.33, white on signal 5.33. DESIGN.md frontmatter, "Ember Signal" line, and contrast table updated (white on signal and signal on panel 5.3). Added a "signal on background (light, as text)" row at 4.6. `--signal-deep` unchanged.
2. Dark `--hairline` is now `#39393c` (`src/index.css`). On shoal 1.57, panel 1.70, background 1.82. DESIGN.md frontmatter, Hairline line, and table updated (panel 1.70, plus a "panel / shoal (dark)" row).
3. `Badge` (`src/ui/components/Chip.tsx`) gains `border border-hairline`, keeps `bg-shoal`. Its doc comment and the DESIGN.md Chips line ("shoal fill with a 1px hairline") now match. Token values for shoal unchanged.
4. Dark selected-chip tick left as is (2.9:1, decorative). Documented in DESIGN.md Chips "State".
5. Welcome glow (`src/ui/screens/Onboarding.tsx`): moved out of the 640px column into an outer `isolate relative min-h-full w-full` wrapper, so it spans the full main field. It is `inset-x-0`, `h-2/5` (was `h-1/2`), `-z-10`, `pointer-events-none`, `hidden dark:block`. Still step 0 only, no animation. Visual check at 1280x800 and 1024x600 in dark is still owed.
6. Progress dot (`src/index.css`): `.ember-fill` is flat `var(--signal)` in light. `.dark .ember-fill` applies `--ember-gradient`.
7. `cssToHex` (`src/ui/globe/Globe.tsx`) is now a passthrough (`color.trim()`). The canvas code and the `'#000000'` fallback are gone. A comment above the token blocks in `src/index.css` requires the globe-read tokens to stay 6-digit hex.
8. Globe selected glow and light atmosphere: no code change. The light haze visual check is still owed (screenshot both themes).
9. DESIGN.md prose: welcome glow noted as a background layer in "no blur on panels"; Ember Rule names the globe atmosphere tint and the dark primary-button glow as the other two ember effects; `--panel-rim` scoped to Panel, FactLine popover and Combobox list in Elevation. `.plans/A-build-conventions.md` line 4 now says "The Ember Chart".

Verify (after all fixes): `bun run build` pass (existing Globe chunk-size warning only), `bun run check:i18n` pass, `bun test` 159 pass / 0 fail, `(cd src-tauri && cargo check --offline)` pass.

Still owed: dark and light screenshots of the welcome glow (finding 5), the light atmosphere (finding 8), and the chip tick (finding 4, accepted).
