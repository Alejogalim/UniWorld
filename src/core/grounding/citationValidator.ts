import type { Fact } from '../contracts';
import { QUOTE_MAX_WORDS, QUOTE_MIN_WORDS } from '../config';
import {
  domainCandidates,
  hostOf,
  normalizeText,
  normalizeUrl,
  tokens,
  wordCount,
} from '../normalize';
import { languageName, languagesInText } from './languages';

export type FactKind = 'text' | 'tuition' | 'languages' | 'exams' | 'date' | 'url' | 'any';

export interface SourceQuote {
  value: string | string[] | null;
  sourceUrl: string | null;
  quote: string | null;
}

export interface ValidateOptions {
  kind?: FactKind;
  /** Domains/URLs that count as an "official" source for this university. */
  officialDomains?: string[];
  checkedAt?: string;
}

interface SourceEntry {
  url: string;
  text: string;
  normalized: string;
}

/** The text the search actually returned, keyed by canonical URL. */
export class CitationIndex {
  private readonly entries = new Map<string, SourceEntry>();

  static fromHits(hits: { url: string; text: string; title?: string }[]): CitationIndex {
    const index = new CitationIndex();
    for (const hit of hits) {
      const key = normalizeUrl(hit.url);
      const existing = index.entries.get(key);
      if (existing) existing.text = `${existing.text}\n${hit.text}`;
      else index.entries.set(key, { url: hit.url, text: hit.text, normalized: '' });
    }
    for (const entry of index.entries.values()) entry.normalized = normalizeText(entry.text);
    return index;
  }

  has(url: string): boolean {
    return this.entries.has(normalizeUrl(url));
  }

  canonicalUrl(url: string): string | null {
    return this.entries.get(normalizeUrl(url))?.url ?? null;
  }

  textFor(url: string): string | null {
    return this.entries.get(normalizeUrl(url))?.text ?? null;
  }

  normalizedFor(url: string): string | null {
    return this.entries.get(normalizeUrl(url))?.normalized ?? null;
  }

  urls(): string[] {
    return [...this.entries.values()].map((entry) => entry.url);
  }

  get size(): number {
    return this.entries.size;
  }
}

function officialMatch(url: string, officialDomains: string[] | undefined): boolean {
  if (!officialDomains || officialDomains.length === 0) return false;
  const host = hostOf(url);
  if (!host) return false;
  const hosts = new Set<string>();
  for (const entry of officialDomains) {
    const entryHost = hostOf(entry) ?? entry.replace(/^https?:\/\//i, '').split('/')[0];
    if (!entryHost) continue;
    for (const candidate of domainCandidates(entryHost.toLowerCase())) hosts.add(candidate);
  }
  return domainCandidates(host).some((candidate) => hosts.has(candidate));
}

function nullFact<T>(checkedAt: string, sourceKind: 'official' | 'third_party'): Fact<T> {
  return { value: null, sourceUrl: null, quote: null, sourceKind, checkedAt };
}

const SIGNIFICANT_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'are',
  'was',
  'were',
  'has',
  'have',
  'will',
  'all',
  'any',
  'its',
  'their',
  'our',
  'your',
  'you',
  'per',
  'into',
  'over',
  'under',
  'about',
  'also',
  'more',
  'most',
  'some',
  'such',
  'than',
  'then',
  'they',
  'them',
  'there',
  'these',
  'those',
  'which',
  'when',
  'where',
  'what',
  'who',
]);

function significant(input: string): string[] {
  return tokens(input).filter((t) => t.length >= 3 && !SIGNIFICANT_STOPWORDS.has(t));
}

function tokenSupport(value: string, quoteNormalized: string, minRatio: number): boolean {
  const valueTokens = significant(value);
  if (valueTokens.length === 0) {
    const normalized = normalizeText(value);
    return normalized.length > 0 && quoteNormalized.includes(normalized);
  }
  let shared = 0;
  for (const token of valueTokens) if (quoteNormalized.includes(token)) shared++;
  const required = Math.max(1, Math.ceil(valueTokens.length * minRatio));
  return shared >= required;
}

const FREE_QUOTE_MARKERS = [
  'free',
  'no tuition',
  'no fees',
  'tuition-free',
  'tuition free',
  'gratis',
  'kostenlos',
  'free of charge',
  'covered',
  'scholarship',
  'waived',
];

function tuitionSupport(value: string, quoteNormalized: string): boolean {
  const normalizedValue = normalizeText(value);
  const looksFree =
    /\b(free|no tuition|tuition free|tuition-free|free of charge|gratis|kostenlos|scholarship)\b/.test(
      normalizedValue,
    ) || normalizedValue === 'free';
  if (looksFree) {
    return FREE_QUOTE_MARKERS.some((marker) => quoteNormalized.includes(marker));
  }
  const digits = normalizedValue.match(/\d+/g) ?? [];
  if (digits.length > 0) {
    return digits.some((digit) => quoteNormalized.includes(digit));
  }
  return tokenSupport(value, quoteNormalized, 0.5);
}

function languagesSupport(value: string[], quoteNormalized: string): boolean {
  const quoteLanguages = new Set(languagesInText(quoteNormalized));
  const valueLanguages = new Set(languagesInText(value.join(' ')));
  if (valueLanguages.size > 0) {
    for (const code of valueLanguages) {
      if (!quoteLanguages.has(code)) {
        const name = normalizeText(languageName(code));
        if (!name || !quoteNormalized.includes(name)) return false;
      }
    }
    return true;
  }
  return value.every((entry) => tokenSupport(entry, quoteNormalized, 0.5));
}

function examsSupport(value: string[], quoteNormalized: string): boolean {
  if (value.length === 0) return false;
  let supported = 0;
  for (const item of value) {
    const itemTokens = significant(item);
    if (itemTokens.length === 0) {
      const normalized = normalizeText(item);
      if (normalized && quoteNormalized.includes(normalized)) supported++;
      continue;
    }
    if (itemTokens.some((token) => quoteNormalized.includes(token))) supported++;
  }
  return supported >= Math.max(1, Math.ceil(value.length / 2));
}

function dateSupport(value: string, quoteNormalized: string): boolean {
  const numbers = normalizeText(value).match(/\d{2,4}/g) ?? [];
  if (numbers.length === 0) return tokenSupport(value, quoteNormalized, 0.5);
  return numbers.some((number) => quoteNormalized.includes(number));
}

function urlSupport(value: string, quoteNormalized: string, sourceUrl: string | null): boolean {
  const valueHost = hostOf(value);
  const sourceHost = sourceUrl ? hostOf(sourceUrl) : null;
  if (valueHost && sourceHost) {
    const valueDomains = domainCandidates(valueHost);
    const sourceDomains = domainCandidates(sourceHost);
    if (valueDomains.some((domain) => sourceDomains.includes(domain))) return true;
  }
  const normalizedValue = normalizeText(valueHost ?? value);
  if (normalizedValue && quoteNormalized.includes(normalizedValue)) return true;
  return tokenSupport(valueHost ?? value, quoteNormalized, 0.5);
}

function supportsValue(
  value: unknown,
  quoteNormalized: string,
  kind: FactKind,
  sourceUrl: string | null,
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    switch (kind) {
      case 'tuition':
        return tuitionSupport(value, quoteNormalized);
      case 'date':
        return dateSupport(value, quoteNormalized);
      case 'url':
        return urlSupport(value, quoteNormalized, sourceUrl);
      case 'text':
        return tokenSupport(value, quoteNormalized, 0.45);
      default:
        return tokenSupport(value, quoteNormalized, 0.5);
    }
  }
  if (Array.isArray(value)) {
    const strings = value.filter((entry): entry is string => typeof entry === 'string');
    if (strings.length === 0) return false;
    switch (kind) {
      case 'languages':
        return languagesSupport(strings, quoteNormalized);
      case 'exams':
        return examsSupport(strings, quoteNormalized);
      default:
        return strings.every((entry) => tokenSupport(entry, quoteNormalized, 0.4));
    }
  }
  return true;
}

/**
 * Design §7.3 step 4 and §12, "never relax this check":
 * - the source URL must be one the search returned,
 * - the quote must appear in that URL's returned text after normalization,
 * - the quote must support the claimed value.
 * Anything else becomes `null` ("Not found — check official site").
 */
export function validateFact<T extends string | string[]>(
  source: SourceQuote,
  index: CitationIndex,
  options: ValidateOptions = {},
): Fact<T> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const kind = options.kind ?? 'any';
  const official = officialMatch(source.sourceUrl ?? '', options.officialDomains);
  const sourceKind: 'official' | 'third_party' = official ? 'official' : 'third_party';

  if (source.value === null || source.sourceUrl === null || source.quote === null) {
    return nullFact<T>(checkedAt, sourceKind);
  }

  const quote = source.quote.trim();
  const wordTotal = wordCount(quote);
  if (wordTotal < QUOTE_MIN_WORDS || wordTotal > QUOTE_MAX_WORDS) {
    return nullFact<T>(checkedAt, sourceKind);
  }

  const entry = index.canonicalUrl(source.sourceUrl);
  const normalizedText = index.normalizedFor(source.sourceUrl);
  if (!entry || normalizedText === null) {
    return nullFact<T>(checkedAt, sourceKind);
  }

  const normalizedQuote = normalizeText(quote);
  if (!normalizedQuote || !normalizedText.includes(normalizedQuote)) {
    return nullFact<T>(checkedAt, sourceKind);
  }

  if (!supportsValue(source.value, normalizedText, kind, entry)) {
    return nullFact<T>(checkedAt, sourceKind);
  }

  return {
    value: source.value as T,
    sourceUrl: entry,
    quote,
    sourceKind,
    checkedAt,
  };
}

export function validateStringFact(
  source: SourceQuote,
  index: CitationIndex,
  options: ValidateOptions = {},
): Fact<string> {
  return validateFact<string>(source, index, options);
}

export function validateStringArrayFact(
  source: SourceQuote,
  index: CitationIndex,
  options: ValidateOptions = {},
): Fact<string[]> {
  return validateFact<string[]>(source, index, options);
}
