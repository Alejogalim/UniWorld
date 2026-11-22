import type { Continent } from '@/core/contracts';
import continentJson from '../../../data/country-continent.json';
import countriesUrl from '../../../data/countries.geojson?url';

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

/** Loads the bundled Natural Earth 110m countries (about 170 KB). Only the globe needs it. */
export async function loadCountries(): Promise<CountryFeature[]> {
  const res = await fetch(countriesUrl);
  if (!res.ok) throw new Error(`Could not load the country map (${res.status}).`);
  const collection = (await res.json()) as { features: CountryFeature[] };
  return collection.features;
}
