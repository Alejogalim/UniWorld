import type { TrackedStatus } from '@/core/contracts';

/** The application pipeline, in order. */
export const PIPELINE = ['considering', 'preparing', 'applied'] as const;

/** Outcomes after the application was submitted. */
export const OUTCOMES = ['waiting', 'admitted', 'waitlisted', 'rejected'] as const;

/** The three final outcomes share one slot on the overview track. */
export const FINAL_OUTCOMES = ['admitted', 'waitlisted', 'rejected'] as const;

/** The overview track: the pipeline, then waiting, then one shared final-outcome slot. */
export const OVERVIEW_STEPS = [...PIPELINE, 'waiting'] as const;

export type PipelineStatus = (typeof PIPELINE)[number];
export type OutcomeStatus = (typeof OUTCOMES)[number];
export type FinalOutcomeStatus = (typeof FINAL_OUTCOMES)[number];

/** How far along the pipeline a status is: 0, 1 or 2. Outcomes count as "applied" (stage 2). */
export function stageIndex(status: TrackedStatus): 0 | 1 | 2 {
  const index = (PIPELINE as readonly TrackedStatus[]).indexOf(status);
  return index >= 0 ? (index as 0 | 1 | 2) : 2;
}

/**
 * Index on the five-slot overview track: 0–3 for the named steps, 4 for the shared outcome slot.
 * admitted, waitlisted and rejected all land on the same final slot.
 */
export function overviewIndex(status: TrackedStatus): number {
  if (finalOutcomeOf(status)) return OVERVIEW_STEPS.length;
  const index = (OVERVIEW_STEPS as readonly TrackedStatus[]).indexOf(status);
  return index >= 0 ? index : 0;
}

/** The final outcome of a status (admitted, waitlisted, rejected), or null for anything earlier. */
export function finalOutcomeOf(status: TrackedStatus): FinalOutcomeStatus | null {
  return (FINAL_OUTCOMES as readonly TrackedStatus[]).includes(status)
    ? (status as FinalOutcomeStatus)
    : null;
}

/** The outcome of a status, or null while it is still in the pipeline. */
export function outcomeOf(status: TrackedStatus): OutcomeStatus | null {
  return (OUTCOMES as readonly TrackedStatus[]).includes(status) ? (status as OutcomeStatus) : null;
}
