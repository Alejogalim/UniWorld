import type {
  FinderEvent,
  Profile,
  Provider,
  RemovalReason,
  RemovalReasons,
  SearchInput,
  UniDetail,
  UniResult,
} from '../contracts';
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
import { deterministicResults, rankVerified } from './rank';
import { pageCandidates, type CandidateGroup, type PageCandidatesResult } from './suggest';
import { mergeResults, verifyCandidates, type VerifiedUniversity } from './verify';

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

interface WebResult extends PageCandidatesResult {
  candidates: Awaited<ReturnType<typeof extractCandidates>>;
  index: CitationIndex;
}

/** OpenRouter path: planned web search, then extraction from the hits. */
async function webCandidates(
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  deps: CoreDeps,
  onEvent: EmitFn,
): Promise<WebResult> {
  onEvent({ type: 'progress', message: 'Searching the web…' });
  const queries = await planQueries(client, profile, input, deps.logger);
  const hits = await client.search(queries, { maxResults: SEARCH_MAX_RESULTS_PER_QUERY });
  if (hits.length === 0) {
    return { candidates: [], index: CitationIndex.fromHits([]), removed: 0, reasons: {} };
  }
  try {
    const candidates = await extractCandidates(client, profile, input.careers, hits, deps.logger);
    return { candidates, index: CitationIndex.fromHits(hits), removed: 0, reasons: {} };
  } catch (error) {
    deps.logger?.error?.(
      `Web extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      candidates: [],
      index: CitationIndex.fromHits(hits),
      removed: 1,
      reasons: { ai_answer_rejected: 1 },
    };
  }
}

function addReason(reasons: RemovalReasons, reason: RemovalReason, count = 1): void {
  reasons[reason] = (reasons[reason] ?? 0) + count;
}

function mergeReasons(into: RemovalReasons, from: RemovalReasons | undefined): void {
  if (!from) return;
  for (const [reason, count] of Object.entries(from) as [RemovalReason, number][]) {
    addReason(into, reason, count);
  }
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
        const seen = new Set<string>();
        const results = cached.results.filter((result) => {
          if (seen.has(result.rorId)) return false;
          seen.add(result.rorId);
          return true;
        });
        for (const result of results) onEvent({ type: 'result', uni: result });
        onEvent({ type: 'done', verified: results.length, removed: cached.rejectedCount });
        return;
      }
    }

    const client = await createAiClient(provider, deps);

    const reasons: RemovalReasons = {};
    let totalRemoved = 0;
    const verifiedAll: VerifiedUniversity[] = [];

    const emitDeterministic = (verified: VerifiedUniversity[]) => {
      if (verified.length === 0) return;
      for (const entry of deterministicResults(verified, profile, input)) {
        onEvent({ type: 'result', uni: entry.result });
      }
    };

    const verifyGroup = (group: CandidateGroup) => {
      const { verified, removed, reasons: groupReasons } = verifyCandidates(group.candidates, {
        ror,
        index: CitationIndex.fromHits(group.hits),
        profile,
        input,
        checkedAt,
      });
      totalRemoved += removed;
      mergeReasons(reasons, groupReasons);
      verifiedAll.push(...verified);
      emitDeterministic(verified);
    };

    if (provider === 'openrouter') {
      const found = await webCandidates(client, profile, input, deps, onEvent);
      totalRemoved += found.removed;
      mergeReasons(reasons, found.reasons);

      if (found.candidates.length > 0) {
        onEvent({
          type: 'progress',
          message: `Checking ${found.candidates.length} candidates against the university registry…`,
        });
        const { verified, removed, reasons: verifyReasons } = verifyCandidates(found.candidates, {
          ror,
          index: found.index,
          profile,
          input,
          checkedAt,
        });
        totalRemoved += removed;
        mergeReasons(reasons, verifyReasons);
        verifiedAll.push(...verified);
        onEvent({
          type: 'progress',
          message: `${verified.length} verified, ${removed} removed.`,
        });
      }
    } else {
      const pageResult = await pageCandidates(
        deps.http,
        client,
        profile,
        input,
        ror,
        deps.logger,
        (message) => onEvent({ type: 'progress', message }),
        verifyGroup,
        { pageCache: deps.pages },
      );
      totalRemoved += pageResult.removed;
      mergeReasons(reasons, pageResult.reasons);
    }

    // Different groups can ground to the same ROR id (shared domains); keep one.
    const byRorId = new Map<string, VerifiedUniversity>();
    for (const entry of verifiedAll) {
      const existing = byRorId.get(entry.result.rorId);
      if (!existing) {
        byRorId.set(entry.result.rorId, entry);
      } else {
        byRorId.set(entry.result.rorId, {
          ...existing,
          result: mergeResults(existing.result, entry.result),
        });
      }
    }
    const uniqueVerified = [...byRorId.values()];

    if (uniqueVerified.length === 0) {
      onEvent({ type: 'progress', message: TOO_FEW });
      onEvent({
        type: 'done',
        verified: 0,
        removed: totalRemoved,
        ...(Object.keys(reasons).length > 0 ? { reasons } : {}),
      });
      return;
    }

    const ranked = await rankVerified(client, profile, input, uniqueVerified, deps.logger);
    const results = ranked.slice(0, MAX_RESULTS).map((entry) => entry.result);
    const capped = Math.max(0, ranked.length - results.length);
    if (capped > 0) {
      totalRemoved += capped;
      addReason(reasons, 'over_cap', capped);
    }

    // Re-emit better-ranked versions: the UI replaces rows by rorId and re-sorts.
    for (const result of results) onEvent({ type: 'result', uni: result as UniResult });

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

    onEvent({
      type: 'done',
      verified: results.length,
      removed: totalRemoved,
      ...(Object.keys(reasons).length > 0 ? { reasons } : {}),
    });
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
