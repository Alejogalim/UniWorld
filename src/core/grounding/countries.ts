import type { Continent } from '../contracts';
import { normalizeText } from '../normalize';

let regionNames: Intl.DisplayNames | null = null;
function display(): Intl.DisplayNames | null {
  if (regionNames) return regionNames;
  try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    regionNames = null;
  }
  return regionNames;
}

export function countryName(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return code;
  try {
    return display()?.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : null;
}

export function normalizeContinent(value: string | null | undefined): Continent | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  switch (normalized) {
    case 'africa':
      return 'Africa';
    case 'asia':
      return 'Asia';
    case 'europe':
      return 'Europe';
    case 'north america':
      return 'North America';
    case 'south america':
      return 'South America';
    case 'oceania':
    case 'australia':
    case 'australasia':
      return 'Oceania';
    default:
      return null;
  }
}

/** ROR uses continent_code; Design uses full names. */
export function continentFromCode(code: string | null | undefined): Continent | null {
  if (!code) return null;
  switch (code.trim().toUpperCase()) {
    case 'AF':
      return 'Africa';
    case 'AS':
      return 'Asia';
    case 'EU':
      return 'Europe';
    case 'NA':
      return 'North America';
    case 'SA':
      return 'South America';
    case 'OC':
      return 'Oceania';
    default:
      return null;
  }
}
