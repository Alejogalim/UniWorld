import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Pause, X, type LucideIcon } from 'lucide-react';
import type { TrackedStatus } from '@/core/contracts';
import { cn } from '@/lib/utils';
import { Chip } from '@/ui/components/Chip';
import { OUTCOMES, OVERVIEW_STEPS, PIPELINE, finalOutcomeOf, type FinalOutcomeStatus } from './status';
import {
  fillStartScale,
  introDelayMs,
  isLooping,
  outcomeFlourish,
  statusMemory,
  trackIndex,
  trackProgress,
  trackTiming,
  type TrackVariant,
} from './trackMotion';
import { useLiveWhileVisible } from './useLiveWhileVisible';

interface StatusProgressProps {
  status: TrackedStatus;
  name: string;
  /** When given, the stages and outcomes become selectable controls. */
  onChange?: (status: TrackedStatus) => void;
  /** CSS colour of the progress light: the current node and its ring. Defaults to the ember signal. */
  accent?: string;
  /**
   * Remembers the last status shown under this key for the app session, so a remounted track can
   * play the change (the overview card passes the university id). The editor leaves it out.
   */
  trackKey?: string | number;
  /** Card position on the page's first paint. When given, the track draws in once on mount. */
  drawIn?: number;
  className?: string;
}

interface Step {
  key: TrackedStatus | 'outcome';
  label: string;
}

interface Change {
  id: number;
  from: TrackedStatus;
}

const EASE = [0.2, 0, 0, 1] as const;
/** Node diameters in px, on the 4px grid. The line is 2px and centred on the node slot. */
const NODE = { done: 8, current: 12, upcoming: 8, outcome: 16 } as const;
/** A ring in the ground colour around a filled node, so it sits on the line like a bead on a wire. */
const KNOCKOUT = '0 0 0 2px var(--track-ground)';
/** The final node once an outcome is reached: a solid disc with one glyph knocked out of it. */
const OUTCOME_NODE: Record<FinalOutcomeStatus, { Icon: LucideIcon; fill: string }> = {
  admitted: { Icon: Check, fill: 'var(--evidence)' },
  waitlisted: { Icon: Pause, fill: 'var(--foreground)' },
  rejected: { Icon: X, fill: 'var(--chart-grey)' },
};
/** How long the node fade-in trails the line as it draws from the first node to the last. */
const NODE_TRAIL_MS = 480;

/**
 * The application track. The overview shows considering → preparing → applied → waiting → one
 * shared final-outcome node. The editor shows the three-stage pipeline plus the outcome controls.
 * A straight 2px line runs behind the nodes: the completed part in ink, the rest a hairline. One
 * accent, ember: a small ember light travels from the first node to the current one, and the current
 * node breathes. Loops run only on screen and never under reduced motion.
 */
export function StatusProgress({
  status,
  name,
  onChange,
  accent = 'var(--signal)',
  trackKey,
  drawIn,
  className,
}: StatusProgressProps) {
  const { t } = useTranslation('myUnis');
  const reduceMotion = useReducedMotion() ?? false;
  const interactive = Boolean(onChange);
  const variant: TrackVariant = interactive ? 'editor' : 'overview';
  const finalOutcome = finalOutcomeOf(status);
  const rejected = finalOutcome === 'rejected';
  const current = trackIndex(status, variant);
  const progress = trackProgress(status, variant);

  // A change is a new status while mounted, or (overview cards) a status that differs from the one
  // this card showed last time this session. A first mount is never a change.
  const [change, setChange] = useState<Change | null>(() => {
    const last = trackKey === undefined ? null : statusMemory.peek(trackKey);
    return last !== null && last !== status ? { id: 1, from: last } : null;
  });
  const [shown, setShown] = useState(status);
  if (shown !== status) {
    setShown(status);
    setChange({ id: (change?.id ?? 0) + 1, from: shown });
  }

  useEffect(() => {
    if (trackKey !== undefined) statusMemory.remember(trackKey, status);
  }, [trackKey, status]);

  const [timing] = useState(() => trackTiming());
  // Captured once: the draw-in plays on mount only, and never together with a change.
  const [intro] = useState(() => drawIn !== undefined && change === null && !reduceMotion);

  const trackRef = useRef<HTMLDivElement>(null);
  const looping = isLooping(status) && !reduceMotion;
  const live = useLiveWhileVisible(trackRef, looping);

  const fillFrom = change ? fillStartScale(change.from, status, variant) : null;
  const flourish = change && !reduceMotion ? outcomeFlourish(change.from, status, variant) : null;
  const changeId = change?.id ?? 0;
  const introDelay = introDelayMs(drawIn ?? 0);
  const lineColor = rejected ? 'var(--chart-grey)' : 'var(--foreground)';

  const steps: Step[] = interactive
    ? PIPELINE.map((stage) => ({ key: stage, label: t(`status.${stage}`) }))
    : [
        ...OVERVIEW_STEPS.map((stage) => ({ key: stage, label: t(`status.${stage}`) })),
        {
          key: 'outcome',
          label: finalOutcome ? t(`status.${finalOutcome}`) : t('status.final'),
        },
      ];

  const count = steps.length;
  const slot = interactive ? 20 : 16;
  const trackVars = {
    '--pulse-period': `${timing.pulsePeriodMs}ms`,
    '--pulse-delay': `${timing.pulseDelayMs}ms`,
    '--ring-period': `${timing.ringPeriodMs}ms`,
    '--ring-delay': `${timing.ringDelayMs}ms`,
    '--ring-color': accent,
    '--intro-delay': `${introDelay}ms`,
    // The surface under the track: the card on the overview, the page ground in the editor.
    '--track-ground': interactive ? 'var(--background)' : 'var(--panel)',
  } as CSSProperties;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div
        className={cn(
          'min-w-0',
          !interactive && 'status-track-scroll max-md:overflow-x-auto max-md:py-3',
        )}
      >
        <div
          ref={trackRef}
          role="group"
          aria-label={`${t('status.label', { name })} ${t('status.current', { status: t(`status.${status}`) })}`}
          className={cn(
            'status-track relative flex',
            looping && !live && 'is-paused',
            !interactive && 'max-md:min-w-[44rem]',
          )}
          style={trackVars}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${50 / count}%`,
              right: `${50 / count}%`,
              top: `${slot / 2 - 1}px`,
              height: '2px',
            }}
          >
            <div className={cn('absolute inset-0', intro && 'status-draw')}>
              <span className="absolute inset-0 rounded-full bg-hairline" />
              <motion.span
                key={`fill-${changeId}`}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: lineColor,
                  transformOrigin: 'left center',
                }}
                initial={
                  !change ? false : reduceMotion ? { opacity: 0 } : fillFrom === null ? false : { scaleX: fillFrom }
                }
                animate={{ opacity: 1, scaleX: 1 }}
                transition={reduceMotion ? { duration: 0.25 } : { duration: 0.5, ease: EASE }}
              />
            </div>
            {looping && current > 0 && (
              <span
                key={`pulse-${changeId}`}
                className="status-pulse"
                style={{ width: `${progress * 100}%` }}
              />
            )}
          </div>

          {steps.map((step, i) => {
            const done = i < current;
            const isCurrent = i === current;
            const upcoming = !done && !isCurrent;
            const outcome = !interactive && step.key === 'outcome' && isCurrent ? finalOutcome : null;
            const outcomeNode = outcome ? OUTCOME_NODE[outcome] : null;
            const OutcomeIcon = outcomeNode?.Icon;
            const pop = isCurrent && change !== null && !reduceMotion;
            const nodeDelay = intro ? introDelay + (count > 1 ? (i / (count - 1)) * NODE_TRAIL_MS : 0) : 0;

            const dotSize = outcomeNode
              ? NODE.outcome
              : isCurrent
                ? NODE.current
                : done
                  ? NODE.done
                  : NODE.upcoming;

            let dotStyle: CSSProperties;
            if (outcomeNode) {
              dotStyle = { backgroundColor: outcomeNode.fill, boxShadow: KNOCKOUT };
            } else if (isCurrent) {
              dotStyle = { backgroundColor: accent, boxShadow: KNOCKOUT };
            } else if (done) {
              dotStyle = { backgroundColor: lineColor, boxShadow: KNOCKOUT };
            } else {
              dotStyle = { backgroundColor: 'var(--track-ground)' };
            }

            const labelClass = cn(
              'text-center text-xs leading-4 break-words transition-colors duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              isCurrent
                ? 'font-semibold text-foreground'
                : done && !rejected
                  ? 'text-foreground/75'
                  : 'text-chart-grey',
              interactive && !isCurrent && 'group-hover:text-foreground',
            );

            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cn('relative grid shrink-0 place-items-center', intro && 'status-node-in')}
                  style={{ width: slot, height: slot, '--node-delay': `${nodeDelay}ms` } as CSSProperties}
                >
                  <motion.span
                    key={pop ? `pop-${changeId}` : 'dot'}
                    className={cn(
                      'relative grid place-items-center rounded-full',
                      upcoming && 'border-[1.5px] border-chart-grey',
                    )}
                    style={{ width: dotSize, height: dotSize, ...dotStyle }}
                    initial={pop ? { scale: 0.6 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  >
                    {OutcomeIcon && (
                      <OutcomeIcon
                        aria-hidden="true"
                        size={10}
                        strokeWidth={3}
                        fill={outcome === 'waitlisted' ? 'currentColor' : 'none'}
                        style={{ color: 'var(--track-ground)' }}
                      />
                    )}
                    {isCurrent && looping && <span className="status-ring" />}
                    {outcomeNode && flourish === 'ring' && <span className="status-ring status-ring--once" />}
                  </motion.span>
                </span>
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
                className="group relative z-10 flex flex-1 flex-col items-center gap-2 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
              >
                {content}
              </button>
            ) : (
              <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
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
