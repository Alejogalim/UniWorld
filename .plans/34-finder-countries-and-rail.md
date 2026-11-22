# 34 — Finder: compact Countries tab + globe under the rail

Branch: `feat/finder-glass-dock` (plan 33 is already built and committed there). Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ.

## Goal (one slice, demoable)
A. The Countries tab in the glass dock becomes one compact column: filter field, one scrolling row of region chips, a removable selected-countries row (only when any are selected), and the country list taking all the remaining height. All behaviour stays: selection, filtering, regions (fly-to), keyboard navigation, globe hover focus.
B. On the Finder, the globe runs under the rail, so the rail and the map read as one scene (no hard cut of the red atmosphere at the rail edge). The sphere stays exactly where it is today (centred on the working column) for both rail widths.

## Diagnosis (why it looks like this today)
- **Rail seam:** the rail (`.app-rail`) is already transparent (dark mode has no border), so the "flat near-black strip" is just the app ground + stars. The cut comes from the globe: `Finder.tsx` renders the canvas in `<div className="absolute inset-0 overflow-hidden">` inside the Finder root, which lives in AppShell's `<main className="relative min-h-0 overflow-auto">` in the second grid column. So the canvas is exactly the main column; the atmosphere glow is drawn up to the canvas's left edge and is clipped there (by the canvas bounds, the wrapper's `overflow-hidden` and `main`'s `overflow-auto`). Result: a straight vertical edge where the rail starts.
- **Clipped filter field (image 9):** below 680px the ScopePicker root is `@max-[679px]:overflow-y-auto`, so the whole tab is a scroll container; `scrollIntoView({ block: 'nearest' })` in CountryPicker (and wheel scrolling) scrolls that outer pane too, pushing the filter's top border out of view. Also the CountryPicker root is `overflow-hidden` with no padding, so the input's 2px focus outline is clipped. Fix: only the list scrolls (manual `scrollTop`, no `scrollIntoView`), and the picker root no longer clips.

## Builder rules
- Touch ONLY: `src/ui/screens/Finder.tsx`, `src/ui/screens/finder/CountryPicker.tsx`, `src/ui/screens/finder/ScopePicker.tsx`, `src/ui/layout/AppShell.tsx`, `src/ui/globe/Globe.tsx`, `src/index.css`, `src/i18n/locales/{en,es,vi}/finder.json`, `DESIGN.md` (owner-approved for this plan), and this plan file (checkboxes + Builder notes).
- Minimal diff: every step is an exact string replacement. Another dev (Quan) edits these files: do not reformat, re-indent, reorder imports or "tidy" anything not named here.
- No commits, no branch switches. No `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- If an "old" text is not found exactly once, stop and write it under Builder notes; do not guess.

---

## Part A — Countries tab

### A1. i18n (`src/i18n/locales/*/finder.json`)
Grep result (done by planner): `scope.hint` and `scope.hoverHint` are used only in `ScopePicker.tsx` and become unused. `scope.selected`, `scope.selectedEmpty`, `scope.clear` stay (the compact summary in the results header still uses them). `sections.countries` stays (listbox aria-label). `sections.scope` is reused as the region row's group label.

- [x] `en/finder.json`: replace the whole `"scope": { … }` object with:
```json
  "scope": {
    "world": "Whole world",
    "current": "Searching in",
    "addCountry": "Add a country",
    "noMatches": "No country matches",
    "filterPlaceholder": "Filter or click a country on the globe",
    "selected": "Selected",
    "clear": "Clear",
    "remove": "Remove {{name}}",
    "selectedEmpty": "No countries selected yet."
  },
```
- [x] `es/finder.json`: same replacement:
```json
  "scope": {
    "world": "Todo el mundo",
    "current": "Buscando en",
    "addCountry": "Añadir un país",
    "noMatches": "Ningún país coincide",
    "filterPlaceholder": "Filtra o haz clic en un país del globo",
    "selected": "Seleccionados",
    "clear": "Borrar",
    "remove": "Quitar {{name}}",
    "selectedEmpty": "Aún no hay países seleccionados."
  },
```
- [x] `vi/finder.json`: same replacement:
```json
  "scope": {
    "world": "Toàn thế giới",
    "current": "Đang tìm ở",
    "addCountry": "Thêm quốc gia",
    "noMatches": "Không có quốc gia nào khớp",
    "filterPlaceholder": "Lọc hoặc nhấn vào một quốc gia trên quả địa cầu",
    "selected": "Đã chọn",
    "clear": "Xóa",
    "remove": "Bỏ {{name}}",
    "selectedEmpty": "Chưa chọn quốc gia nào."
  },
```
(Keep the 2-space indentation and the trailing comma after `}` exactly as the file has it now; the next key `"continent"` follows.)

### A2. `src/index.css` — the chip-row helper
- [x] Append at the very end of the file (after the last `}`), nothing else moves:
```css

/* Finder chip rows (plan 34): one line that scrolls sideways, scrollbar hidden (wheel, drag and Tab still scroll it),
   with a 24px fade at the right edge. The row's 24px right padding lets the last chip scroll clear of the fade. */
@layer components {
  .chip-scroll {
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
  }
  .chip-scroll::-webkit-scrollbar {
    display: none;
  }
}
```

### A3. `src/ui/screens/finder/CountryPicker.tsx`
- [x] A3a. Line 1. Old: `import { useEffect, useId, useMemo, useRef, useState } from 'react';`
  New: `import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type WheelEvent } from 'react';`
- [x] A3b. Line 3. Old: `import { Check } from 'lucide-react';` New: `import { Check, X } from 'lucide-react';`
- [x] A3c. Props interface. Old:
```tsx
  /** Fill the parent height and let only the list scroll (used by the split countries tab). */
  fill?: boolean;
  /** Hide the selected-countries summary when it lives in the other column. */
  showSelected?: boolean;
}
```
  New:
```tsx
  /** Fill the parent height and let only the list scroll (used by the countries tab). */
  fill?: boolean;
  /** Show the removable selected-countries row above the list (default). */
  showSelected?: boolean;
  /** Rendered between the filter and the list (the Finder's region chips). */
  beforeList?: ReactNode;
}
```
- [x] A3d. After the `fold` function (after its closing `}` on line 24, before the `/**` of the CountryPicker docblock) insert:
```tsx

/** Lets a vertical wheel scroll a one-line chip row sideways (the rows hide their scrollbar). */
export function wheelToX(event: WheelEvent<HTMLElement>) {
  const el = event.currentTarget;
  if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  el.scrollLeft += event.deltaY;
}
```
- [x] A3e. Destructuring. Old:
```tsx
  showSelected = true,
}: CountryPickerProps) {
```
  New:
```tsx
  showSelected = true,
  beforeList,
}: CountryPickerProps) {
```
- [x] A3f. Active-row scrolling (replaces `scrollIntoView`, which also scrolled the dock). Old:
```tsx
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);
```
  New:
```tsx
  // Scroll the list only: scrollIntoView would also scroll the dock and clip the filter field.
  useEffect(() => {
    if (activeIndex < 0) return;
    const list = document.getElementById(listboxId);
    const row = document.getElementById(optionId(activeIndex));
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [activeIndex]);
```
- [x] A3g. Root div. Old:
```tsx
      className={cn('flex flex-col gap-3', fill && 'h-full min-h-0 overflow-hidden')}
      onMouseLeave={() => onHoverCountry(null)}
      onBlur={(event) => {
```
  New (no `overflow-hidden`, so the input's focus outline is not clipped; mouse-leave moves to the list):
```tsx
      className={cn('flex flex-col gap-3', fill && 'h-full min-h-0')}
      onBlur={(event) => {
```
- [x] A3h. Middle rows + listbox opening. Old:
```tsx
      />

      <div
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('sections.countries')}
        className={cn(
          'grid min-h-0 grid-cols-1 gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[560px]:grid-cols-2',
          fill
            ? 'flex-1 @max-[679px]:max-h-[clamp(160px,24vh,260px)] @max-[679px]:flex-none'
            : 'max-h-[min(38vh,360px)]',
        )}
      >
```
  New:
```tsx
      />

      {/* Region chips and the selected row sit between the filter and the list; focusing them clears the globe focus. */}
      <div className="flex shrink-0 flex-col gap-3 empty:hidden" onFocus={() => onHoverCountry(null)}>
        {beforeList}
        {showSelected && <SelectedCountries />}
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('sections.countries')}
        onMouseLeave={() => onHoverCountry(null)}
        className={cn(
          'relative grid min-h-0 grid-cols-1 content-start gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[560px]:grid-cols-2',
          fill ? 'flex-1' : 'max-h-[min(38vh,360px)]',
        )}
      >
```
  (`relative` makes each row's `offsetTop` relative to the list for A3f; `content-start` stops rows stretching when a filter leaves few matches.)
- [x] A3i. End of CountryPicker. Old:
```tsx
      </div>

      {showSelected && <SelectedCountries />}
    </div>
  );
}
```
  New:
```tsx
      </div>
    </div>
  );
}
```
- [x] A3j. SelectedCountries docblock. Old: `/** Read-only summary of the chosen countries. Deselection happens by toggling a row in the list. */`
  New: `/** The chosen countries: a removable chip row (countries tab), or a compact inline summary (results header). */`
- [x] A3k. Inside SelectedCountries. Old:
```tsx
  const setScope = useFinder((s) => s.setScope);
  const uiLang = i18n.resolvedLanguage ?? 'en';
```
  New:
```tsx
  const setScope = useFinder((s) => s.setScope);
  const toggleCountry = useFinder((s) => s.toggleCountry);
  const uiLang = i18n.resolvedLanguage ?? 'en';
```
  (This pair appears once in SelectedCountries; CountryPicker has no `setScope` line. If it is not unique, stop.)
- [x] A3l. Clear button class. Old:
  `className="text-xs text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"`
  New:
  `className="shrink-0 whitespace-nowrap text-xs text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"`
- [x] A3m. The non-compact return (the last `return` of the file). Old:
```tsx
  return (
    <section aria-live="polite" aria-label={t('scope.selected')} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{t('scope.selected')}</h3>
        {clear}
      </div>
      {codes.length === 0 ? (
        <p className="text-sm text-chart-grey">{t('scope.selectedEmpty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">{badges}</div>
      )}
    </section>
  );
}
```
  New:
```tsx
  if (codes.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t('scope.selected')}
      onWheel={wheelToX}
      className="chip-scroll -my-1 flex items-center gap-2 overflow-x-auto py-1 pr-6"
    >
      {codes.map((iso) => {
        const name = countryName(iso, uiLang);
        return (
          <span
            key={iso}
            className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-shoal py-0.5 pr-1 pl-2 text-[0.8125rem] leading-tight text-foreground"
          >
            <Flag code={iso} className="size-4" />
            <span className="whitespace-nowrap">{name}</span>
            <button
              type="button"
              onClick={() => toggleCountry(iso)}
              aria-label={t('scope.remove', { name })}
              className="grid size-5 place-items-center rounded-full text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal"
            >
              <X className="size-3" strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        );
      })}
      {clear}
    </div>
  );
}
```
  The `compact` branch and the `badges` constant stay unchanged (results header).

### A4. `src/ui/screens/finder/ScopePicker.tsx`
- [x] A4a. Old: `import { CountryPicker, SelectedCountries } from './CountryPicker';` New: `import { CountryPicker, wheelToX } from './CountryPicker';`
- [x] A4b. Docblock. Old:
```tsx
/**
 * Two panes inside the countries tab: the scrollable country list on the left,
 * and the world/continent chips plus the selected summary on the right.
 */
```
  New:
```tsx
/**
 * The countries tab as one compact column: filter, a sideways row of region chips,
 * the removable selected row (only when any are chosen), then the list filling the rest.
 */
```
- [x] A4c. Replace the whole `return ( … );` of `ScopePicker` (from `  return (` through the matching `  );` just before the final `}`) with:
```tsx
  return (
    <CountryPicker
      fill
      onHoverCountry={onHoverCountry}
      beforeList={
        <div
          role="group"
          aria-label={t('sections.scope')}
          onWheel={wheelToX}
          className="chip-scroll -my-1 flex gap-2 overflow-x-auto py-1 pr-6"
        >
          <Chip
            className="shrink-0 whitespace-nowrap"
            selected={scope.kind === 'global'}
            onClick={() => setScope({ kind: 'global' })}
          >
            {t('scope.world')}
          </Chip>
          {CONTINENTS.map((continent) => (
            <Chip
              key={continent}
              className="shrink-0 whitespace-nowrap"
              selected={active === continent}
              onClick={() => pickContinent(continent)}
            >
              {t(key(continent))}
            </Chip>
          ))}
        </div>
      }
    />
  );
```
  Everything above the return (hooks, `pickContinent`) is unchanged. This removes the "Countries" heading, both hints, the "Selected" heading and the empty text from the tab.

### A5. `src/ui/screens/Finder.tsx` — no change for Part A
The countries tab wrapper (`min-h-0 flex-1 overflow-hidden p-3 @min-[480px]:p-4`) already gives the 12/16px padding the filter needs; keep it.

---

## Part B — globe under the rail

Approach: the Finder's globe layer becomes `fixed inset-0` (the whole window, under the rail). A new optional `centerOn` prop gives the Globe an anchor element (the Finder root = the working column); the Globe sets `globe.gl`'s `globeOffset([dx, dy])` so the sphere's centre stays on the anchor's centre. `dx` is half the rail width (36px collapsed, 142px expanded) and is re-measured with a ResizeObserver on the anchor, so it follows the 200ms rail width animation and window resizes. The sphere's size depends only on the canvas height, which does not change (main is already full height on the Finder), so nothing moves or scales. globe.gl 2.46.2 has `globeOffset` (positive x moves the sphere right).

The rail gets `position: relative; z-index: 10` so it always sits above the fixed globe and keeps its pointer events (the globe gets `pointerleave` when the pointer enters the rail). On the Finder only, the rail gets a static wash that fades to transparent at its right edge, so there is no line. No backdrop blur.

Known transient: during the 180ms route enter/exit animation AppShell's `motion.div` has a `translateX` transform, which makes it the containing block of the fixed globe; for those frames the canvas is the column size and the offset self-corrects to 0 (anchor = canvas), so the sphere stays put and only the glow under the rail is briefly absent. After the animation framer-motion sets `transform: none` and the canvas spans the window again (the ResizeObservers re-run). Do not change AppShell's route animation for this.

### B1. `src/ui/globe/Globe.tsx`
- [x] B1a. Line 1. Old: `import { useEffect, useRef, useState } from 'react';` New: `import { useEffect, useRef, useState, type RefObject } from 'react';`
- [x] B1b. Props. Old:
```tsx
  /** Fill the parent (full-bleed background) instead of drawing a square. */
  fill?: boolean;
  theme: 'light' | 'dark';
}
```
  New:
```tsx
  /** Fill the parent (full-bleed background) instead of drawing a square. */
  fill?: boolean;
  /** Keep the sphere centred on this element instead of the canvas (the Finder globe runs under the rail). */
  centerOn?: RefObject<HTMLElement | null>;
  theme: 'light' | 'dark';
}
```
- [x] B1c. Destructuring. Old:
```tsx
  fill = false,
  theme,
}: GlobeViewProps) {
```
  New:
```tsx
  fill = false,
  centerOn,
  theme,
}: GlobeViewProps) {
```
- [x] B1d. State ref. Old:
```tsx
    fill,
    palette: null as Palette | null,
```
  New:
```tsx
    fill,
    centerOn: (centerOn ?? null) as RefObject<HTMLElement | null> | null,
    /** The globeOffset in px currently applied (the pointer hit test uses it). */
    offset: [0, 0] as [number, number],
    palette: null as Palette | null,
```
- [x] B1e. Old: `  state.current.fill = fill;` New:
```tsx
  state.current.fill = fill;
  state.current.centerOn = centerOn ?? null;
```
- [x] B1f. Hit test follows the offset. Old:
```tsx
      const dx = event.clientX - rect.left - rect.width / 2;
      const dy = event.clientY - rect.top - rect.height / 2;
```
  New:
```tsx
      const dx = event.clientX - rect.left - rect.width / 2 - state.current.offset[0];
      const dy = event.clientY - rect.top - rect.height / 2 - state.current.offset[1];
```
- [x] B1g. After `    resize.observe(el);` (the line right after the resize ResizeObserver block) insert:
```tsx

    // With an anchor, the canvas may be wider than the column (the Finder runs it under the rail); offset the
    // sphere so its centre stays on the anchor's centre. Re-measured on canvas and anchor resizes (rail toggle).
    const syncOffset = () => {
      const anchor = state.current.centerOn?.current ?? null;
      let next: [number, number] = [0, 0];
      if (anchor) {
        const a = anchor.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        next = [
          Math.round(a.left + a.width / 2 - (r.left + r.width / 2)),
          Math.round(a.top + a.height / 2 - (r.top + r.height / 2)),
        ];
      }
      const [x, y] = state.current.offset;
      if (next[0] === x && next[1] === y) return;
      state.current.offset = next;
      globe.globeOffset(next);
    };
    const offsetResize = new ResizeObserver(syncOffset);
    offsetResize.observe(el);
    const anchorEl = state.current.centerOn?.current ?? null;
    if (anchorEl) offsetResize.observe(anchorEl);
```
- [x] B1h. Cleanup. Old:
```tsx
    return () => {
      resize.disconnect();
```
  New:
```tsx
    return () => {
      resize.disconnect();
      offsetResize.disconnect();
```
  Nothing else in Globe.tsx changes (palette, materials, accessors, camera logic untouched).

### B2. `src/ui/screens/Finder.tsx`
- [x] B2a. Old: `  const panelRef = useRef<HTMLElement>(null);` New:
```tsx
  const panelRef = useRef<HTMLElement>(null);
  // The working column: the globe (full window) keeps its sphere centred here.
  const sceneRef = useRef<HTMLDivElement>(null);
```
- [x] B2b. In the `globe` JSX. Old:
```tsx
        fill
        theme={theme}
```
  New:
```tsx
        fill
        centerOn={sceneRef}
        theme={theme}
```
- [x] B2c. Old:
```tsx
    <div className="relative flex min-h-full w-full flex-col">
      {/* The globe is the tab background: full-bleed, no square frame. */}
      <div className="absolute inset-0 overflow-hidden">{globe}</div>
```
  New:
```tsx
    <div ref={sceneRef} className="relative flex min-h-full w-full flex-col">
      {/* The globe is the tab background: the whole window, running under the rail (plan 34), centred on this column. */}
      <div className="fixed inset-0 overflow-hidden">{globe}</div>
```
  Nothing else in Finder.tsx changes.

### B3. `src/ui/layout/AppShell.tsx`
- [x] B3a. Old: `  const onCounselor = location.pathname.startsWith('/counselor');` New:
```tsx
  const onCounselor = location.pathname.startsWith('/counselor');
  // The Finder globe runs under the rail; the rail then takes a soft wash for legibility.
  const onFinder = location.pathname === '/finder';
```
- [x] B3b. Old: `      <aside className="app-rail flex min-h-0 flex-col gap-4 px-3 py-4">`
  New: `      <aside className={cn('app-rail flex min-h-0 flex-col gap-4 px-3 py-4', onFinder && 'app-rail--over-globe')}>`
  (`cn` is already imported.) Nothing else changes.

### B4. `src/index.css` — rail layer + Finder wash
- [x] Old:
```css
/* Rail: transparent over the ground. A 1px hairline separates it in light mode only. */
.app-rail {
  background: transparent;
  border-right: 1px solid var(--hairline);
}
.dark .app-rail {
  border-right-color: transparent;
}
```
  New:
```css
/* Rail: transparent over the ground. A 1px hairline separates it in light mode only. It sits above the content
   layer so the Finder globe, which runs under it, never takes its pointer events. */
.app-rail {
  position: relative;
  z-index: 10;
  background: transparent;
  border-right: 1px solid var(--hairline);
}
.dark .app-rail {
  border-right-color: transparent;
}
/* Finder (plan 34): the globe continues under the rail. A static wash of the ground colour keeps the icons legible
   and fades to nothing at the rail's edge, so rail and map are one scene. Never a backdrop blur here: the globe
   canvas redraws every frame and a full-height blur over it is too slow on software WebKitGTK. */
.app-rail--over-globe {
  border-right-color: transparent;
  background: linear-gradient(to right, color-mix(in srgb, var(--background) 70%, transparent), transparent);
}
```

---

## DESIGN.md
- [x] D1. Layout, rail paragraph (line ~291). Old: `with transparent ground over the stars.` New:
  `with transparent ground over the stars. It sits above the content layer (position relative, z-index 10). On the Finder the globe runs under it and the rail takes `.app-rail--over-globe`: no hairline, and a static wash of the ground colour, 70% at its left edge fading to transparent at its right edge, so the rail and the map read as one scene. Never a backdrop blur there: the globe redraws every frame.`
- [x] D2. Finder paragraph (line ~297). Old: `The Finder is a full-bleed globe with one floating glass dock in the bottom-right corner.`
  New: `The Finder is a full-window globe with one floating glass dock in the bottom-right corner. The globe canvas is fixed to the whole window and runs under the rail; globe.gl's globeOffset keeps the sphere centred on the working column (half the rail width, so it follows the rail between 72px and 284px), so the atmosphere never stops at the rail edge.`
- [x] D3. Same paragraph. Old: `a two-column country list and a right-hand fit column on result rows from 560px, and the region chips and Selected summary stack under the country list below 680px. Content scrolls inside the dock; nothing scrolls sideways.`
  New: `a two-column country list and a right-hand fit column on result rows from 560px. The Countries tab is one compact column with no headings or hints: the filter field ("Filter or click a country on the globe"), one sideways-scrolling row of region chips ("Whole world" first, scrollbar hidden, a 24px fade at the right edge), a row of removable selected-country chips (flag, name, ×) with a quiet Clear only when any are chosen, then the country list taking the rest of the height and scrolling inside itself. Content scrolls inside the dock; only those two chip rows scroll sideways.`
- [x] D4. Gradients & Glow list: after item 7 (`7. **Globe atmosphere.** …`) add a new line:
  `8. **Rail over the Finder globe (`.app-rail--over-globe`).** A static horizontal wash, the ground colour at 70% to transparent, so the rail icons stay legible over the globe. Finder only; never blurred, never animated.`

## Verify
```bash
bun run build
bun run check:i18n
bun test
grep -rn "scope.hint\|hoverHint\|scrollIntoView" src/ui/screens/finder src/i18n/locales   # must print nothing
grep -n "globeOffset\|offsetResize" src/ui/globe/Globe.tsx                                 # syncOffset present
grep -n "app-rail--over-globe\|chip-scroll" src/index.css src/ui/layout/AppShell.tsx src/ui/screens/finder/*.tsx
git diff --stat   # only the listed files + this plan
```
Paste the short results under Builder notes. The orchestrator then reads the diff and checks visually (dark and light, rail collapsed and expanded, ~1920x1080 and a narrow window):
- Countries tab: filter fully visible at the top with its focus ring; region chips in one row that scrolls with wheel/Tab and fades at the right; selected row appears only after picking a country, × removes, Clear clears; list fills the rest (2 columns ≥560px dock width); arrow keys move the active row without scrolling the dock; hovering a row still focuses the globe; leaving the list or tabbing to a chip releases it.
- Rail: the globe's glow continues under the rail with no vertical cut; the sphere is in the same place as before and stays put while the rail opens/closes; rail buttons all clickable; clicking countries on the globe still works; other screens look unchanged.
- Perf note for the orchestrator: the globe canvas is now window-wide (+4% pixels collapsed, +15% expanded at 1920). If the Finder feels slower on the owner's machine, measure fps per plan 20 before shipping.

## Builder notes

Builder notes (implemented directly in-session, no commits, app not started):
- All steps A1-A5, B1-B4, D1-D4 applied with exact-once string matching; every "Old" text was found exactly once. No step failed.
- `bun run build` (tsc + vite build): passed, exit 0.
- `bun run check:i18n`: passed (6 namespaces, es, vi match en).
- `bun test`: 254 pass, 0 fail, 26 files.
- Grep 1 (`scope.hint|hoverHint|scrollIntoView` in finder + locales): one hit, a comment in CountryPicker.tsx line ~72 ("scrollIntoView would also scroll the dock..."), which is the comment text the plan's A3f specifies. No code uses scrollIntoView, no hint keys remain.
- Grep 2: `globeOffset` and `offsetResize` present in Globe.tsx.
- Grep 3: `app-rail--over-globe` in index.css and AppShell.tsx; `chip-scroll` in index.css and both pickers.
- `git diff --stat`: only DESIGN.md, the three finder.json, index.css, Globe.tsx, AppShell.tsx, Finder.tsx, CountryPicker.tsx, ScopePicker.tsx (plus this plan file, untracked).
- Harness reported CountryPicker, Globe, AppShell, Finder and ScopePicker as changed on disk during the run. Every replacement matched the content present at the time, and the diff shows nothing outside the plan's changes, but the orchestrator should read the diff before committing.
- Not done (by rule): visual check, `bun tauri dev`.
