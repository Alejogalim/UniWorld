# 23 — Collapsible rail like Gemini's, and a more visible logo

Rules: Haiku builds, no commits. Touch only the files named here. No pkill/killall; don't start the owner's app.

## Problems
1. Collapsed rail (72px) puts the logo AND the toggle side by side in a 72px cell (`px-1`): cramped, the toggle is hard to find. Gemini's collapsed rail is a clean icon strip: a menu button on top, then the icons, settings at the bottom, all centered in one column.
2. The logo files are a mid-grey/black SQUARE with a thin arc: at 32px the square shows as a box and the arc is tiny and faint.

## A. Rail (src/ui/layout/AppShell.tsx, src/index.css if needed)
- Use lucide `Menu` for the toggle in BOTH states (replace PanelLeftOpen/Close imports). Toggle is 40x40 (`size-10`), rounded-control, same hover style as nav items.
- Collapsed (column 72px): header cell contains ONLY the toggle, centered (`justify-center`, no `px-1`/`justify-between`). The logo (`Logo`, `size-7`) moves to the top of the aside, centered above the nav with `mb-3` (collapsed only).
- Expanded: widen the column from 220px to 248px. Header cell, in order: toggle (40px, at the left), logo (`size-7`), wordmark, beta pill; nothing pushed with `ml-auto`; `gap-2`, `px-3`. If wordmark + beta do not fit, drop the wordmark's `::before/::after` underline decoration NOT the beta pill; check by reasoning about widths (wordmark ~110px at 26px bold).
- Animate the grid column change: add `transition-[grid-template-columns] duration-200 ease-out` on the grid container (respect `useReducedMotion`: no transition when true).
- Keep the footer (language, theme) as is: a column in collapsed, a row expanded.

## B. Logo (src/assets/logo, src/ui/layout/Logo.tsx)
- Keep the four existing files (they remain the app-icon source). ADD two new transparent-background, cropped marks:
  - `src/assets/logo/uniworld-mark-dark.svg`: `viewBox="226 226 572 572"`, NO background rect, the same gradient as `uniworld-logo-dark.svg` (white to #ffc9a3 to #ff6a1f), thin circle `r=260` stroke `rgba(255,255,255,0.55)` width 8, arc `M252 512 A260 260 0 0 0 772 512` stroke width 64 with round caps.
  - `src/assets/logo/uniworld-mark-light.svg`: same geometry, gradient from `uniworld-logo-light.svg` (#0a0a0a to #7a1204 to #e2450f), circle stroke `rgba(0,0,0,0.45)` width 8, arc width 64.
  (Copy the gradient `<defs>` exactly from the existing svgs; read them first.)
- `Logo.tsx`: import the two mark files instead of the square logos; remove `rounded-control`. Keep alt="" aria-hidden draggable={false}.
- Optional extra: in expanded header the logo may be `size-8`. Judge by fit.
- Update the DESIGN.md "Logo" section: marks are transparent and cropped for UI use; the square files are for app icons.

## Verify (report output)
`bun run build`, `bun run check:i18n`, `bun test`. Render both new SVGs to PNG at 32px and 128px to eyeball them if a tool exists (`rsvg-convert` or `magick`), save under the scratchpad dir, and describe what you see. Check `nav.expand` / `nav.collapse` i18n keys still exist and are used.
