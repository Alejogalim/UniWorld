import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { TrackedStatus, UiLang } from '@/core/contracts';
import type { TrackedPatch, TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { Flag } from '@/ui/components/Flag';
import { Input, Select, Textarea } from '@/ui/components/Input';
import { Button } from '@/ui/components/ui/button';

export const STATUSES: TrackedStatus[] = [
  'considering',
  'preparing',
  'applied',
  'waiting',
  'admitted',
  'waitlisted',
  'rejected',
];

const parseExams = (text: string) =>
  text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') e.currentTarget.blur();
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-chart-grey">{label}</span>
      {children}
    </label>
  );
}

interface UniPanelProps {
  uni: TrackedUni;
  onSave: (patch: TrackedPatch) => void;
  /** The owner removes the row and closes the panel. */
  onRemove: () => void;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Side drawer for editing one tracked university. Text fields save on blur or Enter,
 * selects and dates save at once. Escape and a backdrop click close it.
 */
export function UniPanel({ uni, onSave, onRemove, onOpen, onClose }: UniPanelProps) {
  const { t, i18n } = useTranslation('myUnis');
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [program, setProgram] = useState(uni.programName);
  const [language, setLanguage] = useState(uni.language ?? '');
  const [exams, setExams] = useState(uni.requiredExams.join(', '));
  const [notes, setNotes] = useState(uni.notes);
  const [confirming, setConfirming] = useState(false);

  // Focus moves into the panel on open and goes back to the row that opened it on close.
  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Blur first so a field being edited saves before the panel unmounts.
      const active = document.activeElement;
      if (active instanceof HTMLElement && asideRef.current?.contains(active)) active.blur();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trapFocus = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !asideRef.current) return;
    const focusable = Array.from(
      asideRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href]'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !asideRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const commitProgram = () => {
    const next = program.trim();
    if (!next) {
      setProgram(uni.programName);
      return;
    }
    if (next !== uni.programName) onSave({ programName: next });
  };

  const commitLanguage = () => {
    const next = language.trim();
    if (next !== (uni.language ?? '')) onSave({ language: next || null });
  };

  const commitExams = () => {
    const next = parseExams(exams);
    if (next.join('|') !== uni.requiredExams.join('|')) onSave({ requiredExams: next });
  };

  const commitNotes = () => {
    if (notes !== uni.notes) onSave({ notes });
  };

  const place = [uni.city, countryName(uni.countryCode, uiLang)].filter(Boolean).join(', ');
  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
      };
  const slideProps = reduceMotion
    ? {}
    : {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
      };

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30"
        {...motionProps}
      />
      <motion.aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col gap-6 overflow-y-auto border-l border-hairline bg-panel p-6 shadow-xl"
        {...slideProps}
      >
        <header className="flex items-start gap-3">
          <Flag code={uni.countryCode} className="mt-1.5" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={titleId} className="type-title break-words text-foreground">
              {uni.name}
            </h2>
            {place && <span className="text-xs text-chart-grey">{place}</span>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('panel.close')}
            className="grid size-9 shrink-0 place-items-center rounded-pill text-chart-grey transition-colors hover:bg-shoal hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <Button variant="quiet" size="sm" className="-mt-3 self-start px-0" onClick={onOpen}>
          {t('open', { name: uni.name })}
        </Button>

        <div className="flex flex-col gap-5">
          <Field label={t('panel.program')}>
            <Input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              onBlur={commitProgram}
              onKeyDown={blurOnEnter}
            />
          </Field>
          <Field label={t('panel.language')}>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              onBlur={commitLanguage}
              onKeyDown={blurOnEnter}
            />
          </Field>
          <Field label={t('panel.deadline')}>
            <Input
              type="date"
              value={uni.deadline ?? ''}
              onChange={(e) => onSave({ deadline: e.target.value || null })}
            />
          </Field>
          <Field label={t('panel.status')}>
            <Select value={uni.status} onChange={(e) => onSave({ status: e.target.value as TrackedStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('panel.exams')}>
            <Input
              value={exams}
              placeholder={t('exams.placeholder')}
              onChange={(e) => setExams(e.target.value)}
              onBlur={commitExams}
              onKeyDown={blurOnEnter}
            />
            <span className="text-xs text-chart-grey">{t('exams.hint')}</span>
          </Field>
          <Field label={t('panel.notes')}>
            <Textarea
              value={notes}
              placeholder={t('notes.empty')}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitNotes}
              className="min-h-24"
            />
          </Field>
        </div>

        <footer className="mt-auto flex flex-col gap-3 border-t border-hairline pt-5">
          {!confirming ? (
            <Button variant="quiet" size="sm" className="self-start px-0" onClick={() => setConfirming(true)}>
              {t('remove.button')}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">{t('remove.confirm')}</span>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={onRemove}>
                  {t('remove.confirmButton')}
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
                  {t('remove.keep')}
                </Button>
              </div>
            </div>
          )}
        </footer>
      </motion.aside>
    </>
  );
}
