import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useReducedMotion } from 'framer-motion';
import { useTheme } from '@/app/theme';

/*
 * Plan 19 starfield: one small canvas behind everything (backing store = viewport at DPR 1). The stars only move
 * while the user is idle: any pointer, wheel, key, scroll or route change stops all star work, and motion resumes
 * 600 ms after the last input. While idle the field redraws at 4 fps from a timer (no rAF). Positions come from a
 * motion clock that only advances while stars move, so resuming never jumps. Dark theme only.
 */

interface LayerSpec {
  share: number;
  radius: number;
  /** Drift speed in px per second, toward the upper-left. */
  speed: number;
  /** Random alpha range (far to near). */
  alpha: [number, number];
}

const LAYERS: LayerSpec[] = [
  { share: 0.55, radius: 0.5, speed: 1.5, alpha: [0.14, 0.22] },
  { share: 0.3, radius: 0.9, speed: 3, alpha: [0.18, 0.27] },
  { share: 0.15, radius: 1.3, speed: 5, alpha: [0.22, 0.32] },
];

/** One star per this many CSS px squared (about 300 on 1920 x 1080). */
const PX_PER_STAR = 7000;
/** Bright stars on the near layer, drawn with a soft glow. */
const BRIGHT_COUNT = 6;
const BRIGHT_ALPHA = 0.6;
const BRIGHT_RADIUS = 1.3;
const GLOW_SIZE = 12;
const GLOW_ALPHA = 0.27;
const WARM_SHARE = 0.15;
/** Stars fade over this many px at the window edges, so the wrap has no pop. */
const EDGE_FADE = 40;

/** Idle redraw rates, stepped down when a redraw is slow. */
const RATES = [4, 2, 1];
const IDLE_AFTER_MS = 600;
const SLOW_MEDIAN_MS = 25;
const LATE_MS = 400;
const LATE_STRIKES = 3;
const SAMPLES = 8;

interface Star {
  /** Position at motion-clock zero; the drawn position is wrapped and offset by the clock. */
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  warm: boolean;
  bright: boolean;
  twinklePeriod: number;
  twinklePhase: number;
}

interface StarColors {
  /** --foreground in dark mode (white). */
  base: string;
  /** --star-warm, the barely warm tint on about 15% of stars. */
  warm: string;
}

interface Field {
  stop(): void;
  poke(): void;
}

function readColors(): StarColors {
  // Colours come from the dark tokens (--foreground, --star-warm), read once per activation.
  const styles = getComputedStyle(document.documentElement);
  return {
    base: styles.getPropertyValue('--foreground').trim() || '#ffffff',
    warm: styles.getPropertyValue('--star-warm').trim() || '#ffffff',
  };
}

function makeGlowSprite(color: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = GLOW_SIZE;
  sprite.height = GLOW_SIZE;
  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;
  const half = GLOW_SIZE / 2;
  const glow = ctx.createRadialGradient(half, half, 0, half, half, half);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  return sprite;
}

function layerFor(roll: number): LayerSpec {
  if (roll < LAYERS[0].share) return LAYERS[0];
  if (roll < LAYERS[0].share + LAYERS[1].share) return LAYERS[1];
  return LAYERS[2];
}

function makeStar(width: number, height: number, layer: LayerSpec, bright: boolean): Star {
  const [alphaMin, alphaMax] = layer.alpha;
  const diagonal = layer.speed * Math.SQRT1_2;
  return {
    x0: Math.random() * width,
    y0: Math.random() * height,
    vx: -diagonal,
    vy: -diagonal,
    radius: bright ? BRIGHT_RADIUS : layer.radius,
    alpha: bright ? BRIGHT_ALPHA : alphaMin + Math.random() * (alphaMax - alphaMin),
    warm: !bright && Math.random() < WARM_SHARE,
    bright,
    twinklePeriod: 6 + Math.random() * 6,
    twinklePhase: Math.random() * Math.PI * 2,
  };
}

function starCount(width: number, height: number): number {
  return Math.round((width * height) / PX_PER_STAR);
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Starts the field on a canvas. Returns the handles the component needs; stop() removes everything. */
function startStarfield(canvas: HTMLCanvasElement, reduceMotion: boolean): Field {
  const ctx = canvas.getContext('2d');
  const colors = readColors();
  const sprite = makeGlowSprite(colors.base);

  let width = 0;
  let height = 0;
  let stars: Star[] = [];
  let clock = 0;
  let rateIndex = 0;
  let frozen = false;
  let inputIdle = true;
  let blurred = false;
  let lastTick = 0;
  let lateStrikes = 0;
  const costs: number[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  function size() {
    width = Math.max(1, Math.round(canvas.clientWidth));
    height = Math.max(1, Math.round(canvas.clientHeight));
    canvas.width = width;
    canvas.height = height;
  }

  function fillStars() {
    stars = [];
    let bright = 0;
    const total = starCount(width, height);
    for (let i = 0; i < total; i += 1) {
      const layer = layerFor(Math.random());
      const isBright = layer === LAYERS[2] && bright < BRIGHT_COUNT;
      if (isBright) bright += 1;
      stars.push(makeStar(width, height, layer, isBright));
    }
  }

  function edgeFade(x: number, span: number): number {
    return Math.max(0, Math.min(1, x / EDGE_FADE, (span - x) / EDGE_FADE));
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const x = wrap(star.x0 + star.vx * clock, width);
      const y = wrap(star.y0 + star.vy * clock, height);
      const twinkle = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((clock * Math.PI * 2) / star.twinklePeriod + star.twinklePhase));
      const fade = edgeFade(x, width) * edgeFade(y, height) * twinkle;
      if (fade <= 0) continue;
      if (star.bright) {
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.drawImage(sprite, x - GLOW_SIZE / 2, y - GLOW_SIZE / 2, GLOW_SIZE, GLOW_SIZE);
      }
      ctx.globalAlpha = star.alpha * fade;
      ctx.fillStyle = star.warm ? colors.warm : colors.base;
      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function canMove(): boolean {
    return !reduceMotion && !frozen && inputIdle && !blurred && !document.hidden;
  }

  function arm() {
    clearTimeout(timer);
    timer = undefined;
    if (!canMove()) return;
    lastTick = performance.now();
    timer = setTimeout(tick, 1000 / RATES[rateIndex]);
  }

  /** Steps the rate down when redraws are slow; freezes the field when the lowest rate is still slow. */
  function govern() {
    const slow = (costs.length >= SAMPLES && median(costs) > SLOW_MEDIAN_MS) || lateStrikes >= LATE_STRIKES;
    if (!slow) return;
    if (rateIndex < RATES.length - 1) rateIndex += 1;
    else frozen = true;
    costs.length = 0;
    lateStrikes = 0;
  }

  function tick() {
    timer = undefined;
    const now = performance.now();
    const interval = 1000 / RATES[rateIndex];
    const gap = now - lastTick;
    lastTick = now;
    if (gap - interval > LATE_MS) lateStrikes += 1;
    else lateStrikes = 0;
    clock += Math.min(gap, 1000) / 1000;

    const start = performance.now();
    draw();
    costs.push(performance.now() - start);
    if (costs.length > SAMPLES) costs.shift();
    govern();
    arm();
  }

  function poke() {
    // Any input stops star work at once; the canvas keeps its last frame.
    inputIdle = false;
    clearTimeout(timer);
    timer = undefined;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      inputIdle = true;
      arm();
    }, IDLE_AFTER_MS);
  }

  function resize() {
    const oldWidth = width;
    const oldHeight = height;
    const newWidth = Math.max(1, Math.round(canvas.clientWidth));
    const newHeight = Math.max(1, Math.round(canvas.clientHeight));
    if (newWidth === oldWidth && newHeight === oldHeight) return;
    // Move each star to where it is now, rescale that position, then add or drop stars to the new count.
    for (const star of stars) {
      star.x0 = (wrap(star.x0 + star.vx * clock, oldWidth) * newWidth) / oldWidth;
      star.y0 = (wrap(star.y0 + star.vy * clock, oldHeight) * newHeight) / oldHeight;
    }
    width = newWidth;
    height = newHeight;
    canvas.width = width;
    canvas.height = height;
    const total = starCount(width, height);
    if (stars.length > total) {
      stars.length = total;
    } else {
      while (stars.length < total) stars.push(makeStar(width, height, layerFor(Math.random()), false));
    }
    draw();
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }

  function onBlur() {
    blurred = true;
    arm();
  }

  function onFocus() {
    blurred = false;
    arm();
  }

  function onVisibility() {
    arm();
  }

  const inputEvents = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'scroll'] as const;
  const capture = { capture: true, passive: true } as const;
  for (const name of inputEvents) window.addEventListener(name, poke, capture);
  window.addEventListener('resize', onResize);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);

  size();
  fillStars();
  draw();
  arm();

  return {
    poke,
    stop() {
      clearTimeout(timer);
      clearTimeout(resumeTimer);
      clearTimeout(resizeTimer);
      for (const name of inputEvents) window.removeEventListener(name, poke, capture);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

export function Starfield({ enabled }: { enabled: boolean }) {
  const resolved = useTheme((s) => s.resolved);
  const active = enabled && resolved === 'dark';
  const reduceMotion = useReducedMotion() ?? false;
  const { pathname } = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<Field | null>(null);

  // A route change is user activity: the stars pause like they do for any input.
  useEffect(() => {
    fieldRef.current?.poke();
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const field = startStarfield(canvas, reduceMotion);
    fieldRef.current = field;
    return () => {
      fieldRef.current = null;
      field.stop();
    };
  }, [active, reduceMotion]);

  if (!active) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="star-field" />;
}
