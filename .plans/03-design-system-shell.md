# 03 — Design system, light/dark theme, shell, primitives

Read first: `.plans/A-build-conventions.md`, `DESIGN.md` (all of it — it is the spec), `src/index.css`, `src/ui/layout/AppShell.tsx`.

The current shell (`AppShell.tsx`, `.screen-title`, `.wordmark`, `.app-rail`, `.lang-button` in `index.css`) is the owner's own recent work: **keep its structure, the title "plot" animation, the wordmark, and the page transition.** Your job is to turn its hard-coded colors into tokens, add dark mode, and build the shared primitives every later screen uses.

## Steps

### Tokens + theme
- [x] 1. In `src/index.css`, replace the stock shadcn neutral `:root` / `.dark` values with DESIGN.md's palette:
      - Light (`:root`): `--background`=pale-sea, `--panel`=chalk-paper, `--shoal`, `--hairline`, `--foreground`=ink, `--chart-grey`, `--signal`=correction-magenta, `--signal-deep`, `--evidence`=surveyed-green, `--land`=land-buff.
      - Dark (`.dark`, "Night Watch"): background=night-watch, panel=night-panel, foreground=night-ink, chart-grey=night-grey, signal=correction-magenta-night, evidence=surveyed-green-night; derive shoal/hairline/signal-deep for dark by shifting lightness so hairline ≥1.5:1 and text ≥4.5:1 against their surfaces. Land stays a fill (slightly darker in dark, e.g. `oklch(0.42 0.03 85)`).
      - Also map the shadcn names so existing classes keep working: `--card`/`--popover`=panel, `--primary`=signal, `--primary-foreground`=chalk-paper, `--muted`=shoal, `--muted-foreground`=chart-grey, `--accent`=shoal, `--border`/`--input`=hairline, `--ring`=signal, `--destructive`=signal.
      - Expose them to Tailwind in `@theme inline` as colors: `panel, shoal, hairline, chart-grey, signal, signal-deep, evidence, land` (so `bg-panel`, `text-chart-grey`, `border-hairline`, `bg-signal` work).
      - Radii: `--radius-sm: 2px; --radius-md: 4px; --radius-lg: 6px` (override the calc() ones). Add `--shadow-float` from DESIGN.md "Floating layer".
      - Fonts: keep `Agrave Pro` + `Inter Variable` fallback for `--font-sans`; `bun add @fontsource/ibm-plex-mono` and import weights 400/500; set `--font-mono: "IBM Plex Mono", ui-monospace, monospace`.
- [x] 2. Replace every hard-coded `oklch(...)` in `index.css` component classes and in `AppShell.tsx` Tailwind arbitrary values with `var(--token)` / token classes. The rail gradient in `.app-rail` must be built from tokens too (e.g. `color-mix(in oklch, var(--background), var(--shoal) 60%)`) so it works in dark. Grep must find no `oklch(` outside the token blocks in `index.css`.
- [x] 3. `src/store/settings.ts` (A owns it): typed helpers over the `settings` table: `getSetting(key)`, `setSetting(key, value)`, `deleteSetting(key)`. Known keys: `theme` (`system|light|dark`), `model`, `default_provider` (`openrouter|opencode`). B's core reads `model` and `default_provider` — keep those exact key names.
- [x] 4. `src/app/theme.ts`: Zustand `useTheme` `{ mode: 'system'|'light'|'dark'; resolved: 'light'|'dark'; setMode(m) }`. Applies/removes `.dark` on `document.documentElement`, follows `matchMedia('(prefers-color-scheme: dark)')` changes in `system` mode, persists via `setSetting('theme')`, loads it at startup (before first paint where possible: call `initTheme()` in `main.tsx` before render, default `system`).
- [x] 5. Theme control in the rail footer next to the language switcher: a 32px quiet icon button matching `.lang-button` that cycles system → light → dark (icons `Monitor`, `Sun`, `Moon` from lucide), with a translated `title`/`aria-label` naming the current mode. Translate the 3 mode names in `common`.
- [x] 6. UI language persistence: when the language switcher changes, call `i18n.changeLanguage` **and** if a profile exists, save `uiLang` through `useProfile().save({...profile, uiLang})`. On startup, after `useProfile.load()`, call `i18n.changeLanguage(profile.uiLang)` (do this in `FirstLaunchGate`). Also set `document.documentElement.lang`.

### Shell
- [x] 7. Shell tweaks in `AppShell.tsx`:
      - BETA tag per DESIGN.md: 10px IBM Plex Mono, 1px hairline border, no fill, 2px radius (not `rounded-full`). Keep text from `t('beta')`.
      - Hide the "Onboarding" nav item once a profile exists (`useProfile(s => s.profile)`); if a profile exists and the user lands on `/onboarding`, it still renders (Settings links there for nothing — fine).
      - Main field: content wrapper with `max-w-[1120px]` and 48px left page margin (`px-12`) is applied **inside each screen**, not in the shell — leave the shell's `<main>` as is.
      - Respect reduced motion: when `useReducedMotion()` is true, the page transition uses opacity only (no x).
- [x] 8. Error boundary: `src/app/ErrorBoundary.tsx` wrapping the router outlet; shows a designed error panel (title "Something broke on this screen", the error message, a "Reload" secondary button calling `location.reload()`), translated.
- [x] 9. Fix the startup gate: if `useProfile.load()` throws, show the error (message + "Try again" button that re-runs load) instead of spinning forever.

### Primitives (`src/ui/components/`)
Build each with tokens only, per DESIGN.md "Components". Export from `src/ui/components/index.ts`.
- [x] 10. `Button` — rewrite `ui/button.tsx` variants to DESIGN.md: `primary` (bg-signal, hover signal-deep, chalk text), `secondary` (bg-panel, 1px hairline, ink), `quiet` (text-only chart-grey, underline on hover), plus `size` `md` (36px, px-4, 12px/label) and `sm` (28px) and `icon` (32px square). 4px radius. Focus: `focus-visible:outline-1 outline-offset-2 outline-signal`. No translate on press, 120ms color transition. Keep `asChild`. Keep the export name `Button`. Update the default variant name usages.
- [x] 11. `Input`, `Textarea`, `Select` (native `<select>` styled), `Field` (label + control + optional hint + error message wiring `aria-describedby`/`aria-invalid`). 36px controls, panel fill, hairline stroke, 4px radius; focus = ink stroke + signal outline; error = signal stroke + 12px signal message.
- [x] 12. `Chip` — 24px, 2px radius, hairline stroke, panel fill, 12px label; `selected` → ink fill + paper text + 2px signal tick on the leading edge (a pseudo-element or inner span). Optional `code` prop renders a mono ISO code before the label. `onRemove` optional (small x button, translated aria-label). `Badge` — read-only shoal fill, no stroke.
- [x] 13. `Panel` — panel fill, 1px hairline, 6px radius, 24px padding; `inset` variant uses shoal. `Rule` — a 1px hairline divider.
- [x] 14. `Slider` — styled native `<input type="range">` (1–10 by default) with label, mono current value, signal thumb; keyboard accessible.
- [x] 15. `Toggle` (switch) for filters — accessible `role="switch"` button, hairline track, signal when on.
- [x] 16. `Flag` — circular 20px disc from `country-flag-icons` (`bun add country-flag-icons`, MIT; import the SVG React components from `country-flag-icons/react/3x2`), object-cover inside a circle with a hairline ring; falls back to a mono ISO code disc when the code is unknown. Never emoji flags.
- [x] 17. **`FactLine`** (signature, DESIGN.md "Fact Line"): props `{ label: string; fact: Fact<string | string[]>; format?: (v) => ReactNode; index?: number }`.
      - Value present → value in ink + a mono superscript source marker (`index` or 1) that is a button; hover/focus/click opens a floating layer (`--shadow-float`, panel fill, 6px radius) with the source tag (`official` in evidence green / `third-party` in chart-grey, translated), the quote in a left-ruled block (13px), and the URL as a quiet link that opens in the system browser (use `openUrl` from `@tauri-apps/plugin-opener` — `bun add @tauri-apps/plugin-opener`, `cargo add tauri-plugin-opener`, register it in `lib.rs`, add `opener:default` + `opener:allow-open-url` to capabilities).
      - **Never render a value without its source link.** If `value !== null` but `sourceUrl` is null, render as missing.
      - Missing (`value === null`) → "Not found — check official site" (translated) in chart-grey with a 1px dashed underline; row keeps its height.
      - Popover closes on Escape and outside click; keyboard reachable.
- [x] 18. `EmptyState` (title + one line + one action slot; no illustrations), `ErrorNote` (signal left rule, message, optional action), `Spinner` (small, respects reduced motion), `ProgressLine` (a single-line live status with a signal pulse dot, used by the Finder).

### Placeholder screens
- [x] 19. Restyle `PlaceholderScreen` with `EmptyState` inside the `px-12 max-w-[1120px]` page wrapper. (Later slices replace these screens.)

## Slice checks (in addition to the conventions' Verify)
- `grep -rn "oklch(" src --include=*.tsx --include=*.ts` → no results.
- `grep -n "oklch(" src/index.css` → only inside `:root`, `.dark` token blocks.
- Launch with `tauri dev`, then the log must show no errors. (Theme switching is reviewed by the orchestrator.)

## Builder notes

- Verify (conventions), final run:
  - `bun run build`: pass (tsc + vite build).
  - `bun run check:i18n`: pass (es, vi match en).
  - `bun test`: 126 pass, 0 fail (unchanged from baseline).
  - `(cd src-tauri && cargo check)`: pass (tauri-plugin-opener registered).
  - `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: app runs, no panic, no Rust errors. The webview logs `Failed to load profile ... reading 'invoke'` (`window.__TAURI_INTERNALS__` undefined) on first load. HEAD (68417c4), run in a clean worktree, logs the same error, so it predates this slice. Not fixed here; this run also logs `Failed to load theme setting` with the same cause (caught, falls back to system).
- Slice checks: `grep oklch( src --include=*.tsx --include=*.ts` returns 0 lines. In `src/index.css` every `oklch(` is inside `:root` or `.dark`.
- Deviations / decisions for review:
  1. Dark tokens changed from DESIGN.md values, because they fail the contrast rule on Night Watch (measured with an oklch to WCAG script). chart-grey `0.78 0.02 230` (night-grey 0.72 gives 3.3:1 on panel). Hairline `0.6 0.025 240` (0.37 gives 1.06:1, need 1.5). signal-deep `0.75 0.16 355`, lighter than signal, so the hover keeps 5.8:1 with the label (0.62 gave 2.8:1). primary-foreground in dark is Night Watch `0.205`, not chalk (chalk on magenta-night gives about 3.4:1). Light tokens are exactly as in DESIGN.md.
  2. The theme is applied with the `.dark` class (per step 4), not a `prefers-color-scheme` media block. A media block would make an explicit "light" choice show dark under a dark OS.
  3. `.app-rail` keeps the gradient (step 2 says to keep it, token-built). DESIGN.md says "no gradients anywhere". Orchestrator to decide whether to remove it.
  4. `initTheme()` awaits the settings read before the first render (step 4 asks for this). If the database load hangs, the window stays blank. The system theme is applied synchronously first, so the palette is never wrong.
  5. FactLine treats an empty array as missing, as well as `value === null` or a null `sourceUrl`. The spec does not cover this.
  6. Button `md` carries `min-w-40` (160px, DESIGN "Layout"). sm and icon do not.
  7. `Flag` uses the namespace import of `country-flag-icons/react/3x2`, so the whole set is bundled. Tree-shaking does not apply to the dynamic lookup. Size impact not measured.
  8. Button labels use `font-medium`. Agrave Pro only ships 400 and 700, so this resolves to 400 (DESIGN "no intermediate weight").
- Not verified in a running window: theme switching, FactLine popover click/hover, and opener `openUrl` on a live link. Those need manual review.
