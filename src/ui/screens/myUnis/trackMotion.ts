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
