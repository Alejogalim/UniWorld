import { describe, expect, it } from 'bun:test';
import { nextEnabledIndex, tabStopIndex } from './SegmentedControl';

describe('nextEnabledIndex', () => {
  it('steps forward and wraps', () => {
    expect(nextEnabledIndex([false, false, false], 2, 1)).toBe(0);
    expect(nextEnabledIndex([false, false, false], 0, -1)).toBe(2);
  });
  it('skips disabled options', () => {
    expect(nextEnabledIndex([false, true, false], 0, 1)).toBe(2);
    expect(nextEnabledIndex([false, true, false], 2, -1)).toBe(0);
  });
  it('stays put when nothing else is enabled', () => {
    expect(nextEnabledIndex([false, true], 0, 1)).toBe(0);
  });
  it('finds first and last enabled for Home and End', () => {
    expect(nextEnabledIndex([true, false, false], 2, 1)).toBe(1);
    expect(nextEnabledIndex([false, false, true], 0, -1)).toBe(1);
  });
});

describe('tabStopIndex', () => {
  it('uses the checked option when enabled', () => {
    expect(tabStopIndex([false, false], 1)).toBe(1);
  });
  it('falls back to the first enabled option', () => {
    expect(tabStopIndex([false, true], 1)).toBe(0);
    expect(tabStopIndex([true, false], -1)).toBe(1);
  });
});
