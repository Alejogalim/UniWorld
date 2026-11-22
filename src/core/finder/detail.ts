import type { Fact, UniDetail } from '../contracts';
import { AiFormatError, callJson, nextTokenBudget } from '../ai/json';
import { detailPrompt } from '../ai/prompts';
import { createAiClient, pickFinderProvider } from '../ai/index';
import type { AiClient, SearchHit, SearchOptions } from '../ai/types';
import {
  DETAIL_CACHE_TTL_MS,
  DETAIL_ENRICH_PAGES,
  DETAIL_ENRICH_TIMEOUT_MS,
  DETAIL_MAX_CHARS_PER_HIT,
  DETAIL_MAX_HITS,
  DETAIL_MAX_TOKENS,
  DETAIL_MAX_TOTAL_CHARS,
  DETAIL_SEARCH_MAX_RESULTS,
  DETAIL_SPARSE_CACHE_TTL_MS,
  DETAIL_SPARSE_MIN_FACTS,
  PAGE_FETCH_TIMEOUT_MS,
} from '../config';
import {
  CitationIndex,
  validateStringArrayFact,
  validateStringFact,
  type FactKind,
} from '../grounding/citationValidator';
import type { RorStore } from '../grounding/rorStore';
import { hostOf, normalizeUrl } from '../normalize';
import type { CoreDeps, Logger } from '../ports';
import { uniDetailAiSchema, type UniDetailAi } from '../schemas';
import {
  enrichHitsWithPages,
  fetchUniversityPages,
  focusText,
  programKeywords,
} from './webFetch';

function emptyFact<T>(checkedAt: string): Fact<T> {
  return { value: null, sourceUrl: null, quote: null, sourceKind: 'third_party', checkedAt };
}

export function emptyDetail(rorId: string, program: string, checkedAt: string): UniDetail {
  return {
    rorId,
    program,
    overview: emptyFact<string>(checkedAt),
    languages: emptyFact<string[]>(checkedAt),
    tuition: emptyFact<string>(checkedAt),
    scholarships: emptyFact<string>(checkedAt),
    deadlines: emptyFact<string>(checkedAt),
    nextDeadline: emptyFact<string>(checkedAt),
    exams: emptyFact<string[]>(checkedAt),
    requirements: emptyFact<string>(checkedAt),
    applyUrl: emptyFact<string>(checkedAt),
    checkedAt,
  };
}

/** How many of the nine facts were found (non-null, non-empty). */
export function foundFactCount(detail: UniDetail): number {
  const facts: Fact<string | string[]>[] = [
    detail.overview,
    detail.languages,
    detail.tuition,
    detail.scholarships,
    detail.deadlines,
    detail.nextDeadline,
    detail.exams,
    detail.requirements,
    detail.applyUrl,
  ];
  return facts.filter(
    (fact) => fact.value !== null && !(Array.isArray(fact.value) && fact.value.length === 0),
  ).length;
}

function isFresh(checkedAt: string, now: Date, ttlMs: number): boolean {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return false;
  return now.getTime() - timestamp < ttlMs;
}

function nextDeadlineIsUpcoming(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return true;
  return timestamp >= now.getTime() - 24 * 60 * 60 * 1000;
}

/** Plan 39: four focused searches for an international undergraduate applicant. */
export function detailQueries(universityName: string, program: string): string[] {
  return [
    `${universityName} undergraduate ${program} bachelor degree program`,
    `${universityName} undergraduate admissions international first-year applicants application deadlines requirements IELTS TOEFL SAT`,
    `${universityName} undergraduate tuition fees cost of attendance international students`,
    `${universityName} undergraduate scholarships financial aid international students`,
  ];
}

/** Dedupe by canonical URL (first one wins, texts merged), keep order, cap the count. */
export function mergeHits(hits: SearchHit[], maxHits = DETAIL_MAX_HITS): SearchHit[] {
  const byUrl = new Map<string, SearchHit>();
  for (const hit of hits) {
    const key = normalizeUrl(hit.url);
    const existing = byUrl.get(key);
    if (existing) {
      if (hit.text && !existing.text.includes(hit.text)) {
        existing.text = `${existing.text}\n${hit.text}`.trim();
      }
    } else {
      byUrl.set(key, { ...hit });
    }
  }
  return [...byUrl.values()].slice(0, maxHits);
}

/**
 * The exact slicing `sourceBlock` applies, done up front so the prompt and the
 * CitationIndex hold the same text.
 */
export function fitBudget(hits: SearchHit[], maxCharsPerHit: number, maxTotal: number): SearchHit[] {
  const out: SearchHit[] = [];
  let used = 0;
  for (const hit of hits) {
    if (used >= maxTotal) break;
    const text = hit.text.slice(0, Math.max(0, Math.min(maxCharsPerHit, maxTotal - used)));
    used += text.length;
    out.push({ ...hit, text });
  }
  return out;
}

async function searchAll(
  client: AiClient,
  queries: string[],
  options: SearchOptions,
  logger?: Logger,
): Promise<SearchHit[]> {
  const settled = await Promise.allSettled(queries.map((query) => client.search([query], options)));
  const fulfilled = settled.filter(
    (result): result is PromiseFulfilledResult<SearchHit[]> => result.status === 'fulfilled',
  );
  if (fulfilled.length === 0) {
    const first = settled[0];
    throw first && first.status === 'rejected' ? first.reason : new Error('Detail search failed.');
  }
  for (const result of settled) {
    if (result.status === 'rejected') {
      logger?.warn?.(
        `Detail search query failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
    }
  }
  return mergeHits(fulfilled.flatMap((result) => result.value));
}

export interface DetailOptions {
  refresh?: boolean;
}

/**
 * OpenRouter provides verified web search. If it is not configured but an
 * OpenCode key is, detail still works by fetching the university's own pages
 * and extracting facts from that same text (the quote check never relaxes).
 */
async function detailProvider(deps: CoreDeps): Promise<'openrouter' | 'opencode'> {
  const provider = await pickFinderProvider(deps);
  if (provider) return provider;
  throw new Error(
    'University detail needs an OpenRouter key (verified web search) or an OpenCode key (direct official-page fetch).',
  );
}

/**
 * Design §7.3 detail page: focused searches aimed at the university's own
 * domain, full text of the best official pages, the same quote check, and a
 * 30-day cache (1 day when fewer than 3 facts were found).
 */
export async function loadDetail(
  deps: CoreDeps,
  ror: RorStore,
  rorId: string,
  program: string,
  options: DetailOptions = {},
): Promise<UniDetail> {
  const now = deps.now?.() ?? new Date();
  const checkedAt = now.toISOString();
  const record = ror.byRorId(rorId);
  if (!record) {
    throw new Error(
      `Unknown ROR id: ${rorId}. Only active organizations with types: education are ` +
        'bundled in data/universities.json; use an ID from Finder results.',
    );
  }

  if (!options.refresh && deps.details) {
    const cached = await deps.details.get(record.ror_id, program);
    if (cached) {
      const ttl =
        foundFactCount(cached.detail) < DETAIL_SPARSE_MIN_FACTS
          ? DETAIL_SPARSE_CACHE_TTL_MS
          : DETAIL_CACHE_TTL_MS;
      if (isFresh(cached.checkedAt, now, ttl)) return cached.detail;
    }
  }

  const provider = await detailProvider(deps);
  const client = await createAiClient(provider, deps);
  const keywords = programKeywords(program);

  let hits: SearchHit[] = [];
  if (provider === 'openrouter') {
    const allowedDomains = [
      ...new Set([
        ...record.domains,
        ...(record.website ? [hostOf(record.website)].filter((h): h is string => Boolean(h)) : []),
      ]),
    ];
    const queries = detailQueries(record.name, program);
    hits = await searchAll(
      client,
      queries,
      { allowedDomains, maxResults: DETAIL_SEARCH_MAX_RESULTS },
      deps.logger,
    );
    if (hits.length === 0) {
      hits = await searchAll(client, queries, { maxResults: DETAIL_SEARCH_MAX_RESULTS }, deps.logger);
    }
    hits = await enrichHitsWithPages(deps.http, record, hits, {
      maxCharsPerHit: DETAIL_MAX_CHARS_PER_HIT,
      maxPages: DETAIL_ENRICH_PAGES,
      keywords,
      pageCache: deps.pages,
      timeoutMs: PAGE_FETCH_TIMEOUT_MS,
      deadline: Date.now() + DETAIL_ENRICH_TIMEOUT_MS,
      logger: deps.logger,
    });
  } else {
    deps.logger?.info?.(
      `OpenRouter key not set; fetching ${record.name}'s official pages for OpenCode extraction.`,
    );
    const pages = await fetchUniversityPages(deps.http, record, program, deps.logger, undefined, {
      pageCache: deps.pages,
      timeoutMs: PAGE_FETCH_TIMEOUT_MS,
      deadline: Date.now() + 60_000,
    });
    hits = pages.map((hit) => ({
      ...hit,
      text: focusText(hit.text, DETAIL_MAX_CHARS_PER_HIT, keywords),
    }));
  }

  if (hits.length === 0) {
    deps.logger?.warn?.(`No detail sources for ${record.name}`);
    return emptyDetail(record.ror_id, program, checkedAt);
  }

  // The prompt and the quote check see exactly the same text.
  hits = fitBudget(hits, DETAIL_MAX_CHARS_PER_HIT, DETAIL_MAX_TOTAL_CHARS);

  let parsed: UniDetailAi;
  try {
    parsed = await callJson({
      schema: uniDetailAiSchema,
      messages: detailPrompt(
        record.name,
        program,
        hits,
        DETAIL_MAX_CHARS_PER_HIT,
        DETAIL_MAX_TOTAL_CHARS,
      ),
      complete: (messages, attempt) =>
        client.chat(messages, {
          json: true,
          temperature: 0.1,
          maxTokens: nextTokenBudget(DETAIL_MAX_TOKENS, attempt),
        }),
      logger: deps.logger,
    });
  } catch (error) {
    // A malformed AI reply must not turn the page into "could not load"; a real
    // provider/network error still surfaces.
    if (!(error instanceof AiFormatError)) throw error;
    deps.logger?.error?.(
      `Detail extraction failed for ${record.name}: ${error.message}`,
    );
    return emptyDetail(record.ror_id, program, checkedAt);
  }

  const index = CitationIndex.fromHits(hits);
  const domains = [...record.domains, ...(record.website ? [record.website] : [])];
  const optionsFor = (kind: FactKind) => ({ kind, officialDomains: domains, checkedAt });

  const nextDeadlineRaw = validateStringFact(parsed.nextDeadline, index, optionsFor('date'));
  const nextDeadline =
    nextDeadlineRaw.value !== null && !nextDeadlineIsUpcoming(nextDeadlineRaw.value, now)
      ? emptyFact<string>(checkedAt)
      : nextDeadlineRaw;

  const detail: UniDetail = {
    rorId: record.ror_id,
    program,
    overview: validateStringFact(parsed.overview, index, optionsFor('text')),
    languages: validateStringArrayFact(parsed.languages, index, optionsFor('languages')),
    tuition: validateStringFact(parsed.tuition, index, optionsFor('tuition')),
    scholarships: validateStringFact(parsed.scholarships, index, optionsFor('text')),
    deadlines: validateStringFact(parsed.deadlines, index, optionsFor('text')),
    nextDeadline,
    exams: validateStringArrayFact(parsed.exams, index, optionsFor('exams')),
    requirements: validateStringFact(parsed.requirements, index, optionsFor('text')),
    applyUrl: validateStringFact(parsed.applyUrl, index, optionsFor('url')),
    checkedAt,
  };

  if (foundFactCount(detail) < DETAIL_SPARSE_MIN_FACTS) {
    deps.logger?.info?.(
      `Detail for ${record.name} found ${foundFactCount(detail)} fact(s); cached for a day only.`,
    );
  }
  if (deps.details) await deps.details.put(detail);
  return detail;
}
