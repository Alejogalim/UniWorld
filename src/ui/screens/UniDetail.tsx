import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MissingKeyError } from '@/core';
import type { Fact, UiLang, UniDetail as UniDetailData, UniResult } from '@/core/contracts';
import { useCore } from '@/app/useCore';
import { useTracked, type TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { Flag } from '@/ui/components/Flag';
import { FactLine } from '@/ui/components/FactLine';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { ProgressLine } from '@/ui/components/ProgressLine';
import { Button } from '@/ui/components/ui/button';
import { factValue } from '@/ui/screens/finder/ResultRow';
import { parseDeadline } from './myUnis/deadline';

interface DetailLocationState {
  uni?: UniResult;
  tracked?: TrackedUni;
}

type LoadStatus = 'loading' | 'ready' | 'error';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** `checkedAt` is an ISO date (YYYY-MM-DD) or a full timestamp; a bare date is read as local. */
function formatCheckedAt(value: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(date);
}

/**
 * University detail (Design §7.3 "Detail page", "Add to my list"). Facts come from the core
 * (cached for 30 days); every fact is a FactLine so its source, quote and link travel with it.
 */
export function UniDetailScreen() {
  const { t, i18n } = useTranslation(['finder', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { rorId = '' } = useParams();
  const [search] = useSearchParams();
  const core = useCore();
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  const state = (location.state ?? null) as DetailLocationState | null;
  const uni = state?.uni;
  const tracked = state?.tracked;
  const program = (search.get('program') || uni?.program || tracked?.programName || '').trim();
  const name = uni?.name ?? tracked?.name ?? rorId;
  const city = uni?.city ?? tracked?.city ?? null;
  const countryCode = uni?.countryCode ?? tracked?.countryCode ?? '';

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [detail, setDetail] = useState<UniDetailData | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<unknown>(null);
  const [listError, setListError] = useState<unknown>(null);

  const trackedLoaded = useTracked((s) => s.loaded);
  const existing = useTracked((s) => s.find(rorId, program));

  const load = (refresh: boolean) => {
    if (!program) return;
    const id = ++requestRef.current;
    setStatus('loading');
    setLoadError(null);
    core.finder
      .detail(rorId, program, refresh ? { refresh: true } : undefined)
      .then((d) => {
        if (id !== requestRef.current) return;
        setDetail(d);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (id !== requestRef.current) return;
        setLoadError(err);
        setStatus('error');
      });
  };

  useEffect(() => {
    setDetail(null);
    load(false);
    // Reload only when the university or program changes; Refresh is explicit.
  }, [rorId, program]);

  useEffect(() => {
    if (trackedLoaded) return;
    useTracked
      .getState()
      .load()
      .catch((err: unknown) => setListError(err));
  }, [trackedLoaded]);

  const addToList = () => {
    if (!detail) return;
    setAdding(true);
    setAddError(null);
    useTracked
      .getState()
      .add({
        rorId,
        name,
        city,
        countryCode,
        programName: detail.program,
        deadline: parseDeadline(factValue(detail.nextDeadline)),
        requiredExams: factValue(detail.exams) ?? [],
        language: factValue(detail.languages)?.join(', ') ?? null,
        status: 'considering',
        notes: '',
      })
      .catch((err: unknown) => setAddError(err))
      .finally(() => setAdding(false));
  };

  const back = (
    <Button variant="quiet" size="sm" onClick={() => navigate(-1)}>
      <ArrowLeft aria-hidden="true" />
      {t('detail.back')}
    </Button>
  );

  if (!program) {
    return (
      <div className="max-w-[1120px] px-12 py-8">
        <div className="flex flex-col gap-6">
          {back}
          <ErrorNote message={t('detail.noProgram')} />
        </div>
      </div>
    );
  }

  // Numbers the source markers down the page, in the order the facts appear.
  let marker = 0;
  const mark = (fact: Fact<unknown>) => (factValue(fact) !== null ? ++marker : 1);

  const place = [city, countryName(countryCode, uiLang)].filter(Boolean).join(', ');
  const checked = detail ? formatCheckedAt(detail.checkedAt, i18n.resolvedLanguage ?? 'en') : null;
  const busy = status === 'loading';

  let loadNote: ReactNode = null;
  if (status === 'error' && loadError) {
    const missingKey = loadError instanceof MissingKeyError;
    loadNote = (
      <ErrorNote
        title={t('detail.errorTitle')}
        message={missingKey ? t('detail.missingKey') : messageOf(loadError)}
        action={
          <div className="flex flex-wrap gap-2">
            {missingKey && (
              <Button variant="secondary" onClick={() => navigate('/settings')}>
                {t('detail.openSettings')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => load(false)}>
              {t('detail.tryAgain')}
            </Button>
          </div>
        }
      />
    );
  }

  const primaryAction = existing ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-chart-grey">{t('detail.inList')}</span>
      <Button variant="quiet" size="sm" onClick={() => navigate('/my-unis')}>
        {t('detail.openList')}
      </Button>
    </div>
  ) : (
    <Button onClick={addToList} disabled={!detail || busy || adding}>
      {t('detail.addToList')}
    </Button>
  );

  return (
    <div className="max-w-[1120px] px-12 py-8">
      <div className="flex flex-col gap-6">
        {back}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Flag code={countryCode} />
              <h2 className="min-w-0 text-[1.5rem] leading-[1.2] font-semibold tracking-[-0.015em] break-words text-foreground">
                {name}
              </h2>
            </div>
            {place && <p className="text-sm leading-[1.55] text-chart-grey">{place}</p>}
            {detail && (
              <p className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">{detail.program}</p>
            )}
            {!detail && <p className="text-[1.0625rem] leading-[1.35] text-foreground">{program}</p>}
            {checked && (
              <p className="text-sm text-chart-grey">
                {t('detail.lastChecked')}{' '}
                <span className="font-mono text-xs font-medium tabular-nums">{checked}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => load(true)}>
              <RefreshCw aria-hidden="true" />
              {t('detail.refresh')}
            </Button>
            {primaryAction}
          </div>
        </header>

        {listError ? <ErrorNote message={messageOf(listError)} /> : null}
        {addError ? <ErrorNote title={t('detail.addError')} message={messageOf(addError)} /> : null}
        {busy && <ProgressLine message={t('detail.loading')} />}
        {loadNote}

        {detail && (
          <div className="flex flex-col">
            <FactLine label={t('detail.sections.overview')} fact={detail.overview} index={mark(detail.overview)} />
            <FactLine label={t('detail.sections.language')} fact={detail.languages} index={mark(detail.languages)} />
            <FactLine label={t('detail.sections.tuition')} fact={detail.tuition} index={mark(detail.tuition)} />
            <FactLine label={t('detail.sections.scholarships')} fact={detail.scholarships} index={mark(detail.scholarships)} />
            <FactLine label={t('detail.sections.deadlines')} fact={detail.deadlines} index={mark(detail.deadlines)} />
            <FactLine label={t('detail.sections.nextDeadline')} fact={detail.nextDeadline} index={mark(detail.nextDeadline)} />
            <FactLine label={t('detail.sections.exams')} fact={detail.exams} index={mark(detail.exams)} />
            <FactLine label={t('detail.sections.requirements')} fact={detail.requirements} index={mark(detail.requirements)} />
            <FactLine
              label={t('detail.sections.apply')}
              fact={detail.applyUrl}
              index={mark(detail.applyUrl)}
              format={(url) => (
                <a
                  href={url}
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl(url).catch((err: unknown) => console.error('Could not open the application link', err));
                  }}
                  className="break-all underline decoration-hairline underline-offset-2 hover:text-signal"
                >
                  {url}
                </a>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
