# 22 — App logo (light/dark) and always-on stars

Rules: Haiku builds, no commits (Sonnet commits). Another agent edits this folder: touch only files named here. Never pkill/killall. Don't start the owner's app.

## A. Stars always on (remove the toggle)
- Delete `src/ui/layout/StarsSwitcher.tsx` and `src/app/stars.ts`.
- `AppShell.tsx`: remove the `StarsSwitcher` import/usage, the `initStars`/`useStars` import, the `starsOn` const and the `initStars()` effect (drop the `useEffect` import only if now unused). Render `<Starfield />` with no props.
- `Starfield.tsx`: drop the `enabled` prop; `active = resolved === 'dark'`.
- Remove `'stars'` from `SettingKey` in `src/store/settings.ts`; remove the `stars` block from `src/i18n/locales/{en,es,vi}/common.json` (check nothing else uses those keys).
- `index.css`: fix the `.lang-button` comment that mentions stars. `DESIGN.md` Starfield section: delete the Control bullet, say stars are always on in dark mode; fix any other mention of the stars toggle/setting (grep "stars" case-insensitive in DESIGN.md and .plans is NOT needed for .plans).

## B. Logo
- Copy `/home/alejogalim/.orca/bots/idea-explorer/logo/uniworld-logo-{light,dark}.{svg,png}` into `src/assets/logo/` (same file names).
- Add `src/ui/layout/Logo.tsx`: `<Logo className? />` renders an `<img>` (imported svg URLs via Vite) that is the dark logo when `useTheme((s) => s.resolved) === 'dark'`, else the light logo; `alt=""` + `aria-hidden` (the wordmark/title carries the name), rounded corners (`rounded-control`), `draggable={false}`. Size via className.
- `AppShell.tsx` rail: replace the placeholder mark (collapsed) with `<Logo className="size-8" />`; in the expanded rail show `<Logo className="size-8" />` before the wordmark. Keep the beta pill and collapse button as they are. Remove the "No logo yet" comment.
- Onboarding or other screens: grep for a placeholder brand mark and replace only if it is clearly the same placeholder; otherwise leave.
- App icon: with the dark 1024px PNG run `bun tauri icon src/assets/logo/uniworld-logo-dark.png` to regenerate `src-tauri/icons/*` (if that command fails offline, skip and say so). Check `index.html` for a favicon link; if present point it at the dark svg copied to a place Vite serves (e.g. import-free: put a copy in `public/favicon.svg`), otherwise skip.
- `DESIGN.md`: add a short "Logo" note (arc-in-circle mark, two versions by theme, files in `src/assets/logo/`).

## Verify (report output)
`bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check --offline)`. Also `grep -rn "StarsSwitcher\|useStars\|initStars\|stars\.\(on\|off\|label\)" src` must return nothing.
