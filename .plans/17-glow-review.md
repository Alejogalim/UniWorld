# 17 — Review of plan 16 (Ember glow + stars)

Reviewed: working tree on `feat/ui-opencode` (diff + untracked), plan 16, `DESIGN.md`, `.plans/A-build-conventions.md`, and the ten screenshots in the scratchpad `glow/` folder.

## Summary

The work follows plan 16 closely and the build is clean. Verify results (run by the reviewer, nothing edited):

| command | result |
|---|---|
| `bun run build` | pass (chunk-size warning is pre-existing) |
| `bun run check:i18n` | pass (6 namespaces, es and vi match en) |
| `bun test` | 159 pass, 0 fail |
| `(cd src-tauri && cargo check --offline)` | pass |

Regressions: `git diff --stat` shows no edits to `src/core/**`, `src/ui/screens/Settings.tsx` or `src/ui/screens/settings/**`. `grep -ri "agrave\|plex"` over `src`, `README.md`, `DESIGN.md`, `package.json` finds nothing. `initStars()` is called from AppShell and the `stars` key is in `SettingKey`. New es/vi strings are translated and the welcome `<strong>` phrase is a phrase, not a word.

What is wrong: the dark Finder panel stretches to window height; disabled primary buttons look like a smudge; the globe has no ember atmosphere; the starfield can put grey text at 1.46:1 under a star; the 30 fps cap probably runs at 20 fps; the panel glow uses a `blur(28px)` filter that is costly in WebKitGTK software rendering (this machine runs with `WEBKIT_DISABLE_DMABUF_RENDERER=1`). All have small fixes below.

Counts: 0 blockers, 5 important, 9 minor.

---

## Important

### 1. Dark Finder search panel stretches to full height (confirmed, large)
- Where: `dark-finder.png`; `src/ui/screens/finder/FinderForm.tsx:83`.
- Problem: the `Panel` is a grid item in `grid gap-8 min-[1100px]:grid-cols-[420px_minmax(0,1fr)]`, and grid items stretch. The panel is as tall as the globe column (about 870px) while its content ends at 720px, so about 300px of empty card is filled with a tall ember glow. It reads as a bug. (In the light shots the grid is one column below 1100px so it does not show.)
- Fix: add `self-start` to the panel: `<Panel variant="ember" className="flex min-w-0 flex-col gap-8 self-start">`. Do the same on the `Finder.tsx:151` grid children if the left column there is also a `Panel` (it is not today; no change needed). The stacked branch at line 94 is a normal block and needs nothing.

### 2. Disabled primary buttons look washed (confirmed)
- Where: `dark-finder.png` (Search universities), `dark-counselor.png` (Send), `light-finder.png`, `light-counselor.png`; `src/ui/components/ui/button.tsx:11` (`disabled:opacity-50`).
- Problem: 50% opacity on the ember gradient gives salmon on light paper and muddy brown on black. It still says "ember" while meaning "unavailable", and the grey caption is hard to tell from it.
- Fix: in the `primary` variant string append (these override `.ember-button` because it lives in `@layer components`, and the variant comes after the base in `cva`, so tailwind-merge keeps them):
  `disabled:opacity-100 disabled:bg-none disabled:bg-shoal disabled:text-chart-grey disabled:shadow-none`
  Result: a neutral shoal pill with grey label. Contrast chart grey on shoal is 5.44 (light) and 5.55 (dark), so it passes even though disabled text is exempt. Leave `disabled:opacity-50` for secondary and quiet. Also the Send button in `ChatPane.tsx` inherits this, no extra change. Add `disabled:hover:brightness-100` so the hover filter does not apply (pointer events are already off, so this is optional).

### 3. Starfield 30 fps cap probably runs at about 20 fps
- Where: `src/ui/layout/Starfield.tsx:~140` (`if (now - lastDraw < FRAME_MS)`).
- Problem: on a 60 Hz display rAF stamps arrive about 16.7 ms apart. Two frames equal 33.33 ms, which can fall just under `1000 / 30` (33.333...) because of timestamp rounding, so the frame is skipped and the draw happens at 50 ms. Result: 20 fps, visibly steppier drift.
- Fix: `if (now - lastDraw < FRAME_MS - 4) {` (a 4 ms tolerance). Leave the `dt` clamp as is, since movement already uses real dt.

### 4. Stars can sit under text at 1.46:1; propose a text-safe scheme
- Where: plan 16 contrast table (grey text under a base star at alpha .45 is 1.46:1, under a bright star 1.55:1); `Starfield.tsx` `makeStars` and `draw`; `dark-counselor.png` shows a star inside body text ("would you want to").
- Why it matters: grey text (`--chart-grey`, luminance about .27) against a star pixel only stays at or above 4.5:1 while the star pixel is at or below about 15% white. Measured: star alpha .15 gives 4.6:1, .20 gives 3.9:1, .30 gives about 2.6:1, .45 gives 1.46:1. White text is safe up to about .45 (4.76:1). So stars cannot be both visible at .45 and text-safe; the fix is to lower them where text lives and keep the rich stars in the rail and gutters.
- Fix (concrete, all in `Starfield.tsx`):
  1. Add constants `const RAIL = 220; const SAFE_FROM = 200; const SAFE_TO = 260; const TEXT_CAP = 0.15;`.
  2. In `draw`, after computing `alpha`, apply a smooth zone cap so nothing pops while drifting:
     ```ts
     const t = Math.min(1, Math.max(0, (star.x - SAFE_FROM) / (SAFE_TO - SAFE_FROM)));
     const cap = 0.45 - (0.45 - TEXT_CAP) * t * t * (3 - 2 * t); // 0.45 in the rail, 0.15 over content
     alpha = Math.min(alpha, cap);
     ```
     Also draw the bright-star glow only when `t < 1` (or multiply the glow alpha by `1 - t`).
  3. Keep the right gutter bright: add `const gutter = width - star.x;` and treat `gutter < 120` as `t = 0` (full cap 0.45) so the stars remain lively at the right edge of wide windows (content is capped at 1120px).
  4. Lower the base alpha range in `makeStars` from `0.1 + Math.random() * 0.35` to `0.08 + Math.random() * 0.3`, and bright stars from `0.7` to `0.6`.
- Outcome: grey and white text stay at or above 4.5:1 everywhere over the main column, the rail (which holds small grey nav labels) is slightly less safe at .45 so also cap the rail at .30 (replace `0.45` in step 2 with `0.30`; grey nav text then sees about 2.6:1 on a single star pixel, accepted as a 1 to 2 px dot; say so in DESIGN.md). Update the Starfield "Alpha" lines in `DESIGN.md` (about line 253) and the contrast note at line 175 to record the cap and remove "Owner decision pending".
- Alternative if the owner prefers the full-strength field: wrap the main column in nothing and accept; not recommended.

### 5. `.panel-ember::after` uses `filter: blur(28px)` (performance and bleed)
- Where: `src/index.css`, `.panel-ember::after` (`filter: blur(28px)`), seen as an orange halo leaking past the card edges in `dark-finder.png` and `dark-onboarding.png`.
- Problem: a blurred, masked layer inside every ember panel. On this machine WebKitGTK runs without DMABUF (software compositing), and the Counselor and My Unis screens scroll; a blurred layer inside a scroller is re-rasterised often. It also bleeds past the 28px corners, so the glow is not contained by the card (the outer glow is already provided by the box-shadow on `.dark .panel-ember`).
- Fix: drop the blur and the mask; get the same look with one gradient, then clip to the card:
  ```css
  .panel-ember::after {
    height: 45%;
    background: radial-gradient(120% 100% at 50% 100%, var(--ember-1), transparent 70%);
    opacity: 0.35;
    clip-path: inset(0 round var(--radius-card));
    /* remove: filter: blur(28px); -webkit-mask-image; mask-image */
  }
  ```
  The light override (`:root:not(.dark) .panel-ember::after`) keeps its own background and can drop `filter: none` and the mask resets. Re-check the contrast number after the change (grey on glow was 4.66 at the worst point; the radial peak is `--ember-1` at 0.35, the same strength, so it should hold; measure with the builder's `/tmp/uw-contrast/pass2.ts` if it is still there).

---

## Minor

### 6. Dark globe has no ember atmosphere (confirmed)
- Where: `dark-finder.png`; `src/ui/globe/Globe.tsx:72` (`mix(ocean, ember, 0.25)`) and `:156` (`atmosphereAltitude(0.12)`).
- Problem: the atmosphere colour is a 25% ember mix on `#060607`, about `#401706`, and three-globe's atmosphere is a faint fresnel shell, so nothing shows; the sphere edge just dissolves into black.
- Fix: use a strong colour and a thicker shell, then judge by eye: `atmosphere: theme === 'dark' ? mix(ocean, ember, 0.85) : ...` and `.atmosphereAltitude(theme dark ? 0.2 : 0.12)` (set it alongside `atmosphereColor` at `:244`). If it is still too quiet, add a CSS glow behind the globe container instead: a `div` behind the canvas with `background: radial-gradient(closest-side, color-mix(in oklch, var(--ember-1) 22%, transparent), transparent 70%); opacity: 0` and `.dark &` opacity 1, `pointer-events: none`. Keep the plan's "alpha .25" as the visible result (about 25% ember at the rim), not as the mix ratio.

### 7. `aria-pressed` plus a state-bearing label double-announces
- Where: `src/ui/layout/StarsSwitcher.tsx:14-20`.
- Problem: the button is `aria-pressed` and its label also says "Stars: on", so a screen reader says "Stars: on, toggle button, pressed".
- Fix: use a fixed `aria-label` (new key `stars.label`: en "Background stars", es "Estrellas de fondo", vi "Sao nền") and keep the state text only in `title`. Add the key to all three `common.json` files; keep `stars.on/off` for the title. Run `bun run check:i18n`.

### 8. Resize regenerates the whole field (stars pop) and DPR change is ignored
- Where: `Starfield.tsx` `size()` / `onResize`.
- Problem: every debounced resize calls `makeStars`, so all stars jump. Moving the window between monitors with a different DPR is not picked up until a resize.
- Fix: in `size()` keep the existing array when it exists and only rescale positions: `stars.forEach(s => { s.x *= width / prevWidth; s.y *= height / prevHeight; })`, then top up or trim to the new count. Optional: also listen to `matchMedia('(resolution: ...)')`; skip unless it shows up in use.

### 9. Per-frame allocations in the starfield
- Where: `Starfield.tsx` `draw`, `ctx.createRadialGradient` up to 4 times per frame.
- Problem: small garbage per frame (at most 4 gradients at 30 fps), not a real problem, but trivial to remove.
- Fix: pre-render one 16x16 glow sprite to an `OffscreenCanvas` or a hidden canvas once per `size()` (radial gradient from `colors.base` to transparent), then `ctx.drawImage(sprite, x - 8, y - 8)` with `globalAlpha`. Also add `will-change: transform` on the canvas class (`pointer-events-none fixed inset-0 -z-1 will-change-transform`) so scrolling content never repaints the star layer.

### 10. Counselor chat scroll area cuts text mid-line under the title
- Where: `dark-counselor.png` (first visible line is sliced at y about 135, directly under the transparent header).
- Problem: now that the header is transparent over stars, the hard clip edge is visible.
- Fix: on the chat scroll container add `[mask-image:linear-gradient(to_bottom,transparent,#000_16px)]`. Only the scroll container, not the whole pane.

### 11. Composer pill radius on multi-line text
- Where: `src/ui/screens/counselor/ChatPane.tsx` (composer, `rounded-pill` on a textarea that can grow).
- Problem: with 3 or more lines a 999px radius on the textarea rounds off the corners of the text box; the wrapper pill becomes a tall stadium.
- Fix: keep the wrapper `rounded-pill` only while one line is shown; simplest: wrapper `rounded-[28px]` (the card radius, in the shape lock) and the textarea `rounded-none`. Visual change is nil for one line (height 52px is under 56px, so it still looks like a pill).

### 12. Result-row focus ring is 1px
- Where: `src/ui/screens/finder/ResultRow.tsx` (`focus-visible:outline-1 focus-visible:-outline-offset-1`).
- Problem: plan 16 says focus is a 2px signal ring. 1px on a 20px-radius hover surface is easy to miss. Also `Chip.tsx` close button uses `outline-1`.
- Fix: change both to `focus-visible:outline-2` (keep the negative offset on the row).

### 13. Settings has no ember panel (known plan deviation 1)
- Where: `dark-settings.png`, `light-settings.png`.
- Problem: Settings and every other screen have one ember panel except Settings; only the ambient haze shows. Intentional because the files are off-limits for this pass.
- Fix: later pass only: wrap the AI providers section header in `<Panel variant="ember">` in `src/ui/screens/settings/**`. No action now.

### 14. Light-mode rail divider has a 10px gap
- Where: `light-*.png`: the vertical line left of the content breaks between y about 100 and 110 (header cell versus rail cell).
- Problem: the header `border-right` and the `aside` border meet with a gap because the header has `self-baseline` and no row stretch.
- Fix: put a single `border-r border-hairline` on the shell instead (a `before:` pseudo-element on the grid at `left: 220px`) or add `self-stretch` to both cells; cosmetic only and light-only. Check whether it pre-dates this branch before spending time on it.

### 15. Unused type classes
- Where: `src/index.css` `.type-body`, `.type-label` (no `.tsx` uses them; `type-display/headline/title` are used).
- Fix: either delete the two classes or leave them as the documented scale. Low value; delete only if the owner wants no dead CSS.

### 16. Light star button looks pressed in two shots
- Where: `light-myunis.png`, `light-settings.png` (heavier ring on the stars button than on the other two).
- Likely cause: the pointer was hovering or the button had focus in those captures. Not reproducible from code (hover is `bg-shoal`, focus is a 2px signal ring). Confirm by hand; no code change expected.

### 17. Narrow widths (about 940px, light shots)
- No overflow or clipping found: the Finder switches to a single column below 1100px as designed, the MyUnis summary wraps (`flex-wrap`), the onboarding sheet and Counselor layout hold. The 28px radius on the narrow Finder panel looks right. Vietnamese and Spanish welcome headlines are longer than English but the headline wraps in a 640px sheet; verify visually once in vi, as the vi string is about 80 characters. No code change.

---

## Checklist answers

- Starfield spec: dark only (yes: `active = enabled && resolved === 'dark'`), density formula and 40 to 110 clamp (yes, about 75 at 1896x1026), three layers and speeds (yes), at most 4 bright stars (yes), 15% warm tint (yes), DPR cap 2 (yes), `visibilitychange` pause (yes), reduced-motion static frame with live toggle (yes), cleanup of rAF, timeout, resize, visibility and media-query listeners (yes), theme change handling (yes: `theme.ts` applies the `.dark` class before the store update, so colours are read correctly), resize debounce 150 ms (yes), no React state in the loop (yes), `pointer-events-none`, `aria-hidden`, `-z-1` inside the `isolate` shell, canvas first and haze second so haze paints above stars and all content above both (yes). Gaps: items 3, 4, 8, 9.
- Ember only in allowed places: yes (primary buttons, toggle on, chips' dot, nav dot, slider ring in dark, numerals, panel glow, haze). No stray ember found in the screenshots.
- Radii: only pill, 28, 14, 20 and circles seen. Consistent in the screenshots.
- Gradient button text contrast at worst point: black on `#ff5a1f` 6.73, black on `#ff8a3d` 8.95; white on `#c4400b` 5.14, white on `#b83304` 5.98. All pass.
- Reduced motion: `.panel-ember::after` animation is disabled in the `prefers-reduced-motion` block; press scale (`active:scale-[0.97]`) is a transform and is not disabled; add `motion-reduce:active:scale-100` to the button base string.
- Focus rings: buttons, nav, inputs, toggle, chips, combobox wrapper, composer (`focus-within`), lang buttons (`focus-within`), slider (`.ui-range:focus-visible`) all have visible 2px signal rings; the two 1px ones are in item 12.

---

## Fixes applied

Verify after the fixes: `bun run build` pass, `bun run check:i18n` pass, `bun test` 159 pass 0 fail, `(cd src-tauri && cargo check --offline)` pass. Contrast re-measured with `/tmp/uw-contrast/pass3.ts`.

### Important

1. **Done.** `FinderForm.tsx` beside-layout Panel gets `self-start`. The stacked branch is unchanged.
2. **Done.** `button.tsx` primary variant adds `disabled:opacity-100 disabled:bg-none disabled:bg-shoal disabled:text-chart-grey disabled:shadow-none disabled:hover:brightness-100`. Secondary and quiet keep `disabled:opacity-50`. Measured: chart grey on shoal 5.55 (dark), 5.44 (light).
3. **Done.** `Starfield.tsx` step: `FRAME_MS - 4` tolerance. The `dt` clamp is unchanged.
4. **Done, with two changes to the suggested values.**
   - Caps: `TEXT_CAP = 0.15` over the rail and content, easing to `FULL_CAP = 0.45` in the right gutter over a smoothstep ramp. Bright-star glow fades out with `1 - textness`.
   - Rail held to 0.15, not the suggested 0.30. At 0.30, grey nav labels measure 2.61:1 over a star pixel, which fails the target. The user rule is to keep every pair at target.
   - The gutter is measured from the content column's right edge (x 1292 px, which is 220 + 1120 - 48), not from the window edge. A window-edge gutter would have boosted stars over the text on narrow windows, where text runs to the right margin.
   - Base alpha 0.08 to 0.38, bright 0.6, as suggested. `RAIL` was not added because nothing reads it.
   - Measured (pass3.ts): chart grey over a star at the cap 4.63; ink 15.08; grey over a bright star's glow 5.78; grey nav label over a rail star 4.63. All pass.
   - DESIGN.md: the star alpha lines, the contrast table, and the "Owner decision pending" note are updated.
5. **Done, with one change.** `.panel-ember::after` uses the suggested radial, `clip-path: inset(0 round var(--radius-card))`, and no blur or mask. The light override drops `filter` and the mask resets. The suggested `--ember-1` centre fails: grey measures 3.59:1 at the bottom centre, not the 4.66 the review assumed. The centre is `--ember-0` instead, which measures 4.75:1 (ink 15.50). That matches the old band bottom colour. The sweep is in `/tmp/uw-contrast/glow-options.ts`.

### Minor

6. **Done.** `Globe.tsx` dark atmosphere is `mix(ocean, ember, 0.85)` with altitude 0.2. Altitude is a new `Palette.atmosphereAltitude` field, set beside `atmosphereColor` in the theme effect. Light is unchanged. Not judged by eye, since the app was not run; the rim needs a visual check. The CSS glow fallback was not needed.
7. **Done.** `StarsSwitcher.tsx` uses `aria-label={t('stars.label')}`. `title` keeps the state text. New key `stars.label` in en, es, and vi `common.json`.
8. **Done.** `Starfield.tsx` `size()` keeps the existing stars, rescales their positions to the new size, and then adds or trims to the new count (`fitStars`). The optional DPR matchMedia listener was skipped, as the review said.
9. **Done.** One 12 px glow sprite per size, drawn with `drawImage`. The canvas class gets `will-change-transform`.
10. **Done.** The chat log container gets `[mask-image:linear-gradient(to_bottom,transparent,#000_16px)]`. Only that container.
11. **Done.** `ChatPane.tsx` composer wrapper is `rounded-[28px]`, and the textarea is `rounded-none`.
12. **Done.** `ResultRow.tsx` and `Chip.tsx` focus rings are `focus-visible:outline-2`. The row keeps its negative offset.
13. **Not done.** Settings is off-limits for this pass, and the review itself defers it.
14. **Done.** The logo cell and the header in `AppShell.tsx` use `self-stretch` instead of `self-baseline`, which closes the light-mode divider gap. The gap also exists at HEAD, so it pre-dates this branch.
15. **Not done.** The review says delete only if the owner wants it. The two classes are left in place.
16. **No code change.** The review expects none. The "looks pressed" capture needs a by-hand check.
17. **No code change.** The review expects none. The vi headline wrap needs a by-eye check.

### Checklist item

- **Done.** `motion-reduce:active:scale-100` added to the button base string, so press scale is off under reduced motion.
