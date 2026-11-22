import type { z } from 'zod';
import type { ChatMessage } from './types';
import type { Logger } from '../ports';

export class AiFormatError extends Error {
  constructor(
    message: string,
    readonly raw: string,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = 'AiFormatError';
  }
}

export interface CallJsonOptions<T> {
  schema: z.ZodType<T>;
  messages: ChatMessage[];
  /**
   * Calls the model. `attempt` is 0 on the first try and increases on retries,
   * so callers can raise `max_tokens` when the first reply was truncated.
   */
  complete: (messages: ChatMessage[], attempt: number) => Promise<string>;
  /** Design §8: retried once on invalid JSON. */
  retries?: number;
  logger?: Logger;
}

/** Doubles the token budget on each retry, capped so a runaway prompt can't grow forever. */
export function nextTokenBudget(base: number, attempt: number, cap = 8000): number {
  return Math.min(cap, Math.round(base * 2 ** attempt));
}

const RAW_LOG_CHARS = 500;

function rawSnippet(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '<empty reply>';
  return trimmed.slice(0, RAW_LOG_CHARS);
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * Calls the model, parses JSON, validates with Zod, and retries once with the
 * validation error fed back. Throws `AiFormatError` when both attempts fail.
 */
export async function callJson<T>(options: CallJsonOptions<T>): Promise<T> {
  const retries = options.retries ?? 1;
  let messages = options.messages;
  let lastRaw = '';
  let lastIssues: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const raw = await options.complete(messages, attempt);
    lastRaw = raw;
    try {
      const parsed: unknown = JSON.parse(stripFences(raw));
      const result = options.schema.safeParse(parsed);
      if (result.success) return result.data;
      lastIssues = result.error.issues;
      options.logger?.warn?.(
        `AI JSON failed validation (attempt ${attempt + 1}): ${JSON.stringify(result.error.issues)}`,
      );
      options.logger?.error?.(`AI reply that failed validation: ${rawSnippet(raw)}`);
      messages = [
        ...messages,
        { role: 'assistant', content: raw },
        {
          role: 'user',
          content:
            'That JSON did not match the required schema. Return only corrected JSON, with no markdown or commentary. Validation errors: ' +
            JSON.stringify(result.error.issues),
        },
      ];
    } catch (error) {
      lastIssues = error instanceof Error ? error.message : String(error);
      const empty = raw.trim().length === 0;
      options.logger?.warn?.(
        `AI returned ${empty ? 'an empty reply' : 'invalid JSON'} (attempt ${attempt + 1}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      options.logger?.error?.(`AI raw reply: ${rawSnippet(raw)}`);
      messages = [
        ...messages,
        { role: 'assistant', content: raw || '(empty)' },
        {
          role: 'user',
          content: empty
            ? 'Your previous reply was empty. Return only the JSON object matching the schema, with no reasoning, markdown or commentary.'
            : 'That was not valid JSON. Return only a valid JSON object matching the schema, with no markdown fences or commentary.',
        },
      ];
    }
  }

  throw new AiFormatError('The AI did not return valid JSON after one retry.', lastRaw, lastIssues);
}
