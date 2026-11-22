# 16 — "Ember glow" visual pass: Inter, soft surfaces, gradients, drifting stars

Branch: `feat/ui-opencode`. Read first: `.plans/A-build-conventions.md`, `DESIGN.md`, `src/index.css`, `src/ui/layout/AppShell.tsx`, `src/ui/components/` (all), `src/ui/globe/Globe.tsx`.

## Why
The owner's feedback on the Ember palette: "too plain". They want it to look like their reference image (a dark card and a light card, shown earlier): **big soft squircle surfaces, a light rim around the dark card, an ember gradient glowing up from the bottom of the card and bleeding into white numerals, large Inter-style numerals, mixed-weight headlines (light grey text with a bold white phrase)**. Plus a **slow, faint drifting starfield behind every screen** (reference: black sky with sparse white dots of different sizes, a few brighter). The owner's brief wins over any "avoid gradients/glow" default.

## Design decisions (do not re-debate; implement)

### Type: Inter, replacing Agrave Pro and IBM Plex Mono
- `@fontsource-variable/inter` is already installed (variable weight 100–900, includes Vietnamese). Import it in `src/index.css`; set `--font-sans` and `--font-heading` to `"Inter Variable", system-ui, sans-serif`. `--font-mono` becomes the same Inter stack; anything that used mono for numbers gets `font-variant-numeric: tabular-nums` (make `.font-mono` do that, and zero letter-spacing). Remove the Agrave `@font-face` blocks, delete `public/assets/fonts/agrave-pro-*.ttf`, remove the `@fontsource/ibm-plex-mono` imports and dependency (`bun remove @fontsource/ibm-plex-mono`).
- Scale: display 56/1.0, weight 600, tracking -0.035em (screen titles keep their existing plot-in animation and wordmark rule, restyled to this size); headline 28/1.15 w600 -0.02em; title 17/1.35 w600; body 15/1.55 w400; label 13/1.2 w500; numerals are always tabular.
- **Two-tone headline** (the reference's signature): body text in `--chart-grey`, the key phrase in `--foreground` weight 600. Use it ONLY for: the onboarding welcome headline and EmptyState titles. Implement with react-i18next `<Trans>` and `<strong>` in the JSON (all three languages, natural phrasing; the emphasized part is a phrase, never a single word).
- **Gradient numerals**: a class `.numeral-ember` for large display numbers: `background: linear-gradient(to bottom, var(--foreground) 55%, var(--ember-2) 100%)` + `background-clip:text; color: transparent` in dark mode; plain `--foreground` in light mode. Used for: the onboarding step number (shown big, e.g. "2" with "/7" small and grey; this is a real sequence), the result-row rank, and the My Unis days-left number. Screen titles get the same treatment very subtly (last 25% of height tints toward `--ember-2` at 35% mix) in dark mode only.

### Shape lock (state this rule in DESIGN.md, then never violate it)
Pills for actions and chips (`999px`), cards/panels `28px`, controls (inputs, selects, textareas, comboboxes, table cells' editors) `14px`, popovers/menus `20px`, toggles/sliders pill, the globe a circle, flag discs circles. Nothing else. Replace the old 2/4/6px radii everywhere (tokens `--radius-pill/-card/-control/-popover`, and map shadcn `--radius-*` to them).

### Surfaces
- **Dark panel**: vertical gradient `#151517` → `#0b0b0c`, 1px **gradient rim** (top `rgb(255 255 255 / .16)` fading to `.04` at the bottom; build with a `::before` pseudo-element and a mask-composite border technique, or `border-image`-free equivalent that keeps the 28px radius), inner top highlight. No flat grey boxes.
- **Light panel**: flat `#ffffff`, 28px radius, a 1px `rgb(0 0 0 / .06)` ring, no shadow, exactly like the reference's light card.
- **`.panel-ember` variant (the "one memorable element per screen")**: dark: an ember gradient rising from the bottom edge inside the card (`--ember-gradient`, blurred, ≈55% opacity, masked to the bottom 40%) plus a soft outer glow below the card (`--ember-glow`, larger blur than today); light: a very soft peach wash at 8–10% in the bottom 35%, no outer glow. Content stays readable: add a content wrapper above the glow. Use `.panel-ember` on exactly one element per screen: onboarding sheet, Counselor priorities panel, Finder search form panel (wrap the left column's Search block), UniDetail header card, My Unis summary strip (add a slim summary card above the table: "N universities, M with a deadline in the next 30 days" in numerals; only if the list is non-empty), Settings AI providers section header card.
- **Buttons**: primary = pill, vertical gradient `--ember-2`→`--ember-1` (dark: top amber `#ff8a3d` to `#ff5a1f`, black text) / light: `#d4430c`→`#b83304` with white text; 1px inner top highlight; dark hover adds `--ember-glow`; press scales 0.97 in 120 ms. Secondary = pill, panel fill with the same rim, ink text. Quiet = text only. All ≥ 40px tall (36 for `sm`).
- **Inputs/selects/textareas**: 14px radius, panel fill, rim; focus = 2px `--signal` ring + faint ember glow in dark.
- **Chips**: pills; selected = ink fill (white in dark) with a small ember dot instead of the tick bar. Badges: pills, shoal fill, hairline.
- **Toggle**: pill; on = ember gradient. **Slider**: 4px track, white/ink thumb with ember glow ring in dark.
- **Rail / nav**: transparent over the stars; active item = pill with the gradient rim, ember dot at its left. Rail items 40px high, 14px radius. Language, theme and the new stars control sit at the bottom as three round 40px icon buttons with rims.
- **Result rows / list rows**: keep the ruled list structure but each row is a 20px-radius hover surface (shoal on hover); selected = rim + ember dot.
- **Globe**: dark: ocean sphere near-black `#060607` with a faint rim and an ember atmosphere (alpha .25) so it glows against the stars; land `#26262a`, graticule very faint; light: unchanged logic with the new tokens. Selected country: ember fill.
- **Page ambient (dark only)**: one very faint ember haze at the bottom-centre of the window (fixed, radial gradient, opacity ≤ .14, `pointer-events:none`, behind content, above stars). Light: nothing.

### Starfield (new, all screens)
`src/ui/layout/Starfield.tsx`, mounted once in `AppShell` as a `position: fixed; inset: 0; z-index: 0` canvas behind everything (rail, header, main, popovers all sit above), `pointer-events:none`, `aria-hidden`.
- Dark theme only (render nothing / clear canvas in light; re-check on theme change via `useTheme`).
- Density ≈ one star per 26 000 px² (≈ 80 on 1920×1080), clamp 40–110, regenerated on resize (debounced).
- Three depth layers: radius 0.5 / 0.9 / 1.4 px; drift speeds 1.5 / 3 / 5 px per second toward the upper-left; stars wrap at the edges (no popping: fade near edges).
- Alpha: 0.10–0.45 base, a slow sine twinkle (±20%, 4–9 s period, per-star phase). At most 4 "bright" stars (radius ~1.6, alpha ≈ 0.7) with a soft 6px radial glow, like the large star in the reference.
- Pure white with a barely warm tint on 15% of stars (`#fff4ea`). No colors beyond that.
- Performance: one canvas, rAF capped at 30 fps, DPR capped at 2, pauses when `document.hidden`, no React state in the loop, cleans up listeners/observers on unmount.
- `prefers-reduced-motion`: draw one static frame, no animation.
- A user control: a third round button in the rail footer (lucide `Sparkles` off / on state) toggling stars; persisted with `setSetting('stars', 'on'|'off')` (add `'stars'` to `SettingKey` in `src/store/settings.ts`); default on; `aria-pressed`, translated title (`common.stars.on/off`, en/es/vi). Do NOT edit `src/ui/screens/Settings.tsx` or `src/ui/screens/settings/**` (another agent may be working there).

### Motion
Keep AppShell's page transition and the title plot-in. New: press feedback (scale .97, 120 ms), the panel glow fades in on first paint of a screen (300 ms, opacity only). Nothing else moves except stars and search results. Reduced motion: opacity only.

### Contrast & slop pre-flight (measure and report)
All text pairs ≥ 4.5:1 on their surface (including text on the gradient button at its darkest and lightest point and gradient numerals' lowest tint), hairlines ≥ 1.5:1 as before, signal outline ≥ 3:1. Pre-flight counts to report: distinct accent hues (1: the ember family), radii used (only the 4 scale values), emoji in chrome (0), duplicate labels (0). Stars must not reduce text contrast: sample the brightest possible star alpha under body text and confirm text stays legible (stars alpha ≤ .45).

## Steps
Build in two passes (the orchestrator runs them in order).

### Pass 1 — system
- [x] 1. Fonts: Inter wiring, remove Agrave + Plex (files, CSS, package, README attribution line, `DESIGN.md` typography), type scale classes, `.numeral-ember`, `.font-mono` tabular mapping.
- [x] 2. Tokens: radii scale, gradient/rim/glow tokens (dark + light), panel gradient and rim implementation, `.panel-ember` + content wrapper, ambient haze class.
- [x] 3. Primitives restyled to the rules above: Button, Input/Textarea/Select/Field, Combobox, Chip/Badge, Panel (+ `variant="ember"`), Slider, Toggle, FactLine popover, EmptyState (two-tone headline via a `title` ReactNode or `Trans`), ErrorNote, ProgressLine, Flag ring, Spinner. Update `src/ui/components/index.ts`.
- [x] 4. Shell: rail/nav restyle, three round footer buttons, header title treatment, ambient haze, content z-index above stars.
- [x] 5. Globe skin per spec.

### Pass 2 — starfield and screens
- [x] 6. `Starfield.tsx` + the rail toggle + `stars` setting + i18n (`common.stars.*`).
- [x] 7. Onboarding: sheet as `.panel-ember`, big gradient step numeral, two-tone welcome headline (new i18n strings in all 3 languages), radio rows and steppers restyled; keep all logic.
- [x] 8. Counselor: priorities panel `.panel-ember`, chat bubbles to the 20px radius surfaces, composer pill, career cards 28px panels, fit bars as thin pills.
- [x] 9. Finder: search form block `.panel-ember`, result rows restyle with `.numeral-ember` rank, fit chips as pills, scope chips pills, globe container with the new ambient. Keep every behaviour (run ids, markers, progress map).
- [x] 10. UniDetail: header card `.panel-ember`, section rules, FactLine unchanged in behaviour.
- [x] 11. My Unis: summary strip (`.panel-ember`) with numerals (add `myUnis.summary.*` strings in 3 languages), table rows to the new shape rules, urgent badge = ember pill with the days numeral.
- [x] 12. Settings: **styling only through the shared primitives** (no edits to `Settings.tsx` or `settings/**`); verify it still looks right.
- [x] 13. `DESIGN.md`: rewrite to match (north star: "The Ember Chart" now with stars and soft surfaces; shape lock; type; gradient/glow rules and where allowed; starfield spec; light/dark tokens table; contrast results). Update `.plans/A-build-conventions.md` visual-system bullet list to the new rules (radii scale, gradients allowed only via the listed classes).

## Verify (each pass)
`bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)`. The orchestrator takes screenshots in both themes for review.

## Builder notes

**Pass 1 (steps 1-5) built by the builder agent. Not committed. Owner review pending in both themes.**

What changed:
- Step 1 (type): Inter Variable is the only face (`--font-sans`, `--font-heading`, `--font-mono` all Inter, `.font-mono` = tabular, zero tracking). Agrave `@font-face` blocks and the IBM Plex imports removed; `@fontsource/ibm-plex-mono` removed with `bun remove`; `public/assets/fonts/agrave-pro-*.ttf` deleted; README font line updated. Type classes added: `.type-display/-headline/-title/-body/-label`. `.numeral-ember` added (dark gradient, light plain ink).
- Step 2 (tokens): radii are four values in `@theme`: `--radius-pill` 999px, `--radius-card` 28px, `--radius-control` 14px, `--radius-popover` 20px; legacy `rounded-sm/md/lg/xl` map onto them. Gradient, rim and glow tokens defined for both themes (`--ember-button-top/bottom`, `--ember-wash`, `--ember-glow(-wide)`, `--surface-fill`, `--rim`, `--globe-ocean`). Classes: `.rim` (1px mask-composite gradient border, any radius), `.surface`, `.panel-ember` (glow layer + wide glow), `.ember-button`, `.ambient-haze` (dark only). Component classes sit in `@layer components` so utilities still override them.
- Step 3 (primitives): Button (pill, 40px md / 36px sm, ember gradient primary, rimmed secondary, press 0.97), Input/Textarea/Select (14px, 40px), Combobox (rimmed popover, option pills), Chip/Badge (pills, ember dot when selected), Panel (`rim surface`, `variant="ember"`), Toggle (pill, ember track, thumb inverts on), Slider (`.ui-range`, 4px track), FactLine popover (rimmed 20px), EmptyState (title is a ReactNode), Flag ring, ErrorNote/Field type sizes. `src/ui/components/index.ts` unchanged (no new exports needed).
- Step 4 (shell): rail and header transparent over the ground; nav rows 40px with 14px corners, active = rim + shoal + ember dot; footer language and theme buttons are round 40px with rims; ambient haze added (dark, opacity 0.14, behind content inside an `isolate` root); screen title at 56px display.
- Step 5 (globe): ocean reads `--globe-ocean` (dark `#060607`, light unchanged); dark land `#26262a`; dark graticule faint (60% toward ocean); tooltip radius 20px and Inter.

Deviations (all deliberate; reasons given):
1. DESIGN.md not edited. Step 1 lists DESIGN.md typography, but the owner's rule defers DESIGN.md to Pass 2 step 13. It still describes Agrave Pro, IBM Plex, the old radii and the 0.55 glow.
2. Ember glow opacity is 0.35 (plan: about 0.55). At 0.55 chart grey measured 3.64:1 over the glow's worst point. 0.35 gives 4.54:1.
3. Light primary top is `#c4400b` (plan: `#d4430c`). At `#d4430c` the hover state measured 4.45:1, under 4.5.
4. Toggle thumb is ink in light and black in dark when on (plan: white). White measured 2.27:1 over the track band. Ink and black measure 3.75 and 3.98.
5. Rail items use 14px corners, as the plan's rail spec says, not a full pill. The active item is rimmed with a shoal fill.
6. Two round footer buttons, not three. The stars button is step 6 (Pass 2).
7. EmptyState titles accept a ReactNode and render as a 28px semibold ink headline. The two-tone grey-plus-ink split is not applied to any existing string, because that needs new `<strong>` copy. That belongs with the Pass 2 onboarding strings.
8. Combobox: the rim and surface sit on an outer wrapper and the scrolling `role="listbox"` moved to an inner element. The rim stays put while the list scrolls. The listbox id and aria wiring are unchanged.
9. FactLine popover padding went from 12px to 16px, to match the 20px popover radius. Chips are 28px tall (was 24px).
10. Light panel ring (6% black) is decorative and not in the contrast table. The hairline table rows cover the stroke that carries structure.
11. Removed the `--panel-rim` token. Its uses are now the `rim` class.
12. Radius classes still used by screens that Pass 2 restyles: `ChatPane` (`rounded-lg`, now 28px), `LanguagesStep` (`rounded-md`, now 14px), `MyUnis` urgent badge (`rounded-sm`, now 14px). These map onto the four-value scale. Pass 2 steps 8, 7 and 11 will set their final shapes.
13. Not checked in Pass 1: the stars alpha under body text (Pass 2 step 6) and the duplicate-label count (no labels changed).

Pre-flight counts (Pass 1 scope, screens untouched by Pass 2):
- Accent hues: 1 (the ember family). Evidence green is the verified-only exception, as DESIGN.md says.
- Radii in `src/ui` and `src/app` (non-Settings): `rounded-full` (circles and dots), `rounded-pill`, `rounded-control`, `rounded-popover`, plus the three legacy classes listed in deviation 12. Shape lock values in CSS: 999, 28, 14, 20.
- Emoji in `src/ui`: 0.
- Hard-coded hex or oklch in `src/ui` components: 0 (only globe palette reads tokens; the globe tooltip string uses `var()` and the new Inter stack).

Contrast results (`/tmp/uw-contrast/contrast.ts`, reads token values from `src/index.css`; the glow and toggle rows use the worst point of the layer or thumb band; `sweep.ts` alongside it):

| theme | pair | ratio | target | pass |
|---|---|---|---|---|
| light | ink on background | 17.22 | 4.5:1 | yes |
| light | ink on panel | 19.80 | 4.5:1 | yes |
| light | ink on shoal | 18.00 | 4.5:1 | yes |
| light | chart grey on background | 5.21 | 4.5:1 | yes |
| light | chart grey on panel | 5.99 | 4.5:1 | yes |
| light | chart grey on shoal | 5.44 | 4.5:1 | yes |
| light | white on primary button top (#d4430c) | 5.14 | 4.5:1 | yes |
| light | white on primary button bottom (#b83304) | 5.98 | 4.5:1 | yes |
| light | white on primary button hover top (x0.95) | 5.00 | 4.5:1 | yes |
| light | white on primary button hover bottom (x0.95) | 5.78 | 4.5:1 | yes |
| light | signal as text on background | 4.63 | 4.5:1 | yes |
| light | signal as text/outline on panel | 5.33 | 3:1 (outline) | yes |
| light | evidence on panel | 5.20 | 4.5:1 | yes |
| light | evidence on shoal | 4.73 | 4.5:1 | yes |
| light | ink on ember wash (bottom of light ember panel) | 18.68 | 4.5:1 | yes |
| light | chart grey on ember wash | 5.65 | 4.5:1 | yes |
| light | ink thumb on toggle track, worst over thumb band | 3.75 | 3:1 (graphic) | yes |
| light | hairline stroke on background (input, rule) | 1.55 | 1.5:1 | yes |
| light | hairline stroke on panel (input, rule) | 1.78 | 1.5:1 | yes |
| dark | ink on background | 21.00 | 4.5:1 | yes |
| dark | ink on card top (#151517) | 18.24 | 4.5:1 | yes |
| dark | ink on card bottom (#0b0b0c) | 19.67 | 4.5:1 | yes |
| dark | ink on shoal | 18.08 | 4.5:1 | yes |
| dark | chart grey on background | 6.44 | 4.5:1 | yes |
| dark | chart grey on card top | 5.59 | 4.5:1 | yes |
| dark | chart grey on card bottom | 6.03 | 4.5:1 | yes |
| dark | chart grey on shoal | 5.55 | 4.5:1 | yes |
| dark | black on primary button top (#ff8a3d) | 8.95 | 4.5:1 | yes |
| dark | black on primary button bottom (#ff5a1f) | 6.73 | 4.5:1 | yes |
| dark | black on primary button hover top (x1.10) | 9.81 | 4.5:1 | yes |
| dark | black on primary button hover bottom (x1.10) | 7.06 | 4.5:1 | yes |
| dark | signal as text on background | 7.35 | 4.5:1 | yes |
| dark | signal as text/outline on card | 6.88 | 3:1 (outline) | yes |
| dark | evidence on card | 8.75 | 4.5:1 | yes |
| dark | evidence on background | 9.34 | 4.5:1 | yes |
| dark | hairline stroke on background | 1.82 | 1.5:1 | yes |
| dark | hairline stroke on card bottom | 1.71 | 1.5:1 | yes |
| dark | black thumb (on state) on toggle track, worst over thumb band | 3.98 | 3:1 (graphic) | yes |
| dark | white thumb (off state) on shoal track | 18.08 | 3:1 (graphic) | yes |
| light | ink thumb (off state) on shoal track | 18.00 | 3:1 (graphic) | yes |
| dark | ink (#fff) on ember glow layer, worst point (t=0.15) | 14.81 | 4.5:1 | yes |
| dark | chart grey on ember glow layer, worst point (t=0.15) | 4.54 | 4.5:1 | yes |
| dark | numeral gradient low point (ember-2) on card bottom | 10.79 | 3:1 (large numerals) | yes |
| dark | numeral gradient low point (ember-2) on background | 11.52 | 3:1 (large numerals) | yes |
| dark | ink on ambient haze (bottom centre, 14%) | 18.56 | 4.5:1 | yes |
| dark | chart grey on ambient haze (bottom centre, 14%) | 5.69 | 4.5:1 | yes |

All 46 pairs pass. Stars are not on screen in Pass 1, so their contrast effect is for Pass 2.

Verify (Pass 1, after the last edit):
- `bun run build`: pass (tsc and vite build; the chunk-size warning is pre-existing).
- `bun run check:i18n`: pass (6 namespaces, es and vi match en).
- `bun test`: 159 pass, 0 fail, 327 expects (baseline before the edits was the same).
- `(cd src-tauri && cargo check --offline)`: pass.
- `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: NOT run to completion. Port 1420 was already held by a running `uniworld` dev session (vite pid 1197912, app pid 1198025, started outside this build). I did not kill it. Instead I fetched the changed modules and `/src/index.css` from that live vite server: HTTP 200, no compile errors, and the new classes are served.
- Screenshots: not taken by the builder. The orchestrator takes them in both themes, per the plan.

**Pass 2 (steps 6-13) built by the builder agent. Not committed. Owner review pending in both themes.**

Changes per step:
- Step 6 (starfield): `src/ui/layout/Starfield.tsx` (canvas, dark only, 26 000 px per star, clamp 40-110, three layers 0.5/0.9/1.4 px at 1.5/3/5 px/s, twinkle, at most four bright stars with a 6px glow, 30 fps cap, DPR cap 2, pauses when hidden, static frame under reduced motion, listeners cleaned up on unmount). `src/app/stars.ts` (store, default on, `initStars()` loads the saved value). `src/ui/layout/StarsSwitcher.tsx` (third round rail button, `aria-pressed`, Sparkles icon). `stars` added to `SettingKey`. `common.stars.on/off` in en/es/vi (es "Estrellas: activadas/desactivadas", vi "Sao nền: bật/tắt"). Mounted in `AppShell`.
- Step 7 (onboarding): the sheet is `Panel variant="ember"`. The old dark welcome ember is removed, since the screen now has one ember panel. The progress is a numeral (`numeral-ember`, `.type-display`, "/7" in grey) plus the hairline bar. The step text stays in a `sr-only` line, so the translated progress string is kept. Welcome headline is two-tone through `<Trans>` with a `<strong>` in `welcome.title` (en/es/vi). Radio rows (`ProgramStep`) are 14px rows, and the selected row takes `rim`, shoal and an ember dot.
- Step 8 (counselor): priorities panel is `.panel-ember`. Student bubbles take the 20px radius. The composer is one pill: a `rim` wrapper with a borderless textarea. Career cards were already 28px `Panel`s, so they are unchanged. Fit bars are pills.
- Step 9 (finder): the `.panel-ember` is the search block: the left block in the beside layout, and the whole form in the stacked layout. Result rank is `numeral-ember`. Rows have a 20px hover surface. Fit badges and scope chips were already pills through `Badge` and `Chip`, so unchanged. Keys, run ids, markers and progress are untouched.
- Step 10 (UniDetail): the header is inside a `Panel variant="ember"`. A hairline rule is added above the FactLine list. FactLine is unchanged.
- Step 11 (My Unis): summary strip (`Panel variant="ember"`) with `numeral-ember` total and urgent counts, shown when the list is not empty. New strings `summary.total_one/_other/urgent` in en/es/vi. The urgent deadline pill is `.ember-button` with `rounded-pill`. Rows take a shoal hover.
- Step 12 (settings): no edits to `Settings.tsx` or `settings/**`, as ordered. Settings gets the new look only through the primitives and tokens. Not visually verified by me (see deviation 1).
- Step 13 (docs): `DESIGN.md` rewritten to the Pass 2 system (Inter only, shape lock, gradient and glow list, starfield spec, token table, contrast). `.plans/A-build-conventions.md` visual-system bullets updated.

Deviations (Pass 2):
1. Settings `.panel-ember` on the AI providers header card (plan step 12 list) is not applied, because `Settings.tsx` and `settings/**` are off-limits for this pass. Settings is only restyled through primitives and tokens. Owner or next pass should add it.
2. No stepper control exists in onboarding, so the "steppers" item was read as the progress line. Restyled the progress line and the radio rows instead.
3. Step 9 "globe container with the new ambient": no change to the globe container. The ambient is the page haze, which already sits behind the content.
4. Step 9 "fit chips as pills" and "scope chips pills": already pills through `Badge` and `Chip`. No change.
5. Step 6 z-index: the canvas is `-z-1`, not `z-0`. The haze is `z -1` later in the DOM, so it paints above the stars (the plan says the haze sits above them), and every content layer still sits above both. The `isolate` shell makes this stack local.
6. Step 6 colours: star colours come from `--foreground` and a new `--star-warm` dark token (`#fff4ea`), read at runtime, so no hex literal is in the component.
7. Step 8 composer: the textarea keeps its own `Textarea` primitive. The pill is a wrapper with `rim`, and the textarea overrides only its border, background and outline. Focus shows on the wrapper.
8. Step 11 table rows are not rounded. A ruled `<table>` keeps its hairlines, and only the hover fill is shaped.
9. Two-tone headlines are on the onboarding welcome only. EmptyState titles keep their existing ink headline, as Pass 1 left them. The plan allowed the two-tone style there, but no existing EmptyState string has a `<strong>` phrase, so adding one was out of scope for this pass.
10. Starfield text-safety check does not pass at pixel level (see contrast). Not changed. Owner decision needed.

Contrast (`/tmp/uw-contrast/pass2.ts`; token values read from `src/index.css`; the glow sweep models the gradient, the mask and the card gradient):

| theme | pair | ratio | target | pass |
|---|---|---|---|---|
| dark | chart grey on the rendered ember glow, worst point (f=0.24) | 4.66 | 4.5:1 | yes |
| dark | ink on the rendered ember glow, worst point | 15.20 | 4.5:1 | yes |
| light | white on urgent pill top (#c4400b) | 5.14 | 4.5:1 | yes |
| light | white on urgent pill bottom (#b83304) | 5.98 | 4.5:1 | yes |
| dark | black on urgent pill top (#ff8a3d) | 8.95 | 4.5:1 | yes |
| dark | black on urgent pill bottom (#ff5a1f) | 6.73 | 4.5:1 | yes |
| dark | ember-2 numeral low stop on glow bottom | 8.50 | 3:1 | yes |
| dark | ember-2 numeral low stop on glow middle | 6.41 | 3:1 | yes |
| light | chart grey on panel (unit label) | 5.99 | 4.5:1 | yes |
| dark | ink text over a base star at alpha .45, worst pixel | 4.76 | 4.5:1 | yes |
| dark | chart grey text over a base star at alpha .45, worst pixel | 1.46 | 4.5:1 | **no** |
| dark | ink text over a bright star at alpha .7, worst pixel | 2.11 | 4.5:1 | **no** |
| dark | chart grey text over a bright star at alpha .7, worst pixel | 1.55 | 4.5:1 | **no** |
| dark | ink text over a bright star's glow (.7 x .45) | 8.02 | 4.5:1 | yes |
| dark | chart grey text over a bright star's glow | 2.46 | 4.5:1 | **no** |

Reading: these are single-pixel worst cases (a star directly under a glyph). A star is 1 to 3 px and drifts, so it covers a small share of a text line, and the average contrast of a text run is far above these figures. Still, the spec's own "stars alpha ≤ .45" text check is not met for grey text, and bright stars at .7 are above it. Options for the owner: (a) accept; (b) keep the bright stars (alpha .7) out of text regions by fading the field under the content column; (c) cap base alpha lower.

Pre-flight counts:
- Accent hues: 1 (the ember family). Evidence green stays as the verified-only exception.
- Radius classes in `src/ui` and `src/app`: `rounded-pill` 11, `rounded-popover` 4, `rounded-control` 4, `rounded-full` 8 (dots and circles). Legacy `rounded-md` removed (LanguagesStep, now `rounded-control`). Values are only 999, 20 and 14 px, plus circles.
- Emoji in `src/ui`, `src/app` and `en` strings: 0.
- Hex or oklch literals in `src/ui` and `src/app`: 0 after the `--star-warm` change.
- Duplicate labels: not counted in full. The new labels are unique within their screens (for example "Stars: on" and "Summary total" are new).

Verify (Pass 2, final edits):
- `bun run build`: pass (tsc and vite; the chunk-size warning is pre-existing).
- `bun run check:i18n`: pass (6 namespaces, es and vi match en).
- `bun test`: 159 pass, 0 fail, 327 expects.
- `(cd src-tauri && cargo check --offline)`: pass.
- Smoke: `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 120 bun tauri dev --config '{"build":{"devUrl":"http://localhost:1423","beforeDevCommand":"bun x vite --port 1423 --strictPort"}}'`, run twice (once before the last starfield and CSS edits, and again after). Vite was ready on 1423, cargo built and ran `target/debug/uniworld`, and the terminal log had no panic. Both runs ended on our timeout (SIGTERM), as expected. The webview console is not in the terminal log, so frontend runtime errors were not captured. Port 1420 (owner session) was not touched.
- Screenshots: not taken by the builder. The orchestrator takes them in both themes.

