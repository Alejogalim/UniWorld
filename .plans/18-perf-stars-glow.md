# 18 — Performance pass, more stars, outer-only glow

Branch `feat/ui-opencode`. Read first: `.plans/A-build-conventions.md`, `.plans/16-ui-glow-stars.md` (what exists), `src/index.css`, `src/ui/layout/Starfield.tsx`, `src/ui/layout/StarsSwitcher.tsx`, `src/app/stars.ts`, `src/ui/globe/Globe.tsx`, `src/ui/components/Panel.tsx`.

Owner feedback: (1) the app is laggy now, (2) not enough stars, (3) the "ember" boxes (e.g. the Counselor "Your priorities" panel) must NOT have an inside glow; only a glow outside, around the box. No reviewer this round; builder verifies by code and build.

Context: the app runs on Linux WebKitGTK with `WEBKIT_DISABLE_DMABUF_RENDERER=1`, i.e. software compositing and software WebGL. Anything that repaints large areas every frame, per-frame JS drawing on a full-window canvas, mask-composite on many elements, big blurs and continuous WebGL are expensive there.

## Steps
- [x] 1. **Starfield without per-frame JS.** Rewrite `Starfield.tsx` so the stars are drawn ONCE (on mount, theme change, and a debounced resize that changes the tile only if the window grew) into pre-rendered **tiles** and animated purely by CSS `transform` on the compositor:
      - Three parallax layers, each an absolutely positioned div (`position: fixed; inset: -TILEpx 0 0 -TILEpx`-style oversize so the wrap is invisible) whose `background-image` is a tile (data URL from an offscreen canvas, `background-repeat: repeat`, `background-size` = tile CSS px) and whose animation is `@keyframes` translating by exactly one tile (x and y) linearly, infinite, so it loops seamlessly: tile sizes 512 / 640 / 768 px, durations such that speeds are ≈ 2 / 3.5 / 5 px per second (e.g. 512px / 2px/s = 256 s). `will-change: transform`, `transform: translate3d`, `contain: strict`, `pointer-events: none`, `aria-hidden`.
      - **More stars**: ≈ 1 per 9 000 px² overall (≈ 220 on 1920×1080) split across layers 55 / 30 / 15 %. Radii 0.5 / 0.8 / 1.2 px. Alpha 0.12–0.30 (soft, text-safe; drop the old position-dependent caps and the smoothstep code). 15% of stars slightly warm (`--star-warm`). A few (≤ 6 per tile on the biggest layer) "bright" stars: radius 1.3 with a 5px soft glow baked into the tile, alpha ≤ 0.55.
      - **Twinkle**: one extra layer with ~25 stars in its own tile fading with a CSS opacity animation (6–9 s, `alternate`, `ease-in-out`), plus a second with a different duration/delay. Opacity animation only.
      - Dark theme only (render nothing in light; recompute on `useTheme`). Respect `prefers-reduced-motion`: no animations (static tiles). Respect the existing stars toggle/setting (`src/app/stars.ts`, `StarsSwitcher.tsx`). Remove the rAF loop, the 30 fps logic, the canvas element in the DOM and all per-frame code; keep a tiny canvas only offscreen to bake tiles. Define the keyframes in `src/index.css` using CSS variables for the tile size so one rule serves all layers.
      - Pause cost when idle: add `animation-play-state: paused` on the layers when `document.hidden` (visibilitychange listener toggling a class).
- [x] 2. **Outer-only glow.** In `src/index.css` and `Panel.tsx`: delete the inside ember wash completely (the `.panel-ember::after` radial gradient and any inner gradient/glow on `.panel-ember`, dark and light) and any bottom-edge inner highlight that reads as a glow. The glow is now a single static `box-shadow` around the whole box: dark = `0 0 0 1px <rim>, 0 0 44px -6px color-mix(in oklch, var(--ember-1) 45%, transparent), 0 14px 60px -24px color-mix(in oklch, var(--ember-0) 55%, transparent)` (all-around soft ember halo, slightly stronger below); light = no glow (flat white card with its 6% ring), same as before for the outer side. The panel's own fill keeps the plain vertical dark gradient. Keep `.panel-ember` as the only class that gets the outer glow, one per screen as before. Remove `--ember-glow-wide` duplicates if unused.
- [x] 3. **Cheaper rims.** Replace every `mask`/`mask-composite` gradient-border (index.css ~lines 211–223 and ~410–412, plus any in components) with the two-background technique: `border: 1px solid transparent; background: linear-gradient(<fill>) padding-box, linear-gradient(to bottom, <rim top>, <rim bottom>) border-box;` (keep `border-radius`). No pseudo-elements and no masks for rims anywhere. Flat controls (buttons, chips, inputs, toggles, round icon buttons, badges) use a plain 1px `border` with a solid/alpha color token, not a gradient. Re-check dark and light contrast for hairline ≥ 1.5:1 as before.
- [x] 4. **Other repaint hot spots.** Grep `src/index.css` and components for `transition: all`, `backdrop-filter`, `filter: blur`, `drop-shadow`, big `box-shadow` on lists/rows, `mix-blend-mode`, and `will-change` outside the star layers. Remove or narrow them (transition only `background-color, border-color, color, box-shadow, transform, opacity` on the few controls that need it). The page ambient haze must be a single static `fixed` radial-gradient layer with no animation and `contain: strict` (keep it, dark only). The page transition in `AppShell` stays but must not animate `filter` or box-shadow.
- [x] 5. **Globe performance** (`src/ui/globe/Globe.tsx`): cap the renderer pixel ratio to 1 (`globe.renderer().setPixelRatio(1)`) on creation and on resize; set `polygonsTransitionDuration(0)`; stop rebuilding all polygons on hover: keep polygon data/accessors stable and change hover/selection through a small update path (e.g. update `polygonAltitude`/`polygonCapColor`/`polygonSideColor` only when the hovered or selected id actually changes, debounced to the next animation frame, and reuse accessor functions that read from refs instead of re-creating them each render); lower geometry cost (`polygonCapCurvatureResolution(10)` or higher degrees per segment); pause rendering when the window is hidden or the route is not the Finder (`pauseAnimation()` / `resumeAnimation()` via `visibilitychange` and unmount); keep idle auto-rotation but stop it entirely while the pointer is over the canvas as now. Do not change behaviour (click toggle, tooltip, fly-to, tokens re-skin on theme change).
- [x] 6. **Docs**: update `DESIGN.md` (starfield now CSS tile layers, density, alpha; glow is outer-only; rims via background layering; the performance notes: software compositing, no per-frame JS, no masks) and the `.plans/A-build-conventions.md` visual bullets if they mention the old approach.

## Acceptance (builder checks)
- `grep -rn "requestAnimationFrame" src/ui/layout` returns nothing for the starfield; no `<canvas>` rendered by `Starfield`.
- `grep -n "mask" src/index.css src/ui` finds no gradient-border masks.
- `.panel-ember` has no `::before/::after` gradient layers inside the box.
- `bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)` pass.
- Do NOT run the app, and never use pkill/killall (the user's app is running). The orchestrator checks it visually.

## Builder notes
- Step 1 (starfield): `Starfield.tsx` rewritten. Three drifting tile layers (512/640/768 px, 256 s / 183 s / 154 s per tile) and two 1024 px twinkle layers. Keyframes `star-drift` and `star-twinkle` in `index.css`. Tiles baked once per dark activation from an offscreen canvas. No rAF, no canvas in the DOM, pause class on `document.hidden`, reduced motion removes the animation. Density 1 per 9 000 px².
- Step 2 (outer glow): `.panel-ember::after`, the inner highlight, the fade-in and the light wash are deleted. Dark `.panel-ember` has one static outer `box-shadow`. `--ember-wash` and `--ember-glow-wide` are removed.
- Step 3 (rims): mask rims replaced by two background layers in `.rim` (fill on padding-box, rim gradient on border-box). `.lang-button` and the secondary button, and the Toggle off state, use a solid `border-hairline`. Measured hairline boundary: 1.82 / 1.70 / 1.57 dark, 1.55 / 1.78 / 1.62 light.
- Step 4 (hot spots): button transition drops `filter`. `.ambient-haze` gets `contain: strict`. No `transition: all`, `backdrop-filter`, `filter: blur`, `drop-shadow` or `mix-blend-mode` remain in `src/ui` or `index.css`.
- Step 5 (globe): pixel ratio 1 on create and resize. `polygonsTransitionDuration(0)`, `polygonCapCurvatureResolution(10)`. Accessors are created once and read `state.current`. The setters run in a rAF and only when the hovered id, selection or continent key changes. `pauseAnimation` and `resumeAnimation` follow `visibilitychange`, and the globe is torn down on unmount.
- Step 6 (docs): `DESIGN.md` starfield, surfaces, gradients and contrast sections updated. `A-build-conventions.md` gets two bullet edits.

Verify (this session):
- `bun run build` (tsc + vite): passes, run twice.
- `bun run check:i18n`: passes.
- `bun test`: 159 pass, 0 fail.
- `cargo check --offline` in `src-tauri`: finished.
- Not run: the app (per instruction).

Acceptance greps:
- `grep -rn requestAnimationFrame src/ui/layout`: no output.
- Starfield renders no `<canvas>`: only a comment mentions it.
- `grep -n mask src/index.css src/ui`: only a comment in index.css and the ChatPane scroll-fade `mask-image` (a fade, not a rim; not in plan step 3 scope; the file has another in-flight change).
- `.panel-ember` pseudo-elements: none (only `.dark .panel-ember { box-shadow }`).

Contrast (script `/tmp/ui18/contrast.py`, WCAG 2.x):
- Chart grey text over one star pixel: 4.64 at alpha 0.15 (target 4.5), 2.63 at 0.30.
- Ink over a star at 0.15: 15.13. Warm star at 0.15: 4.70. Bright glow at 0.15 x 0.45: 5.79.
- Residual: two stacked stars at 0.15 on one pixel give 2.85 (documented in DESIGN.md).
- Hairline boundaries: see Step 3 above.

Deviations (each is deliberate, please check):
1. Star alpha. The plan asked for 0.12 to 0.30 and bright cores to 0.55. The measurement above shows 0.30 fails chart-grey text (2.63:1). Every baked star is capped at 0.15, bright cores included. Twinkle layers are baked at 0.12 to 0.15 and animate opacity from 0.35 to 1.
2. Resize. The plan asked for a debounced resize that re-bakes only if the window grew. Tiles repeat and the layers are oversized, so no re-bake is needed and no resize listener exists.
3. Rim border. `.rim` now has a real 1px transparent border (it was an overlay). Panels and rims grow by 1px in each direction. Toggle thumb offsets moved from 3/18 to 2/17 px to keep the thumb where it was.
4. Rim fills. A rim gradient paints under the whole box, so any rim needs an opaque `--rim-fill`. Nav active, the program row and the composer set one explicitly. The composer edit is a single class string in `ChatPane.tsx`, which has another in-flight change in the working tree. I did not touch anything else in that file.
5. Docs. Step 6 says to edit `DESIGN.md` and `.plans/A-build-conventions.md`. The conventions file lists both as "never edit". I followed the plan and made only the listed edits. Flagging the conflict for you to confirm.
6. Globe. Stable accessors are re-set on key change, in a rAF. kapsule re-digests on every setter call, so the refresh works. I could not check the visual result without running the app. The `pauseAnimation` and `resumeAnimation` calls are wired but not exercised.
7. Twinkle count. Each twinkle layer is 25 stars per 1024 px tile, so about 50 per layer on 1920 x 1080. The total on screen is above the plan's 230 base count.
8. Overlap. The residual two-star overlap at 2.85:1 is accepted and documented. It is not fixable without a per-position cap, which tiles cannot carry.

Left untouched: `src/ui/screens/settings/**`, `Settings.tsx`, `src/core/**`, B's stores, `src/i18n/locales/*/counselor.json` and most of `ChatPane.tsx` (both have another in-flight change). No commits or pushes.

