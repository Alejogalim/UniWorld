import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTheme } from '@/app/theme';

/*
 * Plan 18 starfield: stars are drawn once into tiles (an offscreen canvas, baked on mount and on theme change)
 * and the tiles drift by CSS transform on the compositor. No per-frame JS, no canvas in the DOM.
 * Dark theme only. The keyframes and layer rules live in src/index.css (.star-field, .star-layer, .star-twinkle).
 */

interface LayerSpec {
  /** Tile size in CSS px; the drift moves the layer by exactly one tile, so the loop is seamless. */
  tile: number;
  /** Seconds per tile: tile / speed (px per second), so speeds are about 2, 3.5 and 5 px/s. */
  duration: number;
  /** Share of the field's stars on this layer. */
  share: number;
  radius: number;
  /** Bright stars on this layer (radius 1.3, with a baked glow). */
  bright: number;
  /** Random alpha range for the base and warm stars on this layer. */
  alpha: [number, number];
}

const LAYERS: LayerSpec[] = [
  { tile: 512, duration: 256, share: 0.55, radius: 0.5, bright: 0, alpha: [0.14, 0.22] },
  { tile: 640, duration: 183, share: 0.3, radius: 0.8, bright: 0, alpha: [0.18, 0.27] },
  { tile: 768, duration: 154, share: 0.15, radius: 1.2, bright: 6, alpha: [0.22, 0.32] },
];

/** One star per this many CSS px², summed over the layers (about 300 on 1920 x 1080). */
const PX_PER_STAR = 7000;
/** Bright cores are fixed at this alpha; their 5px glow is drawn at a proportional alpha. */
const BRIGHT_ALPHA = 0.6;
const BRIGHT_RADIUS = 1.3;
const GLOW_RADIUS = 5;
const GLOW_STRENGTH = 0.45;
const WARM_SHARE = 0.15;

/** Two twinkle layers: one tile of sparse stars each, faded by opacity only. Baked alpha is the peak. */
const TWINKLE_TILE = 1024;
const TWINKLE_STARS = 25;
const TWINKLE_ALPHA_MIN = 0.2;
const TWINKLE_ALPHA_MAX = 0.4;
const TWINKLES = [
  { duration: 7, delay: 0 },
  { duration: 8.5, delay: -3.5 },
];

const MAX_DPR = 2;

interface BakedStar {
  x: number;
  y: number;
  r: number;
  alpha: number;
  warm: boolean;
  glow: boolean;
}

interface Field {
  layers: { key: string; tile: number; duration: number; image: string }[];
  twinkles: { key: string; tile: number; duration: number; delay: number; image: string }[];
}

interface StarColors {
  /** --foreground in dark mode (white). */
  base: string;
  /** --star-warm, the barely warm tint on about 15% of stars. */
  warm: string;
}

function randomStar(size: number, radius: number, alpha: number, warm: boolean, glow: boolean): BakedStar {
  return { x: Math.random() * size, y: Math.random() * size, r: radius, alpha, warm, glow };
}

function starsForTile(spec: LayerSpec): BakedStar[] {
  const count = Math.round((spec.share * spec.tile * spec.tile) / PX_PER_STAR);
  const [alphaMin, alphaMax] = spec.alpha;
  const stars: BakedStar[] = [];
  for (let i = 0; i < count; i += 1) {
    const bright = i < spec.bright;
    const alpha = bright ? BRIGHT_ALPHA : alphaMin + Math.random() * (alphaMax - alphaMin);
    const warm = !bright && Math.random() < WARM_SHARE;
    stars.push(
      bright
        ? randomStar(spec.tile, BRIGHT_RADIUS, alpha, false, true)
        : randomStar(spec.tile, spec.radius, alpha, warm, false),
    );
  }
  return stars;
}

function twinkleStars(): BakedStar[] {
  const stars: BakedStar[] = [];
  for (let i = 0; i < TWINKLE_STARS; i += 1) {
    const alpha = TWINKLE_ALPHA_MIN + Math.random() * (TWINKLE_ALPHA_MAX - TWINKLE_ALPHA_MIN);
    stars.push(randomStar(TWINKLE_TILE, 0.8, alpha, Math.random() < WARM_SHARE, false));
  }
  return stars;
}

/**
 * Draws one tile. Every star is also drawn at the four neighbouring offsets when it sits near an edge, so the
 * tile wraps with no seam. Returns a PNG data URL for background-image.
 */
function bakeTile(size: number, dpr: number, stars: BakedStar[], colors: StarColors): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const star of stars) {
    const color = star.warm ? colors.warm : colors.base;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const x = star.x + ox;
        const y = star.y + oy;
        if (x < -GLOW_RADIUS || x > size + GLOW_RADIUS || y < -GLOW_RADIUS || y > size + GLOW_RADIUS) continue;
        if (star.glow) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
          glow.addColorStop(0, colors.base);
          glow.addColorStop(1, 'transparent');
          ctx.globalAlpha = star.alpha * GLOW_STRENGTH;
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, GLOW_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  return canvas.toDataURL('image/png');
}

function readColors(): StarColors {
  // Star colours come from the dark tokens (--foreground, --star-warm), not literals.
  const styles = getComputedStyle(document.documentElement);
  return {
    base: styles.getPropertyValue('--foreground').trim() || '#ffffff',
    warm: styles.getPropertyValue('--star-warm').trim() || '#ffffff',
  };
}

function bakeField(): Field {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const colors = readColors();
  return {
    layers: LAYERS.map((spec, index) => ({
      key: `layer-${index}`,
      tile: spec.tile,
      duration: spec.duration,
      image: bakeTile(spec.tile, dpr, starsForTile(spec), colors),
    })),
    twinkles: TWINKLES.map((spec, index) => ({
      key: `twinkle-${index}`,
      tile: TWINKLE_TILE,
      duration: spec.duration,
      delay: spec.delay,
      image: bakeTile(TWINKLE_TILE, dpr, twinkleStars(), colors),
    })),
  };
}

export function Starfield({ enabled }: { enabled: boolean }) {
  const resolved = useTheme((s) => s.resolved);
  const active = enabled && resolved === 'dark';
  const rootRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<Field | null>(null);

  // Bake once per activation (mount in dark, or the switch from light to dark). Tiles repeat, so a resize
  // needs no re-bake: the layers are oversized and the pattern is infinite.
  useEffect(() => {
    if (!active) {
      setField(null);
      return;
    }
    setField(bakeField());
  }, [active]);

  // Pause the drift while the window is hidden. The class is toggled on the root, not React state.
  useEffect(() => {
    const root = rootRef.current;
    if (!field || !root) return;
    const onVisibility = () => root.classList.toggle('is-paused', document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [field]);

  if (!active || !field) return null;
  return (
    <div ref={rootRef} aria-hidden="true" className="star-field">
      {field.layers.map((layer) => (
        <div
          key={layer.key}
          className="star-layer"
          style={
            {
              '--star-tile': `${layer.tile}px`,
              '--star-duration': `${layer.duration}s`,
              backgroundImage: `url(${layer.image})`,
            } as CSSProperties
          }
        />
      ))}
      {field.twinkles.map((layer) => (
        <div
          key={layer.key}
          className="star-twinkle"
          style={
            {
              '--star-tile': `${layer.tile}px`,
              '--star-duration': `${layer.duration}s`,
              animationDelay: `${layer.delay}s`,
              backgroundImage: `url(${layer.image})`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
