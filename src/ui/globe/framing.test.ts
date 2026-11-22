import { describe, expect, test } from 'bun:test';
import { easeOutCubic, globeOffsetFor, lerpOffset, NO_INSET } from './framing';

describe('globeOffsetFor', () => {
  test('no inset keeps the globe centred', () => {
    expect(globeOffsetFor(NO_INSET)).toEqual([0, 0]);
  });
  test('a right panel moves the centre left by half its width', () => {
    expect(globeOffsetFor({ right: 400, bottom: 0 })).toEqual([-200, 0]);
  });
  test('a bottom sheet moves the centre up by half its height', () => {
    expect(globeOffsetFor({ right: 0, bottom: 360 })).toEqual([0, -180]);
  });
  test('negative insets are ignored', () => {
    expect(globeOffsetFor({ right: -10, bottom: -4 })).toEqual([0, 0]);
  });
});

describe('easeOutCubic', () => {
  test('clamps and hits both ends', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
  });
  test('is ahead of linear in the middle', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('lerpOffset', () => {
  test('blends both axes', () => {
    expect(lerpOffset([0, 0], [-200, -100], 0.5)).toEqual([-100, -50]);
  });
});
