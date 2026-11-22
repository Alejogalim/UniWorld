import type { Profile, SearchInput, UniResult } from '../contracts';
import { callJson, nextTokenBudget } from '../ai/json';
import { rankingPrompt } from '../ai/prompts';
import { RANK_MAX_TOKENS } from '../config';
import type { AiClient } from '../ai/types';
import type { Logger } from '../ports';
import { rankingSchema, type RankingItemAI } from '../schemas';
import {
  careerFit,
  costFit,
  fallbackWhyFits,
  languageFitScore,
  overallFit,
  sanitizeWhyFits,
} from './scoring';
import type { VerifiedUniversity } from './verify';

function rankingPayload(universities: VerifiedUniversity[]): unknown[] {
  return universities.map(({ result, requirements }) => ({
    rorId: result.rorId,
    name: result.name,
    countryCode: result.countryCode,
    city: result.city ?? null,
    program: result.program,
    overview: result.overview.value,
    languages: result.languages.value,
    tuition: result.tuition.value,
    entryRequirements: requirements?.value ?? null,
  }));
}

function deterministic(uni: VerifiedUniversity, profile: Profile, input: SearchInput): UniResult {
  const { result } = uni;
  const language = languageFitScore(profile, result.languages.value);
  const career = careerFit(result.program, input.careers);
  const cost = costFit(result.tuition.value, profile);
  const updated: UniResult = {
    ...result,
    fit: {
      career,
      admission: 'Unknown',
      language,
      cost,
      overall: 0,
    },
    whyFits: fallbackWhyFits(profile, result),
  };
  updated.fit.overall = overallFit(updated);
  return updated;
}

/** Honest, AI-free fit so the UI can show rows before ranking finishes. */
export function deterministicResults(
  universities: VerifiedUniversity[],
  profile: Profile,
  input: SearchInput,
): VerifiedUniversity[] {
  return universities.map((uni) => ({ ...uni, result: deterministic(uni, profile, input) }));
}

function applyAiItem(
  uni: VerifiedUniversity,
  item: RankingItemAI | undefined,
  profile: Profile,
  input: SearchInput,
): UniResult {
  const fallback = deterministic(uni, profile, input);
  if (!item) return fallback;

  const clamped = (value: number) => Math.max(0, Math.min(1, value));
  const hasTuition = uni.result.tuition.value !== null;
  const cost: UniResult['fit']['cost'] = !hasTuition
    ? 'depends_on_citizenship'
    : item.cost === 'depends_on_citizenship'
      ? 'depends_on_citizenship'
      : clamped(item.cost);
  const admission = uni.requirements?.value ? item.admission : 'Unknown';

  const updated: UniResult = {
    ...uni.result,
    fit: {
      career: clamped(item.career),
      admission,
      language: clamped(item.language),
      cost,
      overall: 0,
    },
    whyFits: '',
  };
  updated.whyFits = sanitizeWhyFits(item.whyFits, profile, updated, fallback.whyFits);
  updated.fit.overall = overallFit(updated);
  return updated;
}

/**
 * Design §7.3 step 5: rank from verified facts only. If the model fails, use
 * the deterministic scores so the UI still gets honest results.
 */
export async function rankVerified(
  client: AiClient,
  profile: Profile,
  input: SearchInput,
  universities: VerifiedUniversity[],
  logger?: Logger,
): Promise<VerifiedUniversity[]> {
  if (universities.length === 0) return [];

  let items: RankingItemAI[] = [];
  try {
    const parsed = await callJson({
      schema: rankingSchema,
      messages: rankingPrompt(profile, rankingPayload(universities)),
      complete: (messages, attempt) =>
        client.chat(messages, {
          json: true,
          temperature: 0.1,
          maxTokens: nextTokenBudget(RANK_MAX_TOKENS, attempt),
        }),
      logger,
    });
    items = parsed.items;
  } catch (error) {
    logger?.warn?.(
      `Ranking call failed, using deterministic scores: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const byId = new Map<string, RankingItemAI>();
  for (const item of items) byId.set(item.rorId, item);

  const ranked = universities.map((uni) => ({
    ...uni,
    result: applyAiItem(uni, byId.get(uni.result.rorId), profile, input),
  }));

  ranked.sort((a, b) => b.result.fit.overall - a.result.fit.overall);
  return ranked;
}
