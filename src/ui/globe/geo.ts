import type { Continent } from '@/core/contracts';
import continentJson from '../../../data/country-continent.json';
import countriesUrl from '../../../data/countries.geojson?url';
import { FALLBACK_COUNTRY_VIEWS } from './countryFallback';

export const CONTINENTS: readonly Continent[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
];

export interface GeoView {
  lat: number;
  lng: number;
  altitude: number;
}

/** Hard-coded camera views for the continent chips (fly-to on click). */
export const CONTINENT_VIEWS: Record<Continent, GeoView> = {
  Africa: { lat: 2, lng: 20, altitude: 1.9 },
  Asia: { lat: 35, lng: 90, altitude: 1.9 },
  Europe: { lat: 52, lng: 14, altitude: 1.5 },
  'North America': { lat: 42, lng: -100, altitude: 2.0 },
  'South America': { lat: -16, lng: -60, altitude: 2.0 },
  Oceania: { lat: -25, lng: 140, altitude: 1.9 },
};

const continentByCode = continentJson as Record<string, Continent>;

/** Continent of an ISO 3166-1 alpha-2 code, or null (Antarctica and unknown codes). */
export function continentOf(iso: string): Continent | null {
  return continentByCode[iso.toUpperCase()] ?? null;
}

/** Every alpha-2 code that belongs to a continent, sorted. */
export function countriesIn(continent: Continent): string[] {
  return Object.entries(continentByCode)
    .filter(([, c]) => c === continent)
    .map(([code]) => code)
    .sort();
}

export interface CountryFeature {
  type: 'Feature';
  properties: { iso: string; name: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Normalizes a longitude to -180..180. */
function normalizeLng(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

/** Visits every [lng, lat] position in a Polygon or MultiPolygon coordinate tree. */
function eachPosition(coords: unknown, visit: (lng: number, lat: number) => void): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    visit(coords[0], coords[1]);
    return;
  }
  for (const child of coords) eachPosition(child, visit);
}

/**
 * Camera view that frames a country: bbox centre with an altitude from its span.
 * Countries crossing the antimeridian (Russia, Fiji) shift negative longitudes
 * before centring, then normalise back.
 */
export function countryView(feature: CountryFeature): GeoView {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  eachPosition(feature.geometry.coordinates, (lng, lat) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (minLat > maxLat || minLng > maxLng) return { lat: 0, lng: 0, altitude: 2.1 };

  if (maxLng - minLng > 180) {
    minLng = 180;
    maxLng = -180;
    eachPosition(feature.geometry.coordinates, (lng) => {
      const shifted = lng < 0 ? lng + 360 : lng;
      if (shifted < minLng) minLng = shifted;
      if (shifted > maxLng) maxLng = shifted;
    });
  }

  const span = Math.max(maxLng - minLng, maxLat - minLat);
  return {
    lat: (minLat + maxLat) / 2,
    lng: normalizeLng((minLng + maxLng) / 2),
    altitude: clamp(0.5 + span / 50, 0.45, 1.6),
  };
}

const viewCache = new Map<string, GeoView>();

/** Cached camera view for an ISO code, using the loaded country features. */
export function viewForCountry(iso: string, features: CountryFeature[]): GeoView | null {
  const code = iso.toUpperCase();
  const cached = viewCache.get(code);
  if (cached) return cached;
  const feature = features.find((f) => f.properties.iso === code);
  const view = feature ? countryView(feature) : (FALLBACK_COUNTRY_VIEWS[code] ?? null);
  if (!view) return null;
  viewCache.set(code, view);
  return view;
}

/** Loads the bundled Natural Earth 110m countries (about 170 KB). Only the globe needs it. */
export async function loadCountries(): Promise<CountryFeature[]> {
  const res = await fetch(countriesUrl);
  if (!res.ok) throw new Error(`Could not load the country map (${res.status}).`);
  const collection = (await res.json()) as { features: CountryFeature[] };
  return collection.features;
}
