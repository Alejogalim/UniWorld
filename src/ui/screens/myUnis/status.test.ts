import { describe, expect, it } from 'bun:test';
import type { TrackedStatus } from '@/core/contracts';
import {
  FINAL_OUTCOMES,
  OUTCOMES,
  OVERVIEW_STEPS,
  PIPELINE,
  finalOutcomeOf,
  outcomeOf,
  overviewIndex,
  stageIndex,
  statusAccent,
} from './status';

describe('stageIndex', () => {
  it('maps the pipeline statuses to their stage', () => {
    expect(stageIndex('considering')).toBe(0);
    expect(stageIndex('preparing')).toBe(1);
    expect(stageIndex('applied')).toBe(2);
  });

  it('treats every outcome as a completed application', () => {
    for (const outcome of OUTCOMES) expect(stageIndex(outcome)).toBe(2);
  });
});

describe('overviewIndex', () => {
  it('orders the named steps', () => {
    expect(OVERVIEW_STEPS).toEqual(['considering', 'preparing', 'applied', 'waiting']);
    expect(overviewIndex('considering')).toBe(0);
    expect(overviewIndex('preparing')).toBe(1);
    expect(overviewIndex('applied')).toBe(2);
    expect(overviewIndex('waiting')).toBe(3);
  });

  it('maps each final outcome to the shared final slot', () => {
    for (const outcome of FINAL_OUTCOMES) expect(overviewIndex(outcome)).toBe(4);
  });
});

describe('outcomeOf', () => {
  it('returns the outcome for outcome statuses', () => {
    for (const outcome of OUTCOMES) expect(outcomeOf(outcome)).toBe(outcome);
  });

  it('returns null for pipeline statuses', () => {
    for (const status of PIPELINE) expect(outcomeOf(status)).toBeNull();
  });
});

describe('finalOutcomeOf', () => {
  it('returns only admitted, waitlisted and rejected', () => {
    for (const outcome of FINAL_OUTCOMES) expect(finalOutcomeOf(outcome)).toBe(outcome);
    expect(finalOutcomeOf('waiting')).toBeNull();
    for (const status of PIPELINE) expect(finalOutcomeOf(status)).toBeNull();
  });
});

describe('status sets', () => {
  it('covers all seven contract statuses exactly once', () => {
    const all: TrackedStatus[] = [...PIPELINE, ...OUTCOMES];
    expect(all).toHaveLength(7);
    expect(new Set(all).size).toBe(7);
  });

  it('gives every status an accent colour', () => {
    for (const status of [...PIPELINE, ...OUTCOMES]) expect(statusAccent(status)).toBeTruthy();
  });
});
