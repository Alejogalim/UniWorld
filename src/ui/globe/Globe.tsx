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
  /** Graticule lines: the hairline on paper, faint on black. */
  graticule: string;
  hairline: string;
  ink: string;
  signal: string;
  atmosphere: string;
  /** Atmosphere shell thickness, set with the colour so the two change together with the theme. */
  atmosphereAltitude: number;
}

/** The globe tokens are 6-digit hex in src/index.css (shade and mix depend on it), so the value passes through. */
function cssToHex(color: string): string {
  return color.trim();
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return '#' + [16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('');
}

/** Linear blend of two #rrggbb colours; t = 0 keeps a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const ca = (na >> shift) & 0xff;
    const cb = (nb >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t);
  };
  return '#' + [16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('');
}

/** Reads the app tokens so the globe always matches the active theme. */
function readPalette(theme: 'light' | 'dark'): Palette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => cssToHex(styles.getPropertyValue(name).trim());
  const land = token('--land');
  const ocean = token('--globe-ocean');
  const ember = token('--ember-1');
  const hairline = token('--hairline');
  return {
    ocean,
    land,
    landSide: shade(land, 0.82),
    graticule: theme === 'dark' ? mix(ocean, hairline, 0.6) : hairline,
    hairline,
    ink: token('--foreground'),
    signal: token('--signal'),
    // Dark: a faint ember tint on black. Light: a soft peach ember rim on paper (plan 26).
    atmosphere: theme === 'dark' ? mix(ocean, ember, 0.85) : mix(ocean, ember, 0.35),
    atmosphereAltitude: theme === 'dark' ? 0.2 : 0.12,
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
    /** Key of the styles last sent to the globe; the setters run only when it changes. */
    appliedKey: '',
    /** Pending requestAnimationFrame for a style update, 0 when none. */
    frame: 0,
    /** Set once the scene exists: re-applies styles now, and schedules them for the next frame. */
    applyNow: (() => {}) as () => void,
    schedule: (() => {}) as () => void,
  });
  state.current.selected = selected;
  state.current.highlightContinent = highlightContinent;
  state.current.onToggleCountry = onToggleCountry;
  state.current.reduceMotion = reduceMotion;
  state.current.uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  // Build the scene once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const s = state.current;

    const isOn = (iso: string) =>
      s.selected.has(iso) || (s.highlightContinent !== null && continentOf(iso) === s.highlightContinent);
    // Accessors are created once here and read everything from `s`, so they are never re-created on render.
    const isoOf = (d: object) => (d as CountryFeature).properties.iso;
    const altitude = (d: object) => (isoOf(d) === s.hovered ? 0.03 : 0.006);
    const capColor = (d: object) => (isOn(isoOf(d)) ? s.palette?.signal : s.palette?.land) ?? 'transparent';
    const sideColor = (d: object) =>
      (isOn(isoOf(d)) ? (s.palette ? shade(s.palette.signal, 0.82) : undefined) : s.palette?.landSide) ??
      'transparent';
    const strokeColor = (d: object) => {
      const iso = isoOf(d);
      if (iso === s.hovered) return s.palette?.ink ?? 'transparent';
      return (isOn(iso) ? s.palette?.signal : s.palette?.hairline) ?? 'transparent';
    };

    // Re-sends the accessors only when the hovered id, the selection or the continent highlight changed.
    const applyNow = () => {
      s.frame = 0;
      const globe = globeRef.current;
      if (!globe || !s.palette) return;
      const key = [s.hovered ?? '', [...s.selected].sort().join(','), s.highlightContinent ?? ''].join('|');
      if (key === s.appliedKey) return;
      s.appliedKey = key;
      globe
        .polygonAltitude(altitude)
        .polygonCapColor(capColor)
        .polygonSideColor(sideColor)
        .polygonStrokeColor(strokeColor);
    };
    // Hover and selection changes land on the next frame, so a burst of pointer moves costs one update.
    const schedule = () => {
      if (s.frame) return;
      s.frame = requestAnimationFrame(applyNow);
    };
    s.applyNow = applyNow;
    s.schedule = schedule;

    const globe = new Globe(el)
      .backgroundColor('rgba(0,0,0,0)')
      .showGraticules(true)
      .atmosphereAltitude(0.12)
      .polygonsTransitionDuration(0)
      .polygonCapCurvatureResolution(10)
      .polygonAltitude(altitude)
      .polygonCapColor(capColor)
      .polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor)
      .polygonLabel((d: object) => {
        const iso = (d as CountryFeature).properties.iso;
        const style =
          'background:var(--panel);color:var(--foreground);border:1px solid var(--hairline);border-radius:20px;padding:6px 12px;font:500 12px/1.3 "Inter Variable", system-ui, sans-serif;box-shadow:var(--shadow-float);white-space:nowrap';
        return `<div style="${style}">${escapeHtml(countryName(iso, state.current.uiLang))}</div>`;
      })
      .onPolygonHover((polygon: object | null) => {
        const iso = polygon ? (polygon as CountryFeature).properties.iso : null;
        state.current.hovered = iso;
        syncRotation();
        schedule();
        el.style.cursor = iso ? 'pointer' : '';
      })
      .onPolygonClick((polygon: object) => {
        state.current.onToggleCountry((polygon as CountryFeature).properties.iso);
      });

    globe.controls().autoRotateSpeed = 0.35;
    // The software-composited WebView gains nothing from a sharper globe; 1 keeps the WebGL fill cost down.
    globe.renderer().setPixelRatio(1);

    // No rendering while the window is hidden; the scene resumes on return.
    const onVisibility = () => {
      if (document.hidden) globe.pauseAnimation();
      else globe.resumeAnimation();
    };
    if (document.hidden) globe.pauseAnimation();
    document.addEventListener('visibilitychange', onVisibility);

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
      globe.renderer().setPixelRatio(1);
    });
    resize.observe(el);

    globeRef.current = globe;
    return () => {
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(s.frame);
      s.frame = 0;
      s.appliedKey = '';
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      globe.controls().autoRotate = false;
      // Browsers cap live WebGL contexts; the globe remounts often, so release the context explicitly.
      globe.renderer().forceContextLoss();
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
    state.current.palette = readPalette(theme);
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
    globe.atmosphereColor(p.atmosphere);
    globe.atmosphereAltitude(p.atmosphereAltitude);
    // Graticules are plain line segments in the scene; colour them with the hairline token.
    const graticule = globe
      .scene()
      .children.find((child: { type?: string }) => child.type === 'LineSegments') as
      | { material: { color: { set: (hex: string) => void } } }
      | undefined;
    graticule?.material.color.set(p.graticule);
    globe.polygonsData(countries);
    state.current.appliedKey = '';
    state.current.applyNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, theme]);

  // Re-apply styles whenever selection or continent highlight changes.
  useEffect(() => {
    state.current.schedule();
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
