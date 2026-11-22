import { useTranslation } from 'react-i18next';
import type { TrackedStatus } from '@/core/contracts';
import { cn } from '@/lib/utils';
import { Chip } from '@/ui/components/Chip';
import {
  OUTCOMES,
  OVERVIEW_STEPS,
  PIPELINE,
  finalOutcomeOf,
  overviewIndex,
  stageIndex,
} from './status';

interface StatusProgressProps {
  status: TrackedStatus;
  name: string;
  /** When given, the stages and outcomes become selectable controls. */
  onChange?: (status: TrackedStatus) => void;
  /** CSS colour for the lit track. Defaults to the evidence green. */
  accent?: string;
  className?: string;
}

interface Step {
  key: TrackedStatus | 'outcome';
  label: string;
}

/**
 * The application track. The overview shows considering → preparing → applied → waiting → one
 * shared final-outcome dot. The editor shows the three-stage pipeline plus the outcome controls.
 * A single continuous wave runs behind the nodes; the lit layer is clipped to the current stage.
 */
export function StatusProgress({
  status,
  name,
  onChange,
  accent = 'var(--evidence)',
  className,
}: StatusProgressProps) {
  const { t } = useTranslation('myUnis');
  const interactive = Boolean(onChange);
  const finalOutcome = finalOutcomeOf(status);
  const current = interactive ? stageIndex(status) : overviewIndex(status);
  const glow = `color-mix(in oklch, ${accent} 60%, transparent)`;

  const steps: Step[] = interactive
    ? PIPELINE.map((stage) => ({ key: stage, label: t(`status.${stage}`) }))
    : [
        ...OVERVIEW_STEPS.map((stage) => ({ key: stage, label: t(`status.${stage}`) })),
        {
          key: 'outcome',
          label: finalOutcome ? t(`status.${finalOutcome}`) : t('status.final'),
        },
      ];

  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  const nodeSize = interactive ? 14 : 10;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div
        className={cn(
          'min-w-0',
          !interactive && 'status-track-scroll max-md:overflow-x-auto max-md:py-2',
        )}
      >
        <div
          role="group"
          aria-label={`${t('status.label', { name })} ${t('status.current', { status: t(`status.${status}`) })}`}
          className={cn('relative flex', !interactive && 'max-md:min-w-[44rem]')}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${50 / steps.length}%`,
              right: `${50 / steps.length}%`,
              top: `${nodeSize / 2 - 4}px`,
              height: '8px',
            }}
          >
            <span
              className="absolute rounded-full bg-hairline"
              style={{
                left: `${progress}%`,
                right: 0,
                top: '50%',
                height: '3px',
                transform: 'translateY(-50%)',
              }}
            />
            <span
              className="status-wave-line status-wave-line--animated absolute inset-0"
              style={{
                backgroundColor: accent,
                filter: `drop-shadow(0 0 3px ${glow})`,
                clipPath: `inset(0 ${100 - progress}% 0 0)`,
              }}
            />
          </div>

          {steps.map((step, i) => {
            const lit = i <= current;
            const isCurrent = i === current;
            const labelClass = cn(
              'text-center leading-tight break-words',
              interactive ? 'text-xs' : 'text-[11px]',
              lit ? 'text-foreground' : 'text-chart-grey',
              isCurrent && 'font-semibold',
            );
            const content = (
              <>
                <span
                  aria-hidden="true"
                  style={
                    lit
                      ? {
                          backgroundColor: accent,
                          borderColor: accent,
                          boxShadow: isCurrent
                            ? `0 0 0 3px color-mix(in oklch, ${accent} 26%, transparent), 0 0 16px 2px ${glow}`
                            : `0 0 10px 1px ${glow}`,
                        }
                      : undefined
                  }
                  className={cn(
                    'shrink-0 rounded-full border',
                    interactive ? 'size-3.5' : 'size-2.5',
                    !lit && 'border-hairline bg-panel',
                  )}
                />
                <span className={labelClass}>{step.label}</span>
              </>
            );

            return interactive ? (
              <button
                key={step.key}
                type="button"
                onClick={() => step.key !== 'outcome' && onChange?.(step.key)}
                aria-pressed={status === step.key}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative z-10 flex flex-1 flex-col items-center gap-2 rounded-control outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal',
                  !lit && 'hover:text-foreground',
                )}
              >
                {content}
              </button>
            ) : (
              <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {interactive && onChange && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="type-label text-chart-grey">{t('status.afterApplying')}</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={status === 'applied'} onClick={() => onChange('applied')}>
              {t('status.none')}
            </Chip>
            {OUTCOMES.map((value) => (
              <Chip key={value} selected={status === value} onClick={() => onChange(value)}>
                {t(`status.${value}`)}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
