import type { Fact, Profile, SearchInput, UniResult } from '../contracts';
import type { ExtractedCandidate } from '../schemas';
import type { CitationIndex } from '../grounding/citationValidator';
import { validateStringArrayFact, validateStringFact } from '../grounding/citationValidator';
import { languageFit } from '../grounding/languages';
import type { RorStore } from '../grounding/rorStore';
import type { UniversityRecord } from '../grounding/types';
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

function mergeFacts<T>(a: Fact<T>, b: Fact<T>, prefer: (a: T, b: T) => T | null): Fact<T> {
  if (a.value !== null && b.value !== null) {
    const chosen = prefer(a.value, b.value);
    return chosen === null ? a : { ...a, value: chosen };
  }
  return a.value !== null ? a : b;
}

function mergeResults(a: UniResult, b: UniResult): UniResult {
  const languages = mergeFacts(a.languages, b.languages, (left, right) => [
    ...new Set([...left, ...right]),
  ]);
  const overview = mergeFacts(a.overview, b.overview, (left, right) =>
    right.length > left.length ? right : null,
  );
  const tuition = mergeFacts(a.tuition, b.tuition, (left, right) =>
    isFreeTuition(left) && !isFreeTuition(right) ? left : null,
  );
  const result: UniResult = {
    ...a,
    program: a.program.length >= b.program.length ? a.program : b.program,
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
): { keep: boolean } {
  const filters = input.filters;
  if (filters.tuitionFreeOnly && costFit(result.tuition.value, profile) !== 1) {
    return { keep: false };
  }

  const languages = result.languages.value;
  if (filters.spokenLanguagesOnly) {
    if (!languages || languages.length === 0) return { keep: false };
    const fit = languageFit(profile, languages);
    if (!fit.speaks) {
      if (!filters.includeNeedToLearn) return { keep: false };
      if (fit.needToLearn.length === 0) return { keep: false };
      result.needToLearn = { lang: fit.needToLearn[0]!, usualLevel: requiredLevel };
    }
  } else if (filters.includeNeedToLearn && languages && languages.length > 0) {
    const fit = languageFit(profile, languages);
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
): { verified: VerifiedUniversity[]; removed: number } {
  const byRorId = new Map<string, VerifiedUniversity>();
  let removed = 0;

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
      removed++;
      continue;
    }

    const record = match.record;
    if (!inScope(record, ctx.input.scope)) {
      removed++;
      continue;
    }

    const domains = officialDomains(record);
    const overview = validateStringFact(candidate.overview, ctx.index, {
      kind: 'text',
      officialDomains: domains,
      checkedAt: ctx.checkedAt,
    });
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

    const { keep } = applyFilters(result, ctx.profile, ctx.input, requiredLevel);
    if (!keep) {
      removed++;
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

  return { verified: [...byRorId.values()], removed };
}

export { factValue, emptyFact, officialDomains, sourceCount };
