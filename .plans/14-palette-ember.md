# 14 — New palette: "Ember" (from the owner's reference image)

Read first: `.plans/A-build-conventions.md`, `DESIGN.md`, `src/index.css`, `src/ui/globe/Globe.tsx`, `src/ui/components/` (Button, Chip, Panel, FactLine, ProgressLine, Toggle, Slider).

## The reference (owner's image: a clock-style card, dark and light)
- **Dark:** page is pure black. The card is near-black with a thin lighter rim and a soft outer glow. Text is white (strong) and mid-grey (secondary). The ONLY color is an ember glow rising from the bottom: deep red → orange → warm amber/peach, bleeding into the white numerals.
- **Light:** page is soft light grey, card is pure white, ink is pure black, secondary text is greys. No accent color at all; the gauge ticks are greys.
- Feeling: monochrome and calm, one fire accent used rarely. Large confident type. Not colorful.

Keep the typography (Agrave Pro + Plex Mono) — the owner only asked for the palette. Radii, spacing, layout, motion stay.

## Tokens (replace the current palette in `src/index.css`; keep the same token NAMES so components keep working)
Starting values; Haiku must **measure contrast and adjust lightness** to meet the targets below.

| token | light | dark |
|---|---|---|
| `--background` | `#efefef` | `#000000` |
| `--panel` | `#ffffff` | `#0c0c0d` |
| `--shoal` (second tonal step, hover/headers) | `#f4f4f4`→ pick so it differs from panel and background | `#161617` |
| `--hairline` | `#d2d2d2` | `#343437` |
| `--foreground` (ink) | `#0a0a0a` | `#ffffff` |
| `--chart-grey` (secondary text) | `#636366` | `#8e8e93` |
| `--signal` (ember, solid) | `#c93a05` | `#ff6a2b` |
| `--signal-deep` (hover/press) | `#a82f03` | `#ff8a4d` |
| `--evidence` (verified/official) | muted green `#2f7a56` | `#5fbf8f` |
| `--land` (globe land fill) | `#d9d9d9` | `#262628` |

Also add: `--ember-0: #b3210a; --ember-1: #ff5a1f; --ember-2: #f7b267;` and `--ember-gradient: linear-gradient(to top, var(--ember-0), var(--ember-1) 55%, var(--ember-2));` plus `--ember-glow: 0 0 32px -8px color-mix(in oklch, var(--ember-1) 55%, transparent);` (used in dark mode; in light mode set the glow to `none` and keep gradient usage minimal, see below). Map the shadcn names as before (`--primary`=signal, `--primary-foreground` = text on signal: **white in light, black in dark**, `--muted`=shoal, `--accent`=shoal, `--border`/`--input`=hairline, `--ring`=signal, `--destructive`=signal).

Contrast targets (measure with an oklch/sRGB → WCAG script like before and note results): body text ≥ 4.5:1 on panel AND on background in both themes; secondary text ≥ 4.5:1; hairline vs its surface ≥ 1.5:1; text on signal ≥ 4.5:1; signal as text/outline on its surface ≥ 3:1.

## Where the ember is allowed (DESIGN.md rule: spend it in a few places)
1. **Primary button**: solid `--signal`. In dark mode only, add a faint ember glow under it (`--ember-glow`) on hover/focus-visible.
2. **Search progress**: the `ProgressLine` dot and a thin 2px progress bar use `--ember-gradient`.
3. **Globe**: selected country = `--signal` fill/outline with a soft glow in dark; atmosphere color is a faint `--ember-1` tint in dark (alpha ≈ 0.25) and a neutral grey in light; ocean = `--background`; land = `--land`; graticule = `--hairline`; stroke = `--hairline`; hover = foreground outline. No texture, no yellow/buff anywhere.
4. **Selected states** (nav active mark, chip tick, radio rule, focus ring): flat `--signal`, no gradient.
5. **The onboarding welcome step only**: a single large ember glow rising from the bottom edge of the sheet in dark mode (the reference's signature) using `--ember-gradient` with heavy blur/low alpha, `pointer-events: none`, `aria-hidden`, no animation. Nothing similar on other screens.
Everywhere else: flat greys, no gradients, no glow. Light mode: no glow at all; the ember appears only as flat `--signal` in the places above.

## Steps
- [x] 1. Replace the palette tokens in `src/index.css` (`:root` and `.dark`) with the table above, adding the ember tokens and `--ember-gradient`/`--ember-glow`. All `oklch(` or hex literals stay inside the token blocks only (components keep using tokens). Report the measured contrast table in Builder notes.
- [x] 2. Remove the old `--land` buff and the sea-blue values. Remove the `.app-rail` gradient: make the rail flat (`background: var(--background)`; 1px right hairline in light mode, none in dark if the black-on-black reads clean; the owner liked the soft top-left logo area, so keep layout and the wordmark rule as is).
- [x] 3. `Button` primary: text color `--primary-foreground` (white light / black dark), the dark-mode glow on hover/focus-visible. Check Chip selected state (ink fill + paper text still reads in both themes; signal tick), Toggle on-state (signal track; knob contrasts), Slider thumb (signal), FactLine tags (official = `--evidence`), ErrorNote left rule (signal), ProgressLine (step 2 of the ember list), nav active mark.
- [x] 4. Globe (`src/ui/globe/Globe.tsx`): read the new tokens exactly as listed in "Where the ember is allowed" #3, re-skin on theme change as before (tokens via `getComputedStyle`), remove any buff/blue assumptions, the blue-ish atmosphere glow, and the colour conversions that assume the old palette.
- [x] 5. Onboarding welcome glow (#5) in `src/ui/screens/Onboarding.tsx` or the welcome step: absolutely positioned div at the bottom of the sheet area, `bg: var(--ember-gradient)`, `filter: blur(60px)`, `opacity: .35`, dark mode only (`display:none` in light), `pointer-events:none`, `aria-hidden`. It must never cover text or controls (z-index below content).
- [x] 6. Update `DESIGN.md`: rewrite the frontmatter colors (rename tokens to match: ink, chart-grey, panel, shoal, hairline, ember/signal, evidence, land) and the prose sections "Colors", "Dark theme", the Named Rules (Correction Rule → Ember Rule: ember = what needs the student now, used in the listed places only; Evidence Rule unchanged; drop the Land Buff Rule, land is now a neutral grey), "Elevation & Depth" (dark panels get a 1px inner top highlight `inset 0 1px 0 rgb(255 255 255 / 0.06)`; add that to panels in dark mode in the CSS), "The Globe", "Do's and Don'ts" (the "no gradients" rule gets the explicit exceptions above). Update the overview paragraph: the north star is now a black-and-white instrument with one ember; keep the name "The Corrected Chart" only if it still makes sense, otherwise rename to "The Ember Chart" and say so.
- [x] 7. Dark panels: add the inner top highlight (see step 6) to `Panel`, result rows panels and popovers via a token (`--panel-rim`), nowhere else.
- [x] 8. Grep checks: no leftover magenta/cyan/buff literals (`355`, `206`, `205`, `85` hues in oklch, `#d97757`), no hard-coded colors in `src/**/*.tsx|ts` outside tokens.

## Verify
`bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check)`. Launch is checked by the orchestrator (screenshots in both themes).

## Builder notes

- Step 1: tokens replaced in `src/index.css` (`:root` light, `.dark`), ember tokens and `--ember-gradient`/`--ember-glow`/`--panel-rim` added. Light hairline set to `#c2c2c2`, not the plan's `#d2d2d2` (measured 1.31:1 on background, failed the 1.5:1 target); `#c2c2c2` gives 1.55:1 on background and 1.78:1 on panel. Light `--ember-glow` and `--panel-rim` are transparent no-op shadows (`0 0 #0000`, `inset 0 0 #0000`) rather than `none`, because `none` inside Tailwind's combined `box-shadow` list makes the declaration invalid.
- Step 2: `.app-rail` flattened (background `var(--background)`, 1px hairline right border in light, transparent in dark). Gradient removed.
- Step 3: Button primary gets `hover:shadow-(--ember-glow) focus-visible:shadow-(--ember-glow)` (glow is none in light). Chip, Toggle, Slider, ErrorNote, FactLine checked by tokens and the table below; no code change needed beyond the above. Nav active mark (the 3px dot in AppShell) changed from ink to `bg-signal`, per step 4 of the ember list.
- Step 4: Globe reads `--land`, `--background`, `--hairline`, `--foreground`, `--signal`, `--ember-1` (via `getComputedStyle`); selected countries are `--signal` fill and side; atmosphere is a 25% ember tint on black (dark) and a 50% `--chart-grey` haze on ground (light). Graticule colour is set on the globe scene's `LineSegments` material (globe.gl has no public graticule colour option). Old `veil`/buff logic removed.
- Step 5: welcome glow added in `src/ui/screens/Onboarding.tsx` (step 0 only, `hidden dark:block`, `blur(60px)`, opacity .35, `pointer-events-none`, `aria-hidden`, `-z-10` inside an `isolate` sheet so it sits below content).
- Step 6: DESIGN.md rewritten (plan explicitly asked; conventions list it as read-only, the plan overrides that). Renamed to "The Ember Chart". Measured contrast table added to it.
- Step 7: `inset-shadow-(--panel-rim)` on `Panel`, the FactLine popover and the Combobox list. Result rows are not given a rim (they are rows, not panels).
- Step 8: grep clean for the old hues (355/206/205/85), `#d97757`, `buff`, `magenta`, `cyan`. Two literals remain by design: `Globe.tsx` `'rgba(0,0,0,0)'` (globe.gl background, a transparency value) and the `'#000000'` fallback in `cssToHex` (only reached when no 2D canvas context exists).

Deviations from the plan:
- No "thin 2px progress bar" exists in the Finder; the ember gradient is applied only to the `ProgressLine` dot (`.ember-fill`). Not added a new bar.
- Selected-country glow in dark mode is not implemented. globe.gl polygons have no per-polygon glow; selected countries are plain ember fill and outline. The ember atmosphere tint is the only glow on the globe.
- DESIGN.md "Lifted globe" shadow is documented but not applied in code (it was not implemented before either).

### Contrast (measured by /tmp/ember/contrast.mjs, WCAG 2.x)

| pair | fg | bg | ratio | target | result |
|---|---|---|---|---|---|
| L ink on background | #0a0a0a | #efefef | 17.22 | 4.5:1 | pass |
| L ink on panel | #0a0a0a | #ffffff | 19.80 | 4.5:1 | pass |
| L ink on shoal | #0a0a0a | #f4f4f4 | 18.00 | 4.5:1 | pass |
| L chart-grey on background | #636366 | #efefef | 5.21 | 4.5:1 | pass |
| L chart-grey on panel | #636366 | #ffffff | 5.99 | 4.5:1 | pass |
| L chart-grey on shoal | #636366 | #f4f4f4 | 5.44 | 4.5:1 | pass |
| L primary-fg on signal | #ffffff | #c93a05 | 5.13 | 4.5:1 | pass |
| L primary-fg on signal-deep (hover) | #ffffff | #a82f03 | 6.83 | 4.5:1 | pass |
| L signal on panel (text/outline) | #c93a05 | #ffffff | 5.13 | 3:1 | pass |
| L signal on background | #c93a05 | #efefef | 4.46 | 3:1 | pass |
| L evidence on panel | #2f7a56 | #ffffff | 5.20 | 4.5:1 | pass |
| L evidence on background | #2f7a56 | #efefef | 4.52 | 4.5:1 | pass |
| L hairline vs panel | #c2c2c2 | #ffffff | 1.78 | 1.5:1 | pass |
| L hairline vs background | #c2c2c2 | #efefef | 1.55 | 1.5:1 | pass |
| D ink on background | #ffffff | #000000 | 21.00 | 4.5:1 | pass |
| D ink on panel | #ffffff | #0c0c0d | 19.55 | 4.5:1 | pass |
| D ink on shoal | #ffffff | #161617 | 18.08 | 4.5:1 | pass |
| D chart-grey on background | #8e8e93 | #000000 | 6.44 | 4.5:1 | pass |
| D chart-grey on panel | #8e8e93 | #0c0c0d | 6.00 | 4.5:1 | pass |
| D chart-grey on shoal | #8e8e93 | #161617 | 5.55 | 4.5:1 | pass |
| D primary-fg on signal | #000000 | #ff6a2b | 7.35 | 4.5:1 | pass |
| D primary-fg on signal-deep (hover) | #000000 | #ff8a4d | 8.99 | 4.5:1 | pass |
| D signal on panel (text/outline) | #ff6a2b | #0c0c0d | 6.84 | 3:1 | pass |
| D signal on background | #ff6a2b | #000000 | 7.35 | 3:1 | pass |
| D evidence on panel | #5fbf8f | #0c0c0d | 8.69 | 4.5:1 | pass |
| D evidence on background | #5fbf8f | #000000 | 9.34 | 4.5:1 | pass |
| D hairline vs panel | #343437 | #0c0c0d | 1.58 | 1.5:1 | pass |
| D hairline vs background | #343437 | #000000 | 1.69 | 1.5:1 | pass |
| D chip selected: panel text on ink | #0c0c0d | #ffffff | 19.55 | 4.5:1 | pass |
| D toggle knob (panel) on signal track | #0c0c0d | #ff6a2b | 6.84 | 3:1 | pass |
| L toggle knob (panel) on signal track | #ffffff | #c93a05 | 5.13 | 3:1 | pass |

failing: 0

### Verify
- `bun run build`: passes (after fixing one implicit-any in the graticule lookup).
- `bun run check:i18n`: `i18n key check passed (6 namespaces, es, vi match en)`.
- `bun test`: 159 pass, 0 fail, 18 files.
- `(cd src-tauri && cargo check)`: finished, exit 0.
- `tauri dev`: port 1420 was already held by another session's vite server (pid 1119292, running about six hours), so the first attempt failed with "Port 1420 is already in use". That process was left alone (no pkill). Re-ran with `bun tauri dev --config '{"build":{"devUrl":"http://localhost:1422","beforeDevCommand":"bun x vite --port 1422 --strictPort"}}'` under `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90`: the app compiled and ran for the full 90 seconds, no panic and no error lines in the log (`/tmp/claude-1000-tauri-dev-ember-1422.log`). Exit was the timeout's SIGTERM.
- Screenshots in both themes are left to the orchestrator, as the plan says.
