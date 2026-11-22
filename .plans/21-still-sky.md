# 21 — Still sky (replaces the drifting starfield)

Why: on Linux software WebKitGTK every full-window repaint costs 10–20 ms (see 20-starfield-optimization-handoff.md). Drift repaints the whole window. A still sky costs nothing; small twinkles and rare shooting stars repaint only tiny boxes.

## Rules
- Branch `feat/ui-opencode`. Another agent edits the same folder: `git status` first, commit ONLY the files listed below.
- Files in scope: `src/ui/layout/Starfield.tsx`, `src/index.css` (the `.star-field` block + new `.star-twinkle` / `.star-shoot` rules and keyframes), `DESIGN.md` (Starfield section). Nothing else. Keep the `Starfield({ enabled })` export and the AppShell mount unchanged.

## Build
Rewrite `Starfield.tsx` (target ~100–130 lines; delete idle detection, timers loop, rate stepping, governor, clock, drift, edge fade, route-change poke, useLocation).

1. **Static canvas.** Keep the canvas (`.star-field`, DPR 1, backing = CSS size). Draw ~300 stars once on mount and after a debounced (200 ms) resize: same density (1 per 7000 px²), three depth layers (shares .55/.30/.15, radii .5/.9/1.3, alpha ranges as today), 15% warm tint from `--star-warm`, colours read from `--foreground` / `--star-warm`. No animation, no timers except the resize debounce. Keep the 12px glow sprite approach for glows. Re-seed stars on resize (just redraw fresh).
2. **Twinkles.** On the near layer, instead of drawing 6 "bright" stars into the canvas, render 10 absolutely-positioned DOM elements (`.star-twinkle`, ~16×16 px, radial-gradient dot with glow, `position:fixed`, random left/top in %, `pointer-events:none`, `aria-hidden`) in a wrapper. CSS keyframe animates `opacity` only (e.g. 0.25 → 1 → 0.25), duration 5–9 s random per element via inline `animation-duration`, negative random `animation-delay` so they are staggered. Use `will-change: opacity`. Render them in the same fixed layer (z-index -2) via a wrapper div with `contain: strict`, or as siblings in a fragment — each must stay at z-index -2.
3. **Shooting star.** One element `.star-shoot` (thin ~80×1.5 px gradient streak, rotated ~25°, hidden by default). Every 30–60 s (random) pick a random start in the upper 60% of the screen, restart a ~900 ms `transform: translate(...)`+`opacity` animation (Web Animations API `el.animate`, or CSS class toggle), then schedule the next. Only transform/opacity. No timer while paused.
4. **Pauses.** Render nothing when `!enabled`, theme not dark, or `useReducedMotion()` is true → in reduced motion draw the static canvas only (no twinkles, no shooting stars). Hidden document (`visibilitychange`) or window `blur`: cancel the shooting-star timer, set twinkles to `animation-play-state: paused` (class on wrapper); resume on visible/focus.
5. **Cleanup.** The effect must remove every listener and clear every timer/animation on unmount or when inactive.
6. Update the comment at the top of the file and the `.star-field` comment in index.css. Remove stale mentions of plan 19 drift/idle.
7. `DESIGN.md` Starfield section: rewrite to the new approach (static canvas + ~10 CSS-opacity twinkles + occasional shooting star), keep the measured reason (9 fps vs 62 fps), the density, radii, alpha, colour, control and layer bullets that still apply; delete idle-only / self-protection / drift bullets.

## Verify (run all, report output)
`bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)`. Do NOT launch the owner's app. Do not commit; leave the diff for review.

## Acceptance
- No rAF or interval loop; only a resize debounce and one shooting-star timeout.
- Animations touch only opacity/transform on tiny elements.
- Stars off / light theme / reduced motion / hidden window → nothing animates.
- Frame-rate check (Sonnet does this after review, scratch worktree per handoff) must hold ≥ 58 fps.
