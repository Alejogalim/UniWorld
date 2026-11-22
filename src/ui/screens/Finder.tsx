import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { setSetting } from '@/store/settings';
import { useTheme } from '@/app/theme';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { ProgressLine } from '@/ui/components/ProgressLine';
import { Spinner } from '@/ui/components/Spinner';
import type { GeoView } from '@/ui/globe/geo';
import { FinderForm } from './finder/FinderForm';
import { ResultRow } from './finder/ResultRow';
import { ScopePicker } from './finder/ScopePicker';
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

/** Design §7.3: the globe at rest, a 380px column with the ranked results when a search runs. */
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

  const switchAndSearch = async (provider: NonNullable<typeof switchTo>) => {
    try {
      await setSetting('default_provider', provider);
      setProviders(await loadFinderProviderState());
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : String(err));
      return;
    }
    void search();
  };

  const split = phase !== 'idle';
  const selected = useMemo(
    () => new Set(scope.kind === 'countries' ? scope.codes : []),
    [scope],
  );
  const highlightContinent = scope.kind === 'continent' ? scope.continent : null;
  const lastProgress = progress[progress.length - 1];
  const showTooFew = phase === 'done' && (progress.some(isTooFew) || (summary !== null && summary.verified < 3));

  const globe = (
    // At rest the globe is square and as large as the height allows (header, padding and scope chips).
    <div className={cn('w-full', split ? 'max-w-[380px]' : 'max-w-[calc(100vh-240px)]')}>
      <Suspense fallback={<div className="grid aspect-square place-items-center"><Spinner label={t('common:loading')} /></div>}>
        <GlobeView
          selected={selected}
          highlightContinent={highlightContinent}
          onToggleCountry={toggleCountry}
          flyTo={flyTo}
          compact={split}
          theme={theme}
        />
      </Suspense>
    </div>
  );

  const motionProps = {
    layout: reduceMotion ? false : ('position' as const),
    transition: { duration: 0.4, ease: EASE },
  };

  const form = (
    <FinderForm
      hasKey={hasKey}
      onSearch={() => void search()}
      onFlyTo={(view) => setFlyTo({ ...view })}
      globe={globe}
      beside={!split}
    />
  );

  const left = split && !editing ? (
    <div className="flex flex-col gap-6">
      {globe}
      <ScopePicker compact onFlyTo={(view) => setFlyTo({ ...view })} />
      <div className="flex flex-wrap gap-2">
        {careers.map((career) => (
          <Chip key={career} selected>
            {career}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="quiet" size="sm" disabled={phase === 'searching'} onClick={() => setEditing(true)}>
          {t('search.edit')}
        </Button>
        <Button variant="quiet" size="sm" disabled={phase === 'searching'} onClick={() => reset()}>
          {t('search.newSearch')}
        </Button>
      </div>
    </div>
  ) : (
    form
  );

  return (
    <div className="max-w-[1120px] px-12 py-8">
      {keyError && <ErrorNote message={keyError} />}
      <div className={cn('grid gap-8', split && 'min-[1100px]:grid-cols-[380px_minmax(0,1fr)]')}>
        <motion.section {...motionProps} className="flex min-w-0 flex-col">
          {left}
        </motion.section>

        {split && (
          <motion.section {...motionProps} className="flex min-w-0 flex-col gap-4" aria-label={t('sections.results')}>
            <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">{t('sections.results')}</h2>

            {phase === 'searching' && <ProgressLine message={lastProgress ? translateProgress(lastProgress, t) : t('progress.searching')} />}

            {phase === 'done' && summary && (
              <p className="font-mono text-xs text-chart-grey tabular-nums">
                {t('progress.verified', { verified: summary.verified, removed: summary.removed })}
              </p>
            )}

            {showTooFew && <ErrorNote message={t('warning.tooFew')} />}

            {phase === 'error' && error && (
              error.missingKey ? (
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
                      <Button variant="secondary" onClick={() => void search()}>
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
              )
            )}

            {results.length > 0 && providers?.used === 'opencode' && (
              <p className="text-sm text-chart-grey">{t('source.ownPages')}</p>
            )}

            {results.length > 0 && (
              <motion.ol layout={reduceMotion ? false : 'position'} className="flex flex-col border-t border-hairline">
                {results.map((uni, index) => (
                  <ResultRow key={uni.rorId} uni={uni} rank={index + 1} index={index} />
                ))}
              </motion.ol>
            )}

            {phase === 'done' && results.length === 0 && (
              <EmptyState title={t('empty.title')} description={t('empty.description')} />
            )}
          </motion.section>
        )}
      </div>
    </div>
  );
}
