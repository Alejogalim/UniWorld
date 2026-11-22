import { useEffect, useRef } from 'react';
import { useTheme } from '@/app/theme';

/** Plan 16 starfield: one fixed canvas behind every screen, dark theme only. */

interface Star {
  x: number;
  y: number;
  /** Radius in CSS px: 0.5, 0.9 or 1.4 by depth layer; bright stars are 1.6. */
  r: number;
  /** Drift speed in px per second toward the upper-left. */
  speed: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  warm: boolean;
  bright: boolean;
}

const LAYERS = [
  { r: 0.5, speed: 1.5, weight: 0.55 },
  { r: 0.9, speed: 3, weight: 0.3 },
  { r: 1.4, speed: 5, weight: 0.15 },
];
const MAX_BRIGHT = 4;
const FRAME_MS = 1000 / 30;
const MAX_DPR = 2;
const EDGE_FADE = 40;
const TWINKLE_DEPTH = 0.2;

/*
 * Text safety (review 17, item 4). Grey text stays at 4.5:1 over black only while a star pixel is at or below
 * about 15% white. So stars are capped at TEXT_CAP everywhere text can sit (rail and content column), and the
 * right gutter beyond the 1120px column, which has no text, returns to FULL_CAP. The rail is held to the text
 * cap rather than the review's 0.30: grey nav labels would otherwise measure 2.6:1 over a star pixel.
 */
const TEXT_CAP = 0.15;
const FULL_CAP = 0.45;
/** Content column: 220px rail + 1120px max width - 48px page margin. Text never reaches past this. */
const TEXT_RIGHT = 1292;
const SAFE_FROM = 200;
const SAFE_TO = 260;
const GUTTER_FROM = TEXT_RIGHT + 40;
const GUTTER_RAMP = 60;
/** Bright-star glow sprite: 6px radius, so a 12px square. */
const GLOW_PX = 12;

function starCount(width: number, height: number): number {
  return Math.min(110, Math.max(40, Math.round((width * height) / 26000)));
}

function makeStar(width: number, height: number, brightAllowed: boolean): Star {
  const roll = Math.random();
  let acc = 0;
  let layer = LAYERS[LAYERS.length - 1];
  for (const candidate of LAYERS) {
    acc += candidate.weight;
    if (roll < acc) {
      layer = candidate;
      break;
    }
  }
  // The few brightest stars sit in the nearest layer, as the large star in the reference does.
  const isBright = brightAllowed && layer.r === 1.4 && Math.random() < 0.5;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: isBright ? 1.6 : layer.r,
    speed: layer.speed,
    alpha: isBright ? 0.6 : 0.08 + Math.random() * 0.3,
    twinkleSpeed: (2 * Math.PI) / (4 + Math.random() * 5),
    phase: Math.random() * Math.PI * 2,
    warm: !isBright && Math.random() < 0.15,
    bright: isBright,
  };
}

/**
 * Brings `stars` to the count for this size. Existing stars are kept, so a resize never re-rolls the field:
 * extra stars are added at random and surplus ones are dropped from the end.
 */
function fitStars(stars: Star[], width: number, height: number) {
  const target = starCount(width, height);
  stars.length = Math.min(stars.length, target);
  let bright = stars.filter((star) => star.bright).length;
  while (stars.length < target) {
    const star = makeStar(width, height, bright < MAX_BRIGHT);
    if (star.bright) bright += 1;
    stars.push(star);
  }
}

function edgeFade(pos: number, size: number): number {
  return Math.min(1, pos / EDGE_FADE, (size - pos) / EDGE_FADE);
}

function smooth01(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/**
 * The alpha cap at this x, and how much of the text zone the star sits in (0 to 1). The cap eases between
 * the two zones over a smooth ramp, so a star drifting across the edge never pops.
 */
function starCap(x: number): { cap: number; textness: number } {
  const text = smooth01((x - SAFE_FROM) / (SAFE_TO - SAFE_FROM));
  const gutter = smooth01((x - GUTTER_FROM) / GUTTER_RAMP);
  return { cap: TEXT_CAP + (FULL_CAP - TEXT_CAP) * gutter, textness: text * (1 - gutter) };
}

/** The bright-star glow, pre-rendered once per size: the star colour fading to transparent. */
function makeGlowSprite(color: string, dpr: number): HTMLCanvasElement {
  const px = Math.ceil(GLOW_PX * dpr);
  const sprite = document.createElement('canvas');
  sprite.width = px;
  sprite.height = px;
  const ctx = sprite.getContext('2d');
  if (ctx) {
    const mid = px / 2;
    const glow = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, px, px);
  }
  return sprite;
}

interface StarColors {
  /** Ink in dark mode (white). */
  base: string;
  /** --star-warm, the barely warm tint on about 15% of stars. */
  warm: string;
}

function draw(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  time: number,
  colors: StarColors,
  glow: HTMLCanvasElement | null,
) {
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    ctx.globalAlpha = 1;
    const twinkle = 1 + TWINKLE_DEPTH * Math.sin(time * star.twinkleSpeed + star.phase);
    const fade = Math.max(0, Math.min(edgeFade(star.x, width), edgeFade(star.y, height)));
    const { cap, textness } = starCap(star.x);
    const alpha = Math.min(1, star.alpha * twinkle, cap) * fade;
    if (alpha <= 0) continue;
    const color = star.warm ? colors.warm : colors.base;
    if (star.bright && glow && textness < 1) {
      // The glow sprite is drawn at its CSS size; its strength comes from globalAlpha and fades out over text.
      ctx.globalAlpha = alpha * 0.45 * (1 - textness);
      ctx.drawImage(glow, star.x - GLOW_PX / 2, star.y - GLOW_PX / 2, GLOW_PX, GLOW_PX);
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function Starfield({ enabled }: { enabled: boolean }) {
  const resolved = useTheme((s) => s.resolved);
  const active = enabled && resolved === 'dark';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Star colours come from the dark tokens (--foreground, --star-warm), not literals.
    const styles = getComputedStyle(document.documentElement);
    const colors: StarColors = {
      base: styles.getPropertyValue('--foreground').trim() || 'white',
      warm: styles.getPropertyValue('--star-warm').trim() || 'white',
    };
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let glow: HTMLCanvasElement | null = null;
    let frame = 0;
    let lastDraw = 0;
    let elapsed = 0;
    let resizeTimer: number | undefined;

    const size = () => {
      const prevWidth = width;
      const prevHeight = height;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glow = makeGlowSprite(colors.base, dpr);
      // Rescale the existing stars to the new size so the field stays put; only the count changes.
      if (prevWidth > 0 && prevHeight > 0) {
        const sx = width / prevWidth;
        const sy = height / prevHeight;
        for (const star of stars) {
          star.x *= sx;
          star.y *= sy;
        }
      }
      fitStars(stars, width, height);
    };

    const step = (now: number) => {
      frame = 0;
      // A 4 ms tolerance: 60 Hz frames land 33.3 ms apart, and rounding must not skip them down to 20 fps.
      if (now - lastDraw < FRAME_MS - 4) {
        frame = requestAnimationFrame(step);
        return;
      }
      const dt = lastDraw === 0 ? 0 : Math.min(now - lastDraw, 200) / 1000;
      lastDraw = now;
      elapsed += dt;
      for (const star of stars) {
        star.x -= star.speed * 0.8 * dt;
        star.y -= star.speed * 0.6 * dt;
        if (star.x < 0) star.x += width;
        if (star.y < 0) star.y += height;
      }
      draw(ctx, stars, width, height, elapsed, colors, glow);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (document.hidden) return;
      if (reduceMotion.matches) {
        draw(ctx, stars, width, height, 0, colors, glow);
        return;
      }
      lastDraw = 0;
      frame = requestAnimationFrame(step);
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        size();
        start();
      }, 150);
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        start();
      }
    };

    size();
    start();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    reduceMotion.addEventListener('change', start);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMotion.removeEventListener('change', start);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-1 will-change-transform"
    />
  );
}
