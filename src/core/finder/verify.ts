import type {
  Fact,
  Profile,
  RemovalReason,
  RemovalReasons,
  SearchInput,
  UniResult,
} from '../contracts';
import type { ExtractedCandidate } from '../schemas';
import type { CitationIndex } from '../grounding/citationValidator';
import { validateStringArrayFact, validateStringFact } from '../grounding/citationValidator';
import { languageFit } from '../grounding/languages';
import type { RorStore } from '../grounding/rorStore';
import type { UniversityRecord } from '../grounding/types';
import { looksNonBachelor } from './level';
import { costFit, isFreeTuition } from './scoring';

export interface VerifiedUniversity {
  result: UniResult;
  record: UniversityRecord;
  /** Present when the ranking stage has a verified requirements fact (detail). */
  requirements: Fact<string> | null;
}

export interface VerifyContext {
  ror: RorStore;
  index: CitationIndex;
  profile: Profile;
  input: SearchInput;
  checkedAt: string;
}

function emptyFact<T>(checkedAt: string): Fact<T> {
  return { value: null, sourceUrl: null, quote: null, sourceKind: 'third_party', checkedAt };
}

function officialDomains(record: UniversityRecord): string[] {
  return [...record.domains, ...(record.website ? [record.website] : [])].filter(Boolean);
}

/** Ranking/marketing copy is not a useful overview; treat it as "Not found". */
const RANKING_OVERVIEW =
  /\b(ranked|ranking|rank\b|no\.\s*\d+|number\s+\d+|top\s+\d+|best (?:universities|colleges|national|value)|world (?:university|reputation)|most innovative)\b/i;

function isRankingOverview(value: string): boolean {
  return RANKING_OVERVIEW.test(value);
}

export function inScope(record: UniversityRecord, scope: SearchInput['scope']): boolean {
  if (scope.kind === 'global') return true;
  if (scope.kind === 'countries') {
    return scope.codes.some((code) => code.toUpperCase() === record.country_code.toUpperCase());
  }
  return record.continent === scope.continent;
}

function sourceCount(result: UniResult): number {
  const urls = new Set<string>();
  const facts = [result.overview, result.languages, result.tuition];
  for (const fact of facts) if (fact.value !== null && fact.sourceUrl) urls.add(fact.sourceUrl);
  return urls.size;
}

function factValue<T>(fact: Fact<T>): T | null {
  return fact.value;
}

/** Keep the whole fact (value + sourceUrl + quote) from one source. */
function pickFact<T>(a: Fact<T>, b: Fact<T>, preferB: boolean): Fact<T> {
  if (a.value === null) return b;
  if (b.value === null) return a;
  return preferB ? b : a;
}

/** Free tuition wins over a fee regardless of merge order. */
function preferTuition(a: Fact<string>, b: Fact<string>): Fact<string> {
  if (a.value !== null && b.value !== null) {
    const aFree = isFreeTuition(a.value);
    const bFree = isFreeTuition(b.value);
    if (aFree && !bFree) return a;
    if (bFree && !aFree) return b;
    return a;
  }
  return a.value !== null ? a : b;
}

function pickProgramSource(a: UniResult, b: UniResult): UniResult {
  const aHasEvidence = Boolean(a.programQuote);
  const bHasEvidence = Boolean(b.programQuote);
  if (aHasEvidence !== bHasEvidence) return aHasEvidence ? a : b;
  return b.program.length > a.program.length ? b : a;
}

export function mergeResults(a: UniResult, b: UniResult): UniResult {
  const aLangs = a.languages.value;
  const bLangs = b.languages.value;
  const languages = pickFact(
    a.languages,
    b.languages,
    (bLangs?.length ?? 0) > (aLangs?.length ?? 0),
  );
  const overview = pickFact(
    a.overview,
    b.overview,
    (b.overview.value?.length ?? 0) > (a.overview.value?.length ?? 0),
  );
  const tuition = preferTuition(a.tuition, b.tuition);
  // Keep the programme name and its evidence URL/quote from the same candidate.
  const programSource = pickProgramSource(a, b);
  const result: UniResult = {
    ...a,
    program: programSource.program,
    programUrl: programSource.programUrl,
    programQuote: programSource.programQuote,
    overview,
    languages,
    tuition,
    city: a.city ?? b.city,
  };
  return { ...result, sourceCount: sourceCount(result) };
}

function applyFilters(
  result: UniResult,
  profile: Profile,
  input: SearchInput,
  requiredLevel: Fact<string>,
): { keep: boolean; reason?: RemovalReason } {
  const filters = input.filters;
  if (filters.tuitionFreeOnly && costFit(result.tuition.value, profile) !== 1) {
    return { keep: false, reason: 'tuition_not_free' };
  }

  const languages = result.languages.value;
  const hasLanguages = Boolean(languages && languages.length > 0);

  // An unstated language is not a reason to drop: many sites never write
  // "taught in English". Keep it, show "not stated", and rank it lower
  // (languageFitScore(null) = 0). Only a verified, unspeakable language drops.
  if (filters.spokenLanguagesOnly && hasLanguages) {
    const fit = languageFit(profile, languages!);
    if (!fit.speaks) {
      if (!filters.includeNeedToLearn) return { keep: false, reason: 'language_not_spoken' };
      if (fit.needToLearn.length === 0) return { keep: false, reason: 'language_not_spoken' };
      result.needToLearn = { lang: fit.needToLearn[0]!, usualLevel: requiredLevel };
    }
  } else if (filters.includeNeedToLearn && hasLanguages) {
    const fit = languageFit(profile, languages!);
    if (!fit.speaks && fit.needToLearn.length > 0) {
      result.needToLearn = { lang: fit.needToLearn[0]!, usualLevel: requiredLevel };
    }
  }

  return { keep: true };
}

/**
 * Design §7.3 step 4: match ROR, validate every fact, then enforce scope and
 * filters. Anything unverified is dropped and counted as removed.
 */
export function verifyCandidates(
  candidates: ExtractedCandidate[],
  ctx: VerifyContext,
): { verified: VerifiedUniversity[]; removed: number; reasons: RemovalReasons } {
  const byRorId = new Map<string, VerifiedUniversity>();
  let removed = 0;
  const reasons: RemovalReasons = {};
  const drop = (reason?: RemovalReason) => {
    removed++;
    if (reason) reasons[reason] = (reasons[reason] ?? 0) + 1;
  };

  for (const candidate of candidates) {
    const sourceUrls = [
      ...(candidate.sourceUrls ?? []),
      candidate.overview.sourceUrl,
      candidate.languages.sourceUrl,
      candidate.tuition.sourceUrl,
    ].filter((url): url is string => Boolean(url));

    const match = ctx.ror.match({
      name: candidate.name,
      country: candidate.countryCode ?? candidate.country ?? null,
      sourceUrls,
    });
    if (!match) {
      drop('not_in_registry');
      continue;
    }

    const record = match.record;
    if (!inScope(record, ctx.input.scope)) {
      drop('out_of_scope');
      continue;
    }

    // Checked on the final programme + evidence URL, and for both AI paths.
    if (looksNonBachelor(candidate.programName, candidate.programUrl)) {
      drop('not_bachelor');
      continue;
    }

    const domains = officialDomains(record);
    let overview = validateStringFact(candidate.overview, ctx.index, {
      kind: 'text',
      officialDomains: domains,
      checkedAt: ctx.checkedAt,
    });
    if (overview.value && isRankingOverview(overview.value)) {
      overview = emptyFact<string>(ctx.checkedAt);
    }
    const languages = validateStringArrayFact(candidate.languages, ctx.index, {
      kind: 'languages',
      officialDomains: domains,
      checkedAt: ctx.checkedAt,
    });
    const tuition = validateStringFact(candidate.tuition, ctx.index, {
      kind: 'tuition',
      officialDomains: domains,
      checkedAt: ctx.checkedAt,
    });
    const requiredLevel = candidate.languageRequirement
      ? validateStringFact(candidate.languageRequirement, ctx.index, {
          kind: 'text',
          officialDomains: domains,
          checkedAt: ctx.checkedAt,
        })
      : emptyFact<string>(ctx.checkedAt);

    const result: UniResult = {
      rorId: record.ror_id,
      name: record.name,
      countryCode: record.country_code,
      city: record.city ?? candidate.city ?? undefined,
      lat: record.lat ?? undefined,
      lng: record.lng ?? undefined,
      program: candidate.programName || candidate.name,
      programUrl: candidate.programUrl ?? undefined,
      programQuote: candidate.programQuote ?? undefined,
      overview,
      languages,
      tuition,
      fit: {
        career: 0,
        admission: 'Unknown',
        language: 0,
        cost: 'depends_on_citizenship',
        overall: 0,
      },
      whyFits: '',
      sourceCount: 0,
    };
    result.sourceCount = sourceCount(result);

    const { keep, reason } = applyFilters(result, ctx.profile, ctx.input, requiredLevel);
    if (!keep) {
      drop(reason);
      continue;
    }

    const existing = byRorId.get(record.ror_id);
    if (existing) {
      existing.result = mergeResults(existing.result, result);
    } else {
      byRorId.set(record.ror_id, {
        result,
        record,
        requirements: null,
      });
    }
  }

  return { verified: [...byRorId.values()], removed, reasons };
}

export { factValue, emptyFact, officialDomains, sourceCount };
