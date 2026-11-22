import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useTracked, type TrackedUni } from '@/store/tracked';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Button } from '@/ui/components/ui/button';
import { daysUntil, isUrgent } from './myUnis/deadline';
import { TrackedUniCard } from './myUnis/TrackedUniCard';
import { TrackedUniEditor } from './myUnis/TrackedUniEditor';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

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

/** Uni Manager (Design §7.4): an overview of independent cards, with a full-content editor per university. */
export function MyUnisScreen() {
  const { t } = useTranslation(['myUnis', 'common']);
  const navigate = useNavigate();
  const items = useTracked((s) => s.items);
  const loaded = useTracked((s) => s.loaded);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<TrackedUni | null>(null);
  // True until the cards have painted once: their tracks draw in on this screen's first paint only,
  // not when the list comes back from the editor.
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    if (loaded) return;
    useTracked
      .getState()
      .load()
      .catch((err: unknown) => setLoadError(err));
  }, [loaded]);

  useEffect(() => {
    if (intro && loaded && items.length > 0) setIntro(false);
  }, [intro, loaded, items.length]);

  const today = new Date();
  const sorted = sortByDeadline(items, today);

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
    const urgentCount = sorted.filter((u) => u.deadline && isUrgent(daysUntil(u.deadline, today))).length;
    body = (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-chart-grey">
          <span className="font-medium text-foreground">{items.length}</span>{' '}
          {t('summary.total', { count: items.length })}
          <span aria-hidden="true" className="mx-2 text-hairline">
            ·
          </span>
          <span className="font-medium text-foreground">{urgentCount}</span>{' '}
          {t('summary.urgent')}
        </p>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {sorted.map((uni, index) => (
            <TrackedUniCard
              key={uni.id}
              uni={uni}
              today={today}
              introIndex={intro ? index : undefined}
              onEdit={() => setEditing(uni)}
              onOpen={() => openDetail(uni)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
      {editing ? (
        <TrackedUniEditor
          key={editing.id}
          uni={editing}
          today={today}
          onClose={() => setEditing(null)}
        />
      ) : (
        body
      )}
    </div>
  );
}
