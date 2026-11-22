import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Briefcase, ChevronUp, Globe2, Search as SearchIcon } from 'lucide-react';
import { setSetting } from '@/store/settings';
import { useTheme } from '@/app/theme';
import { cn } from '@/lib/utils';
import type { UniResult } from '@/core/contracts';
import { Button } from '@/ui/components/ui/button';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Panel } from '@/ui/components/Panel';
import { ProgressLine } from '@/ui/components/ProgressLine';
import { Spinner } from '@/ui/components/Spinner';
import type { GeoView } from '@/ui/globe/geo';
import { NO_INSET, type ViewInset } from '@/ui/globe/framing';
import { CareerPicker } from './finder/CareerPicker';
import { Filters } from './finder/Filters';
import { ResultRow } from './finder/ResultRow';
import { ScopePicker } from './finder/ScopePicker';
import { SelectedCountries } from './finder/CountryPicker';
import { isTooFew, translateProgress } from './finder/progress';
import {
  loadFinderProviderState,
  PROVIDER_NAME,
  switchTargetFor,
  type FinderProviderState,
} from './finder/providerState';
import { useFinder } from './finder/useFinder';
import { UniDetailView } from './UniDetail';

// three.js (through globe.gl) is only fetched when the Finder opens.
const GlobeView = lazy(() => import('@/ui/globe/Globe'));

type FinderTab = 'careers' | 'countries' | 'search';

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

/** Design §7.3: careers, countries and search in one bottom dock over the full-bleed globe. */
export function FinderScreen() {
  const { t } = useTranslation(['finder', 'common']);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion() ?? false;
  const theme = useTheme((s) => s.resolved);
  const phase = useFinder((s) => s.phase);
  const editing = useFinder((s) => s.editing);
  const results = useFinder((s) => s.results);
  const progress = useFinder((s) => s.progress);
  const summary = useFinder((s) => s.summary);
  const error = useFinder((s) => s.error);
  const careers = useFinder((s) => s.careers);
  const scope = useFinder((s) => s.scope);
  const toggleCountry = useFinder((s) => s.toggleCountry);
  const search = useFinder((s) => s.search);
  const reset = useFinder((s) => s.reset);
  const setEditing = useFinder((s) => s.setEditing);

  const [providers, setProviders] = useState<FinderProviderState | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<GeoView | null>(null);
  // Raw list hover and the debounced value the globe follows.
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const [tab, setTab] = useState<FinderTab>(() => (phase === 'idle' ? 'careers' : 'search'));
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

  const hasKey = providers === null ? null : providers.hasOpenRouter || providers.hasOpenCode;
  const switchTo = providers ? switchTargetFor(providers) : null;

  useEffect(() => {
    let cancelled = false;
    loadFinderProviderState()
      .then((state) => {
        if (!cancelled) setProviders(state);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setKeyError(err instanceof Error ? err.message : String(err));
        setProviders({ used: null, hasOpenRouter: false, hasOpenCode: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A very short pause avoids flying on every pointer crossing between rows.
  useEffect(() => {
    if (hoverIso === null) {
      setFocusIso(null);
      return;
    }
    const timer = setTimeout(() => setFocusIso(hoverIso), 50);
    return () => clearTimeout(timer);
  }, [hoverIso]);

  const showingResults = phase !== 'idle' && !editing;

  // Plan 32: dragging the globe folds the panel to its pill, except while a search runs
  // or while the Search tab shows results, an error or a university detail.
  const keepOpen = phase === 'searching' || (tab === 'search' && (showingResults || detail !== null));
  const collapseOnDrag = () => {
    if (!keepOpen) setOpen(false);
  };
  // The globe centres itself in the area the open panel leaves free.
  const viewInset = open ? frameInset : NO_INSET;

  // A reset elsewhere (for example after deleting local data) must also close an embedded detail.
  useEffect(() => {
    if (phase === 'idle') setDetail(null);
  }, [phase]);

  // The list is gone once results take the search tab, so drop any focus it set.
  useEffect(() => {
    if (showingResults) setHoverIso(null);
  }, [showingResults]);

  const runSearch = () => {
    setHoverIso(null);
    setDetail(null);
    setTab('search');
    setOpen(true);
    void search();
  };

  const openDetail = (uni: UniResult) => {
    setDetail({ rorId: uni.rorId, program: uni.program, uni });
    setTab('search');
    setOpen(true);
  };

  const switchAndSearch = async (provider: NonNullable<typeof switchTo>) => {
    try {
      await setSetting('default_provider', provider);
      setProviders(await loadFinderProviderState());
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : String(err));
      return;
    }
    runSearch();
  };

  const selected = useMemo(
    () => new Set(scope.kind === 'countries' ? scope.codes : []),
    [scope],
  );
  const highlightContinent = scope.kind === 'continent' ? scope.continent : null;
  const lastProgress = progress[progress.length - 1];
  const showTooFew =
    phase === 'done' && (progress.some(isTooFew) || (summary !== null && summary.verified < 3));
  const noCareer = careers.length === 0;
  const canSearch = !noCareer && hasKey === true && phase !== 'searching';
  const reason = noCareer ? t('search.noCareer') : null;

  const globe = (
    <Suspense
      fallback={
        <div className="grid size-full place-items-center">
          <Spinner label={t('common:loading')} />
        </div>
      }
    >
      <GlobeView
        selected={selected}
        highlightContinent={highlightContinent}
        onToggleCountry={toggleCountry}
        flyTo={flyTo}
        focusCountry={focusIso}
        listHover={hoverIso !== null}
        fill
        theme={theme}
        viewInset={viewInset}
        onUserDrag={collapseOnDrag}
      />
    </Suspense>
  );

  const tabs: { id: FinderTab; icon: typeof Briefcase; label: string }[] = [
    { id: 'careers', icon: Briefcase, label: t('tabs.careers') },
    { id: 'countries', icon: Globe2, label: t('tabs.countries') },
    { id: 'search', icon: SearchIcon, label: t('tabs.search') },
  ];

  const searchControls = (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {keyError && <ErrorNote message={keyError} />}
      <div className="grid gap-4 @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] @min-[680px]:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
            {t('sections.filters')}
          </h2>
          <Filters />
        </section>

        <Panel variant="ember" className="flex flex-col gap-3 p-4">
          {hasKey === false && (
            <ErrorNote
              message={t('key.message')}
              action={
                <Button variant="secondary" onClick={() => navigate('/settings')}>
                  {t('key.openSettings')}
                </Button>
              }
            />
          )}

          <div>
            <Button onClick={runSearch} disabled={!canSearch}>
              {t('search.button')}
            </Button>
          </div>
          {reason && <p className="text-sm text-chart-grey">{reason}</p>}
        </Panel>
      </div>
    </div>
  );

  const resultsPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
            {t('sections.results')}
          </h2>
          {scope.kind === 'countries' && <SelectedCountries compact />}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="quiet"
            size="sm"
            disabled={phase === 'searching'}
            onClick={() => {
              setEditing(true);
              setTab('search');
            }}
          >
            {t('search.edit')}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            disabled={phase === 'searching'}
            onClick={() => {
              reset();
              setDetail(null);
              setTab('careers');
            }}
          >
            {t('search.newSearch')}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3 pr-1">
        {phase === 'searching' && (
          <ProgressLine
            message={lastProgress ? translateProgress(lastProgress, t) : t('progress.searching')}
          />
        )}

        {phase === 'done' && summary && (
          <p className="font-mono text-xs text-chart-grey tabular-nums">
            {t('progress.verified', { verified: summary.verified, removed: summary.removed })}
          </p>
        )}

        {showTooFew && <ErrorNote message={t('warning.tooFew')} />}

        {phase === 'error' &&
          error &&
          (error.missingKey ? (
            <ErrorNote
              message={t('key.message')}
              action={
                <Button variant="secondary" onClick={() => navigate('/settings')}>
                  {t('key.openSettings')}
                </Button>
              }
            />
          ) : (
            <ErrorNote
              message={error.message}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={runSearch}>
                    {t('search.tryAgain')}
                  </Button>
                  {switchTo && (
                    <Button variant="secondary" onClick={() => void switchAndSearch(switchTo)}>
                      {t('search.switchProvider', { provider: PROVIDER_NAME[switchTo] })}
                    </Button>
                  )}
                </div>
              }
            />
          ))}

        {results.length > 0 && providers?.used === 'opencode' && (
          <p className="text-sm text-chart-grey">{t('source.ownPages')}</p>
        )}

        {results.length > 0 && (
          <motion.ol
            layout={reduceMotion ? false : 'position'}
            className="flex flex-col border-t border-hairline"
          >
            {results.map((uni, index) => (
              <ResultRow key={uni.rorId} uni={uni} rank={index + 1} index={index} onOpen={openDetail} />
            ))}
          </motion.ol>
        )}

        {phase === 'done' && results.length === 0 && (
          <EmptyState title={t('empty.title')} description={t('empty.description')} />
        )}
      </div>
    </div>
  );

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
}
