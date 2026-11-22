import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTheme } from '@/app/theme';

/*
 * Still sky: one static canvas of stars behind everything, drawn once on mount and again after a resize or a theme
 * change. On top of it sit about ten CSS opacity twinkles and a rare shooting star. Nothing drifts, so a full-window
 * repaint never happens on a timer. Both themes: white stars on the night sky, warm specks and ember sparks on paper
 * (colours, alpha scale and density come from the --star-* tokens). Reduced motion keeps the static canvas only.
 */

interface LayerSpec {
  share: number;
  radius: number;
  /** Random alpha range (far to near). */
  alpha: [number, number];
}

const LAYERS: LayerSpec[] = [
  { share: 0.55, radius: 0.5, alpha: [0.14, 0.22] },
  { share: 0.3, radius: 0.9, alpha: [0.18, 0.27] },
  { share: 0.15, radius: 1.3, alpha: [0.22, 0.32] },
];

/** One star per this many CSS px squared (about 300 on 1920 x 1080). */
const PX_PER_STAR = 7000;
const WARM_SHARE = 0.15;
const RESIZE_DEBOUNCE_MS = 200;

const TWINKLE_COUNT = 10;
const TWINKLE_MIN_S = 5;
const TWINKLE_MAX_S = 9;

const SHOOT_MIN_MS = 30_000;
const SHOOT_MAX_MS = 60_000;
const SHOOT_DURATION_MS = 900;
const SHOOT_DISTANCE_PX = 320;
const SHOOT_ANGLE_DEG = 25;

function layerFor(roll: number): LayerSpec {
  if (roll < LAYERS[0].share) return LAYERS[0];
  if (roll < LAYERS[0].share + LAYERS[1].share) return LAYERS[1];
  return LAYERS[2];
}

/** A unitless number token (e.g. --star-alpha: 0.8). Missing or invalid falls back to 1, the dark-sky value. */
function tokenNumber(styles: CSSStyleDeclaration, name: string): number {
  const value = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function paint(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const styles = getComputedStyle(document.documentElement);
  const base = styles.getPropertyValue('--star-base').trim() || '#ffffff';
  const warm = styles.getPropertyValue('--star-warm').trim() || '#fff4ea';
  const alphaScale = tokenNumber(styles, '--star-alpha');
  const density = tokenNumber(styles, '--star-density');
  ctx.clearRect(0, 0, width, height);
  const total = Math.round(((width * height) / PX_PER_STAR) * density);
  for (let i = 0; i < total; i += 1) {
    const layer = layerFor(Math.random());
    const [alphaMin, alphaMax] = layer.alpha;
    ctx.globalAlpha = (alphaMin + Math.random() * (alphaMax - alphaMin)) * alphaScale;
    ctx.fillStyle = Math.random() < WARM_SHARE ? warm : base;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, layer.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function makeTwinkles(): CSSProperties[] {
  return Array.from({ length: TWINKLE_COUNT }, () => {
    const duration = TWINKLE_MIN_S + Math.random() * (TWINKLE_MAX_S - TWINKLE_MIN_S);
    return {
      left: `${(Math.random() * 100).toFixed(2)}%`,
      top: `${(Math.random() * 100).toFixed(2)}%`,
      animationDuration: `${duration.toFixed(2)}s`,
      animationDelay: `${(-Math.random() * duration).toFixed(2)}s`,
    };
  });
}

interface Motion {
  /** Wrapper holding the twinkles and the shooting star; gets `is-paused` while the window is hidden or blurred. */
  layer: HTMLElement;
  shoot: HTMLElement;
}

/** Draws the field and, when motion is allowed, runs the shooting-star timer. Returns the cleanup. */
function startSky(canvas: HTMLCanvasElement, motion: Motion | null): () => void {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let blurred = false;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let shootTimer: ReturnType<typeof setTimeout> | undefined;
  let shootAnim: Animation | undefined;

  function redraw() {
    if (!ctx) return;
    const w = Math.max(1, Math.round(canvas.clientWidth));
    const h = Math.max(1, Math.round(canvas.clientHeight));
    if (w !== width || h !== height) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
    }
    paint(ctx, w, h);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redraw, RESIZE_DEBOUNCE_MS);
  }

  function isPaused(): boolean {
    return document.hidden || blurred;
  }

  function fireShoot() {
    shootTimer = undefined;
    if (!motion || isPaused()) return;
    const { shoot } = motion;
    const x = Math.random() * width;
    const y = Math.random() * height * 0.6;
    const rad = (SHOOT_ANGLE_DEG * Math.PI) / 180;
    const dx = Math.cos(rad) * SHOOT_DISTANCE_PX;
    const dy = Math.sin(rad) * SHOOT_DISTANCE_PX;
    shoot.style.left = `${x.toFixed(1)}px`;
    shoot.style.top = `${y.toFixed(1)}px`;
    shootAnim?.cancel();
    shootAnim = shoot.animate(
      [
        { transform: `translate3d(0, 0, 0) rotate(${SHOOT_ANGLE_DEG}deg)`, opacity: 0 },
        { transform: `translate3d(${dx / 4}px, ${dy / 4}px, 0) rotate(${SHOOT_ANGLE_DEG}deg)`, opacity: 0.85, offset: 0.15 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${SHOOT_ANGLE_DEG}deg)`, opacity: 0 },
      ],
      { duration: SHOOT_DURATION_MS, easing: 'ease-out' },
    );
    scheduleShoot();
  }

  function scheduleShoot() {
    if (!motion || shootTimer !== undefined || isPaused()) return;
    const wait = SHOOT_MIN_MS + Math.random() * (SHOOT_MAX_MS - SHOOT_MIN_MS);
    shootTimer = setTimeout(fireShoot, wait);
  }

  /** Applies the paused state: twinkles freeze and the shooting-star timer stops, or both resume. */
  function sync() {
    const paused = isPaused();
    motion?.layer.classList.toggle('is-paused', paused);
    if (paused) {
      clearTimeout(shootTimer);
      shootTimer = undefined;
    } else {
      scheduleShoot();
    }
  }

  function onBlur() {
    blurred = true;
    sync();
  }

  function onFocus() {
    blurred = false;
    sync();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', sync);

  redraw();
  sync();

  return () => {
    clearTimeout(resizeTimer);
    clearTimeout(shootTimer);
    shootAnim?.cancel();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', sync);
  };
}

export function Starfield() {
  // Read so the effect re-runs (and the canvas repaints with the new --star-* colours) when the theme changes.
  // theme.ts toggles the `.dark` class before it updates `resolved`, so the tokens are current when the effect runs.
  const resolved = useTheme((s) => s.resolved);
  const reduceMotion = useReducedMotion() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const shootRef = useRef<HTMLDivElement>(null);
  const [twinkles] = useState(makeTwinkles);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layer = layerRef.current;
    const shoot = shootRef.current;
    const motion = !reduceMotion && layer && shoot ? { layer, shoot } : null;
    return startSky(canvas, motion);
  }, [resolved, reduceMotion]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="star-field" />
      {!reduceMotion && (
        <div ref={layerRef} className="star-twinkles" aria-hidden="true">
          {twinkles.map((style, i) => (
            <span key={i} className="star-twinkle" style={style} />
          ))}
          <div ref={shootRef} className="star-shoot" />
        </div>
      )}
    </>
  );
}
