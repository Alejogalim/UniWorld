import { useEffect, useRef, useState } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Continent, UiLang } from '@/core/contracts';
import { countryName } from '@/ui/data/countries';
import { continentOf, loadCountries, type CountryFeature, type GeoView } from './geo';

export interface GlobeViewProps {
  /** ISO codes of the selected countries. */
  selected: Set<string>;
  highlightContinent: Continent | null;
  onToggleCountry: (iso: string) => void;
  /** Changes identity to request a camera move. */
  flyTo: GeoView | null;
  compact: boolean;
  theme: 'light' | 'dark';
}

interface Palette {
  ocean: string;
  land: string;
  landSide: string;
  hairline: string;
  ink: string;
  signal: string;
  veil: string;
}

/** Turns any CSS color (including oklch) into #rrggbb by letting the canvas normalize it. */
function cssToHex(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#000000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return '#' + [16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('');
}

/** Reads the app tokens so the globe always matches the active theme. */
function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => cssToHex(styles.getPropertyValue(name).trim());
  const land = token('--land');
  return {
    ocean: token('--background'),
    land,
    landSide: shade(land, 0.82),
    hairline: token('--hairline'),
    ink: token('--foreground'),
    signal: token('--signal'),
    veil: shade(land, 0.9),
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The one expressive object in the Finder (DESIGN.md "The Globe"). Built once per mount;
 * accessors are re-applied from refs so hover, selection and theme never recreate the scene.
 */
export default function GlobeView({
  selected,
  highlightContinent,
  onToggleCountry,
  flyTo,
  compact,
  theme,
}: GlobeViewProps) {
  const { t, i18n } = useTranslation('finder');
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mutable view state read by the accessors (so re-applying never needs new closures).
  const state = useRef({
    selected,
    highlightContinent,
    hovered: null as string | null,
    pointerInside: false,
    palette: null as Palette | null,
    uiLang: i18n.language as UiLang,
    onToggleCountry,
    reduceMotion,
  });
  state.current.selected = selected;
  state.current.highlightContinent = highlightContinent;
  state.current.onToggleCountry = onToggleCountry;
  state.current.reduceMotion = reduceMotion;
  state.current.uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  const isOn = (iso: string) => {
    const s = state.current;
    return (
      s.selected.has(iso) ||
      (s.highlightContinent !== null && continentOf(iso) === s.highlightContinent)
    );
  };

  const applyStyles = () => {
    const globe = globeRef.current;
    const s = state.current;
    if (!globe || !s.palette) return;
    const p = s.palette;
    globe
      .polygonAltitude((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        return iso === s.hovered ? 0.03 : 0.006;
      })
      .polygonCapColor((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        return isOn(iso) ? p.veil : p.land;
      })
      .polygonSideColor((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        return isOn(iso) ? shade(p.veil, 0.82) : p.landSide;
      })
      .polygonStrokeColor((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        if (iso === s.hovered) return p.ink;
        return isOn(iso) ? p.signal : p.hairline;
      });
  };

  // Build the scene once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const globe = new Globe(el)
      .backgroundColor('rgba(0,0,0,0)')
      .showGraticules(true)
      .atmosphereAltitude(0.12)
      .polygonLabel((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        const style =
          'background:var(--panel);color:var(--foreground);border:1px solid var(--hairline);border-radius:2px;padding:4px 8px;font:500 12px/1.3 var(--font-sans);box-shadow:var(--shadow-float);white-space:nowrap';
        return `<div style="${style}">${escapeHtml(countryName(iso, state.current.uiLang))}</div>`;
      })
      .onPolygonHover((polygon: object | null) => {
        const iso = polygon ? (polygon as CountryFeature).properties.iso : null;
        state.current.hovered = iso;
        syncRotation();
        applyStyles();
        el.style.cursor = iso ? 'pointer' : '';
      })
      .onPolygonClick((polygon: object) => {
        state.current.onToggleCountry((polygon as CountryFeature).properties.iso);
      });

    globe.controls().autoRotateSpeed = 0.35;

    // Rotation pauses while the pointer is over the globe or a country is hovered.
    const syncRotation = () => {
      const s = state.current;
      globe.controls().autoRotate = !s.reduceMotion && !s.pointerInside && s.hovered === null;
    };
    const onEnter = () => {
      state.current.pointerInside = true;
      syncRotation();
    };
    const onLeave = () => {
      state.current.pointerInside = false;
      syncRotation();
    };
    syncRotation();
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      globe.width(Math.floor(width)).height(Math.floor(height));
    });
    resize.observe(el);

    globeRef.current = globe;
    return () => {
      resize.disconnect();
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      globe.controls().autoRotate = false;
      const destroy = (globe as unknown as { _destructor?: () => void })._destructor;
      destroy?.call(globe);
      el.replaceChildren();
      globeRef.current = null;
    };
  }, []);

  // Load the country geometry (lazy chunk only).
  useEffect(() => {
    let cancelled = false;
    loadCountries()
      .then((features) => {
        if (!cancelled) setCountries(features);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Materials and polygons, and re-skin on theme change.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !countries) return;
    state.current.palette = readPalette();
    const p = state.current.palette;
    // A matte surface: no specular highlight on the sphere.
    const material = globe.globeMaterial() as unknown as {
      color: { set: (hex: string) => void };
      specular: { setScalar: (value: number) => void };
      shininess: number;
    };
    material.color.set(p.ocean);
    material.specular.setScalar(0);
    material.shininess = 0;
    globe.polygonsData(countries);
    applyStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, theme]);

  // Re-apply styles whenever selection or continent highlight changes.
  useEffect(() => {
    applyStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, highlightContinent]);

  // Camera moves.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !flyTo) return;
    globe.pointOfView(flyTo, state.current.reduceMotion ? 0 : 900);
  }, [flyTo]);

  // Compact mode keeps the sphere a little further away inside the 380px column.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ altitude: compact ? 2.4 : 2.1 }, 0);
  }, [compact]);

  return (
    <div className="relative aspect-square w-full" aria-label={t('globe.label')} role="application">
      <div ref={containerRef} className="absolute inset-0" />
      {loadError && (
        <p role="alert" className="absolute inset-x-0 bottom-2 text-center text-sm text-chart-grey">
          {loadError}
        </p>
      )}
    </div>
  );
}
