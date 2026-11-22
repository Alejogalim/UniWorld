import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import type { TrackedStatus, UiLang } from '@/core/contracts';
import { useTracked, type TrackedPatch, type TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { languageName } from '@/ui/data/languages';
import { Badge } from '@/ui/components/Chip';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Flag } from '@/ui/components/Flag';
import { Input, Textarea } from '@/ui/components/Input';
import { Button } from '@/ui/components/ui/button';
import { DeadlineNote } from './TrackedUniCard';
import { StatusProgress } from './StatusProgress';

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

interface Draft {
  programName: string;
  status: TrackedStatus;
  deadline: string;
  language: string;
  exams: string;
  notes: string;
}

function draftOf(uni: TrackedUni): Draft {
  return {
    programName: uni.programName,
    status: uni.status,
    deadline: uni.deadline ?? '',
    language: uni.language ?? '',
    exams: uni.requiredExams.join(', '),
    notes: uni.notes,
  };
}

interface TrackedUniEditorProps {
  uni: TrackedUni;
  today: Date;
  onClose: () => void;
}

/**
 * The full-content editor for one university. It keeps a local draft, saves all changed fields in
 * one update, and only writes to the store on Save.
 */
export function TrackedUniEditor({ uni, today, onClose }: TrackedUniEditorProps) {
  const { t, i18n } = useTranslation('myUnis');
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const [draft, setDraft] = useState<Draft>(() => draftOf(uni));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const place = [uni.city, countryName(uni.countryCode, uiLang)].filter(Boolean).join(', ');
  const programName = draft.programName.trim();
  const exams = splitCsv(draft.exams);
  const language = draft.language.trim();
  const deadline = draft.deadline || null;

  const dirty =
    programName !== uni.programName ||
    draft.status !== uni.status ||
    deadline !== uni.deadline ||
    (language || null) !== uni.language ||
    exams.join('|') !== uni.requiredExams.join('|') ||
    draft.notes !== uni.notes;

  const patchOf = (): TrackedPatch => {
    const patch: TrackedPatch = {};
    if (programName !== uni.programName) patch.programName = programName;
    if (draft.status !== uni.status) patch.status = draft.status;
    if (deadline !== uni.deadline) patch.deadline = deadline;
    if ((language || null) !== uni.language) patch.language = language || null;
    if (exams.join('|') !== uni.requiredExams.join('|')) patch.requiredExams = exams;
    if (draft.notes !== uni.notes) patch.notes = draft.notes;
    return patch;
  };

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (saving || !dirty || !programName) return;
    setSaving(true);
    setError(null);
    try {
      await useTracked.getState().update(uni.id, patchOf());
      onClose();
    } catch (err) {
      setError({ title: t('error.save'), message: messageOf(err) });
      setSaving(false);
    }
  };

  const remove = async () => {
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      await useTracked.getState().remove(uni.id);
      onClose();
    } catch (err) {
      setError({ title: t('error.remove'), message: messageOf(err) });
      setRemoving(false);
      setConfirmingRemove(false);
    }
  };

  const requestClose = () => {
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    if (dirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };

  const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    // Enter in a single-line field should not submit the whole form; Save is an explicit action.
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  };

  const fieldId = (name: string) => `tracked-${uni.id}-${name}`;

  return (
    <form
      onSubmit={save}
      onKeyDown={onFormKeyDown}
      className="mx-auto flex w-full max-w-[960px] min-w-0 flex-col"
    >
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-background/95 py-3 backdrop-blur">
        <Button type="button" variant="quiet" size="sm" onClick={requestClose} className="px-0">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('editor.back')}
        </Button>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="type-title text-foreground">{t('editor.title')}</h2>
          <span className="flex min-w-0 items-center gap-2 text-sm text-chart-grey">
            <Flag code={uni.countryCode} />
            <span className="min-w-0 break-words">{uni.name}</span>
            {place && <span className="min-w-0 break-words">· {place}</span>}
          </span>
        </div>
        <Button type="submit" disabled={saving || !dirty || !programName}>
          {saving ? t('editor.saving') : t('editor.save')}
        </Button>
      </header>

      {confirmingDiscard && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 border-l-2 border-signal pl-4"
        >
          <span className="text-sm text-foreground">{t('editor.discard')}</span>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t('editor.discardConfirm')}
          </Button>
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => setConfirmingDiscard(false)}
          >
            {t('editor.discardCancel')}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorNote title={error.title} message={error.message} />
        </div>
      )}

      <div className="flex flex-col gap-6 pt-5 pb-16">
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('deadline')} className="type-label text-foreground">
            {t('card.deadline')}
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Input
              id={fieldId('deadline')}
              type="date"
              value={draft.deadline}
              onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))}
              className="w-full sm:w-64"
            />
            {draft.deadline && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => setDraft((current) => ({ ...current, deadline: '' }))}
              >
                {t('deadline.clear')}
              </Button>
            )}
            <DeadlineNote deadline={deadline} today={today} />
          </div>
        </div>

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="type-label pb-2 text-foreground">{t('status.pipeline')}</legend>
          <StatusProgress
            status={draft.status}
            name={uni.name}
            onChange={(status) => setDraft((current) => ({ ...current, status }))}
          />
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('program')} className="type-label text-foreground">
            {t('card.program')}
          </label>
          <Input
            id={fieldId('program')}
            value={draft.programName}
            required
            aria-invalid={programName ? undefined : true}
            onChange={(event) =>
              setDraft((current) => ({ ...current, programName: event.target.value }))
            }
          />
          {!programName && <p className="text-xs text-signal">{t('editor.programRequired')}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('language')} className="type-label text-foreground">
            {t('card.language')}
          </label>
          <Input
            id={fieldId('language')}
            value={draft.language}
            placeholder="en, de"
            onChange={(event) =>
              setDraft((current) => ({ ...current, language: event.target.value }))
            }
          />
          <p className="text-xs text-chart-grey">{t('editor.languageHint')}</p>
          {splitCsv(draft.language).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {splitCsv(draft.language).map((code) => (
                <Badge key={code}>{languageName(code, uiLang)}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('exams')} className="type-label text-foreground">
            {t('card.exams')}
          </label>
          <Input
            id={fieldId('exams')}
            value={draft.exams}
            placeholder={t('exams.placeholder')}
            onChange={(event) => setDraft((current) => ({ ...current, exams: event.target.value }))}
          />
          <p className="text-xs text-chart-grey">{t('editor.examsHint')}</p>
          {exams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {exams.map((exam) => (
                <Badge key={exam}>{exam}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId('notes')} className="type-label text-foreground">
            {t('card.notes')}
          </label>
          <Textarea
            id={fieldId('notes')}
            value={draft.notes}
            placeholder={t('notes.placeholder')}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            className="field-sizing-content min-h-24"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-6">
          <span className="type-label text-chart-grey">{t('editor.remove')}</span>
          {!confirmingRemove ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingRemove(true)}
              >
                {t('remove.button')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">{t('remove.confirm')}</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={removing}
                  onClick={() => void remove()}
                >
                  {removing ? t('editor.removing') : t('remove.confirmButton')}
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => setConfirmingRemove(false)}
                >
                  {t('remove.keep')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
