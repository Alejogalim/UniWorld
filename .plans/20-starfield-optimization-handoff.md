# 20 — Starfield optimization: handoff plan (read this first in a fresh session)

Goal: make the drifting stars look smoother **without making the app heavier**. Nothing here is built yet. This file captures the diagnosis, the measurements, the plan and the open questions from the previous session.

## Working rules from the owner (follow them)
- Roles: **Sonnet plans, Haiku builds** (delegate with the Agent tool, `model: "haiku"`), **Sonnet reviews only when the owner asks for a review**. Do not create code with the orchestrating model itself.
- The owner often says "no code yet, just plan"; build only after they confirm.
- Branch: work on `feat/ui-opencode` (already merged into `main` at `ab5e83f`). Push the branch; merge to `main` only when asked.
- **Another agent (OpenCode) edits the same folder** (`/home/alejogalim/Documents/Projects/UniWorld`). Before committing, run `git status` and commit **only your own files**. Never revert or reformat theirs. Prefer a separate worktree for risky experiments.
- Never use `pkill -f` / `killall` (it killed a shell before). Kill only processes you started, by PID. The owner's own `uniworld` app may be running; never kill it.
- Read `.plans/A-build-conventions.md`, `DESIGN.md` (The Ember Chart) and `.plans/19-stars-no-lag.md` first. `DESIGN.md` has a Starfield section that must be kept in sync.

## Current implementation (commit `ab5e83f`)
- `src/ui/layout/Starfield.tsx`: one full-window `<canvas>` (backing store = CSS size, DPR 1), `pointer-events:none`, `aria-hidden`, `z-index:-2`, `contain: strict`. Mounted in `src/ui/layout/AppShell.tsx` under the rail/header/main. Dark theme only; toggle button in the rail (`StarsSwitcher.tsx`, `src/app/stars.ts`, setting key `stars`).
- About 300 stars on 1920×1080 (1 per ~7 000 px²), three depths (radius 0.5 / 0.9 / 1.3, speeds 1.5 / 3 / 5 px/s toward the upper-left), alpha 0.14–0.32, ≤ 6 bright stars (alpha 0.6 with a baked glow sprite), 15% warm tint (`--star-warm`), slow per-star twinkle inside the same redraw.
- **Idle-only motion:** any pointer/wheel/key/scroll event or route change stops all star work; stars resume 600 ms after the last input. While idle it redraws at **4 fps** from a `setTimeout` loop (not rAF). Positions are computed from elapsed time, so resuming never jumps.
- Self-protection: if redraws are slow, 4 → 2 → 1 fps, then freeze. Pauses for hidden/blurred window, reduced motion, light theme, toggle off.
- The ambient ember haze (`.ambient-haze`, a static fixed radial gradient) and the outer-only ember glow on `.panel-ember` are separate, static, and not part of this task.

## Measurements (real app, 1920×1080, Linux WebKitGTK with `WEBKIT_DISABLE_DMABUF_RENDERER=1` = software compositing and software WebGL)
| Case | Frame rate |
|---|---|
| Old CSS-animated tile layers (3 drift + 2 twinkle layers) | **9 fps**, worst frame 115 ms |
| Stars hidden | **62 fps**, worst 17 ms |
| Only the far layer drifting (CSS) | 39 fps |
| Static tiles, twinkle hidden | 62 fps |
| **Current idle-only canvas** (idle and while typing) | **62 fps**, worst 17 ms |
- Lesson: the cost is **painting/compositing**, not JS and not CPU load (CPU stayed near 0% while the UI crawled). Every full-window layer that changes costs about 10–20 ms per update in this software path. CPU graphs do not show it; **always measure frame rate**.
- The shipping target is Windows (WebView2, GPU compositing), where the old CSS drift would likely run fine. The lag is specific to the owner's Linux software-rendering path, so the star rate should **adapt to the machine**, not be hard-coded to the worst case.

## The problem to solve now
At 4 fps each redraw moves a star about 0.4–1.2 px, so the drift reads as small hops. We want smoother motion with no extra cost to the UI.

## Plan (in order of payoff)
1. **Sub-pixel soft stars.** Draw stars as pre-rendered soft sprites (small radial-alpha sprites per radius/alpha bucket, drawn with `drawImage` at **fractional** coordinates) so bilinear smoothing blends between positions; slow stars then look continuous even at 4 fps. No extra cost.
2. **Auto-calibrate the idle redraw rate.** At startup (and after a resize), run a ~1 s test redrawing at 12 fps and measure how late timer ticks and frames arrive. Choose the highest rate from {2, 4, 8, 12, 20, 30} that keeps the UI ≥ 55 fps and one redraw ≤ ~12 ms. Cache the result in the `settings` table (new key, e.g. `stars_rate`) and recheck rarely (e.g. each app start, or when the window size changes by > 25%). Keep the existing step-down protection as a safety net. Expected: Linux box ≈ 4–8 fps, a GPU machine 30 fps or more.
3. **Cheaper redraws** so step 2 can go higher: repaint only small boxes around stars instead of clearing the whole canvas; split stars by depth into 2–3 canvases that update at their own rates (far stars need few updates); try `getContext('2d', { desynchronized: true })` if supported; shrink the star count automatically when redraws are slow; skip a redraw when nothing would move by ≥ 0.25 px.
4. **Gentler resume.** Keep idle-only motion, but fade the motion back in over ~400 ms after input stops so the field does not freeze and jump. While the pointer is moving, show the static last frame.
5. **A permanent frame-rate check (dev only).** Keep the probe below behind a dev switch (e.g. `?perf` or `import.meta.env.DEV` + a localStorage flag), writing fps and worst-frame time somewhere readable. Targets: UI ≥ 58 fps during interaction and while stars drift; a single star redraw ≤ 25 ms. Every starfield change must pass.
6. **Optional, Finder only:** render stars inside the globe's three.js scene as `Points` so they cost almost nothing while the globe is already rendering. Only if the Finder still feels heavy with stars on.

## Open questions for the owner (ask before building)
1. Should stars **pause completely while the user interacts** (recommended, cheapest; current behaviour), or keep drifting even at a very low rate?
2. Do they want step 6 (stars inside the globe scene on the Finder), or leave the globe alone?

## How to measure frame rate (reproducible method)
Never test in the owner's running app. Use a **scratch git worktree** and a separate config/DB copy:
1. `git worktree add --detach <scratch>/wt HEAD` and `ln -s <repo>/node_modules <scratch>/wt/node_modules` (fonts from the symlinked `node_modules` fail Vite's allow list; that only changes fonts, fine for fps).
2. Copy the owner's config dir so the app has a profile: `cp -r ~/.config/com.uniworld.app <scratch>/cfg/` and set `settings` rows `theme=dark`, `stars=on` in that DB copy (`sqlite3`).
3. Add a dev Vite plugin `fps-sink.ts` (middleware at `/__fps` that appends each request's query to a log file) and register it in the scratch `vite.config.ts`. Add this probe to the scratch `src/main.tsx`:
```ts
let frames = 0, last = performance.now(), worst = 0, prev = last;
const tick = (t: number) => { frames++; worst = Math.max(worst, t - prev); prev = t; requestAnimationFrame(tick); };
requestAnimationFrame(tick);
setInterval(() => { const now = performance.now(); const fps = Math.round(frames * 1000 / (now - last));
  fetch('/__fps?' + encodeURIComponent(`fps=${fps} worst=${Math.round(worst)}ms`)).catch(() => {}); frames = 0; worst = 0; last = now; }, 2000);
```
4. Run it on its own port and cargo target so nothing collides:
`CARGO_TARGET_DIR=<scratch>/target-wt XDG_CONFIG_HOME=<scratch>/cfg WEBKIT_DISABLE_DMABUF_RENDERER=1 bun tauri dev --config '{"build":{"devUrl":"http://localhost:1424","beforeDevCommand":"bun x vite --port 1424 --strictPort"}}'`
(the first compile takes a few minutes; later runs are fast). To test variants live, import a `src/probe.css` from the scratch `index.css` and swap its contents (HMR applies it), or copy the changed `Starfield.tsx` into the scratch tree.
5. **Pitfalls learned the hard way:**
   - WebKit stops painting windows that are hidden or covered, so `fps=0` just means the window is not visible. Keep the scratch window on the visible workspace and focused while measuring (`hyprctl dispatch focuswindow address:<addr>`), and ignore `fps=0` readings. This does switch the owner's workspace, so measure briefly and tell them.
   - Hyprland may reuse window addresses; identify the scratch window by its PID, not by a remembered address.
   - Heavy probe styles (`*{...!important}`) can wedge the page; restart the scratch app by PID if readings stay at 0.
   - To check the stars are visible and moving without a screenshot, have the probe read the star canvas (`getImageData`) and report the lit-pixel count and a checksum; changing checksums mean it is moving.
   - Do not take screenshots of the full screen: other windows (e.g. the owner's Orca) can be on top. Capture only a window you can verify is the scratch one, or avoid screenshots.
6. Clean up when done: kill the scratch app by PID, `git worktree remove --force <scratch>/wt`, `git worktree prune`, delete the scratch target dir.

## Acceptance for the optimization
- Frame rate stays ≥ 58 fps during interaction and while stars drift (probe).
- Idle drift is visibly smoother (no 1-px hops) on the owner's Linux machine; a faster machine automatically gets a higher rate.
- No `requestAnimationFrame` loop running while the user is active or the stars are off/hidden/light theme.
- `bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)` pass.
- `DESIGN.md` Starfield section updated (new approach, numbers, measured reasons).
- Commit only star-related files; leave the other agent's changes alone.

## Builder notes
