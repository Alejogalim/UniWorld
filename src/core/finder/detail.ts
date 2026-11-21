import type { Fact, UniDetail } from '../contracts';
import { callJson } from '../ai/json';
import { detailPrompt } from '../ai/prompts';
import { createAiClient, hasKey } from '../ai/index';
import type { SearchHit } from '../ai/types';
import {
  DETAIL_CACHE_TTL_MS,
  EXTRACT_MAX_CHARS_PER_HIT,
  EXTRACT_MAX_TOTAL_CHARS,
} from '../config';
import {
  CitationIndex,
  validateStringArrayFact,
  validateStringFact,
  type FactKind,
} from '../grounding/citationValidator';
import type { RorStore } from '../grounding/rorStore';
import { hostOf } from '../normalize';
import type { CoreDeps } from '../ports';
import { uniDetailAiSchema } from '../schemas';
import { fetchUniversityPages } from './webFetch';

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

function isFresh(checkedAt: string, now: Date): boolean {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return false;
  return now.getTime() - timestamp < DETAIL_CACHE_TTL_MS;
}

function nextDeadlineIsUpcoming(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return true;
  return timestamp >= now.getTime() - 24 * 60 * 60 * 1000;
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
  if (await hasKey(deps, 'openrouter')) return 'openrouter';
  if (await hasKey(deps, 'opencode')) return 'opencode';
  throw new Error(
    'University detail needs an OpenRouter key (verified web search) or an OpenCode key (direct official-page fetch).',
  );
}

/**
 * Design §7.3 detail page: a second search aimed at the university's own
 * domain, the same quote check, and a 30-day cache.
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
    if (cached && isFresh(cached.checkedAt, now)) return cached.detail;
  }

  const provider = await detailProvider(deps);
  const client = await createAiClient(provider, deps);

  let hits: SearchHit[] = [];
  if (provider === 'openrouter') {
    const allowedDomains = [
      ...new Set([
        ...record.domains,
        ...(record.website ? [hostOf(record.website)].filter((h): h is string => Boolean(h)) : []),
      ]),
    ];
    const queries = [
      `${record.name} ${program} tuition fees application deadline entry requirements international students`,
      `${record.name} ${program} how to apply admissions language of instruction`,
    ];
    hits = await client.search(queries, { allowedDomains, maxResults: 8 });
    if (hits.length === 0) {
      hits = await client.search(queries, { maxResults: 8 });
    }
  } else {
    deps.logger?.info?.(
      `OpenRouter key not set; fetching ${record.name}'s official pages for OpenCode extraction.`,
    );
    hits = await fetchUniversityPages(deps.http, record, program, deps.logger);
  }

  if (hits.length === 0) {
    deps.logger?.warn?.(`No detail sources for ${record.name}`);
    return emptyDetail(record.ror_id, program, checkedAt);
  }

  const parsed = await callJson({
    schema: uniDetailAiSchema,
    messages: detailPrompt(
      record.name,
      program,
      hits,
      EXTRACT_MAX_CHARS_PER_HIT,
      EXTRACT_MAX_TOTAL_CHARS,
    ),
    complete: (messages) =>
      client.chat(messages, { json: true, temperature: 0.1, maxTokens: 3000 }),
    logger: deps.logger,
  });

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

  if (deps.details) await deps.details.put(detail);
  return detail;
}
