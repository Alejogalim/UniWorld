import { useTranslation } from 'react-i18next';
import type { UiLang } from '@/core/contracts';
import type { TrackedUni } from '@/store/tracked';
import { countryName } from '@/ui/data/countries';
import { languageLabel } from '@/ui/data/languages';
import { cn } from '@/lib/utils';
import { Badge } from '@/ui/components/Chip';
import { Flag } from '@/ui/components/Flag';
import { Panel } from '@/ui/components/Panel';
import { Button } from '@/ui/components/ui/button';
import { daysUntil, formatDeadline, isUrgent } from './deadline';
import { StatusProgress } from './StatusProgress';

interface DeadlineNoteProps {
  deadline: string | null;
  today: Date;
  className?: string;
}

/** The relative note next to a deadline: passed, urgent (signal), or a quiet day count. */
export function DeadlineNote({ deadline, today, className }: DeadlineNoteProps) {
  const { t } = useTranslation('myUnis');
  const days = deadline ? daysUntil(deadline, today) : null;
  if (days === null) return null;

  if (days < 0) {
    return (
      <span className={cn('font-mono text-xs tabular-nums text-chart-grey', className)}>
        {t('deadline.passed')}
      </span>
    );
  }

  if (isUrgent(days)) {
    return (
      <span
        className={cn(
          'ember-button w-fit rounded-pill bg-signal px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums text-primary-foreground',
          className,
        )}
      >
        {t('deadline.daysLeft', { count: days })}
      </span>
    );
  }

  return (
    <span className={cn('font-mono text-xs tabular-nums text-chart-grey', className)}>
      {t('deadline.daysLeft', { count: days })}
    </span>
  );
}

interface TrackedUniCardProps {
  uni: TrackedUni;
  today: Date;
  onEdit: () => void;
  onOpen: () => void;
  /** Position on the page's first paint; the status track draws in once, staggered by it. */
  introIndex?: number;
}

/**
 * One wide, read-only university card. Name and place sit top-left, the deadline top-right, the
 * facts run through the middle, and the status track owns the bottom line. The card keeps the
 * standard panel rim for every status: the status lives on the track alone.
 */
export function TrackedUniCard({ uni, today, onEdit, onOpen, introIndex }: TrackedUniCardProps) {
  const { t, i18n } = useTranslation('myUnis');
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const place = [uni.city, countryName(uni.countryCode, uiLang)].filter(Boolean).join(', ');
  const languages = (uni.language ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => languageLabel(code, uiLang));
  const date = uni.deadline ? formatDeadline(uni.deadline, uiLang) : null;
  const hasFacts = languages.length > 0 || uni.requiredExams.length > 0 || Boolean(uni.notes);

  return (
    <Panel className="flex min-w-0 flex-col gap-4 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Flag code={uni.countryCode} className="mt-1" />
          <div className="flex min-w-0 flex-col gap-1">
            <button
              type="button"
              onClick={onOpen}
              aria-label={t('open', { name: uni.name })}
              className="type-title text-left break-words text-foreground underline decoration-transparent underline-offset-4 outline-none transition-colors hover:decoration-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {uni.name}
            </button>
            {place && <span className="text-xs break-words text-chart-grey">{place}</span>}
            {uni.programName && (
              <span className="text-xs break-words text-foreground">{uni.programName}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-xs text-chart-grey">{t('card.deadline')}</span>
          <span
            className={cn(
              'text-sm break-words',
              uni.deadline ? 'font-medium text-foreground' : 'text-chart-grey',
            )}
          >
            {date ?? t('deadline.none')}
          </span>
          {uni.deadline && <DeadlineNote deadline={uni.deadline} today={today} />}
        </div>
      </div>

      {hasFacts && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="sr-only">{t('card.language')}</span>
              {languages.map((language) => (
                <Badge key={language}>{language}</Badge>
              ))}
            </div>
          )}
          {uni.requiredExams.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="sr-only">{t('card.exams')}</span>
              {uni.requiredExams.map((exam) => (
                <Badge key={exam}>{exam}</Badge>
              ))}
            </div>
          )}
          {uni.notes && (
            <p className="line-clamp-2 min-w-0 max-w-full flex-1 text-sm leading-[1.5] break-words text-chart-grey">
              <span className="sr-only">{t('card.notes')}: </span>
              {uni.notes}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-4">
        <StatusProgress
          status={uni.status}
          name={uni.name}
          trackKey={uni.id}
          drawIn={introIndex}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onEdit}
          aria-label={t('card.editFor', { name: uni.name })}
          className="shrink-0"
        >
          {t('card.edit')}
        </Button>
      </div>
    </Panel>
  );
}
