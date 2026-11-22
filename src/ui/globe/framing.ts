/** Space a floating panel takes from the globe's field, in CSS px (plan 32). */
export interface ViewInset {
  right: number;
  bottom: number;
}

export const NO_INSET: ViewInset = { right: 0, bottom: 0 };

/** Duration of the globe re-centring when the panel opens, folds or the window resizes. */
export const OFFSET_TWEEN_MS = 300;

/**
 * globe.gl `globeOffset` ([x, y] px from the canvas centre, +x right, +y down) that puts the
 * globe's centre in the middle of the area the inset leaves free.
 */
export function globeOffsetFor(inset: ViewInset): [number, number] {
  return [inset.right > 0 ? -inset.right / 2 : 0, inset.bottom > 0 ? -inset.bottom / 2 : 0];
}

/** Ease-out cubic on 0..1 (input is clamped). */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** Linear blend of two offsets; k = 0 gives `from`, k = 1 gives `to`. */
export function lerpOffset(from: [number, number], to: [number, number], k: number): [number, number] {
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
}
