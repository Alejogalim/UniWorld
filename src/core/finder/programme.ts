import { z } from 'zod';
import { callJson, nextTokenBudget } from '../ai/json';
import type { AiClient, ChatMessage, SearchHit } from '../ai/types';
import { KEYWORD_MAX_TOKENS } from '../config';
import { normalizeText } from '../normalize';
import type { Logger } from '../ports';

const MAX_DEGREE_KEYWORDS = 8;

export const degreeKeywordsSchema = z.object({
  // Accept more than we use: models often return 10, and rejecting the whole
  // reply over two extra keywords wastes a call.
  keywords: z.preprocess(
    (value) => value ?? [],
    z.array(z.string().min(2).max(60)).min(1).max(20),
  ),
});

export interface ProgrammeEvidence {
  /** The programme/degree name as it appears on the page (or the keyword). */
  program: string;
  url: string;
  quote: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const HAS_CJK = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

/**
 * Substring match for scripts without spaces (CJK/kana/hangul); whole-word
 * match for Latin so "Art" does not match "start" and "Arts" not "charts".
 */
export function containsTerm(normalizedHaystack: string, normalizedTerm: string): boolean {
  if (!normalizedTerm) return false;
  if (!/[a-z]/.test(normalizedTerm)) return normalizedHaystack.includes(normalizedTerm);
  const re = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`,
    'i',
  );
  return re.test(normalizedHaystack);
}

/** Crop a long line around the match so the quote always contains the term. */
function around(text: string, keyword: string, limit = 240): string {
  if (text.length <= limit) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return text.slice(0, limit);
  const half = Math.floor((limit - keyword.length) / 2);
  const start = Math.max(0, Math.min(idx - Math.max(0, half), text.length - limit));
  return text.slice(start, start + limit).trim();
}

function keywordIn(text: string, keywords: string[]): string | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  for (const keyword of keywords) {
    if (containsTerm(normalized, normalizeText(keyword))) return keyword;
  }
  return null;
}

/**
 * Evidence gate: a university only survives if one of its own fetched pages
 * mentions a requested degree keyword. Returns the matched text as the
 * verified programme name plus a short quote for the card.
 */
export function findProgrammeEvidence(
  hits: SearchHit[],
  keywords: string[],
): ProgrammeEvidence | null {
  const usable = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => {
      if (!keyword) return false;
      const normalized = normalizeText(keyword);
      // Ignore short/generic terms ("AI", "Art") that match incidentally.
      return normalized.length >= 6 || normalized.includes(' ') || HAS_CJK.test(normalized);
    });
  if (usable.length === 0) return null;

  for (const hit of hits) {
    const titleMatch = keywordIn(hit.title, usable);
    const lines = hit.text.split(/\n|(?<=[.!?])\s+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = keywordIn(trimmed, usable);
      if (!match) continue;
      const hasCjk = HAS_CJK.test(trimmed);
      if (!hasCjk && trimmed.split(/\s+/).filter(Boolean).length < 3) continue;
      // The quote must contain the keyword; a title-only match is not evidence.
      return {
        program: (titleMatch && hit.title.trim()) || match,
        url: hit.url,
        quote: around(trimmed, match),
      };
    }
  }
  return null;
}

function sentenceFor(hit: SearchHit, name: string): string | null {
  const needle = normalizeText(name);
  if (!needle) return null;
  const lines = hit.text.split(/\n|(?<=[.!?])\s+/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, ' ');
    if (trimmed && containsTerm(normalizeText(trimmed), needle)) {
      return around(trimmed, name);
    }
  }
  return null;
}

/**
 * Fallback evidence for non-English sites: accept the programme name the model
 * extracted only if that exact text (any language) appears on a fetched page.
 */
export function findProgrammeNameEvidence(
  hits: SearchHit[],
  name: string | null | undefined,
): ProgrammeEvidence | null {
  const cleaned = (name ?? '').trim();
  const needle = normalizeText(cleaned);
  const minLen = HAS_CJK.test(needle) ? 2 : 4;
  if (needle.length < minLen) return null;
  for (const hit of hits) {
    if (containsTerm(normalizeText(hit.title), needle)) {
      return { program: cleaned, url: hit.url, quote: hit.title.trim() };
    }
    if (!containsTerm(normalizeText(hit.text), needle)) continue;
    return {
      program: cleaned,
      url: hit.url,
      quote: sentenceFor(hit, cleaned) ?? cleaned,
    };
  }
  return null;
}

function keywordPrompt(careers: string[]): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You map a student career to the degree/programme names universities use.',
        'Return English degree keywords only (for example "Robotics" -> Robotics, Mechatronics, Automation, Mechanical engineering, Computer science, Artificial intelligence).',
        'Keep them short, concrete and searchable. No facts, no commentary, no reasoning.',
        'Return only JSON matching this shape:',
        JSON.stringify({ keywords: ['degree or programme name'] }),
      ].join(' '),
    },
    {
      role: 'user',
      content: `Careers: ${careers.join(', ')}\n\nReturn the JSON now.`,
    },
  ];
}

/**
 * One small AI call to widen "Robotics" into the degree names a programme page
 * would actually use. Falls back to the raw careers on any failure.
 */
export async function expandDegreeKeywords(
  client: AiClient,
  careers: string[],
  logger?: Logger,
): Promise<string[]> {
  const cleaned = careers.map((career) => career.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];
  try {
    const parsed = await callJson({
      schema: degreeKeywordsSchema,
      messages: keywordPrompt(cleaned),
      complete: (messages, attempt) =>
        client.chat(messages, {
          json: true,
          temperature: 0.1,
          maxTokens: nextTokenBudget(KEYWORD_MAX_TOKENS, attempt),
        }),
      logger,
    });
    const keywords = [...new Set(parsed.keywords.map((keyword) => keyword.trim()))].filter(Boolean);
    return keywords.length > 0 ? keywords.slice(0, MAX_DEGREE_KEYWORDS) : cleaned;
  } catch (error) {
    logger?.warn?.(
      `Degree keyword expansion failed, using the careers as keywords: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return cleaned;
  }
}
