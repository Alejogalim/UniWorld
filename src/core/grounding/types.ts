import type { Continent } from '../contracts';

/** One record in data/universities.json (Design §5.2 + additive geo fields). */
export interface UniversityRecord {
  ror_id: string;
  name: string;
  aliases: string[];
  acronyms: string[];
  country_code: string;
  /** Additive: lets the core filter by scope without another data file. */
  country_name: string;
  /** Additive: from ROR's continent_name / continent_code. */
  continent: Continent | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  domains: string[];
}

export interface RorMatch {
  record: UniversityRecord;
  /** 0..1 confidence; 1 means an exact domain or exact normalized name match. */
  score: number;
  /** Why the record matched, useful in logs and tests. */
  reason: 'domain' | 'name' | 'alias' | 'acronym' | 'fuzzy';
}

export interface CandidateIdentity {
  name: string;
  country?: string | null;
  sourceUrls?: string[];
}
