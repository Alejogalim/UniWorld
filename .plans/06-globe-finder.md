# 06 — Globe + Finder search (Design §7.3)

Read first: `.plans/A-build-conventions.md`, `DESIGN.md` (esp. "The Globe", "Layout" Finder paragraph, "Panels & Rows" result row, "Motion"), `Design.md` §7.3, `src/core/contracts.ts` (`SearchInput`, `Scope`, `Continent`, `FinderEvent`, `UniResult`), `src/core/finder/index.ts` (read only: event order and messages), `src/ui/components/index.ts`.
The detail page is the NEXT slice; here a result row navigates to `/finder/uni/:rorId` (add the route with a temporary EmptyState screen that the next slice replaces).

## Data (A owns `data/countries.geojson`, `data/country-continent.json`)
- [x] 1. Download Natural Earth 110m countries (public domain) into a fresh scratch dir, not the repo: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`. Write `scripts/build-globe-data.ts` that reads it (path as an argument) and writes `data/countries.geojson` keeping only geometry + properties `{ iso: ISO_A2_EH (fallback ISO_A2; skip features whose code is not 2 letters), name: NAME }`, coordinates rounded to 2 decimals. Commit-ready output must be < 400 KB.
- [x] 2. `bun add -d countries-list` (MIT). In the same script (or `scripts/build-continents.ts`), write `data/country-continent.json`: `{ "<ISO2>": "<Continent>" }` for **every** ISO 3166-1 alpha-2 code in `countries-list`, mapping its continent codes AF/AS/EU/NA/SA/OC to the contract's `Continent` names; Antarctica (AN) codes are omitted. Add both scripts to package.json as `build:globe`. Run it and commit the outputs (data files only; don't commit the raw download).
- [x] 3. `src/ui/globe/geo.ts`: typed loaders for both files (`import countries from '../../../data/countries.geojson?url'` + fetch, or `import continentMap from '../../../data/country-continent.json'`), plus `continentOf(iso)`, `countriesIn(continent)`, and a centroid per continent for fly-to (hard-code 6 good `{lat,lng,altitude}` views).

## Globe (`src/ui/globe/`)
- [x] 4. `bun add globe.gl` (it brings three). `src/ui/globe/Globe.tsx`: a React wrapper that creates one `Globe()` instance on a div ref, sized to its container (ResizeObserver → `.width()/.height()`), and disposes it on unmount (`_destructor()` if present, pause animation, remove renderer). Props: `selected: Set<string>`, `highlightContinent: Continent | null`, `onToggleCountry(iso)`, `flyTo: {lat,lng,altitude} | null`, `compact: boolean`, `theme: 'light'|'dark'`.
      - Look (DESIGN.md "The Globe"): no texture image. Ocean = the `--background` token color as the globe material (`globeMaterial().color`), land polygons = `--land`, polygon side color slightly darker land, stroke = `--hairline`, graticules on (`showGraticules(true)`), atmosphere subtle (`atmosphereColor` = hairline, `atmosphereAltitude(0.12)`). Read tokens with `getComputedStyle(document.documentElement)` and re-apply when `theme` changes. Transparent background (`backgroundColor('rgba(0,0,0,0)')`).
      - Idle auto-rotation via `controls().autoRotate = true; autoRotateSpeed = 0.35`; pause rotation while the pointer is over the globe or a country is hovered, and stop it entirely under `prefers-reduced-motion`.
      - Hover: polygon altitude 0.006 → 0.03 (lift), ink outline, tooltip (`polygonLabel`) with the country name (translated via `countryName(iso, uiLang)` from `src/ui/data/countries.ts`) in a small floating layer styled with tokens.
      - Selected countries: signal stroke and a land veil (slightly stronger land fill). Continent highlight: all its countries get the selected look while `highlightContinent` is set.
      - `flyTo` → `pointOfView(view, 900)`.
      - Click a polygon → `onToggleCountry(iso)`.
- [x] 5. Lazy-load the globe (`React.lazy`) so the rest of the app doesn't pay for three.js on startup; show a `Spinner` while loading.

## Finder screen (`src/ui/screens/Finder.tsx` + `src/ui/screens/finder/`)
- [x] 6. `useFinder.ts` Zustand store (in-memory, survives navigation): `careers: string[]`, `scope: Scope`, `filters` (defaults: `tuitionFreeOnly:false`, `spokenLanguagesOnly:true`, `includeNeedToLearn:false`), `phase: 'idle'|'searching'|'done'|'error'`, `progress: string[]` (all messages, last one shown live), `results: UniResult[]` (kept **sorted by `fit.overall` desc**, max 12), `summary: {verified, removed} | null`, `error`.
- [x] 7. Inputs (top of the screen):
      - **Careers**: chips for the student's saved careers (`new SqlCounselorStore(await createTauriSqlClient()).listSavedCareers()`), toggleable, plus a free-text input that adds a chip on Enter (removable). If the route has `location.state.career`, preselect/add it. At least one career is required to search.
      - **Scope**: continent `Chip` row (Africa, Asia, Europe, North America, South America, Oceania, translated) + a "Whole world" chip. Clicking a continent sets `scope={kind:'continent'}`, highlights it on the globe and flies there; clicking a country on the globe switches to `{kind:'countries', codes}` (toggle). Under the globe, the current scope as chips (country chips show `Flag` + mono ISO code + name, removable; continent/global chip shows its name). Selecting a continent clears countries and vice versa.
      - **Filters**: three `Toggle`s with the Design §7.3 labels (translated).
      - Primary **"Search"** button. Disabled with a reason line when no career is chosen. If `getSecret('openrouter')` is null → `ErrorNote` with Design §5.1 text ("University search needs an OpenRouter key (for verified web search).", translated) and a secondary "Open settings" button; Search disabled.
- [x] 8. Layout + motion (DESIGN.md): at rest the globe is large (fills the field under the inputs, square, up to ~640px). When a search starts the layout becomes two columns: a 380px left column (globe compact + scope chips + inputs collapsed into a summary with an "Edit search" quiet button) and the ranked results column on the right. Animate the change with Framer `layout` (400ms, `cubic-bezier(0.2,0,0,1)`); opacity only under reduced motion. "New search" returns to the rest layout.
- [x] 9. Search: `core.finder.search(input, onEvent)`:
      - `progress` → append; show the latest in a `ProgressLine` with the signal pulse while searching. Translate known core messages via regex map (en text → i18n key with params): `Searching the web…`, `Loaded cached results.`, `Checking {{count}} candidates against the university registry…`, `{{verified}} verified, {{removed}} removed.`, `Couldn't verify enough results, try a narrower scope.`; unknown messages are shown as-is.
      - `result` → insert keeping sort by `fit.overall` desc.
      - `done` → summary line in mono ("9 verified, 6 removed" translated); if `verified < 3` or the TOO_FEW message appeared, show a warning `ErrorNote`: "Couldn't verify enough results. Try a narrower scope." (B's request).
      - `error` / thrown → `ErrorNote` with the message and "Try again".
- [x] 10. **Result rows** (DESIGN.md: a ranked single column with hairline separators, not a card grid): `ResultRow.tsx` shows mono rank, `Flag`, name (Title), city + country name (chart-grey), the matched program, one-line overview (`overview.value`, or the "Not found" treatment), language-of-instruction `Badge`s (from `languages.value`, language names via `languageName`), a tuition `Badge` (value text, or "Tuition unknown"), the fit block: admission label (Reach/Match/Safety/Unknown, translated) + mono codes `CAR 82 · …` are NOT joined with middle dots — render four small mono chips `CAR 82`, `ADM Match`, `LNG 100`, `CST 60` (cost `depends_on_citizenship` → `CST ?` with a tooltip "Depends on citizenship"), the "Why this fits you" line (prose), and the mono source count ("4 sources"). If `uni.needToLearn` → a note "You'd need to learn {{language}}" (+ usual level if `usualLevel.value`, with its source via `FactLine`-style marker). Rows enter in rank order (24ms stagger, cap 8) and move to their new position with Framer `layout` when a better-ranked result arrives; no re-animation otherwise. Hover: shoal fill. Click/Enter → `navigate('/finder/uni/' + encodeURIComponent(rorId), { state: { uni } })`. Every fact value shown on the row must come from a `Fact` whose `sourceUrl` is non-null; otherwise show the missing treatment.
- [x] 11. i18n: `finder` namespace (en/es/vi) registered in `src/i18n/index.ts` and in `scripts/check-i18n.ts`; continent names, filters, progress messages, labels, errors.

## Slice checks
- Conventions' Verify passes.
- `ls -la data/countries.geojson data/country-continent.json` (< 400 KB and present); `bun -e "const m=require('./data/country-continent.json'); console.log(Object.keys(m).length)"` ≥ 245.
- Build output: the globe/three.js code is in a separate lazy chunk.

## Builder notes

- Verify (all green): `bun run build` (tsc + vite) ok; `bun run check:i18n` passes (en/es/vi/finder); `bun test` 131 pass, 0 fail; `cd src-tauri && cargo check` ok; `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev` stayed up for the full 90s, no Rust panic. Its log shows only the `__TAURI_INTERNALS__` undefined console errors from theme/profile loading (expected in the plain webview), nothing from the Globe or Finder.
- Slice checks: `data/countries.geojson` 172 KB (175 features); `data/country-continent.json` has 247 codes (>= 245). Build emits `Globe-*.js` (about 2.0 MB, globe.gl + three) as its own lazy chunk, and `countries.geojson` as a separate asset.
- Deps: `globe.gl@2.46.2` (exact; published 2026-08-22, older than two weeks), `countries-list@^3.4.1` devDep. Script: `bun run build:globe -- <path to ne_110m_admin_0_countries.geojson>`. The download went to a fresh scratch dir outside the repo.
- Deviations:
  - countries-list has 252 entries. The script keeps every 2-letter key that has a continent except AN, so 247 codes. Non-ISO-assigned codes such as XK and AC are included.
  - The Finder motion uses Framer `layout="position"` on the two columns, not full `layout`, so the WebGL canvas is not scaled during the 400ms transition.
  - The globe tooltip is styled with inline `var(--…)` tokens, so `src/index.css` is untouched.
  - Result row fit codes: ADM carries the admission label, so there is no separate admission badge. CST shows `?` with a `title` tooltip when the cost depends on citizenship.
  - A country chip shows code, then flag, then name, because `Chip` renders its `code` before its children.
  - Added `src/app/router.tsx` route `finder/uni/:rorId` (PlaceholderScreen) and registered the `finder` namespace in `src/i18n/index.ts`.
  - Not exercised: no live search (no OpenRouter key in this run), no visual pass in a browser. Check the globe's hover, selection and two-column layout by hand.

