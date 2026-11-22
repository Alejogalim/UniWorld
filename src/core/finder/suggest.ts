import { z } from 'zod';
import type { Profile, RemovalReason, RemovalReasons, SearchInput } from '../contracts';
import { callJson, nextTokenBudget } from '../ai/json';
import { profileToText, scopeToText } from '../ai/prompts';
import type { AiClient, ChatMessage, SearchHit } from '../ai/types';
import {
  PAGE_FETCH_TIMEOUT_MS,
  SEARCH_TARGET_RESULTS,
  SUGGEST_MAX_TOKENS,
  UNIVERSITY_FETCH_TIMEOUT_MS,
} from '../config';
import type { RorStore } from '../grounding/rorStore';
import type { UniversityRecord } from '../grounding/types';
import type { HttpClient, Logger, PageCache } from '../ports';
import type { ExtractedCandidate } from '../schemas';
import { extractCandidates } from './extract';
import {
  expandDegreeKeywords,
  findProgrammeEvidence,
  findProgrammeNameEvidence,
} from './programme';
import { inScope } from './verify';
import { fetchUniversityPages } from './webFetch';

/** OpenCode-only path: how many grounded universities we read (Design §14 cap). */
export const OPENCODE_MAX_UNIVERSITIES = 12;
/** How many names we ask the model for before ROR grounding drops most of them. */
const SUGGEST_COUNT = 24;
/** Official-page budget per university on search (detail uses 8). */
const SEARCH_MAX_PAGES = 7;
const FETCH_CONCURRENCY = 3;

export const suggestionSchema = z.object({
  universities: z.preprocess(
    (value) => value ?? [],
    z.array(
      z.object({
        name: z.string().min(2).max(200),
        country: z.string().min(2).max(100),
      }),
    ),
  ),
});

export type SuggestedUniversity = z.infer<typeof suggestionSchema>['universities'][number];

function suggestPrompt(profile: Profile, input: SearchInput): ChatMessage[] {
  const shape = { universities: [{ name: 'university name', country: 'country name' }] };
  return [
    {
      role: 'system',
      content: [
        'You suggest real universities for UniFinder, from your own knowledge.',
        'Return names and countries only. No tuition, deadlines, rankings, URLs or other facts.',
        `Suggest up to ${SUGGEST_COUNT} real universities that offer bachelor programs related to the requested careers.`,
        'Stay inside the requested scope. Put the best matches first.',
        'Respond in English. Return the JSON object only. No reasoning, no commentary.',
        'Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Requested careers: ${input.careers.join(', ')}`,
        `Scope: ${scopeToText(input.scope)}`,
        `Student: ${profileToText(profile)}`,
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}

/** Step 1: names and countries from the model, no facts. */
export async function suggestUniversities(
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  logger?: Logger,
): Promise<SuggestedUniversity[]> {
  const parsed = await callJson({
    schema: suggestionSchema,
    messages: suggestPrompt(profile, input),
    complete: (messages, attempt) =>
      client.chat(messages, {
        json: true,
        temperature: 0.1,
        maxTokens: nextTokenBudget(SUGGEST_MAX_TOKENS, attempt),
      }),
    logger,
  });
  return parsed.universities.slice(0, SUGGEST_COUNT);
}

export interface GroundedSuggestions {
  records: UniversityRecord[];
  /** Suggestions that were unmatched, out of scope, or over the cap. */
  removed: number;
  reasons: RemovalReasons;
}

/** Step 2: keep only suggestions that match a ROR record in scope, deduped. */
export function groundSuggestions(
  suggestions: SuggestedUniversity[],
  ror: RorStore,
  input: SearchInput,
): GroundedSuggestions {
  const seen = new Set<string>();
  const records: UniversityRecord[] = [];
  const reasons: RemovalReasons = {};
  let removed = 0;
  const drop = (reason: RemovalReason) => {
    removed++;
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  };

  for (const suggestion of suggestions) {
    const match = ror.match({ name: suggestion.name, country: suggestion.country });
    if (!match) {
      drop('not_in_registry');
      continue;
    }
    if (!inScope(match.record, input.scope)) {
      drop('out_of_scope');
      continue;
    }
    if (seen.has(match.record.ror_id)) continue;
    seen.add(match.record.ror_id);
    if (records.length >= OPENCODE_MAX_UNIVERSITIES) {
      drop('over_cap');
      continue;
    }
    records.push(match.record);
  }

  return { records, removed, reasons };
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** One university's official pages plus the candidates extracted from them. */
export interface CandidateGroup {
  record: UniversityRecord;
  hits: SearchHit[];
  candidates: ExtractedCandidate[];
}

export interface PageCandidatesResult {
  removed: number;
  reasons: RemovalReasons;
}

export interface PageCandidatesOptions {
  pageCache?: PageCache;
  /** Stop reading once this many universities produced candidates. */
  target?: number;
}

function bump(reasons: RemovalReasons, reason: RemovalReason): void {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function mergeCounts(into: RemovalReasons, from: RemovalReasons): void {
  for (const [reason, count] of Object.entries(from) as [RemovalReason, number][]) {
    into[reason] = (into[reason] ?? 0) + count;
  }
}

async function resolveDegreeKeywords(
  client: AiClient,
  input: SearchInput,
  logger?: Logger,
): Promise<string[]> {
  if (input.degreeKeywords && input.degreeKeywords.length > 0) {
    return input.degreeKeywords.map((keyword) => keyword.trim()).filter(Boolean);
  }
  return expandDegreeKeywords(client, input.careers, logger);
}

/**
 * OpenCode Go path (no web search): suggest from memory, ground in ROR, discover
 * each university's programme page, then extract with the same quote rules.
 * Each grounded university is handed to `onGroup` as soon as it is ready, so
 * the UI can show verified results while the rest are still being read.
 */
export async function pageCandidates(
  http: HttpClient,
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  ror: RorStore,
  logger: Logger | undefined,
  onProgress: (message: string) => void,
  onGroup: (group: CandidateGroup) => void,
  options: PageCandidatesOptions = {},
): Promise<PageCandidatesResult> {
  const reasons: RemovalReasons = {};
  let removed = 0;

  onProgress('Suggesting universities…');
  const suggestions = await suggestUniversities(client, profile, input, logger);
  const grounded = groundSuggestions(suggestions, ror, input);
  removed += grounded.removed;
  mergeCounts(reasons, grounded.reasons);
  if (grounded.records.length === 0) {
    return { removed, reasons };
  }

  const program = input.careers[0] ?? '';
  const keywords = await resolveDegreeKeywords(client, input, logger);
  const target = options.target ?? SEARCH_TARGET_RESULTS;
  const total = grounded.records.length;
  let done = 0;
  let produced = 0;
  let active = 0;

  onProgress('Reading the pages for facts…');
  await mapWithLimit(grounded.records, FETCH_CONCURRENCY, async (record) => {
    done++;
    // Stop once enough universities produced candidates. Failed groups do not
    // hold a reservation, so the search keeps going until it truly has enough
    // (a small overshoot of up to concurrency-1 is fine and capped later).
    if (produced >= target) return;
    active++;
    try {
      let hits: SearchHit[] = [];
      try {
        hits = await fetchUniversityPages(http, record, program, logger, SEARCH_MAX_PAGES, {
          keywords,
          pageCache: options.pageCache,
          timeoutMs: PAGE_FETCH_TIMEOUT_MS,
          deadline: Date.now() + UNIVERSITY_FETCH_TIMEOUT_MS,
        });
      } catch (error) {
        logger?.debug?.(
          `Page fetch failed for ${record.name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      onProgress(`Reading official pages (${done} of ${total})…`);

      if (hits.length === 0) {
        removed++;
        bump(reasons, 'site_unreachable');
        return;
      }

      let candidates: ExtractedCandidate[] = [];
      try {
        candidates = await extractCandidates(client, profile, input.careers, hits, logger);
      } catch (error) {
        removed++;
        bump(reasons, 'ai_answer_rejected');
        logger?.error?.(
          `Extraction failed for ${record.name}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return;
      }

      if (candidates.length === 0) {
        removed++;
        bump(reasons, 'programme_not_found');
        return;
      }

      const keywordEvidence = findProgrammeEvidence(hits, keywords);
      const withEvidence: ExtractedCandidate[] = [];
      for (const candidate of candidates) {
        if (keywordEvidence) {
          // A specific requested keyword is on one of this university's pages;
          // use it as the verified programme for the row.
          withEvidence.push({
            ...candidate,
            programName: keywordEvidence.program,
            programUrl: keywordEvidence.url,
            programQuote: keywordEvidence.quote,
          });
          continue;
        }
        // Non-English pages: accept the model's programme name only if that
        // exact text (any language) appears on a fetched page.
        const nameEvidence = findProgrammeNameEvidence(hits, candidate.programName);
        if (nameEvidence) {
          withEvidence.push({
            ...candidate,
            programName: nameEvidence.program,
            programUrl: nameEvidence.url,
            programQuote: nameEvidence.quote,
          });
        }
      }

      if (withEvidence.length === 0) {
        removed++;
        bump(reasons, 'programme_not_found');
        return;
      }

      produced++;
      onGroup({ record, hits, candidates: withEvidence });
    } finally {
      active--;
    }
  });

  return { removed, reasons };
}
