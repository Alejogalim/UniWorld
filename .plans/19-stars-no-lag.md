# 19 — Starfield that does not lag

Branch `feat/ui-opencode`. Read first: `.plans/A-build-conventions.md`, `.plans/18-perf-stars-glow.md`, `src/ui/layout/Starfield.tsx`, `src/index.css` (`.star-field`, `.star-layer`, `.star-twinkle`, keyframes), `src/ui/layout/AppShell.tsx`, `src/app/stars.ts`.

## Measured evidence (real app, frame-rate probe, software WebKitGTK, 1920×1080)
- Stars hidden: **62 fps**. Current CSS-tile starfield on: **9 fps** (115 ms worst frame). So the starfield is THE cause of the lag.
- Only the far layer drifting (no twinkle): 39 fps. Static tiles with twinkle hidden: 62 fps. Every full-window animated layer costs about 20 ms per frame in this software compositor (no GPU). CSS-animated oversized layers are the wrong tool here. CPU load is near 0% while this happens (the cost is painting/compositing), so CPU graphs do not show it.

## New design: stars that only move when the user is idle, and almost never repaint
- [x] 1. **One small canvas, no CSS animation, no oversized layers.** A single `<canvas>` fixed behind everything (`pointer-events:none`, `aria-hidden`, `inset:0`, CSS size = viewport, backing store = viewport × **1** (never ×DPR), `contain: strict`). Remove all tile layers, twinkle layers, the keyframes and `.star-layer/.star-twinkle` CSS, and the data-URL tile baking.
- [x] 2. **Star model** (kept visible): ≈ 1 star per 7 000 px² (≈ 300 on 1920×1080), three depth layers (radius 0.5 / 0.9 / 1.3, speeds 1.5 / 3 / 5 px per second toward the upper-left), alpha 0.14–0.32 (far→near), ≤ 6 bright stars (alpha 0.6, soft glow drawn from one pre-rendered 12×12 sprite via `drawImage`), 15% warm tint (`--star-warm`), colours from tokens (read once via `getComputedStyle`; hex-only tokens). Wrap at the edges with a short fade. Twinkle = per-star slow sine on alpha computed inside the same redraw (no extra layers).
- [x] 3. **Idle-only motion (the key rule).** Stars are drawn once statically. They only advance while the user is idle: any `pointermove`, `pointerdown`, `wheel`, `keydown`, `scroll` (capture, on `window`) or a route change marks the app "active" and **stops all star work**; star motion resumes after 600 ms with no input. While idle, redraw at **4 fps** (a `setTimeout` loop of 250 ms, NOT per-frame rAF): positions are computed from elapsed time (`x = x0 - speed * t`), so resuming never jumps. During activity the canvas keeps its last frame (zero work, UI stays at full frame rate).
- [x] 4. **Self-protection.** Measure the cost of each redraw (`performance.now()` around the draw, plus the gap since the previous timer tick); if the median of the last 8 redraws exceeds 25 ms or the tick gap exceeds 400 ms repeatedly, halve the rate (4 → 2 → 1 fps); if it still exceeds, freeze the field (static frame). Never touch the DOM or React state inside the loop.
- [x] 5. **Other pauses**: `document.hidden`, window `blur`, `prefers-reduced-motion` (static frame only), `stars` setting off or light theme (clear the canvas and stop all timers/listeners). Resize: debounce 200 ms, rescale positions proportionally, add/remove stars to the new count, redraw once. Theme change: re-read colours, redraw.
- [x] 6. **Keep** the rail toggle (`StarsSwitcher.tsx`), `src/app/stars.ts`, the ambient haze, z-order (stars behind everything), and all other changes from plan 18.
- [x] 7. **Light cleanup in `src/index.css`**: delete the star-layer/twinkle/keyframes rules and the reduced-motion lines for them; keep `.star-field` only if still used as the canvas wrapper class (`position: fixed; inset: 0; z-index: -2; contain: strict; pointer-events: none`).
8. Update `DESIGN.md`'s starfield section to the new approach and the reason (measured: CSS-animated layers = 9 fps, idle-only 4 fps canvas = no cost while interacting) and the star numbers above.

## Acceptance (builder)
- `grep -rn "star-layer\|star-twinkle\|star-drift\|requestAnimationFrame" src` finds nothing in the starfield code or CSS.
- Exactly one `<canvas>` rendered by `Starfield`; backing store size equals CSS size (DPR 1).
- No `setInterval`/`setTimeout` loop runs while the stars are off, in light theme, when hidden, or when the user is active.
- `bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)` pass.
- Do NOT run the app and never use pkill/killall. The orchestrator measures the frame rate afterwards.

## Builder notes

- Step 1-7 done in `src/ui/layout/Starfield.tsx` (rewritten in one write) and `src/index.css` (`.star-field` now the canvas wrapper, z-index -2; star-layer/star-twinkle/keyframes and their reduced-motion lines removed).
- Step 8 done in `DESIGN.md` "Starfield" section. Deviation: `.plans/A-build-conventions.md` lists DESIGN.md as never-edit; step 8 of this plan asks for it, so I followed the plan.
- Deviation (interpretation): "tick gap exceeds 400 ms" is measured as lateness past the scheduled interval (gap minus 1000/rate), because at 1 fps a normal gap is already 1000 ms. Three strikes in a row step the rate down.
- Deviation (interpretation): velocity is the speed split across x and y (speed / sqrt 2 on each axis), so the magnitude is the plan's px/s.
- Route changes poke the field from a `pathname` effect; the field effect is keyed on `active` and `reduceMotion` only, so a route change does not rebuild the field.
- Idle clock: a motion clock advances only inside ticks (capped at 1 s per tick), so pausing never jumps the stars.
- Verify: `bun run build` passed (tsc + vite). `bun run check:i18n` passed. `bun test` 159 pass, 0 fail. `(cd src-tauri && cargo check --offline)` finished. Did not run the app.
- Acceptance greps: `star-layer|star-twinkle|star-drift|requestAnimationFrame` in `src/ui/layout` and `src/index.css` and `src/app/stars.ts`: no matches. One `<canvas>` in Starfield.tsx. Only setTimeout (no setInterval), all inside the motion loop, resize and resume timers.
- Settings.tsx, settings/**, src/core/**, B's stores: not touched. No commits.
