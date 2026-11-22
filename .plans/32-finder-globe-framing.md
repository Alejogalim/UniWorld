# 32 — Finder: off-centre globe framing + slim glass panel

Read first: `.plans/A-build-conventions.md`. Then only the files listed under "Files".

## Rules (read before anything else)
- Haiku builds. No commits, no pushes, no branch switches. No `pkill`/`killall`. Do not start the app (`tauri dev`, `vite`, `bun run dev`): skip those lines of the A-build-conventions verify block.
- Touch ONLY the files listed under "Files". **Owner override:** this plan may edit `DESIGN.md` (only the parts named in step 9), even though A-build-conventions forbids it.
- **Another dev (Quan) edits these files too.** Keep the diff focused: change only the lines this plan names. Do not reformat, re-order imports, re-indent or "tidy" untouched code. No Prettier/formatter runs.
- **Keep behaviour** of everything not named here: country selection (globe click, list click, Enter/Space), list keyboard navigation (ArrowUp/Down/Enter/Escape in the filter), list hover → globe focus, continent fly-to, careers tab, search flow, results, detail view, error/missing-key states, the pill and its scale animation. You move markup; you change logic only where a step says so.
- Copy class strings, code and i18n strings **exactly** as written here.
- No hex/oklch colours in components. Tokens only.
- If a step fails twice, stop and write it under "Builder notes".

## Goal
The globe stays full-bleed at today's size and zoom, but its visual centre moves into the area the panel leaves free, so the panel never hides the focused country. The wide bottom-right dock (920×540, two columns, tabs at the bottom) becomes a slim right-docked glass panel (384px, tabs at the top, one column). Dragging the globe folds the panel into its pill. Below 900px wide the panel is a bottom sheet and the globe offsets upward.

### How the framing works (context for the builder)
globe.gl 2.46.2 already has `globe.globeOffset([x, y])` (px from canvas centre, +x right, +y down). Internally it calls three-render-objects `viewOffset([-x, -y])`, which calls `camera.setViewOffset(w, h, -x, -y, w, h)` and **re-applies it on every `globe.width()/height()` resize**. So we never touch the camera directly: we only call `globe.globeOffset(...)`. Same full width/height → same zoom; only the projection centre moves. Raycasting (hover, click) uses the camera's projection matrix, so it stays correct. `pointOfView(...)` / fly-to / list-hover focus all aim the camera axis, which now projects at the offset centre, so countries land in the visible middle with no change to `geo.ts`. The only hand-written screen math in `Globe.tsx` (the "is the pointer over the sphere" test in `onPointerMove`) must add the offset; step 3 does that.

## Decisions (owner should know)
1. **Hover-to-open and leave-to-collapse are removed.** Today the pill opens on hover and the dock folds 900ms after the pointer leaves. With the globe re-centring on open/close, that would slide the globe under the cursor every time the pointer crosses the panel edge (e.g. while aiming at a country). New rule: the panel opens **on load** and stays open; it folds **only** when the user drags the globe; the pill opens it on **click / Enter / Space** (not hover, not focus). The tab is kept, so it reopens on the same tab.
2. **Auto-collapse rule:** a drag of ≥ 6px with a button held, starting on the globe canvas, folds the panel **unless** `phase === 'searching'` **or** (`tab === 'search'` **and** (results/error are showing, i.e. `phase !== 'idle' && !editing`, **or** a university detail is open)). A plain click (selecting a country) never folds it. Wheel-zoom never folds it.
3. Selected countries in the Countries tab become removable chips (× removes); they are hidden when none are selected. The Results header keeps the compact read-only badges.
4. The "click a country…" hint becomes the filter placeholder (new key `scope.filterHint`); the old `scope.hint` and `scope.hoverHint` keys are deleted.
5. `ResultRow`'s wide 3-column layout switches from a viewport media query to a container query, otherwise rows would try the wide layout inside the 384px panel.
6. The left-edge fade is a CSS mask on a background layer (not a colour gradient) so the text stays crisp; it applies only when docked (≥ 900px). WebKitGTK + `backdrop-filter` + `mask-image` should be eyeballed once in the real app (owner check, not builder).

## Files
Create:
- `src/ui/globe/framing.ts`
- `src/ui/globe/framing.test.ts`

Edit:
- `src/ui/globe/Globe.tsx`
- `src/ui/screens/Finder.tsx`
- `src/ui/screens/finder/ScopePicker.tsx` (full replacement)
- `src/ui/screens/finder/CountryPicker.tsx`
- `src/ui/screens/finder/ResultRow.tsx` (class prefix swap only)
- `src/index.css` (one new block)
- `src/i18n/locales/en/finder.json`, `src/i18n/locales/es/finder.json`, `src/i18n/locales/vi/finder.json`
- `DESIGN.md` (step 9 only)
- this plan (checkboxes + Builder notes)

Do NOT touch: `geo.ts`, `countryFallback.ts`, `useFinder.ts`, `CareerPicker.tsx`, `Filters.tsx`, `UniDetail.tsx`, `src/ui/components/**`, any other locale namespace, `package.json`.

## Steps

### [x] 1. `src/ui/globe/framing.ts` (new)
Write exactly:

```ts
/** Space a floating panel takes from the globe's field, in CSS px (plan 32). */
export interface ViewInset {
  right: number;
  bottom: number;
}

export const NO_INSET: ViewInset = { right: 0, bottom: 0 };

/** Duration of the globe re-centring when the panel opens, folds or the window resizes. */
export const OFFSET_TWEEN_MS = 300;

/**
 * globe.gl `globeOffset` ([x, y] px from the canvas centre, +x right, +y down) that puts the
 * globe's centre in the middle of the area the inset leaves free.
 */
export function globeOffsetFor(inset: ViewInset): [number, number] {
  return [inset.right > 0 ? -inset.right / 2 : 0, inset.bottom > 0 ? -inset.bottom / 2 : 0];
}

/** Ease-out cubic on 0..1 (input is clamped). */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** Linear blend of two offsets; k = 0 gives `from`, k = 1 gives `to`. */
export function lerpOffset(from: [number, number], to: [number, number], k: number): [number, number] {
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
}
```

### [x] 2. `src/ui/globe/framing.test.ts` (new)
Write exactly:

```ts
import { describe, expect, test } from 'bun:test';
import { easeOutCubic, globeOffsetFor, lerpOffset, NO_INSET } from './framing';

describe('globeOffsetFor', () => {
  test('no inset keeps the globe centred', () => {
    expect(globeOffsetFor(NO_INSET)).toEqual([0, 0]);
  });
  test('a right panel moves the centre left by half its width', () => {
    expect(globeOffsetFor({ right: 400, bottom: 0 })).toEqual([-200, 0]);
  });
  test('a bottom sheet moves the centre up by half its height', () => {
    expect(globeOffsetFor({ right: 0, bottom: 360 })).toEqual([0, -180]);
  });
  test('negative insets are ignored', () => {
    expect(globeOffsetFor({ right: -10, bottom: -4 })).toEqual([0, 0]);
  });
});

describe('easeOutCubic', () => {
  test('clamps and hits both ends', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
  });
  test('is ahead of linear in the middle', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('lerpOffset', () => {
  test('blends both axes', () => {
    expect(lerpOffset([0, 0], [-200, -100], 0.5)).toEqual([-100, -50]);
  });
});
```

### [x] 3. `src/ui/globe/Globe.tsx`
Five targeted edits. Change nothing else.

**3a. Imports.** After the line `import { continentOf, loadCountries, viewForCountry, type CountryFeature, type GeoView } from './geo';` add:

```ts
import { easeOutCubic, globeOffsetFor, lerpOffset, OFFSET_TWEEN_MS, type ViewInset } from './framing';
```

**3b. Props.** In `GlobeViewProps`, after the `theme: 'light' | 'dark';` line add:

```ts
  /** Space a floating panel covers (CSS px). The globe keeps its size; its centre moves into the free area. */
  viewInset?: ViewInset;
  /** Fires once per gesture when the user drags (rotates) the globe, not on a plain click. */
  onUserDrag?: () => void;
```

In the destructured parameters of `GlobeView`, after `theme,` add:

```ts
  viewInset,
  onUserDrag,
```

**3c. State ref.** In the `useRef({...})` object, after the `reduceMotion,` line add:

```ts
    onUserDrag,
    /** globeOffset currently applied, [x, y] px from the canvas centre. */
    offset: [0, 0] as [number, number],
    /** Pending requestAnimationFrame of the offset tween, 0 when none. */
    offsetFrame: 0,
```

After the line `state.current.reduceMotion = reduceMotion;` add:

```ts
  state.current.onUserDrag = onUserDrag;
```

**3d. Pointer-over-sphere test uses the offset centre.** In `onPointerMove` replace the two lines

```ts
      const dx = event.clientX - rect.left - rect.width / 2;
      const dy = event.clientY - rect.top - rect.height / 2;
```

with

```ts
      // The sphere's centre sits at the canvas centre plus the framing offset (plan 32).
      const dx = event.clientX - rect.left - (rect.width / 2 + state.current.offset[0]);
      const dy = event.clientY - rect.top - (rect.height / 2 + state.current.offset[1]);
```

**3e. Drag detection.** Directly after the existing line `el.addEventListener('pointermove', onPointerMove);` add:

```ts

    // A real drag (not a click on a country) tells the Finder to fold its panel (plan 32).
    const DRAG_THRESHOLD_PX = 6;
    let dragStart: { x: number; y: number } | null = null;
    let dragReported = false;
    const onDragDown = (event: PointerEvent) => {
      dragStart = { x: event.clientX, y: event.clientY };
      dragReported = false;
    };
    const onDragMove = (event: PointerEvent) => {
      if (!dragStart || dragReported || event.buttons === 0) return;
      if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) < DRAG_THRESHOLD_PX) return;
      dragReported = true;
      state.current.onUserDrag?.();
    };
    const onDragEnd = () => {
      dragStart = null;
    };
    el.addEventListener('pointerdown', onDragDown);
    el.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
```

In the same effect's cleanup, directly after `el.removeEventListener('pointermove', onPointerMove);` add:

```ts
      el.removeEventListener('pointerdown', onDragDown);
      el.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragEnd);
      cancelAnimationFrame(s.offsetFrame);
      s.offsetFrame = 0;
```

**3f. Offset tween effect.** Directly after the `// Camera moves.` effect (the one ending `}, [flyTo]);`) add:

```ts

  // Off-centre framing (plan 32): move the projection centre into the free area, same size and zoom.
  // globe.gl re-applies globeOffset on every resize, so only changes of the inset need handling here.
  const insetRight = viewInset?.right ?? 0;
  const insetBottom = viewInset?.bottom ?? 0;
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const s = state.current;
    const target = globeOffsetFor({ right: insetRight, bottom: insetBottom });
    const from = s.offset;
    const apply = (offset: [number, number]) => {
      s.offset = offset;
      globe.globeOffset(offset);
    };
    cancelAnimationFrame(s.offsetFrame);
    s.offsetFrame = 0;
    if (s.reduceMotion || (from[0] === target[0] && from[1] === target[1])) {
      apply(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = easeOutCubic((now - start) / OFFSET_TWEEN_MS);
      apply(lerpOffset(from, target, k));
      s.offsetFrame = k < 1 ? requestAnimationFrame(step) : 0;
    };
    s.offsetFrame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(s.offsetFrame);
      s.offsetFrame = 0;
    };
  }, [insetRight, insetBottom]);
```

Note: a new inset mid-tween cancels the old frame and tweens on from the current `s.offset`, so resizes and quick open/close never jump.

### [x] 4. `src/ui/screens/Finder.tsx`
**4a. React import** (line 1) becomes:

```ts
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
```

After the line `import type { GeoView } from '@/ui/globe/geo';` add:

```ts
import { NO_INSET, type ViewInset } from '@/ui/globe/framing';
```

**4b. Constants.** Replace everything from `/** How long the dock waits after the pointer leaves before folding back into its pill. */` down to and including the whole `isTypingInside` function (old lines 37–54) with:

```ts
const EASE = [0.2, 0, 0, 1] as const;

/** Below this width the panel is a bottom sheet and the globe offsets upward (plan 32). Matches `min-[900px]:`. */
const SHEET_QUERY = '(max-width: 899px)';

/**
 * Fixed footprint of the panel. Docked (>= 900px): right edge, full height minus 16px gaps, 384px wide.
 * Bottom sheet (< 900px): full width minus gaps, 45vh tall. It is a container for the tab content.
 */
const DOCK_FRAME =
  '@container absolute inset-x-4 bottom-4 h-[45vh] min-[900px]:inset-x-auto min-[900px]:top-4 min-[900px]:right-4 min-[900px]:h-auto min-[900px]:w-[min(24rem,calc(100%-2rem))]';

/** Expanded panel. It scales from the bottom-right corner so it grows out of the pill. The glass is a separate layer. */
const DOCK_PANEL =
  'pointer-events-auto absolute inset-0 isolate flex origin-bottom-right flex-col overflow-hidden rounded-card shadow-float';

/** Very translucent glass behind the panel content; `.finder-glass` fades its left edge when docked. */
const DOCK_GLASS =
  'finder-glass pointer-events-none absolute inset-0 -z-10 rounded-card border border-hairline bg-panel/55 backdrop-blur-md';
```

(`EASE` is kept, `AUTO_COLLAPSE_MS` and `isTypingInside` are gone.)

**4c. State and refs.** Replace the block from `const [open, setOpen] = useState(false);` down to and including the `previousPhase` effect (old lines 82–128: `open`, `detail`, `panelRef`, `pointerInsideRef`, `keyboardOpenRef`, `phaseRef`, `collapseTimer`, `cancelCollapse`, `scheduleCollapse`, the unmount cleanup effect, the keyboard-focus effect and the "If a search finishes…" effect) with:

```tsx
  // The panel starts open; only a globe drag folds it (plan 32).
  const [open, setOpen] = useState(true);
  const [detail, setDetail] = useState<{ rorId: string; program: string; uni: UniResult } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const keyboardOpenRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameInset, setFrameInset] = useState<ViewInset>(NO_INSET);

  // Keyboard opening moves focus into the dock, since the pill disappears.
  useEffect(() => {
    if (!open || !keyboardOpenRef.current) return;
    const timer = window.setTimeout(() => {
      keyboardOpenRef.current = false;
      panelRef.current?.focus();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Measure how much of the globe's field the panel footprint covers: its width when docked right,
  // its height when it is a bottom sheet. The frame is never transformed, so its rect is the real footprint.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const frame = frameRef.current;
    if (!field || !frame) return;
    const sheet = window.matchMedia(SHEET_QUERY);
    const measure = () => {
      const f = field.getBoundingClientRect();
      const p = frame.getBoundingClientRect();
      const next: ViewInset = sheet.matches
        ? { right: 0, bottom: Math.max(0, Math.round(f.bottom - p.top)) }
        : { right: Math.max(0, Math.round(f.right - p.left)), bottom: 0 };
      setFrameInset((prev) => (prev.right === next.right && prev.bottom === next.bottom ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    observer.observe(frame);
    sheet.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      sheet.removeEventListener('change', measure);
    };
  }, []);
```

(The `keyboardOpenRef` effect is copied verbatim from the old code.)

**4d. Collapse rule.** Directly after the line `const showingResults = phase !== 'idle' && !editing;` add:

```tsx
  // Plan 32: dragging the globe folds the panel to its pill, except while a search runs
  // or while the Search tab shows results, an error or a university detail.
  const keepOpen = phase === 'searching' || (tab === 'search' && (showingResults || detail !== null));
  const collapseOnDrag = () => {
    if (!keepOpen) setOpen(false);
  };
  // The globe centres itself in the area the open panel leaves free.
  const viewInset = open ? frameInset : NO_INSET;
```

**4e. Globe props.** In the `<GlobeView ... />` element, after `theme={theme}` add:

```tsx
        viewInset={viewInset}
        onUserDrag={collapseOnDrag}
```

**4f. `searchControls` / `resultsPanel`:** unchanged.

**4g. The `return (...)`** (old lines 371–520) is replaced by the block below. Inside it, the four tab bodies and the tab buttons keep their existing code; the differences are: no mouse/focus/blur handlers on the section, the tablist comes **first** with `border-b` and the active bar at the **bottom**, the careers and countries bodies scroll (`overflow-y-auto`), the glass layer is the first child, and the pill opens on click only.

```tsx
  return (
    <div className="relative flex min-h-full w-full flex-col">
      {/* The globe is the tab background: full-bleed, no square frame. */}
      <div ref={fieldRef} className="absolute inset-0 overflow-hidden">
        {globe}
      </div>

      <div className="pointer-events-none relative z-10 flex-1">
        <div ref={frameRef} className={DOCK_FRAME}>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.section
                key="finder-dock"
                id="finder-dock"
                ref={panelRef}
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.14 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.14 }}
                transition={{ duration: reduceMotion ? 0 : 0.26, ease: EASE }}
                aria-label={t('tabs.label')}
                className={DOCK_PANEL}
                tabIndex={-1}
              >
                <div aria-hidden="true" className={DOCK_GLASS} />

                <div
                  role="tablist"
                  aria-label={t('tabs.label')}
                  className="grid shrink-0 grid-cols-3 gap-1 border-b border-hairline p-2"
                >
                  {tabs.map(({ id, icon: Icon, label }) => {
                    const active = tab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`finder-tab-${id}`}
                        aria-controls={`finder-panel-${id}`}
                        aria-selected={active}
                        onClick={() => setTab(id)}
                        className={cn(
                          'relative flex min-h-10 items-center justify-center gap-2 rounded-control px-2 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
                          active
                            ? 'bg-shoal text-foreground'
                            : 'text-chart-grey hover:bg-shoal hover:text-foreground',
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-signal"
                          />
                        )}
                        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  role="tabpanel"
                  id={`finder-panel-${tab}`}
                  aria-labelledby={`finder-tab-${tab}`}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  {tab === 'careers' && (
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      <section className="flex flex-col gap-3">
                        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
                          {t('sections.careers')}
                        </h2>
                        <CareerPicker />
                      </section>
                    </div>
                  )}

                  {tab === 'countries' && (
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      <ScopePicker
                        onFlyTo={(view) => setFlyTo({ ...view })}
                        onHoverCountry={setHoverIso}
                      />
                    </div>
                  )}

                  {tab === 'search' &&
                    (detail ? (
                      <UniDetailView
                        embedded
                        rorId={detail.rorId}
                        program={detail.program}
                        uni={detail.uni}
                        onBack={() => setDetail(null)}
                      />
                    ) : showingResults ? (
                      resultsPanel
                    ) : (
                      <div className="min-h-0 flex-1 overflow-hidden">{searchControls}</div>
                    ))}
                </div>
              </motion.section>
            ) : (
              <motion.button
                key="finder-pill"
                type="button"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE }}
                onClick={(event) => {
                  // detail === 0 means Enter/Space, so focus follows into the panel.
                  keyboardOpenRef.current = event.detail === 0;
                  setOpen(true);
                }}
                aria-label={t('common:nav.finder')}
                aria-controls="finder-dock"
                className="pointer-events-auto absolute right-0 bottom-0 inline-flex origin-bottom-right items-center gap-2 rounded-full border border-hairline bg-panel/90 px-4 py-3 text-sm font-medium text-foreground shadow-float outline-none backdrop-blur-md transition-colors hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                <Globe2 className="size-4 text-signal" strokeWidth={1.75} aria-hidden="true" />
                {t('common:nav.finder')}
                <ChevronUp className="size-3.5 text-chart-grey" strokeWidth={2} aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
```

**4h. Unused-symbol check:** `useCallback`, `AUTO_COLLAPSE_MS`, `isTypingInside`, `pointerInsideRef`, `phaseRef`, `collapseTimer`, `cancelCollapse`, `scheduleCollapse` and `previousPhase` must no longer appear anywhere in the file (`grep -nE "useCallback|AUTO_COLLAPSE_MS|isTypingInside|pointerInsideRef|phaseRef|collapseTimer|cancelCollapse|scheduleCollapse|previousPhase" src/ui/screens/Finder.tsx` prints nothing). `tsconfig.json` has `noUnusedLocals`, so the build fails otherwise. Every other line of the file stays as it is.

### [x] 5. `src/ui/screens/finder/ScopePicker.tsx` (full replacement)
One column: filter field → region chips → selected chips (only when any) → country list. The chips are passed into `CountryPicker` so they sit between its filter field and its list.

```tsx
import { useTranslation } from 'react-i18next';
import { CONTINENTS, CONTINENT_VIEWS, type GeoView } from '@/ui/globe/geo';
import { Chip } from '@/ui/components/Chip';
import { CountryPicker, SelectedCountries } from './CountryPicker';
import { useFinder } from './useFinder';
import type { Continent } from '@/core/contracts';

interface ScopePickerProps {
  onFlyTo: (view: GeoView) => void;
  onHoverCountry: (iso: string | null) => void;
}

/**
 * The countries tab as one column (plan 32): the filter field, the world/continent chips,
 * the selected countries as removable chips, then the country list.
 */
export function ScopePicker({ onFlyTo, onHoverCountry }: ScopePickerProps) {
  const { t } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const setContinent = useFinder((s) => s.setContinent);
  const active: Continent | null = scope.kind === 'continent' ? scope.continent : null;
  const key = (c: Continent) => `continent.${c}`;

  const pickContinent = (continent: Continent) => {
    const turningOn = active !== continent;
    setContinent(continent);
    if (turningOn) onFlyTo(CONTINENT_VIEWS[continent]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CountryPicker fill showSelected={false} onHoverCountry={onHoverCountry}>
        <div className="flex flex-wrap gap-2">
          <Chip selected={scope.kind === 'global'} onClick={() => setScope({ kind: 'global' })}>
            {t('scope.world')}
          </Chip>
          {CONTINENTS.map((continent) => (
            <Chip key={continent} selected={active === continent} onClick={() => pickContinent(continent)}>
              {t(key(continent))}
            </Chip>
          ))}
        </div>
        <div className="max-h-28 shrink-0 overflow-y-auto">
          <SelectedCountries removable />
        </div>
      </CountryPicker>
    </div>
  );
}
```

### [x] 6. `src/ui/screens/finder/CountryPicker.tsx`
Targeted edits only.

**6a.** Line 1 becomes:

```ts
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
```

After `import { Badge } from '@/ui/components/Chip';` change that line to:

```ts
import { Badge, Chip } from '@/ui/components/Chip';
```

**6b.** In `CountryPickerProps`, after `showSelected?: boolean;` add:

```ts
  /** Rendered between the filter field and the list (the Finder puts the region and selected chips here). */
  children?: ReactNode;
```

In the `CountryPicker` parameter list, after `showSelected = true,` add `children,`.

**6c.** On the `<Input ...>`, change only the placeholder line:

```tsx
        placeholder={t('scope.filterHint')}
```

(keep `aria-label={t('scope.filterPlaceholder')}` as is). Directly after the Input's closing `/>` add:

```tsx

      {children}
```

**6d.** The listbox `className={cn(...)}` becomes (single column always; in fill mode the list takes the rest of the height but never below 8rem). `min-h-0` moves into the non-fill branch on purpose, so the two `min-h-*` classes never meet (`cn` does not merge Tailwind classes):

```tsx
        className={cn(
          'grid grid-cols-1 gap-x-1 overflow-y-auto rounded-control border border-hairline',
          fill ? 'min-h-32 flex-1' : 'min-h-0 max-h-[min(38vh,360px)]',
        )}
```

**6d-bis.** On the root `<div>` of `CountryPicker`, change only `fill && 'h-full min-h-0 overflow-hidden'` to `fill && 'h-full min-h-0'`. In a short bottom sheet the list then stops at 8rem and the tab body (`overflow-y-auto`, step 4g) scrolls instead of clipping.

**6e. `SelectedCountries`** — signature and body changes:

```tsx
/**
 * Summary of the chosen countries. `compact` is the read-only line in the results header;
 * `removable` shows them as chips with a remove control and renders nothing when none are chosen.
 */
export function SelectedCountries({
  compact = false,
  removable = false,
}: {
  compact?: boolean;
  removable?: boolean;
}) {
  const { t, i18n } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const toggleCountry = useFinder((s) => s.toggleCountry);
  const uiLang = i18n.resolvedLanguage ?? 'en';
  const codes = scope.kind === 'countries' ? scope.codes : [];
```

Keep the existing `badges`, `clear` and `if (compact) {...}` code unchanged. Directly before the final non-compact `return (` add:

```tsx
  if (removable) {
    if (codes.length === 0) return null;
    return (
      <section aria-live="polite" aria-label={t('scope.selected')} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{t('scope.selected')}</h3>
          {clear}
        </div>
        <div className="flex flex-wrap gap-2">
          {codes.map((iso) => (
            <Chip key={iso} onRemove={() => toggleCountry(iso)}>
              {countryName(iso, uiLang)}
            </Chip>
          ))}
        </div>
      </section>
    );
  }
```

(The chip's child is the plain country name string, so the shared `chip.remove` aria label reads "Remove France".)

### [x] 7. `src/ui/screens/finder/ResultRow.tsx`
Replace every `min-[720px]:` with `@min-[720px]:` (5 occurrences on 3 lines: ~92, ~135, ~136). Nothing else. The Finder panel frame is the `@container`, so rows stack inside the 384px panel and only go 3-column in a wide bottom sheet.

Check: `grep -c "@min-\[720px\]:" src/ui/screens/finder/ResultRow.tsx` → counts lines; `grep -o "min-\[720px\]:" src/ui/screens/finder/ResultRow.tsx | wc -l` → 5 and `grep -nE "[^@]min-\[720px\]" src/ui/screens/finder/ResultRow.tsx` prints nothing.

### [x] 8. `src/index.css`
Inside `@layer components`, directly after the `.status-track-scroll::-webkit-scrollbar { display: none; }` block, add:

```css

  /* Finder glass panel (plan 32): when docked right, the glass layer's left edge fades out so land reads
     through. A mask on the background layer only, so the text stays crisp. Not a colour gradient. */
  @media (min-width: 900px) {
    .finder-glass {
      -webkit-mask-image: linear-gradient(to right, rgb(0 0 0 / 0.2), #000 0.75rem);
      mask-image: linear-gradient(to right, rgb(0 0 0 / 0.2), #000 0.75rem);
    }
  }
```

### [x] 9. i18n + DESIGN.md
**9a. `finder.json` (en/es/vi), `scope` object:** delete the keys `hint` and `hoverHint`; add `filterHint` right after `filterPlaceholder`. Edit only those lines (keep every other key and the file's formatting; remember the comma on the line before when deleting the last key `hoverHint`).

- en: `"filterHint": "Filter, or click a country on the globe",`
- es: `"filterHint": "Filtra, o haz clic en un país del globo",`
- vi: `"filterHint": "Lọc, hoặc nhấp một nước trên địa cầu",`

Check: `grep -rn "scope.hint\|hoverHint" src` prints nothing.

**9b. `DESIGN.md`.** Replace the single paragraph that starts `The Finder is the one two-region screen:` (in "## Layout") with:

```md
The Finder is the one full-bleed screen: the globe fills the field at its full size and never shrinks. Careers, countries and search live in one slim glass panel docked right (384px wide, 16px from the top, right and bottom; `bg-panel/55` with `backdrop-blur-md`, a hairline border, and a soft left-edge fade that is a mask on the glass layer, not a colour gradient, so land reads through). Tabs sit at the top and the active tab scrolls inside. The countries tab is one column: the filter field, region chips, the selected countries as removable chips, then the list. The globe's projection centre is offset into the free area left of the panel (a camera view offset, not a smaller globe), so a focused country always lands in view. Dragging the globe folds the panel into its pill, except while a search runs or the Search tab shows results; clicking the pill opens it on the same tab. Below 900px the panel is a bottom sheet (45vh) and the globe offsets upward instead. Results are a ranked column of rows, not a grid.
```

In "### Motion", after the sentence `The globe fly-to and contraction keep their durations.` add:

```md
The globe re-centres into the area the Finder panel leaves free over 300ms (ease-out) when the panel opens, folds or the window resizes; reduced motion jumps.
```

## Verify
```bash
bun run build
bun run check:i18n
bun test            # all existing tests plus the new src/ui/globe/framing.test.ts must pass
grep -nE "useCallback|AUTO_COLLAPSE_MS|isTypingInside|pointerInsideRef|phaseRef|collapseTimer|cancelCollapse|scheduleCollapse|previousPhase" src/ui/screens/Finder.tsx   # empty
grep -rn "scope.hint\|hoverHint" src                                                     # empty
grep -nE "[^@]min-\[720px\]" src/ui/screens/finder/ResultRow.tsx                          # empty
git diff --stat     # only the files listed under "Files"
```
Do NOT run `tauri dev`, `vite` or `bun run dev`. Paste short results under "Builder notes".

### Owner check in the real app (not the builder)
- Docked (≥ 900px): globe the same size as before, centred in the area left of the panel; hovering/arrowing a country in the list and clicking a continent chip fly it to the middle of the free area; the sphere hover cursor/rotation pause matches the visible sphere.
- Drag the globe → panel folds to the pill and the globe glides back to the field centre (~300ms). Click a country without dragging → no fold. Click the pill → reopens on the same tab. With results shown in Search, dragging does not fold.
- Narrow the window below 900px → bottom sheet, globe offsets up; widen → docked again, smooth.
- Light and dark: glass reads as glass, left edge fades, blur still visible with the mask under WebKitGTK.

## Builder notes
- Build: `bun run build` passed (tsc + vite build, exit 0; only the existing chunk-size warning).
- `bun run check:i18n`: passed (es, vi match en).
- `bun test`: 261 pass, 0 fail, 27 files (includes `src/ui/globe/framing.test.ts`).
- Grep checks: Finder.tsx leftover-symbol grep empty; `scope.hint|hoverHint` grep empty; bare `min-[720px]` grep in ResultRow.tsx empty.
- Deviation: step 7 says 5 occurrences on 3 lines. The file has 7 (line 92: 1, line 135: 5, line 136: 1). All 7 were changed to `@min-[720px]:`, per the rule "replace every".
- Deviation: step 9b Motion. The new sentence sits inside the same paragraph, after "The globe fly-to and contraction keep their durations." and before "`prefers-reduced-motion` removes transforms and keeps opacity."
- Steps 4g and 5 were spliced from the plan's code blocks (lines 373-502 and 511-560) rather than retyped.
- Finder.tsx: after my splice, the harness reported the file changed on disk. I checked the content: it has only the planned changes and none of the removed symbols. I did not revert anything.
- `bun run build` wrote `dist/` (not tracked by git). App not started; no commits.
