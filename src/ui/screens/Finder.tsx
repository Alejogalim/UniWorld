import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { setSetting } from '@/store/settings';
import { useTheme } from '@/app/theme';
import { Button } from '@/ui/components/ui/button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { ProgressLine } from '@/ui/components/ProgressLine';
import { Spinner } from '@/ui/components/Spinner';
import type { GeoView } from '@/ui/globe/geo';
import { FinderControls } from './finder/FinderControls';
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

// three.js (through globe.gl) is only fetched when the Finder opens.
const GlobeView = lazy(() => import('@/ui/globe/Globe'));

const EASE = [0.2, 0, 0, 1] as const;

/** Design §7.3: careers and filters, a fluid globe, and the countries/results side region. */
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

  // The list is gone once results take the side region, so drop any focus it set.
  useEffect(() => {
    if (showingResults) setHoverIso(null);
  }, [showingResults]);

  const runSearch = () => {
    setHoverIso(null);
    void search();
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

  const globe = (
    <div className="mx-auto w-full max-w-[min(90vh,1000px)]">
      <Suspense
        fallback={
          <div className="grid aspect-square place-items-center">
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
          theme={theme}
        />
      </Suspense>
    </div>
  );

  const motionProps = {
    layout: reduceMotion ? false : ('position' as const),
    transition: { duration: 0.4, ease: EASE },
  };

  const left = showingResults ? (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {careers.map((career) => (
          <Chip key={career} selected>
            {career}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="quiet"
          size="sm"
          disabled={phase === 'searching'}
          onClick={() => setEditing(true)}
        >
          {t('search.edit')}
        </Button>
        <Button variant="quiet" size="sm" disabled={phase === 'searching'} onClick={() => reset()}>
          {t('search.newSearch')}
        </Button>
      </div>
    </div>
  ) : (
    <FinderControls hasKey={hasKey} onSearch={runSearch} />
  );

  const side = showingResults ? (
    <section aria-label={t('sections.results')} className="flex min-h-0 flex-col">
      <div className="max-h-[min(78vh,900px)] min-h-0 overflow-y-auto pr-1">
        <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2 bg-background/95 px-1 pb-3 backdrop-blur">
          <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
            {t('sections.results')}
          </h2>
          {scope.kind === 'countries' && <SelectedCountries compact />}
        </div>

        {phase === 'searching' && (
          <ProgressLine
            message={
              lastProgress ? translateProgress(lastProgress, t) : t('progress.searching')
            }
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
              <ResultRow key={uni.rorId} uni={uni} rank={index + 1} index={index} />
            ))}
          </motion.ol>
        )}

        {phase === 'done' && results.length === 0 && (
          <EmptyState title={t('empty.title')} description={t('empty.description')} />
        )}
      </div>
    </section>
  ) : (
    <ScopePicker onFlyTo={(view) => setFlyTo({ ...view })} onHoverCountry={setHoverIso} />
  );

  return (
    <div className="@container mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {keyError && <ErrorNote message={keyError} />}
      <div className="grid grid-cols-1 gap-6 @min-[680px]:grid-cols-[minmax(280px,1fr)_minmax(0,1.35fr)] @min-[680px]:items-start @min-[1000px]:grid-cols-[minmax(250px,1fr)_minmax(0,1.9fr)_minmax(250px,1fr)] @min-[1000px]:gap-8">
        <motion.section
          {...motionProps}
          className="min-w-0 @min-[680px]:col-start-1 @min-[680px]:row-start-1"
        >
          {left}
        </motion.section>

        <motion.section
          {...motionProps}
          className="min-w-0 @min-[680px]:col-start-2 @min-[680px]:row-start-1 @min-[680px]:self-center @min-[1000px]:col-start-2"
        >
          {globe}
        </motion.section>

        <motion.section
          {...motionProps}
          className="min-w-0 @min-[680px]:col-span-2 @min-[680px]:row-start-2 @min-[1000px]:col-span-1 @min-[1000px]:col-start-3 @min-[1000px]:row-start-1"
        >
          {side}
        </motion.section>
      </div>
    </div>
  );
}
