import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MissingKeyError } from '@/core';
import type { Fact, UiLang, UniDetail as UniDetailData, UniResult } from '@/core/contracts';
import { useCore } from '@/app/useCore';
import { useTracked, type TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { languageCodeOf, languageLabel } from '@/ui/data/languages';
import { Flag } from '@/ui/components/Flag';
import { FactLine } from '@/ui/components/FactLine';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Panel } from '@/ui/components/Panel';
import { ProgressLine } from '@/ui/components/ProgressLine';
import { Button } from '@/ui/components/ui/button';
import { factValue } from '@/ui/screens/finder/ResultRow';
import { isWebUrl } from '@/lib/url';
import { parseDeadline } from './myUnis/deadline';

interface DetailLocationState {
  uni?: UniResult;
  tracked?: TrackedUni;
}

type LoadStatus = 'loading' | 'ready' | 'error';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** The first language the model named that maps to an ISO code (the tracked list stores codes). */
const firstLanguageCode = (names: string[] | null | undefined): string | undefined =>
  names?.map((name) => languageCodeOf(name)).find((code): code is string => Boolean(code));

/** `checkedAt` is an ISO date (YYYY-MM-DD) or a full timestamp; a bare date is read as local. */
function formatCheckedAt(value: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(date);
}

/** The detail route: read the university from the URL and route state. */
export function UniDetailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { rorId = '' } = useParams();
  const [search] = useSearchParams();
  const state = (location.state ?? null) as DetailLocationState | null;
  const uni = state?.uni;
  const tracked = state?.tracked;
  const program = (search.get('program') || uni?.program || tracked?.programName || '').trim();

  return (
    <UniDetailView
      rorId={rorId}
      program={program}
      uni={uni}
      tracked={tracked}
      onBack={() => navigate(-1)}
    />
  );
}

interface UniDetailViewProps {
  rorId: string;
  program: string;
  uni?: UniResult;
  tracked?: TrackedUni;
  onBack: () => void;
  /** Render inside the Finder dock instead of as a full page. */
  embedded?: boolean;
}

/**
 * University detail (Design §7.3 "Detail page", "Add to my list"). Facts come from the core
 * (cached for 30 days); every fact is a FactLine so its source, quote and link travel with it.
 */
export function UniDetailView({
  rorId,
  program,
  uni,
  tracked,
  onBack,
  embedded = false,
}: UniDetailViewProps) {
  const { t, i18n } = useTranslation(['finder', 'common']);
  const navigate = useNavigate();
  const core = useCore();
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  const trackedByRor = useTracked((s) => s.items.find((i) => i.rorId === rorId));
  const trackedLoaded = useTracked((s) => s.loaded);
  // Route state first, then the tracked list. The rorId is never shown or saved as a name.
  const name = (uni?.name || tracked?.name || trackedByRor?.name || '').trim();
  const nameKnown = name !== '';
  const city = uni?.city ?? tracked?.city ?? trackedByRor?.city ?? null;
  const countryCode = uni?.countryCode ?? tracked?.countryCode ?? trackedByRor?.countryCode ?? '';

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [detail, setDetail] = useState<UniDetailData | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const requestRef = useRef(0);

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<unknown>(null);
  const [listError, setListError] = useState<unknown>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rorId, program]);

  useEffect(() => {
    if (trackedLoaded) return;
    useTracked
      .getState()
      .load()
      .catch((err: unknown) => setListError(err));
  }, [trackedLoaded]);

  const addToList = () => {
    if (!detail || !nameKnown) return;
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
        detailProgram: detail.program,
        deadline: parseDeadline(factValue(detail.nextDeadline)),
        requiredExams: factValue(detail.exams) ?? [],
        language:
          firstLanguageCode(factValue(detail.languages)) ?? (factValue(detail.languages)?.join(', ') ?? null),
        status: 'considering',
        notes: '',
      })
      .catch((err: unknown) => setAddError(err))
      .finally(() => setAdding(false));
  };

  const back = (
    <Button variant="quiet" size="sm" className="-ml-4 self-start" onClick={onBack}>
      <ArrowLeft aria-hidden="true" />
      {t('detail.back')}
    </Button>
  );

  if (!program) {
    const content = <ErrorNote message={t('detail.noProgram')} />;
    if (embedded) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-4 pt-4">{back}</div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{content}</div>
        </div>
      );
    }
    return (
      <div className="@container mx-auto w-full max-w-[800px] px-6 pt-2 pb-12">
        <div className="flex flex-col gap-3">
          {back}
          {content}
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

  // Found facts first, then the missing ones, each group in its original order. The source markers are
  // numbered as the rows render, so they still count down the page.
  const factRows: { fact: Fact<unknown>; render: (index: number) => ReactNode }[] = detail
    ? [
        {
          fact: detail.overview,
          render: (i) => <FactLine key="overview" label={t('detail.sections.overview')} fact={detail.overview} index={i} />,
        },
        {
          fact: detail.languages,
          render: (i) => (
            <FactLine
              key="languages"
              label={t('detail.sections.language')}
              fact={detail.languages}
              index={i}
              format={(codes) => {
                const text = codes.map((c) => languageLabel(c, uiLang)).filter(Boolean).join(', ');
                return text.charAt(0).toLocaleUpperCase(uiLang) + text.slice(1);
              }}
            />
          ),
        },
        {
          fact: detail.tuition,
          render: (i) => <FactLine key="tuition" label={t('detail.sections.tuition')} fact={detail.tuition} index={i} />,
        },
        {
          fact: detail.scholarships,
          render: (i) => (
            <FactLine key="scholarships" label={t('detail.sections.scholarships')} fact={detail.scholarships} index={i} />
          ),
        },
        {
          fact: detail.deadlines,
          render: (i) => <FactLine key="deadlines" label={t('detail.sections.deadlines')} fact={detail.deadlines} index={i} />,
        },
        {
          fact: detail.nextDeadline,
          render: (i) => (
            <FactLine key="nextDeadline" label={t('detail.sections.nextDeadline')} fact={detail.nextDeadline} index={i} />
          ),
        },
        {
          fact: detail.exams,
          render: (i) => <FactLine key="exams" label={t('detail.sections.exams')} fact={detail.exams} index={i} />,
        },
        {
          fact: detail.requirements,
          render: (i) => (
            <FactLine key="requirements" label={t('detail.sections.requirements')} fact={detail.requirements} index={i} />
          ),
        },
        {
          fact: detail.applyUrl,
          render: (i) => (
            <FactLine
              key="applyUrl"
              label={t('detail.sections.apply')}
              fact={detail.applyUrl}
              index={i}
              format={(url) =>
                isWebUrl(url) ? (
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
                ) : (
                  url
                )
              }
            />
          ),
        },
      ]
    : [];
  const orderedFacts = [
    ...factRows.filter((row) => factValue(row.fact) !== null),
    ...factRows.filter((row) => factValue(row.fact) === null),
  ];

  // One row of 36px pills under the title: the list action, then a quiet Refresh at the far end.
  const listAction = existing ? (
    <>
      <span className="inline-flex items-center gap-1.5 text-sm text-chart-grey">
        <Check className="size-4" aria-hidden="true" />
        {t('detail.inList')}
      </span>
      <Button variant="secondary" size="sm" onClick={() => navigate('/my-unis')}>
        {t('detail.openList')}
      </Button>
    </>
  ) : (
    <Button size="sm" onClick={addToList} disabled={!detail || !nameKnown || busy || adding}>
      {t('detail.addToList')}
    </Button>
  );

  const body = (
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-6'}>
      <Panel className={embedded ? 'p-4' : 'p-6 @min-[36rem]:p-8'}>
        <header className="flex flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <Flag code={countryCode} className={embedded ? 'mt-0.5' : 'mt-1 size-6'} />
              <h2
                className={`min-w-0 break-words text-foreground ${embedded ? 'type-title' : 'type-headline'}`}
              >
                {nameKnown ? name : t('detail.untitled')}
              </h2>
            </div>
            <p
              className={
                embedded
                  ? 'text-[0.9375rem] leading-[1.4] font-medium text-foreground'
                  : 'type-title text-foreground'
              }
            >
              {detail?.program ?? program}
            </p>
            {(place || checked) && (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-[1.55] text-chart-grey">
                {place && <span>{place}</span>}
                {place && checked && <span aria-hidden="true">·</span>}
                {checked && (
                  <span>
                    {t('detail.lastChecked')}{' '}
                    <span className="font-mono tabular-nums">{checked}</span>
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {listAction}
              <Button variant="quiet" size="sm" className="-mr-4 ml-auto" disabled={busy} onClick={() => load(true)}>
                <RefreshCw aria-hidden="true" />
                {t('detail.refresh')}
              </Button>
            </div>
            {!existing && !nameKnown && trackedLoaded && (
              <p className="max-w-[48ch] text-xs leading-[1.5] text-chart-grey">{t('detail.addNeedsName')}</p>
            )}
          </div>
        </header>
      </Panel>

      {listError ? <ErrorNote message={messageOf(listError)} /> : null}
      {addError ? <ErrorNote title={t('detail.addError')} message={messageOf(addError)} /> : null}
      {busy && <ProgressLine message={t('detail.loading')} />}
      {loadNote}

      {detail && (
        <div className="flex flex-col border-t border-hairline">
          {orderedFacts.map((row) => row.render(mark(row.fact)))}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pt-4">{back}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-4">{body}</div>
      </div>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-[800px] px-6 pt-2 pb-12">
      <div className="flex flex-col gap-3">
        {back}
        {body}
      </div>
    </div>
  );
}
