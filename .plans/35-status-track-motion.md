# 35 — My universities: status track motion ("light travels along the track")

Branch: `feat/status-track-motion`. Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ (DESIGN.md edits are owner-approved for this plan, and the "nothing that glows is ever animated" rule gets a named exception for this track, recorded in DESIGN.md below).

## Goal (one slice, demoable)
Replace the green sine-wave status track with a calm straight track and a small amount of meaningful motion:
1. Straight 1.5px line: the completed part in ink at 60%, the rest a hairline. Nodes: completed = small filled ink dot; current = larger ember dot with a soft ember ring; upcoming = hollow hairline dot. Labels muted except the current one (foreground, medium).
2. A travelling pulse: every 5–7 s (random per card), a short soft ember glow slides from the first node to the current node, decelerating, and fades into it. It never passes the current step.
3. The current node breathes: a faint ember ring scales up and fades out about every 3 s.
4. On a status change: the completed line fills from the old node to the new one (500 ms, scaleX), the new current node pops (spring), its label turns foreground/medium with a colour fade.
5. Outcomes on the overview track: admitted → a one-time burst of 6 sparks from the final dot (only on an actual change to admitted), dot settles green (`--evidence`); waitlisted → dot settles amber (`--ember-2`) with one slow ring pulse; rejected → no flourish, the whole track goes calm grey (`--chart-grey`). Once a final outcome is reached, the looping pulse and breathing stop.
6. On My universities page mount, each card's track draws in left-to-right once (60 ms stagger per card, capped at index 7). Not on re-renders, not when returning from the editor.

Constraints (owner, binding): per-card random timing; pulse + breathing run only while the card is on screen (IntersectionObserver) and pause while `document.hidden`; `prefers-reduced-motion` → no loops, no burst, no draw-in, no pop, the status-change fill becomes a 250 ms opacity fade. Only small elements animate, transform/opacity only. CSS keyframes + CSS variables for the loops; framer-motion only for state-driven fill and pop. No `requestAnimationFrame`, no full-card or full-window animated layers. Colours only via tokens; works in light and dark. Ember = progress light; green only on the final dot when admitted.

How a remounted card knows the status changed: the editor replaces the card list, so after Save the cards remount. A session-only module map (`statusMemory`, keyed by `uni.id`) remembers the last status each overview card showed. On mount, if the remembered status differs from the current one, the track plays the change (fill, pop, flourish). First page load in an app session has no entries, so nothing plays except the draw-in. In the editor (no `trackKey`), changes are detected while mounted (React "adjust state during render" pattern).

## Builder rules
- Work on branch `feat/status-track-motion`. No commits, no branch switches, no `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- Touch ONLY these files:
  - `src/ui/screens/myUnis/StatusProgress.tsx` (full replacement)
  - `src/ui/screens/myUnis/trackMotion.ts` (new)
  - `src/ui/screens/myUnis/trackMotion.test.ts` (new)
  - `src/ui/screens/myUnis/useLiveWhileVisible.ts` (new)
  - `src/ui/screens/myUnis/TrackedUniCard.tsx` (two exact edits)
  - `src/ui/screens/MyUnis.tsx` (three exact edits)
  - `src/index.css` (one exact block replacement)
  - `DESIGN.md` (three exact edits)
  - this plan file (checkboxes + Builder notes)
- Do NOT edit `status.ts`, `status.test.ts`, `TrackedUniEditor.tsx` (the editor already passes `onChange`; it needs no change).
- Minimal diff: apart from the full replacement of `StatusProgress.tsx` and the new files, every step is an exact string replacement. Another dev (Quan) wrote these files: do not reformat, re-indent, reorder imports or "tidy" anything not named here.
- If an "old" text is not found exactly once, stop and write it under Builder notes; do not guess.

---

## Step 1 — `src/ui/screens/myUnis/trackMotion.ts` (new file)
- [x] Create with exactly:
```ts
import type { TrackedStatus } from '@/core/contracts';
import { OVERVIEW_STEPS, PIPELINE, finalOutcomeOf, overviewIndex, stageIndex } from './status';

/** The overview card track (five slots) or the editor track (three pipeline stages). */
export type TrackVariant = 'overview' | 'editor';

/** Number of nodes on a track: the four named overview steps plus the shared outcome, or the pipeline. */
export function stepCount(variant: TrackVariant): number {
  return variant === 'overview' ? OVERVIEW_STEPS.length + 1 : PIPELINE.length;
}

/** Index of the current node on a track. */
export function trackIndex(status: TrackedStatus, variant: TrackVariant): number {
  return variant === 'overview' ? overviewIndex(status) : stageIndex(status);
}

/** How much of the line is lit, from 0 (first node) to 1 (last node). */
export function trackProgress(status: TrackedStatus, variant: TrackVariant): number {
  const count = stepCount(variant);
  return count > 1 ? trackIndex(status, variant) / (count - 1) : 0;
}

/**
 * Starting scaleX for the lit segment after a change, so it grows (or shrinks) from the old node
 * to the new one. Null when nothing should move: same position, or no lit segment at all.
 */
export function fillStartScale(
  from: TrackedStatus,
  to: TrackedStatus,
  variant: TrackVariant,
): number | null {
  const start = trackProgress(from, variant);
  const end = trackProgress(to, variant);
  if (end <= 0 || start === end) return null;
  return start / end;
}

export type Flourish = 'burst' | 'settle-waitlisted' | null;

/**
 * The one-time outcome flourish for a change on the overview track. Only a real change into an
 * outcome plays one; a first mount (`from` null) never does. Rejected has no flourish.
 */
export function outcomeFlourish(
  from: TrackedStatus | null,
  to: TrackedStatus,
  variant: TrackVariant,
): Flourish {
  if (variant !== 'overview' || from === null || from === to) return null;
  if (to === 'admitted') return 'burst';
  if (to === 'waitlisted') return 'settle-waitlisted';
  return null;
}

/** The pulse and the breathing ring loop only while the application is still in progress. */
export function isLooping(status: TrackedStatus): boolean {
  return finalOutcomeOf(status) === null;
}

export interface TrackTiming {
  pulsePeriodMs: number;
  pulseDelayMs: number;
  ringPeriodMs: number;
  ringDelayMs: number;
}

/** Per-instance timing so cards never pulse in sync. `random` returns a number in [0, 1). */
export function trackTiming(random: () => number = Math.random): TrackTiming {
  return {
    pulsePeriodMs: Math.round(5000 + random() * 2000),
    pulseDelayMs: Math.round(800 + random() * 3000),
    ringPeriodMs: Math.round(2800 + random() * 600),
    // Negative: the ring starts part-way through its cycle.
    ringDelayMs: 0 - Math.round(random() * 3000),
  };
}

export const INTRO_STAGGER_MS = 60;
export const INTRO_MAX_INDEX = 7;

/** Draw-in delay for the card at `index` on first paint: 60 ms apart, capped at the eighth card. */
export function introDelayMs(index: number): number {
  return Math.min(Math.max(index, 0), INTRO_MAX_INDEX) * INTRO_STAGGER_MS;
}

export interface Spark {
  dx: number;
  dy: number;
}

/** End offsets (px) for the admitted burst: `count` sparks evenly around a circle, the first straight up. */
export function sparkVectors(count = 6, radius = 14): Spark[] {
  const round = (value: number) => Math.round(value * 100) / 100;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return { dx: round(Math.cos(angle) * radius), dy: round(Math.sin(angle) * radius) };
  });
}

export interface StatusMemory {
  peek: (key: string | number) => TrackedStatus | null;
  remember: (key: string | number, status: TrackedStatus) => void;
}

/** A per-session record of the last status each track showed, keyed by a stable id. */
export function createStatusMemory(): StatusMemory {
  const seen = new Map<string | number, TrackedStatus>();
  return {
    peek: (key) => seen.get(key) ?? null,
    remember: (key, status) => {
      seen.set(key, status);
    },
  };
}

/**
 * Shared memory for the overview cards. The editor replaces the card list, so after Save the cards
 * remount; this lets a remounted card play the change from the status it showed before.
 * It lives for the app session only (never persisted).
 */
export const statusMemory = createStatusMemory();
```

## Step 2 — `src/ui/screens/myUnis/trackMotion.test.ts` (new file)
- [x] Create with exactly:
```ts
import { describe, expect, it } from 'bun:test';
import { FINAL_OUTCOMES, OUTCOMES, OVERVIEW_STEPS, PIPELINE } from './status';
import {
  INTRO_MAX_INDEX,
  createStatusMemory,
  fillStartScale,
  introDelayMs,
  isLooping,
  outcomeFlourish,
  sparkVectors,
  stepCount,
  trackIndex,
  trackProgress,
  trackTiming,
} from './trackMotion';

describe('trackProgress', () => {
  it('spreads the five overview slots evenly', () => {
    expect(stepCount('overview')).toBe(5);
    expect(trackProgress('considering', 'overview')).toBe(0);
    expect(trackProgress('preparing', 'overview')).toBe(0.25);
    expect(trackProgress('applied', 'overview')).toBe(0.5);
    expect(trackProgress('waiting', 'overview')).toBe(0.75);
    for (const outcome of FINAL_OUTCOMES) expect(trackProgress(outcome, 'overview')).toBe(1);
  });

  it('uses the three pipeline stages in the editor', () => {
    expect(stepCount('editor')).toBe(3);
    expect(trackProgress('considering', 'editor')).toBe(0);
    expect(trackProgress('preparing', 'editor')).toBe(0.5);
    for (const outcome of OUTCOMES) expect(trackProgress(outcome, 'editor')).toBe(1);
  });

  it('matches the existing index helpers', () => {
    OVERVIEW_STEPS.forEach((status, i) => expect(trackIndex(status, 'overview')).toBe(i));
    PIPELINE.forEach((status, i) => expect(trackIndex(status, 'editor')).toBe(i));
  });
});

describe('fillStartScale', () => {
  it('grows from the old node to the new one', () => {
    expect(fillStartScale('preparing', 'waiting', 'overview')).toBeCloseTo(1 / 3);
    expect(fillStartScale('considering', 'admitted', 'overview')).toBe(0);
  });

  it('shrinks when the status moves back', () => {
    expect(fillStartScale('waiting', 'preparing', 'overview')).toBeCloseTo(3);
  });

  it('does nothing when the position is unchanged or nothing is lit', () => {
    expect(fillStartScale('applied', 'applied', 'overview')).toBeNull();
    expect(fillStartScale('admitted', 'rejected', 'overview')).toBeNull();
    expect(fillStartScale('applied', 'waiting', 'editor')).toBeNull();
    expect(fillStartScale('preparing', 'considering', 'overview')).toBeNull();
  });
});

describe('outcomeFlourish', () => {
  it('bursts only on a real change to admitted', () => {
    expect(outcomeFlourish('waiting', 'admitted', 'overview')).toBe('burst');
    expect(outcomeFlourish('rejected', 'admitted', 'overview')).toBe('burst');
    expect(outcomeFlourish(null, 'admitted', 'overview')).toBeNull();
    expect(outcomeFlourish('admitted', 'admitted', 'overview')).toBeNull();
  });

  it('settles waitlisted once and gives rejected nothing', () => {
    expect(outcomeFlourish('waiting', 'waitlisted', 'overview')).toBe('settle-waitlisted');
    expect(outcomeFlourish('waiting', 'rejected', 'overview')).toBeNull();
  });

  it('never plays on the editor track', () => {
    expect(outcomeFlourish('waiting', 'admitted', 'editor')).toBeNull();
  });
});

describe('isLooping', () => {
  it('loops while in progress and stops at a final outcome', () => {
    for (const status of OVERVIEW_STEPS) expect(isLooping(status)).toBe(true);
    for (const outcome of FINAL_OUTCOMES) expect(isLooping(outcome)).toBe(false);
  });
});

describe('trackTiming', () => {
  it('stays inside the agreed ranges', () => {
    const low = trackTiming(() => 0);
    expect(low).toEqual({ pulsePeriodMs: 5000, pulseDelayMs: 800, ringPeriodMs: 2800, ringDelayMs: 0 });
    const high = trackTiming(() => 0.999);
    expect(high.pulsePeriodMs).toBeLessThanOrEqual(7000);
    expect(high.pulseDelayMs).toBeLessThanOrEqual(3800);
    expect(high.ringPeriodMs).toBeLessThanOrEqual(3400);
    expect(high.ringDelayMs).toBeGreaterThanOrEqual(-3000);
    expect(high.ringDelayMs).toBeLessThanOrEqual(0);
  });
});

describe('introDelayMs', () => {
  it('staggers 60 ms per card and caps at the eighth card', () => {
    expect(introDelayMs(0)).toBe(0);
    expect(introDelayMs(3)).toBe(180);
    expect(introDelayMs(INTRO_MAX_INDEX)).toBe(420);
    expect(introDelayMs(20)).toBe(420);
    expect(introDelayMs(-1)).toBe(0);
  });
});

describe('sparkVectors', () => {
  it('spreads the sparks evenly on a circle, the first straight up', () => {
    const sparks = sparkVectors(6, 14);
    expect(sparks).toHaveLength(6);
    for (const { dx, dy } of sparks) expect(Math.hypot(dx, dy)).toBeCloseTo(14, 1);
    expect(sparks[0].dx).toBeCloseTo(0);
    expect(sparks[0].dy).toBeCloseTo(-14);
  });
});

describe('createStatusMemory', () => {
  it('remembers the last status per key', () => {
    const memory = createStatusMemory();
    expect(memory.peek(1)).toBeNull();
    memory.remember(1, 'waiting');
    memory.remember(2, 'applied');
    expect(memory.peek(1)).toBe('waiting');
    memory.remember(1, 'admitted');
    expect(memory.peek(1)).toBe('admitted');
    expect(memory.peek(2)).toBe('applied');
  });
});
```

## Step 3 — `src/ui/screens/myUnis/useLiveWhileVisible.ts` (new file)
- [x] Create with exactly:
```ts
import { useEffect, useState, type RefObject } from 'react';

/**
 * True while `enabled`, the element is on screen and the window is visible. Starts false, so looping
 * CSS animations start paused until the first intersection report. No timers, no animation frames.
 */
export function useLiveWhileVisible(ref: RefObject<Element | null>, enabled: boolean): boolean {
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [enabled]);

  return enabled && inView && pageVisible;
}
```

## Step 4 — `src/ui/screens/myUnis/StatusProgress.tsx` (full replacement)
- [x] Replace the whole file with exactly:
```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import type { TrackedStatus } from '@/core/contracts';
import { cn } from '@/lib/utils';
import { Chip } from '@/ui/components/Chip';
import { OUTCOMES, OVERVIEW_STEPS, PIPELINE, finalOutcomeOf } from './status';
import {
  fillStartScale,
  introDelayMs,
  isLooping,
  outcomeFlourish,
  sparkVectors,
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
/** Completed line and dots: ink at 60%, opaque so a dot over the line does not darken. */
const INK = 'color-mix(in oklch, var(--foreground) 60%, var(--background))';
const SPARKS = sparkVectors(6, 14);
const SPARK_COLORS = ['var(--evidence)', 'var(--ember-2)'];
/** How long the node fade-in trails the line as it draws from the first node to the last. */
const NODE_TRAIL_MS = 480;

/**
 * The application track. The overview shows considering → preparing → applied → waiting → one
 * shared final-outcome dot. The editor shows the three-stage pipeline plus the outcome controls.
 * A straight line runs behind the nodes; a small ember light travels from the first node to the
 * current one, and the current node breathes. Loops run only on screen and never under reduced motion.
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
  const lineColor = rejected ? 'var(--chart-grey)' : INK;

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
              top: `${slot / 2 - 0.75}px`,
              height: '1.5px',
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
            const outcomeTone = !interactive && step.key === 'outcome' && isCurrent ? finalOutcome : null;
            const pop = isCurrent && change !== null && !reduceMotion;
            const nodeDelay = intro ? introDelay + (count > 1 ? (i / (count - 1)) * NODE_TRAIL_MS : 0) : 0;

            const dotSize = isCurrent
              ? interactive ? 12 : 10
              : done
                ? interactive ? 8 : 6
                : interactive ? 10 : 8;

            let dotStyle: CSSProperties | undefined;
            if (done) {
              dotStyle = { backgroundColor: lineColor };
            } else if (isCurrent) {
              if (outcomeTone === 'admitted') {
                dotStyle = {
                  backgroundColor: 'var(--evidence)',
                  boxShadow: '0 0 0 3px color-mix(in oklch, var(--evidence) 22%, transparent)',
                };
              } else if (outcomeTone === 'rejected') {
                dotStyle = { backgroundColor: 'var(--chart-grey)' };
              } else if (outcomeTone !== 'waitlisted') {
                dotStyle = {
                  backgroundColor: accent,
                  boxShadow: `0 0 0 3px color-mix(in oklch, ${accent} 22%, transparent)`,
                };
              }
            }

            const labelClass = cn(
              'text-center leading-tight break-words transition-colors duration-300',
              interactive ? 'text-xs' : 'text-[11px]',
              isCurrent ? 'font-medium text-foreground' : 'text-chart-grey',
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
                      'relative block rounded-full',
                      !done && !isCurrent && 'border-[1.5px] border-hairline bg-panel',
                      outcomeTone === 'waitlisted' && 'status-node--waitlisted',
                    )}
                    style={{ width: dotSize, height: dotSize, ...dotStyle }}
                    initial={pop ? { scale: 0.4 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                  >
                    {isCurrent && looping && <span className="status-ring" />}
                    {outcomeTone === 'waitlisted' && flourish === 'settle-waitlisted' && (
                      <span
                        className="status-ring status-ring--once"
                        style={{ '--ring-color': 'var(--ember-2)' } as CSSProperties}
                      />
                    )}
                    {outcomeTone === 'admitted' &&
                      flourish === 'burst' &&
                      SPARKS.map((spark, s) => (
                        <span
                          key={s}
                          className="status-spark"
                          style={
                            {
                              '--dx': `${spark.dx}px`,
                              '--dy': `${spark.dy}px`,
                              '--spark-color': SPARK_COLORS[s % SPARK_COLORS.length],
                            } as CSSProperties
                          }
                        />
                      ))}
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
```
Notes for the builder (do not change the code above unless `bun run build` fails):
- The `if (shown !== status)` block during render is React's documented "adjust state when a prop changes" pattern; it is intentional, not a bug.
- If TypeScript rejects the `initial={...}` ternary, extract it to `const fillInitial = !change ? false : reduceMotion ? { opacity: 0 } : fillFrom === null ? false : { scaleX: fillFrom };` above the `return` and pass `initial={fillInitial}`. Record it under Builder notes.

## Step 5 — `src/ui/screens/myUnis/TrackedUniCard.tsx` (two exact edits)
- [x] 5a. Old:
```tsx
  onEdit: () => void;
  onOpen: () => void;
}
```
New:
```tsx
  onEdit: () => void;
  onOpen: () => void;
  /** Position on the page's first paint; the status track draws in once, staggered by it. */
  introIndex?: number;
}
```
- [x] 5b. Old:
```tsx
export function TrackedUniCard({ uni, today, onEdit, onOpen }: TrackedUniCardProps) {
```
New:
```tsx
export function TrackedUniCard({ uni, today, onEdit, onOpen, introIndex }: TrackedUniCardProps) {
```
- [x] 5c. Old:
```tsx
        <StatusProgress
          status={uni.status}
          name={uni.name}
          className="min-w-0 flex-1"
        />
```
New:
```tsx
        <StatusProgress
          status={uni.status}
          name={uni.name}
          trackKey={uni.id}
          drawIn={introIndex}
          className="min-w-0 flex-1"
        />
```
(Do not touch `statusAccent` / the card rim: out of scope.)

## Step 6 — `src/ui/screens/MyUnis.tsx` (three exact edits)
- [x] 6a. Old:
```tsx
  const [editing, setEditing] = useState<TrackedUni | null>(null);
```
New:
```tsx
  const [editing, setEditing] = useState<TrackedUni | null>(null);
  // True until the cards have painted once: their tracks draw in on this screen's first paint only,
  // not when the list comes back from the editor.
  const [intro, setIntro] = useState(true);
```
- [x] 6b. Old:
```tsx
  }, [loaded]);
```
New:
```tsx
  }, [loaded]);

  useEffect(() => {
    if (intro && loaded && items.length > 0) setIntro(false);
  }, [intro, loaded, items.length]);
```
- [x] 6c. Old:
```tsx
          {sorted.map((uni) => (
            <TrackedUniCard
              key={uni.id}
              uni={uni}
              today={today}
```
New:
```tsx
          {sorted.map((uni, index) => (
            <TrackedUniCard
              key={uni.id}
              uni={uni}
              today={today}
              introIndex={intro ? index : undefined}
```

## Step 7 — `src/index.css` (one exact block replacement, inside `@layer components`)
- [x] Old (the whole sine-wave block, from its comment to its reduced-motion rule):
```css
  /* Lit status connectors are a true sine wave: a solid colour revealed by a repeating wave mask,
     sliding one full period per cycle so the wave travels like an audio waveform. */
  @keyframes status-wave-move {
```
… through …
```css
  @media (prefers-reduced-motion: reduce) {
    .status-wave-line--animated { animation: none; }
  }
```
i.e. replace every line from `/* Lit status connectors are a true sine wave` down to and including the closing `}` of the `@media` block that contains `.status-wave-line--animated { animation: none; }` (the next line after it is the blank line before `/* Primary button fill`). Leave everything else untouched.

New (2-space indent, as in the surrounding layer):
```css
  /* Status track (plan 35): a straight line; a small ember light travels to the current step and the current
     node breathes. Only small elements animate, transform and opacity only. Per-card timing arrives as CSS
     variables from StatusProgress; .is-paused (off screen or hidden window) freezes the loops. */
  .status-pulse {
    position: absolute;
    left: 0;
    top: 50%;
    height: 0;
    transform: translateX(-100%);
    will-change: transform;
    animation: status-pulse-travel var(--pulse-period, 6000ms) linear var(--pulse-delay, 0ms) infinite;
  }
  .status-pulse::after {
    content: '';
    position: absolute;
    top: -3px;
    right: -4px;
    width: 40px;
    height: 6px;
    border-radius: 999px;
    background:
      radial-gradient(closest-side, var(--ember-2), transparent) right center / 8px 6px no-repeat,
      linear-gradient(to right, transparent, color-mix(in oklch, var(--ember-1) 70%, transparent));
    opacity: 0;
    animation: status-pulse-fade var(--pulse-period, 6000ms) linear var(--pulse-delay, 0ms) infinite;
  }
  @keyframes status-pulse-travel {
    0% {
      transform: translateX(-100%);
      animation-timing-function: cubic-bezier(0.25, 0.8, 0.3, 1);
    }
    28%,
    100% {
      transform: translateX(0);
    }
  }
  @keyframes status-pulse-fade {
    0% { opacity: 0; }
    4% { opacity: 1; }
    26% { opacity: 0.9; }
    36%,
    100% { opacity: 0; }
  }

  .status-ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 1.5px solid var(--ring-color, var(--signal));
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity;
    animation: status-ring-ping var(--ring-period, 3000ms) cubic-bezier(0.2, 0, 0, 1) var(--ring-delay, 0ms) infinite;
  }
  .status-ring--once {
    animation-duration: 1600ms;
    animation-delay: 300ms;
    animation-iteration-count: 1;
  }
  @keyframes status-ring-ping {
    0% { transform: scale(1); opacity: 0.6; }
    70%,
    100% { transform: scale(2.4); opacity: 0; }
  }

  .status-track.is-paused .status-pulse,
  .status-track.is-paused .status-pulse::after,
  .status-track.is-paused .status-ring {
    animation-play-state: paused;
  }

  /* Waitlisted final dot: amber, with an inset edge so it still reads on white paper. */
  .status-node--waitlisted {
    background: var(--ember-2);
    box-shadow:
      0 0 0 3px color-mix(in oklch, var(--ember-2) 30%, transparent),
      inset 0 0 0 1px color-mix(in oklch, var(--signal) 45%, transparent);
  }

  /* Admitted: a one-time burst of tiny sparks from the final dot. */
  .status-spark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 3px;
    height: 3px;
    margin: -1.5px 0 0 -1.5px;
    border-radius: 999px;
    background: var(--spark-color, var(--evidence));
    opacity: 0;
    pointer-events: none;
    animation: status-spark 700ms cubic-bezier(0.2, 0, 0, 1) forwards;
  }
  @keyframes status-spark {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
  }

  /* First paint of My universities: the line draws left to right, the nodes follow it. */
  .status-draw {
    transform-origin: left center;
    animation: status-draw 600ms cubic-bezier(0.2, 0, 0, 1) var(--intro-delay, 0ms) both;
  }
  @keyframes status-draw {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  .status-node-in {
    animation: status-node-in 240ms ease-out var(--node-delay, 0ms) both;
  }
  @keyframes status-node-in {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-pulse,
    .status-ring,
    .status-spark { display: none; }
    .status-draw,
    .status-node-in { animation: none; }
  }
```
- [x] After the edit, `grep -rn "status-wave" src` must print nothing.

## Step 8 — `DESIGN.md` (three exact edits)
- [x] 8a. Old:
```
- Motion answers an action. The twinkling stars, the rare shooting star and the arrival of search results are the only things that move without a cause.
```
New:
```
- Motion answers an action. The twinkling stars, the rare shooting star, the arrival of search results and the small light on the My universities status track are the only things that move without a cause.
```
- [x] 8b. Old:
```
- **Status track** (`StatusProgress`): considering, preparing, applied, waiting, then one shared final-outcome dot (admitted, waitlisted or rejected). One continuous wave runs behind the nodes; the lit layer is clipped to the current stage.
```
New:
```
- **Status track** (`StatusProgress`, plan 35): considering, preparing, applied, waiting, then one shared final-outcome dot (admitted, waitlisted or rejected); the editor shows the three pipeline stages plus the outcome chips. A straight 1.5px line: the completed part in ink at 60%, the rest a hairline. Completed nodes are small ink dots, the current node a larger ember (signal) dot with a soft ember ring, upcoming nodes hollow hairline dots. Labels are chart grey except the current one (ink, medium).
  - **Light travels along the track:** every 5 to 7 s (random per card) a 40px soft ember glow slides from the first node to the current one, decelerating, and fades into it; it never passes the current step. The current node breathes: a faint ember ring scales up and fades about every 3 s. Both are named exceptions to "nothing that glows is ever animated": tiny elements, transform and opacity only, per-card CSS timing, running only while the card is on screen and the window is visible. They stop once a final outcome is reached.
  - **Status change:** the completed line fills from the old node to the new one (500ms, scaleX), the new current node pops with a small spring, and its label fades to ink. A card remembers (for the session) the status it last showed, so the change plays when the list returns from the editor.
  - **Outcomes:** admitted, a one-time burst of six tiny sparks (700ms) on an actual change, then the final dot settles in evidence green (the only green on the track); waitlisted, the dot settles in ember-2 with one slow ring pulse; rejected, no flourish and the whole track goes calm chart grey.
  - **First paint:** on entering My universities each card's line draws in left to right once (600ms, 60ms stagger per card, capped at eight cards), the nodes following it.
```
- [x] 8c. Old:
```
State changes: 180ms, `cubic-bezier(0.2, 0, 0, 1)`. Press: 120ms scale. The panel glow fades in over 300ms on first paint, opacity only. The screen transition keeps the 8px slide and fade. Result rows arrive in rank order with a 24ms stagger capped at eight rows. A few stars twinkle and a rare shooting star crosses; nothing drifts. The globe fly-to and contraction keep their durations. `prefers-reduced-motion` removes transforms and keeps opacity.
```
New:
```
State changes: 180ms, `cubic-bezier(0.2, 0, 0, 1)`. Press: 120ms scale. The panel glow fades in over 300ms on first paint, opacity only. The screen transition keeps the 8px slide and fade. Result rows arrive in rank order with a 24ms stagger capped at eight rows. A few stars twinkle and a rare shooting star crosses; nothing drifts. The globe fly-to and contraction keep their durations. The status track (My universities) carries a travelling ember light and a breathing current node as CSS keyframes on tiny elements, paused off screen and while the window is hidden; its status-change fill (500ms) and node pop are state-driven (framer-motion). On the owner's Linux software-rendering path only small elements may animate, with transform and opacity: never a full-card or full-window animated layer, and no `requestAnimationFrame` loop. `prefers-reduced-motion` removes transforms and keeps opacity: on the status track no loops, no burst, no draw-in, no pop, and the fill becomes a 250ms fade.
```

## Verify (run all; all must pass)
```bash
cd /home/alejogalim/Documents/Projects/UniWorld
bun run build
bun run check:i18n
bun test
grep -rn "status-wave" src || echo "no wave left"
git status --short
```
`git status --short` must list only the files named in Builder rules (plus the pre-existing untracked `.impeccable/` and `graphify-out/`).

## Acceptance (orchestrator checks visually, light and dark)
- Straight track, no wave; completed ink, upcoming hairline, current ember dot + ring; labels muted except current.
- A short glow travels to the current node every 5–7 s, cards out of sync; never on a card at "considering" (nothing to travel) and never once a final outcome is set.
- Edit a card from Waiting to Admitted and save: the line fills to the final node, the dot pops green and six sparks burst once. Reloading the page does not replay the burst.
- Waitlisted settles amber with one slow ring; Rejected goes calm grey with no motion.
- Entering My universities draws each track in with a stagger; closing the editor does not replay it.
- With reduced motion on: no pulse, ring, sparks, draw-in or pop; a status change only fades the line in.

## Builder notes
- Applied Steps 1-8 by extracting each code block verbatim from this plan and asserting each "old" text matched exactly once. No hand edits to code.
- Step 7 first pass used the plan's "Old" css snippet instead of the "New" block; caught by the build (CSS syntax error). Restored `src/index.css` from git and re-applied the correct "New" block. Final diff of index.css removes only the sine-wave block.
- Verify: `bun run build` passed (tsc + vite). `bun run check:i18n` passed. `bun test`: 268 pass, 0 fail. `grep -rn "status-wave" src`: no matches.
- `git status --short`: only the five named tracked files modified (DESIGN.md, index.css, MyUnis.tsx, StatusProgress.tsx, TrackedUniCard.tsx) and the three new files, plus the pre-existing untracked `.impeccable/` and `graphify-out/`. No commits, no branch switch, app not started.
- Not run (out of plan scope): `cd src-tauri && cargo check` and visual check (orchestrator's job).
- Deviations from the plan: none in final content.
