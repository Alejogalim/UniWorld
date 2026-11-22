import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** How long the dock waits after the pointer leaves before folding back into its pill. */
const AUTO_COLLAPSE_MS = 900;
const EASE = [0.2, 0, 0, 1] as const;

/** The dock keeps a fixed bottom-right footprint; the panel scales inside it. */
const DOCK_FRAME =
  '@container relative h-[clamp(300px,54vh,540px)] w-[min(92vw,920px)] max-w-full';

/** Expanded dock surface. It scales from the bottom-right corner so it grows out of the pill. */
const DOCK_PANEL =
  'pointer-events-auto absolute inset-0 flex origin-bottom-right flex-col overflow-hidden rounded-lg border border-hairline bg-panel/85 shadow-float backdrop-blur-md';

/** A focusable form control inside the dock keeps it open while the student is typing. */
function isTypingInside(panel: HTMLElement | null): boolean {
  const active = document.activeElement;
  if (!panel || !(active instanceof HTMLElement) || !panel.contains(active)) return false;
  return Boolean(active.closest('input, textarea, select, [contenteditable="true"]'));
}

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
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{ rorId: string; program: string; uni: UniResult } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pointerInsideRef = useRef(false);
  const keyboardOpenRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const collapseTimer = useRef<number | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimer.current !== null) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const scheduleCollapse = useCallback(() => {
    cancelCollapse();
    collapseTimer.current = window.setTimeout(() => {
      collapseTimer.current = null;
      if (phaseRef.current === 'searching') return;
      if (pointerInsideRef.current) return;
      if (isTypingInside(panelRef.current)) return;
      setOpen(false);
    }, AUTO_COLLAPSE_MS);
  }, [cancelCollapse]);

  useEffect(() => () => cancelCollapse(), [cancelCollapse]);

  // Keyboard opening moves focus into the dock, since the pill disappears.
  useEffect(() => {
    if (!open || !keyboardOpenRef.current) return;
    const timer = window.setTimeout(() => {
      keyboardOpenRef.current = false;
      panelRef.current?.focus();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open]);

  // If a search finishes after the pointer has left, fold the dock back once it is done.
  const previousPhase = useRef(phase);
  useEffect(() => {
    if (previousPhase.current === 'searching' && phase !== 'searching') {
      if (!pointerInsideRef.current && !isTypingInside(panelRef.current)) scheduleCollapse();
    }
    previousPhase.current = phase;
  }, [phase, scheduleCollapse]);

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
      <div className="absolute inset-0 overflow-hidden">{globe}</div>

      <div className="pointer-events-none relative z-10 flex w-full flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mt-auto flex w-full justify-end">
          <div className={DOCK_FRAME}>
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
                  onMouseEnter={() => {
                    pointerInsideRef.current = true;
                    cancelCollapse();
                  }}
                  onPointerMove={() => {
                    pointerInsideRef.current = true;
                    cancelCollapse();
                  }}
                  onMouseLeave={() => {
                    pointerInsideRef.current = false;
                    scheduleCollapse();
                  }}
                  onFocusCapture={cancelCollapse}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      scheduleCollapse();
                    }
                  }}
                  tabIndex={-1}
                >
                <div
                  role="tabpanel"
                  id={`finder-panel-${tab}`}
                  aria-labelledby={`finder-tab-${tab}`}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  {tab === 'careers' && (
                    <div className="min-h-0 flex-1 overflow-hidden p-4">
                      <section className="flex flex-col gap-3">
                        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
                          {t('sections.careers')}
                        </h2>
                        <CareerPicker />
                      </section>
                    </div>
                  )}

                  {tab === 'countries' && (
                    <div className="min-h-0 flex-1 overflow-hidden p-4">
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

                <div
                  role="tablist"
                  aria-label={t('tabs.label')}
                  className="grid shrink-0 grid-cols-3 gap-1 border-t border-hairline bg-panel/70 p-2"
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
                            className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-signal"
                          />
                        )}
                        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
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
                onMouseEnter={() => {
                  setOpen(true);
                  scheduleCollapse();
                }}
                onFocus={() => {
                  keyboardOpenRef.current = true;
                  setOpen(true);
                }}
                onClick={() => setOpen(true)}
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
    </div>
  );
}
