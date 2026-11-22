# 24 — Rail like Gemini's: logo is the opener; rail is its own column; no title on the counselor

Rules: Haiku builds, no commits. Touch only the files named here (AppShell.tsx, src/index.css, DESIGN.md, Logo.tsx only if needed). No pkill/killall; don't start the owner's app.

## Target behaviour (reference: Gemini's sidebar)
- **Collapsed:** a narrow (72px) full-height column. Top: the logo mark alone (`Logo`, `size-8`), and CLICKING THE LOGO OPENS the rail (it is a `<button>` with `aria-label={t('nav.expand')}`, hover bg like nav items, 40x40 hit area). Below it the nav icons (centered), and the language/theme buttons at the bottom. No other toggle button.
- **Expanded:** the same column ~248px wide. Top row: logo + wordmark + beta pill on the left (logo is NOT a button here), and on the right a collapse button (`PanelLeftClose` icon, 40x40, `aria-label={t('nav.collapse')}`, `ml-auto`). Below: nav rows with icon + label (the active row keeps its pill), footer at the bottom.
- The logo must stay in the same spot (top-left, same x/y) in both states so nothing jumps. Width change animates (200ms ease-out, none under reduced motion).

## Structure change (drop the shared grid with the title)
- Replace the 2x2 grid by a two-column layout: `<aside>` (the rail: header row, nav, footer, one component/one element, full height, `app-rail`) and a right column `<div>` that holds the page title header and `<main>`. Keep Starfield and `.ambient-haze` as before.
- The title header (`h1.screen-title`) lives inside the right column above `<main>`, centered as today. **Do not render the title/header at all on the counselor route** (`location.pathname.startsWith('/counselor')`); there `<main>` fills the full column height. Remove the `rightRail` padding hack in the header if it becomes unused; keep the counselor page itself unchanged unless it relied on the header's height (check `src/features` / counselor screen for any top offset that assumed the header and adjust only if the layout visibly depends on it).
- Keep every other screen's title as is. Keep the `NAV` active-item logic, `visibleNav`, ErrorBoundary and the AnimatePresence transition.

## Docs
- `DESIGN.md`: update the Layout section (rail is its own column; logo opens it; collapse button; widths) and note the counselor has no title.

## Verify (report output)
`bun run build`, `bun run check:i18n`, `bun test`. Check no unused imports/vars remain (build is `tsc`). Report any layout assumption you could not verify without running the app.
