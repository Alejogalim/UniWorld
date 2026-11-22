import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { TrackedStatus, UiLang } from '@/core/contracts';
import { useTracked, type TrackedPatch, type TrackedUni } from '@/store/tracked';
import { languageName } from '@/ui/data/languages';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Flag } from '@/ui/components/Flag';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import { daysUntil } from './myUnis/deadline';
import { UniPanel } from './myUnis/UniPanel';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** A deadline is urgent when it is still ahead and within 30 days. */
const isUrgent = (days: number) => days >= 0 && days < 30;

const isDecided = (u: TrackedUni) => u.status === 'admitted' || u.status === 'rejected';

/** Nearest upcoming deadline first, then rows without a deadline, then deadlines already passed. */
export function sortByDeadline(items: TrackedUni[], today: Date): TrackedUni[] {
  const group = (u: TrackedUni) => {
    if (!u.deadline) return 1;
    return daysUntil(u.deadline, today) < 0 ? 2 : 0;
  };
  return [...items].sort((a, b) => {
    const ga = group(a);
    const gb = group(b);
    if (ga !== gb) return ga - gb;
    if (ga !== 1 && a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline < b.deadline ? -1 : 1;
    }
    return a.id - b.id;
  });
}

const STATUS_DOT: Record<TrackedStatus, string> = {
  admitted: 'bg-evidence',
  rejected: 'bg-chart-grey',
  waiting: 'bg-[var(--ember-2)]',
  waitlisted: 'bg-[var(--ember-2)]',
  applied: 'bg-foreground',
  considering: 'bg-hairline',
  preparing: 'bg-hairline',
};

interface ActionError {
  title: string;
  message: string;
}

/** Uni Manager (Design §7.4): three ruled groups, nearest deadline first. Rows open a side panel for editing. */
export function MyUnisScreen() {
  const { t, i18n } = useTranslation(['myUnis', 'common']);
  const navigate = useNavigate();
  const items = useTracked((s) => s.items);
  const loaded = useTracked((s) => s.loaded);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (loaded) return;
    useTracked
      .getState()
      .load()
      .catch((err: unknown) => setLoadError(err));
  }, [loaded]);

  const today = new Date();
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const selected = items.find((u) => u.id === selectedId);

  const dueSoon = sortByDeadline(
    items.filter((u) => !isDecided(u) && u.deadline && isUrgent(daysUntil(u.deadline, today))),
    today,
  );
  const inProgress = sortByDeadline(
    items.filter((u) => !isDecided(u) && !(u.deadline && isUrgent(daysUntil(u.deadline, today)))),
    today,
  );
  const decided = sortByDeadline(items.filter(isDecided), today);

  const save = (id: number, patch: TrackedPatch) => {
    setActionError(null);
    useTracked
      .getState()
      .update(id, patch)
      .catch((err: unknown) => setActionError({ title: t('error.save'), message: messageOf(err) }));
  };

  const remove = (id: number) => {
    setActionError(null);
    useTracked
      .getState()
      .remove(id)
      .catch((err: unknown) => setActionError({ title: t('error.remove'), message: messageOf(err) }));
  };

  const openDetail = (uni: TrackedUni) =>
    // The detail program is the one the page was added with; a renamed programName would be a cache miss.
    navigate(`/finder/uni/${encodeURIComponent(uni.rorId)}?program=${encodeURIComponent(uni.detailProgram ?? uni.programName)}`, {
      state: { tracked: uni },
    });

  let body: ReactNode;
  if (loadError) {
    body = <ErrorNote title={t('error.load')} message={messageOf(loadError)} />;
  } else if (!loaded) {
    body = <p className="text-sm text-chart-grey">{t('common:loading')}</p>;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button variant="secondary" onClick={() => navigate('/finder')}>
            {t('empty.action')}
          </Button>
        }
      />
    );
  } else {
    const next = dueSoon[0];
    const nextDays = next?.deadline ? daysUntil(next.deadline, today) : 0;
    body = (
      <>
        {next && (
          <p className="text-sm text-chart-grey">
            <Trans
              i18nKey={nextDays === 0 ? 'next.today' : 'next.line'}
              ns="myUnis"
              count={nextDays}
              values={{ name: next.name }}
              components={{
                name: <span className="font-medium text-foreground" />,
                days: <span className="font-medium text-signal" />,
              }}
            />
          </p>
        )}
        {dueSoon.length > 0 && (
          <Group title={t('groups.dueSoon')} count={dueSoon.length}>
            {dueSoon.map((uni) => (
              <UniRow key={uni.id} uni={uni} today={today} uiLang={uiLang} onOpen={() => setSelectedId(uni.id)} />
            ))}
          </Group>
        )}
        {inProgress.length > 0 && (
          <Group title={t('groups.inProgress')} count={inProgress.length}>
            {inProgress.map((uni) => (
              <UniRow key={uni.id} uni={uni} today={today} uiLang={uiLang} onOpen={() => setSelectedId(uni.id)} />
            ))}
          </Group>
        )}
        {decided.length > 0 && (
          <Group title={t('groups.decided')} count={decided.length}>
            {decided.map((uni) => (
              <UniRow key={uni.id} uni={uni} today={today} uiLang={uiLang} onOpen={() => setSelectedId(uni.id)} />
            ))}
          </Group>
        )}
      </>
    );
  }

  return (
    <div className="w-full px-6 py-8 min-[900px]:px-10">
      <div className="flex flex-col gap-8">
        {actionError && <ErrorNote title={actionError.title} message={actionError.message} />}
        {body}
      </div>
      <AnimatePresence>
        {selected && (
          <UniPanel
            key={selected.id}
            uni={selected}
            onSave={(patch) => save(selected.id, patch)}
            onRemove={() => {
              remove(selected.id);
              setSelectedId(null);
            }}
            onOpen={() => openDetail(selected)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-medium text-chart-grey">
        {title} · <span className="tabular-nums">{count}</span>
      </h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

interface UniRowProps {
  uni: TrackedUni;
  today: Date;
  uiLang: UiLang;
  onOpen: () => void;
}

/** One row, three zones: identity, deadline, status. The whole row opens the panel. */
function UniRow({ uni, today, uiLang, onOpen }: UniRowProps) {
  const { t, i18n } = useTranslation('myUnis');
  const days = uni.deadline ? daysUntil(uni.deadline, today) : null;
  const urgent = days !== null && isUrgent(days);
  const muted = days === null || days < 0;

  let primary: string;
  if (days === null) primary = t('deadline.none');
  else if (days < 0) primary = t('deadline.closed');
  else if (days === 0) primary = t('deadline.today');
  else primary = t('deadline.inDays', { count: days });

  let dateLabel: string | null = null;
  if (uni.deadline) {
    const [y, m, d] = uni.deadline.split('-').map(Number);
    dateLabel = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(y, m - 1, d),
    );
  }

  const languages = uni.language
    ? uni.language
        .split(',')
        .map((c) => languageName(c.trim(), uiLang))
        .join(', ')
    : null;
  const meta = [uni.programName, uni.city, languages].filter(Boolean).join(' · ');
  const exams = uni.requiredExams.join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="-mx-3 grid grid-cols-1 items-start gap-x-6 gap-y-2 rounded-control px-3 py-4 text-left outline-none transition-colors hover:bg-shoal/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal min-[640px]:grid-cols-[minmax(0,1fr)_10rem_9rem]"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <Flag code={uni.countryCode} />
          <span className="text-base font-semibold break-words text-foreground">{uni.name}</span>
        </span>
        {meta && <span className="truncate text-sm text-chart-grey">{meta}</span>}
        {exams && <span className="truncate text-xs text-chart-grey">{exams}</span>}
        {uni.notes && <span className="line-clamp-1 text-xs text-chart-grey">{uni.notes}</span>}
      </span>

      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            'text-sm font-medium',
            urgent ? 'text-signal' : muted ? 'text-chart-grey' : 'text-foreground',
          )}
        >
          {primary}
        </span>
        {dateLabel && <span className="text-xs tabular-nums text-chart-grey">{dateLabel}</span>}
      </span>

      <span className="flex items-center gap-2 text-sm">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[uni.status])} />
        <span className={uni.status === 'rejected' ? 'text-chart-grey' : 'text-foreground'}>
          {t(`status.${uni.status}`)}
        </span>
      </span>
    </button>
  );
}
