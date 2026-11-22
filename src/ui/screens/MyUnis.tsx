import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { TrackedStatus, UiLang } from '@/core/contracts';
import { useTracked, type TrackedPatch, type TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { languageName } from '@/ui/data/languages';
import { Badge } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Flag } from '@/ui/components/Flag';
import { Input, Select, Textarea } from '@/ui/components/Input';
import { Button } from '@/ui/components/ui/button';
import { daysUntil } from './myUnis/deadline';

const STATUSES: TrackedStatus[] = [
  'considering',
  'preparing',
  'applied',
  'waiting',
  'admitted',
  'waitlisted',
  'rejected',
];

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

interface ActionError {
  title: string;
  message: string;
}

/** Uni Manager (Design §7.4): a dense ruled table, nearest deadline first. Every edit saves at once. */
export function MyUnisScreen() {
  const { t } = useTranslation(['myUnis', 'common']);
  const navigate = useNavigate();
  const items = useTracked((s) => s.items);
  const loaded = useTracked((s) => s.loaded);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);

  useEffect(() => {
    if (loaded) return;
    useTracked
      .getState()
      .load()
      .catch((err: unknown) => setLoadError(err));
  }, [loaded]);

  const today = new Date();
  const sorted = sortByDeadline(items, today);

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
    body = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-medium text-chart-grey">
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.university')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.program')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.language')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.deadline')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.exams')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.status')}</th>
              <th scope="col" className="py-2 pr-4 font-medium">{t('columns.notes')}</th>
              <th scope="col" className="py-2 font-medium">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uni) => (
              <TrackedRow
                key={uni.id}
                uni={uni}
                today={today}
                onSave={(patch) => save(uni.id, patch)}
                onRemove={() => remove(uni.id)}
                onOpen={() => openDetail(uni)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] px-12 py-8">
      <div className="flex flex-col gap-6">
        {actionError && <ErrorNote title={actionError.title} message={actionError.message} />}
        {body}
      </div>
    </div>
  );
}

interface TrackedRowProps {
  uni: TrackedUni;
  today: Date;
  onSave: (patch: TrackedPatch) => void;
  onRemove: () => void;
  onOpen: () => void;
}

function TrackedRow({ uni, today, onSave, onRemove, onOpen }: TrackedRowProps) {
  const { t, i18n } = useTranslation('myUnis');
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const place = [uni.city, countryName(uni.countryCode, uiLang)].filter(Boolean).join(', ');

  return (
    <tr className="border-b border-hairline align-top">
      <td className="py-3 pr-4">
        <div className="flex max-w-56 items-start gap-2">
          <Flag code={uni.countryCode} className="mt-0.5" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={onOpen}
              className="text-left text-[1.0625rem] leading-[1.35] font-semibold break-words text-foreground underline decoration-hairline underline-offset-4 outline-none hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {uni.name}
            </button>
            {place && <span className="text-xs text-chart-grey">{place}</span>}
          </div>
        </div>
      </td>

      <td className="py-3 pr-4">
        <InlineText
          label={t('inline.editProgram', { name: uni.name })}
          value={uni.programName}
          required
          onSave={(v) => onSave({ programName: v })}
        />
      </td>

      <td className="py-3 pr-4">
        <InlineText
          label={t('inline.editLanguage', { name: uni.name })}
          value={uni.language ?? ''}
          display={uni.language ? uni.language.split(',').map((c) => languageName(c.trim(), uiLang)).join(', ') : undefined}
          onSave={(v) => onSave({ language: v || null })}
        />
      </td>

      <td className="py-3 pr-4">
        <DeadlineCell uni={uni} today={today} onSave={(deadline) => onSave({ deadline })} />
      </td>

      <td className="py-3 pr-4">
        <ExamsCell uni={uni} onSave={(requiredExams) => onSave({ requiredExams })} />
      </td>

      <td className="py-3 pr-4">
        <Select
          aria-label={t('status.label', { name: uni.name })}
          value={uni.status}
          onChange={(e) => onSave({ status: e.target.value as TrackedStatus })}
          className="w-full min-w-40"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
      </td>

      <td className="py-3 pr-4">
        <NotesCell uni={uni} onSave={(notes) => onSave({ notes })} />
      </td>

      <td className="py-3">
        <RemoveCell onRemove={onRemove} />
      </td>
    </tr>
  );
}

/** Click the value to edit it inline. Enter saves, Escape cancels. */
function InlineText({
  label,
  value,
  display,
  required = false,
  onSave,
}: {
  label: string;
  value: string;
  /** Shown instead of the value when not editing (for example, language names instead of codes). */
  display?: string;
  required?: boolean;
  onSave: (next: string) => void;
}) {
  const { t } = useTranslation('myUnis');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // Escape unmounts the input, and the browser may still fire blur; that blur must not save the cancelled draft.
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          cancelled.current = false;
          setDraft(value);
          setEditing(true);
        }}
        className="text-left break-words text-foreground underline decoration-hairline underline-offset-4 outline-none hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        {display || value || t('inline.empty')}
      </button>
    );
  }

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = draft.trim();
    setEditing(false);
    if (next !== value && (next || !required)) onSave(next);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelled.current = true;
      setEditing(false);
    }
  };

  return (
    <div className="flex w-48 flex-col gap-1">
      <Input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
      <span className="text-xs text-chart-grey">{t('inline.hint')}</span>
    </div>
  );
}

function DeadlineCell({ uni, today, onSave }: { uni: TrackedUni; today: Date; onSave: (d: string | null) => void }) {
  const { t } = useTranslation('myUnis');
  const days = uni.deadline ? daysUntil(uni.deadline, today) : null;
  const urgent = days !== null && days >= 0 && days < 30;

  let note: ReactNode;
  if (days === null) {
    note = <span className="text-xs text-chart-grey">{t('deadline.none')}</span>;
  } else if (days < 0) {
    note = <span className="font-mono text-xs tabular-nums text-chart-grey">{t('deadline.passed')}</span>;
  } else if (urgent) {
    note = (
      <span className="w-fit rounded-sm bg-signal px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-primary-foreground">
        {t('deadline.daysLeft', { count: days })}
      </span>
    );
  } else {
    note = (
      <span className="font-mono text-xs tabular-nums text-chart-grey">
        {t('deadline.daysLeft', { count: days })}
      </span>
    );
  }

  return (
    <div className="flex w-44 flex-col gap-1.5">
      <Input
        type="date"
        aria-label={t('deadline.label', { name: uni.name })}
        value={uni.deadline ?? ''}
        onChange={(e) => onSave(e.target.value || null)}
      />
      {note}
    </div>
  );
}

function ExamsCell({ uni, onSave }: { uni: TrackedUni; onSave: (exams: string[]) => void }) {
  const { t } = useTranslation('myUnis');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = draft
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    setEditing(false);
    if (next.join('|') !== uni.requiredExams.join('|')) onSave(next);
  };

  if (editing) {
    return (
      <div className="flex w-52 flex-col gap-1">
        <Input
          autoFocus
          aria-label={t('exams.label', { name: uni.name })}
          placeholder={t('exams.placeholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelled.current = true;
              setEditing(false);
            }
          }}
          onBlur={commit}
        />
        <span className="text-xs text-chart-grey">{t('exams.hint')}</span>
      </div>
    );
  }

  return (
    <div className="flex w-44 flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {uni.requiredExams.length === 0 && <span className="text-xs text-chart-grey">{t('exams.empty')}</span>}
        {uni.requiredExams.map((exam) => (
          <Badge key={exam}>{exam}</Badge>
        ))}
      </div>
      <Button
        variant="quiet"
        size="sm"
        className="px-0"
        aria-label={t('exams.label', { name: uni.name })}
        onClick={() => {
          cancelled.current = false;
          setDraft(uni.requiredExams.join(', '));
          setEditing(true);
        }}
      >
        {t('exams.edit')}
      </Button>
    </div>
  );
}

/** One line of preview; click to open an auto-growing note that saves on blur. */
function NotesCell({ uni, onSave }: { uni: TrackedUni; onSave: (notes: string) => void }) {
  const { t } = useTranslation('myUnis');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(uni.notes);

  if (editing) {
    return (
      <Textarea
        autoFocus
        aria-label={t('notes.label', { name: uni.name })}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== uni.notes) onSave(draft);
        }}
        className="field-sizing-content w-64 min-h-16"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={t('notes.label', { name: uni.name })}
      onClick={() => {
        setDraft(uni.notes);
        setEditing(true);
      }}
      className="block w-64 text-left text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      {uni.notes ? (
        <span className="line-clamp-2 break-words">{uni.notes}</span>
      ) : (
        <span className="text-chart-grey">{t('notes.empty')}</span>
      )}
    </button>
  );
}

function RemoveCell({ onRemove }: { onRemove: () => void }) {
  const { t } = useTranslation('myUnis');
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="quiet" size="sm" onClick={() => setConfirming(true)}>
        {t('remove.button')}
      </Button>
    );
  }

  return (
    <div className="flex w-40 flex-col gap-2">
      <span className="text-sm text-foreground">{t('remove.confirm')}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onRemove}>
          {t('remove.confirmButton')}
        </Button>
        <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
          {t('remove.keep')}
        </Button>
      </div>
    </div>
  );
}
