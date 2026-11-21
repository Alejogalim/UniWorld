import { ROR_FUZZY_MARGIN, ROR_FUZZY_THRESHOLD } from '../config';
import {
  domainCandidates,
  hostOf,
  nameSimilarity,
  nameTokens,
  normalizeText,
  normalizedName,
} from '../normalize';
import type { CandidateIdentity, RorMatch, UniversityRecord } from './types';

interface NameEntry {
  record: UniversityRecord;
  reason: 'name' | 'alias' | 'acronym';
}

const MAIN_MARKERS = [
  'university',
  'universitat',
  'universidade',
  'universidad',
  'universite',
  'universita',
  'universiteit',
  'polytechnic',
  'institute of technology',
];

const UNIT_MARKERS = [
  'college',
  'institute',
  'school',
  'centre',
  'center',
  'academy',
  'department',
  'faculty',
  'hospital',
  'research',
  'campus',
  'consortium',
  'foundation',
  'graduate',
  'library',
  'museum',
  'laboratory',
  'observatory',
];

function looksLikeUnit(record: UniversityRecord): boolean {
  const name = normalizeText(record.name);
  return UNIT_MARKERS.some((marker) => name.includes(marker));
}

function looksLikeMain(record: UniversityRecord): boolean {
  const name = normalizeText(record.name);
  return MAIN_MARKERS.some((marker) => name.includes(marker)) || !looksLikeUnit(record);
}

/** The label that identifies an institution inside a domain: ox.ac.uk -> ox. */
export function domainLabel(domain: string): string {
  const parts = domain.toLowerCase().split('.').filter(Boolean);
  if (parts.length >= 3 && (parts[parts.length - 2] === 'ac' || parts[parts.length - 2] === 'co' ||
      parts[parts.length - 2] === 'edu' || parts[parts.length - 2] === 'com' ||
      parts[parts.length - 2] === 'org' || parts[parts.length - 2] === 'gov' ||
      parts[parts.length - 2] === 'net')) {
    return parts[parts.length - 3] ?? '';
  }
  return parts[parts.length - 2] ?? parts[0] ?? '';
}

const ROR_ID_RE = /^https:\/\/ror\.org\/0[a-z0-9]{8}$/i;

export function isUniversityRecord(value: unknown): value is UniversityRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.ror_id === 'string' &&
    typeof r.name === 'string' &&
    Array.isArray(r.aliases) &&
    Array.isArray(r.acronyms) &&
    typeof r.country_code === 'string' &&
    Array.isArray(r.domains)
  );
}

export function normalizeRorId(id: string): string {
  const trimmed = id.trim();
  if (ROR_ID_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^0[a-z0-9]{8}$/i.test(trimmed)) return `https://ror.org/${trimmed.toLowerCase()}`;
  return trimmed.toLowerCase();
}

function countryMatches(record: UniversityRecord, identity: CandidateIdentity): boolean {
  const code = identity.country?.trim().toUpperCase() ?? '';
  if (/^[A-Z]{2}$/.test(code)) return record.country_code.toUpperCase() === code;
  const name = identity.country?.trim();
  if (!name) return true;
  const normalized = normalizeText(name);
  if (!normalized) return true;
  return (
    normalizeText(record.country_name) === normalized ||
    normalizeText(record.country_code) === normalized
  );
}

/**
 * In-memory index over data/universities.json. Pure data: the app and the CLI
 * both build it from the same JSON file.
 */
export class RorStore {
  private readonly records: UniversityRecord[];
  private readonly byId = new Map<string, UniversityRecord>();
  private readonly byDomain = new Map<string, UniversityRecord[]>();
  private readonly byName = new Map<string, NameEntry[]>();
  private readonly byFullName = new Map<string, NameEntry[]>();
  private readonly byToken = new Map<string, Set<UniversityRecord>>();
  private readonly byCountry = new Map<string, UniversityRecord[]>();

  constructor(records: UniversityRecord[]) {
    this.records = records;
    for (const record of records) {
      const id = normalizeRorId(record.ror_id);
      if (!this.byId.has(id)) this.byId.set(id, record);

      for (const domain of record.domains ?? []) {
        for (const candidate of domainCandidates(domain.toLowerCase())) {
          const list = this.byDomain.get(candidate) ?? [];
          if (!list.includes(record)) list.push(record);
          this.byDomain.set(candidate, list);
        }
      }
      const websiteHost = record.website ? hostOf(record.website) : null;
      if (websiteHost) {
        for (const candidate of domainCandidates(websiteHost)) {
          const list = this.byDomain.get(candidate) ?? [];
          if (!list.includes(record)) list.push(record);
          this.byDomain.set(candidate, list);
        }
      }

      const addName = (value: string, reason: NameEntry['reason']) => {
        const key = reason === 'acronym' ? normalizeText(value) : normalizedName(value);
        if (key) {
          const list = this.byName.get(key) ?? [];
          if (!list.some((entry) => entry.record === record)) list.push({ record, reason });
          this.byName.set(key, list);
        }
        const fullKey = normalizeText(value);
        if (fullKey) {
          const fullList = this.byFullName.get(fullKey) ?? [];
          if (!fullList.some((entry) => entry.record === record)) {
            fullList.push({ record, reason });
          }
          this.byFullName.set(fullKey, fullList);
        }
      };
      addName(record.name, 'name');
      for (const alias of record.aliases ?? []) addName(alias, 'alias');
      for (const acronym of record.acronyms ?? []) addName(acronym, 'acronym');

      for (const token of new Set(nameTokens([record.name, ...(record.aliases ?? [])].join(' ')))) {
        const set = this.byToken.get(token) ?? new Set<UniversityRecord>();
        set.add(record);
        this.byToken.set(token, set);
      }
      for (const acronym of record.acronyms ?? []) {
        for (const token of nameTokens(acronym)) {
          const set = this.byToken.get(token) ?? new Set<UniversityRecord>();
          set.add(record);
          this.byToken.set(token, set);
        }
      }

      const countryKey = record.country_code.toUpperCase();
      const list = this.byCountry.get(countryKey) ?? [];
      list.push(record);
      this.byCountry.set(countryKey, list);
    }
  }

  static fromJson(value: unknown): RorStore {
    if (!Array.isArray(value)) throw new Error('universities.json must be an array');
    const records = value.filter(isUniversityRecord);
    if (records.length === 0) throw new Error('universities.json contains no valid records');
    return new RorStore(records);
  }

  get size(): number {
    return this.records.length;
  }

  byRorId(rorId: string): UniversityRecord | null {
    return this.byId.get(normalizeRorId(rorId)) ?? null;
  }

  all(): readonly UniversityRecord[] {
    return this.records;
  }

  /** Best ROR match for an extracted candidate, or null (then it is removed). */
  match(identity: CandidateIdentity): RorMatch | null {
    const domainMatch = this.matchByDomain(identity);
    if (domainMatch) return domainMatch;
    const fullName = this.matchFullName(identity);
    if (fullName !== undefined) return fullName;
    const exact = this.matchByName(identity);
    if (exact !== undefined) return exact;
    return this.matchFuzzy(identity);
  }

  private chooseEntry(
    entries: NameEntry[],
    identity: CandidateIdentity,
  ): RorMatch | null {
    const countryFiltered = entries.filter((entry) => countryMatches(entry.record, identity));
    if (countryFiltered.length === 0) return null;

    const bestReason = new Map<UniversityRecord, NameEntry['reason']>();
    const priority: Record<NameEntry['reason'], number> = { name: 3, alias: 2, acronym: 1 };
    for (const entry of countryFiltered) {
      const current = bestReason.get(entry.record);
      if (!current || priority[entry.reason] > priority[current]) {
        bestReason.set(entry.record, entry.reason);
      }
    }
    if (bestReason.size === 1) {
      const [record, reason] = [...bestReason.entries()][0]!;
      return {
        record,
        score: reason === 'name' ? 1 : 0.97,
        reason,
      };
    }
    const names = [...bestReason.entries()].filter(([, reason]) => reason === 'name');
    if (names.length === 1) {
      return { record: names[0]![0], score: 1, reason: 'name' };
    }
    // Ambiguous in this country: never guess.
    return null;
  }

  /** Exact match against the full name/alias/acronym, before stopword removal. */
  private matchFullName(identity: CandidateIdentity): RorMatch | null | undefined {
    const key = normalizeText(identity.name);
    if (!key) return undefined;
    const entries = this.byFullName.get(key);
    if (!entries) return undefined;
    return this.chooseEntry(entries, identity);
  }

  private matchByName(identity: CandidateIdentity): RorMatch | null | undefined {
    const key = normalizedName(identity.name);
    if (!key) return undefined;
    const entries = this.byName.get(key);
    if (!entries) return undefined;
    return this.chooseEntry(entries, identity);
  }

  private domainScore(
    record: UniversityRecord,
    label: string,
    domain: string,
    identity: CandidateIdentity,
  ): number {
    let score = countryMatches(record, identity) ? 0.5 : 0;
    const firstDomain = record.domains[0]
      ? domainCandidates(record.domains[0].toLowerCase())[0]
      : null;
    if (firstDomain && domainCandidates(firstDomain).includes(domain)) score += 3;

    if (record.acronyms.some((acronym) => normalizeText(acronym) === label)) score += 4;

    const recordTokens = new Set<string>([
      ...nameTokens(record.name),
      ...record.aliases.flatMap((alias) => nameTokens(alias)),
      ...record.acronyms.map((acronym) => normalizeText(acronym)).filter(Boolean),
    ]);
    if (recordTokens.has(label)) score += 3;
    if (label.length >= 2) {
      for (const token of recordTokens) {
        if (token.length >= 3 && (token.startsWith(label) || label.startsWith(token))) {
          score += 2;
          break;
        }
      }
    }

    if (looksLikeMain(record)) score += 2;
    if (looksLikeUnit(record)) score -= 4;

    const websiteHost = record.website ? hostOf(record.website) : null;
    if (websiteHost && domainCandidates(websiteHost).includes(domain)) score += 2;
    return score;
  }

  private pickDomainRecord(
    records: UniversityRecord[],
    identity: CandidateIdentity,
    domain: string,
  ): UniversityRecord | null {
    const countryFiltered = records.filter((record) => countryMatches(record, identity));
    const pool = countryFiltered.length > 0 ? countryFiltered : records;
    if (pool.length === 1) return pool[0] ?? null;

    const fullKey = normalizeText(identity.name);
    if (fullKey) {
      const exact = pool.filter((record) =>
        [record.name, ...record.aliases, ...record.acronyms].some(
          (value) => normalizeText(value) === fullKey,
        ),
      );
      if (exact.length === 1) return exact[0] ?? null;
    }

    const label = domainLabel(domain);
    const scored = pool
      .map((record) => ({
        record,
        score: this.domainScore(record, label, domain, identity),
      }))
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top || top.score <= 0) return null;
    const second = scored[1];
    if (second && top.score - second.score < 0.5) return null;
    return top.record;
  }

  private matchByDomain(identity: CandidateIdentity): RorMatch | null {
    for (const sourceUrl of identity.sourceUrls ?? []) {
      const host = hostOf(sourceUrl);
      if (!host) continue;
      const candidates = domainCandidates(host);
      const pool = new Map<string, UniversityRecord>();
      for (const candidate of candidates) {
        for (const record of this.byDomain.get(candidate) ?? []) {
          pool.set(record.ror_id, record);
        }
      }
      if (pool.size === 0) continue;
      const registrable = candidates[candidates.length - 1] ?? host;
      const record = this.pickDomainRecord([...pool.values()], identity, registrable);
      if (record) return { record, score: 0.99, reason: 'domain' };
    }
    return null;
  }

  private matchFuzzy(identity: CandidateIdentity): RorMatch | null {
    const candidateTokens = nameTokens(identity.name);
    if (candidateTokens.length === 0) return null;

    const pool = new Set<UniversityRecord>();
    for (const token of candidateTokens) {
      const set = this.byToken.get(token);
      if (set) for (const record of set) pool.add(record);
    }
    if (pool.size === 0) {
      const code = identity.country?.trim().toUpperCase() ?? '';
      if (/^[A-Z]{2}$/.test(code)) {
        for (const record of this.byCountry.get(code) ?? []) pool.add(record);
      }
    }

    const scored: { record: UniversityRecord; score: number; reason: RorMatch['reason'] }[] = [];
    for (const record of pool) {
      if (!countryMatches(record, identity)) continue;
      const names = [record.name, ...(record.aliases ?? [])];
      let best = 0;
      for (const name of names) best = Math.max(best, nameSimilarity(identity.name, name));
      for (const acronym of record.acronyms ?? []) {
        const a = normalizeText(acronym);
        const b = normalizeText(identity.name);
        if (a && (a === b || (a.length >= 3 && b === a))) best = Math.max(best, 0.98);
      }
      if (best > 0) {
        scored.push({
          record,
          score: best,
          reason: best >= 0.98 ? 'acronym' : 'fuzzy',
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top) return null;
    if (top.score < ROR_FUZZY_THRESHOLD) return null;
    const second = scored[1];
    if (second && top.score - second.score < ROR_FUZZY_MARGIN) return null;
    return top;
  }

  /** Exposed for tests and debugging. */
  findByName(name: string, country?: string): UniversityRecord | null {
    return this.match({ name, country })?.record ?? null;
  }
}
