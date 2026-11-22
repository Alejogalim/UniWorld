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
