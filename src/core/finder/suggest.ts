import { z } from 'zod';
import type { Profile, SearchInput } from '../contracts';
import { callJson } from '../ai/json';
import { profileToText, scopeToText } from '../ai/prompts';
import type { AiClient, ChatMessage, SearchHit } from '../ai/types';
import { CitationIndex } from '../grounding/citationValidator';
import type { RorStore } from '../grounding/rorStore';
import type { UniversityRecord } from '../grounding/types';
import type { HttpClient, Logger } from '../ports';
import type { ExtractedCandidate } from '../schemas';
import { extractCandidates } from './extract';
import { inScope } from './verify';
import { fetchUniversityPages } from './webFetch';

/** OpenCode-only path: how many grounded universities we read (Design §14 cap). */
export const OPENCODE_MAX_UNIVERSITIES = 12;
/** How many names we ask the model for before ROR grounding drops most of them. */
const SUGGEST_COUNT = 24;
/** Official-page budget per university on search (detail uses 8). */
const SEARCH_MAX_PAGES = 4;
const FETCH_CONCURRENCY = 3;
/** Universities whose pages go into one extraction call. */
const EXTRACT_BATCH_SIZE = 3;

export const suggestionSchema = z.object({
  universities: z.array(
    z.object({
      name: z.string().min(2).max(200),
      country: z.string().min(2).max(100),
    }),
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
        'Respond in English.',
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
    complete: (messages) => client.chat(messages, { json: true, temperature: 0.1, maxTokens: 1500 }),
    logger,
  });
  return parsed.universities.slice(0, SUGGEST_COUNT);
}

export interface GroundedSuggestions {
  records: UniversityRecord[];
  /** Suggestions that were unmatched, out of scope, or over the cap. */
  removed: number;
}

/** Step 2: keep only suggestions that match a ROR record in scope, deduped. */
export function groundSuggestions(
  suggestions: SuggestedUniversity[],
  ror: RorStore,
  input: SearchInput,
): GroundedSuggestions {
  const seen = new Set<string>();
  const records: UniversityRecord[] = [];
  let removed = 0;

  for (const suggestion of suggestions) {
    const match = ror.match({ name: suggestion.name, country: suggestion.country });
    if (!match || !inScope(match.record, input.scope)) {
      removed++;
      continue;
    }
    if (seen.has(match.record.ror_id)) continue;
    seen.add(match.record.ror_id);
    if (records.length >= OPENCODE_MAX_UNIVERSITIES) {
      removed++;
      continue;
    }
    records.push(match.record);
  }

  return { records, removed };
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

export interface PageCandidates {
  candidates: ExtractedCandidate[];
  index: CitationIndex;
  removed: number;
}

/**
 * OpenCode Go path (no web search): suggest from memory, ground in ROR, read
 * each university's own pages, then extract with the same quote rules. Facts
 * still come only from fetched page text, so verification is unchanged.
 */
export async function pageCandidates(
  http: HttpClient,
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  ror: RorStore,
  logger: Logger | undefined,
  onProgress: (message: string) => void,
): Promise<PageCandidates> {
  onProgress('Suggesting universities…');
  const suggestions = await suggestUniversities(client, profile, input, logger);
  const grounded = groundSuggestions(suggestions, ror, input);
  let removed = grounded.removed;
  if (grounded.records.length === 0) {
    return { candidates: [], index: CitationIndex.fromHits([]), removed };
  }

  const program = input.careers[0] ?? '';
  const total = grounded.records.length;
  let done = 0;
  const pages = await mapWithLimit(grounded.records, FETCH_CONCURRENCY, async (record) => {
    let hits: SearchHit[] = [];
    try {
      hits = await fetchUniversityPages(http, record, program, logger, SEARCH_MAX_PAGES);
    } catch (error) {
      logger?.debug?.(
        `Page fetch failed for ${record.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    done++;
    onProgress(`Reading official pages (${done} of ${total})…`);
    return hits;
  });

  const withPages = pages.filter((hits) => hits.length > 0);
  removed += pages.length - withPages.length;
  const allHits = withPages.flat();
  if (allHits.length === 0) {
    return { candidates: [], index: CitationIndex.fromHits([]), removed };
  }

  onProgress('Reading the pages for facts…');
  const candidates: ExtractedCandidate[] = [];
  for (let start = 0; start < withPages.length; start += EXTRACT_BATCH_SIZE) {
    const batch = withPages.slice(start, start + EXTRACT_BATCH_SIZE).flat();
    const extracted = await extractCandidates(client, profile, input.careers, batch, logger);
    candidates.push(...extracted);
  }

  return { candidates, index: CitationIndex.fromHits(allHits), removed };
}
