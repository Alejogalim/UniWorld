import type { HttpResponseLike } from '../ports';

/**
 * Adds a wall-clock cap to a provider call so a stalled request cannot hang a
 * whole search. Falls back to the caller's signal where `AbortSignal.any` is
 * unavailable.
 */
export function withTimeoutSignal(signal?: AbortSignal, ms = 90_000): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  const any = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  return any ? any([signal, timeout]) : signal;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfter?: string | null,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export async function readError(response: HttpResponseLike): Promise<string> {
  try {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error?.message) return parsed.error.message;
      if (parsed.message) return parsed.message;
    } catch {
      // not JSON
    }
    return body.slice(0, 500) || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export interface ExtractedContent {
  content: string;
  annotations: unknown[];
  /** `length` means the reply was cut off by the token budget. */
  finishReason: string | null;
  /** Reasoning models put their scratchpad here; never used as the answer. */
  reasoning: string;
}

export function extractContent(payload: unknown): ExtractedContent {
  const root = payload as {
    choices?: {
      finish_reason?: string | null;
      message?: {
        content?: string | null;
        annotations?: unknown[];
        reasoning_content?: string | null;
        reasoning?: string | null;
      };
      delta?: { content?: string | null };
    }[];
  };
  const choice = root.choices?.[0];
  const message = choice?.message;
  return {
    content: message?.content ?? '',
    annotations: message?.annotations ?? [],
    finishReason: choice?.finish_reason ?? null,
    reasoning: message?.reasoning_content ?? message?.reasoning ?? '',
  };
}

/** True when the reply is unusable: empty content or cut off by `max_tokens`. */
export function looksTruncated(content: string, finishReason: string | null): boolean {
  return content.trim().length === 0 || finishReason === 'length';
}

interface SseChunk {
  choices?: { delta?: { content?: string | null } }[];
}

/**
 * Reads an SSE response token by token. Falls back to a single text body when
 * the adapter cannot expose a stream (some Tauri http builds).
 */
export async function consumeSse(
  response: HttpResponseLike,
  onToken: (token: string) => void,
): Promise<string> {
  const body = response.body;
  if (!body) {
    const text = await response.text();
    // Some adapters (notably tauri-plugin-http) do not expose a stream body,
    // but the full SSE payload is still available as text.
    if (/^\s*data:/m.test(text)) {
      let full = '';
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data) as SseChunk;
          const token = chunk.choices?.[0]?.delta?.content ?? '';
          if (token) {
            full += token;
            onToken(token);
          }
        } catch {
          // ignore malformed lines
        }
      }
      if (full) return full;
    }
    try {
      const payload: unknown = JSON.parse(text);
      const content = extractContent(payload).content;
      if (content) onToken(content);
      return content;
    } catch {
      return '';
    }
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const chunk = JSON.parse(data) as SseChunk;
        const token = chunk.choices?.[0]?.delta?.content ?? '';
        if (token) {
          full += token;
          onToken(token);
        }
      } catch {
        // Ignore keep-alive and malformed lines.
      }
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith('data:')) {
    const data = tail.slice(5).trim();
    if (data && data !== '[DONE]') {
      try {
        const chunk = JSON.parse(data) as SseChunk;
        const token = chunk.choices?.[0]?.delta?.content ?? '';
        if (token) {
          full += token;
          onToken(token);
        }
      } catch {
        // ignore
      }
    }
  }

  return full;
}
