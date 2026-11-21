import type { Profile } from '../contracts';
import { callJson } from '../ai/json';
import { extractionPrompt } from '../ai/prompts';
import type { AiClient, SearchHit } from '../ai/types';
import {
  EXTRACT_MAX_CANDIDATES,
  EXTRACT_MAX_CHARS_PER_HIT,
  EXTRACT_MAX_TOTAL_CHARS,
} from '../config';
import type { Logger } from '../ports';
import { extractionSchema, type ExtractedCandidate } from '../schemas';

export async function extractCandidates(
  client: AiClient,
  profile: Profile,
  careers: string[],
  hits: SearchHit[],
  logger?: Logger,
): Promise<ExtractedCandidate[]> {
  if (hits.length === 0) return [];
  try {
    const parsed = await callJson({
      schema: extractionSchema,
      messages: extractionPrompt(
        careers,
        profile,
        hits,
        EXTRACT_MAX_CHARS_PER_HIT,
        EXTRACT_MAX_TOTAL_CHARS,
      ),
      complete: (messages) =>
        client.chat(messages, { json: true, temperature: 0.1, maxTokens: 4000 }),
      logger,
    });
    return parsed.candidates.slice(0, EXTRACT_MAX_CANDIDATES).map((candidate) => ({
      ...candidate,
      instructionLanguages: candidate.instructionLanguages ?? [],
      sourceUrls: candidate.sourceUrls ?? [],
    }));
  } catch (error) {
    logger?.error?.(
      `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
