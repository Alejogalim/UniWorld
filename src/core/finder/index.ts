import type { FinderEvent, Profile, Provider, SearchInput, UniDetail } from '../contracts';
import { createAiClient, FINDER_NEEDS_OPENROUTER, pickFinderProvider } from '../ai/index';
import type { AiClient } from '../ai/types';
import {
  MAX_RESULTS,
  MIN_VERIFIED_RESULTS,
  SEARCH_MAX_RESULTS_PER_QUERY,
} from '../config';
import { CitationIndex } from '../grounding/citationValidator';
import type { RorStore } from '../grounding/rorStore';
import type { CoreDeps } from '../ports';
import { loadDetail, type DetailOptions } from './detail';
import { extractCandidates } from './extract';
import { planQueries } from './planQueries';
import { rankVerified } from './rank';
import { pageCandidates, type PageCandidates } from './suggest';
import { verifyCandidates } from './verify';

export interface FinderContext {
  deps: CoreDeps;
  ror: RorStore;
}

export interface FinderApi {
  search(input: SearchInput, onEvent: (event: FinderEvent) => void): Promise<void>;
  detail(rorId: string, program: string, options?: DetailOptions): Promise<UniDetail>;
}

const TOO_FEW = "Couldn't verify enough results, try a narrower scope.";

type EmitFn = (event: FinderEvent) => void;

/** OpenRouter path: planned web search, then extraction from the hits. */
async function webCandidates(
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  deps: CoreDeps,
  onEvent: EmitFn,
): Promise<PageCandidates> {
  onEvent({ type: 'progress', message: 'Searching the web…' });
  const queries = await planQueries(client, profile, input, deps.logger);
  const hits = await client.search(queries, { maxResults: SEARCH_MAX_RESULTS_PER_QUERY });
  if (hits.length === 0) {
    return { candidates: [], index: CitationIndex.fromHits([]), removed: 0 };
  }
  const candidates = await extractCandidates(client, profile, input.careers, hits, deps.logger);
  return { candidates, index: CitationIndex.fromHits(hits), removed: 0 };
}

export async function finderSearch(
  ctx: FinderContext,
  input: SearchInput,
  onEvent: (event: FinderEvent) => void,
): Promise<void> {
  const { deps, ror } = ctx;
  const now = deps.now?.() ?? new Date();
  const checkedAt = now.toISOString();

  try {
    const profile = await deps.profile.get();
    if (!profile) {
      onEvent({ type: 'error', message: 'Complete onboarding before searching.' });
      return;
    }

    const provider: Provider | null = await pickFinderProvider(deps);
    if (!provider) {
      onEvent({ type: 'error', message: FINDER_NEEDS_OPENROUTER });
      return;
    }

    if (deps.searches) {
      const cached = await deps.searches.get(input);
      if (cached) {
        onEvent({ type: 'progress', message: 'Loaded cached results.' });
        for (const result of cached.results) onEvent({ type: 'result', uni: result });
        onEvent({ type: 'done', verified: cached.results.length, removed: cached.rejectedCount });
        return;
      }
    }

    const client = await createAiClient(provider, deps);

    const found =
      provider === 'openrouter'
        ? await webCandidates(client, profile, input, deps, onEvent)
        : await pageCandidates(
            deps.http,
            client,
            profile,
            input,
            ror,
            deps.logger,
            (message) => onEvent({ type: 'progress', message }),
          );

    if (found.candidates.length === 0) {
      onEvent({ type: 'progress', message: TOO_FEW });
      onEvent({ type: 'done', verified: 0, removed: found.removed });
      return;
    }

    onEvent({
      type: 'progress',
      message: `Checking ${found.candidates.length} candidates against the university registry…`,
    });

    const { verified, removed } = verifyCandidates(found.candidates, {
      ror,
      index: found.index,
      profile,
      input,
      checkedAt,
    });
    onEvent({
      type: 'progress',
      message: `${verified.length} verified, ${removed} removed.`,
    });

    const ranked = await rankVerified(client, profile, input, verified, deps.logger);
    const results = ranked.slice(0, MAX_RESULTS).map((entry) => entry.result);
    const capped = Math.max(0, ranked.length - results.length);
    const totalRemoved = found.removed + removed + capped;

    for (const result of results) onEvent({ type: 'result', uni: result });

    if (results.length < MIN_VERIFIED_RESULTS) {
      onEvent({ type: 'progress', message: TOO_FEW });
    }

    if (deps.searches && results.length > 0) {
      await deps.searches.put(input, {
        results,
        rejectedCount: totalRemoved,
        createdAt: checkedAt,
      });
    }

    onEvent({ type: 'done', verified: results.length, removed: totalRemoved });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.logger?.error?.(`Finder search failed: ${message}`);
    onEvent({ type: 'error', message });
  }
}

export function createFinder(ctx: FinderContext): FinderApi {
  return {
    search: (input, onEvent) => finderSearch(ctx, input, onEvent),
    detail: (rorId, program, options) => loadDetail(ctx.deps, ctx.ror, rorId, program, options),
  };
}
