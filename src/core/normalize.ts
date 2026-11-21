/** Text, name and URL normalization shared by the matcher and quote checker. */

const COMBINING_MARKS = /[\u0300-\u036f]/g;
/** Exa separates highlights from different parts of a page with this marker. */
const HIGHLIGHT_MARKER = /\[(?:\.\.\.|…)\]/g;

/** Lowercase, strip diacritics and turn punctuation into spaces. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(HIGHLIGHT_MARKER, ' ')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(input: string): string[] {
  const normalized = normalizeText(input);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

export function tokenSet(input: string): Set<string> {
  return new Set(tokens(input));
}

/**
 * Name normalization additionally drops the generic words that every
 * university name shares, so "Universidad de Barcelona" and "University of
 * Barcelona" both reduce to "barcelona".
 */
export const NAME_STOPWORDS = new Set([
  'university',
  'universitat',
  'universidade',
  'universidad',
  'universite',
  'universita',
  'universiteit',
  'universitat',
  'universitaire',
  'universitats',
  'universit',
  'univerzita',
  'universytet',
  'college',
  'institute',
  'institut',
  'school',
  'faculty',
  'academy',
  'akademie',
  'technische',
  'technical',
  'technological',
  'of',
  'the',
  'and',
  'de',
  'del',
  'la',
  'las',
  'los',
  'van',
  'von',
  'der',
  'die',
  'das',
  'du',
  'des',
  'di',
  'da',
  'do',
  'dos',
  'for',
  'in',
  'at',
]);

export function nameTokens(input: string): string[] {
  return tokens(input).filter((t) => !NAME_STOPWORDS.has(t) && t.length > 1);
}

export function normalizedName(input: string): string {
  return nameTokens(input).join(' ');
}

/** Dice coefficient over character bigrams, 0..1. */
export function diceCoefficient(a: string, b: string): number {
  const left = a.replace(/\s+/g, '');
  const right = b.replace(/\s+/g, '');
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < left.length - 1; i++) {
    const g = left.slice(i, i + 2);
    bigrams.set(g, (bigrams.get(g) ?? 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < right.length - 1; i++) {
    const g = right.slice(i, i + 2);
    const count = bigrams.get(g) ?? 0;
    if (count > 0) {
      overlap++;
      bigrams.set(g, count - 1);
    }
  }
  return (2 * overlap) / (left.length - 1 + (right.length - 1));
}

/** Jaccard similarity over token sets, 0..1. */
export function jaccard(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const t of left) if (right.has(t)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

/** Fraction of the smaller token set that appears in the larger one, 0..1. */
export function tokenContainment(a: string, b: string): number {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (left.size === 0 || right.size === 0) return 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  let shared = 0;
  for (const t of smaller) if (larger.has(t)) shared++;
  return shared / smaller.size;
}

/** Blended similarity used by the fuzzy matcher. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizedName(a);
  const nb = normalizedName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dice = diceCoefficient(na, nb);
  const blend = dice * 0.6 + jaccard(na, nb) * 0.4;
  const containment = tokenContainment(a, b);
  return Math.max(dice, blend, containment >= 0.999 ? 0.97 : containment * 0.9);
}

/** Canonical form used when comparing an allowed URL with a returned URL. */
export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/\.+$/, '');
    url.protocol = url.protocol.toLowerCase();
    if (
      (url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')
    ) {
      url.port = '';
    }
    let path = url.pathname;
    if (!path) path = '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    url.pathname = path;
    return url.toString();
  } catch {
    return input.trim().toLowerCase().replace(/#.*$/, '');
  }
}

export function hostOf(input: string): string | null {
  try {
    return new URL(input).hostname.toLowerCase().replace(/\.+$/, '');
  } catch {
    return null;
  }
}

const SECOND_LEVEL_TLDS = new Set([
  'ac.uk',
  'co.uk',
  'gov.uk',
  'org.uk',
  'edu.au',
  'com.au',
  'net.au',
  'org.au',
  'ac.nz',
  'co.nz',
  'ac.jp',
  'co.jp',
  'go.jp',
  'ac.kr',
  'co.kr',
  'or.kr',
  'com.br',
  'edu.br',
  'com.mx',
  'edu.mx',
  'com.cn',
  'edu.cn',
  'ac.cn',
  'com.tr',
  'edu.tr',
  'ac.in',
  'co.in',
  'edu.in',
  'com.sg',
  'edu.sg',
  'co.za',
  'ac.za',
  'com.hk',
  'edu.hk',
  'com.tw',
  'edu.tw',
  'com.ar',
  'edu.ar',
  'com.co',
  'edu.co',
  'co.il',
  'ac.il',
  'com.my',
  'edu.my',
  'com.pt',
  'edu.pt',
  'com.es',
  'edu.es',
]);

/** e.g. "cs.ox.ac.uk" -> "ox.ac.uk"; "www.tum.de" -> "tum.de". */
export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  if (SECOND_LEVEL_TLDS.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

export function domainCandidates(host: string): string[] {
  const clean = host.toLowerCase().replace(/\.+$/, '');
  const reg = registrableDomain(clean);
  return clean === reg ? [clean] : [clean, reg];
}

export function wordCount(input: string): number {
  const normalized = input.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
