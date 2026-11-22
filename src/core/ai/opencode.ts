import type { Provider } from '../contracts';
import { OPENCODE_BASE_URL, OPENCODE_MODEL, OPENCODE_USER_AGENT } from '../config';
import type { HttpClient } from '../ports';
import {
  consumeSse,
  extractContent,
  ProviderError,
  readError,
  withTimeoutSignal,
} from './transport';
import type { AiClient, ChatMessage, ChatOptions, SearchHit, SearchOptions } from './types';

export interface OpenCodeOptions {
  http: HttpClient;
  apiKey: string;
  model?: string;
  /** Stable per conversation, as required by OpenCode Go. */
  sessionId?: string | number;
}

export class OpenCodeClient implements AiClient {
  readonly provider: Provider = 'opencode';
  private readonly http: HttpClient;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly sessionId: string;

  constructor(options: OpenCodeOptions) {
    this.http = options.http;
    this.apiKey = options.apiKey;
    this.model = options.model || OPENCODE_MODEL;
    this.sessionId = `unifinder-${options.sessionId ?? 'default'}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': OPENCODE_USER_AGENT,
      'x-opencode-session': this.sessionId,
    };
  }

  private post(body: Record<string, unknown>, signal?: AbortSignal) {
    return this.http.fetch(`${OPENCODE_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal,
    });
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (options.onToken) return this.stream(messages, options);
    const body: Record<string, unknown> = {
      model: options.model ?? this.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
    };
    if (options.json) body.response_format = { type: 'json_object' };
    let response = await this.post(body, withTimeoutSignal(options.signal));
    if (!response.ok && response.status === 400 && options.json) {
      delete body.response_format;
      response = await this.post(body, withTimeoutSignal(options.signal));
    }
    if (!response.ok) throw new ProviderError(await readError(response), response.status);
    const payload: unknown = await response.json();
    return extractContent(payload).content;
  }

  async stream(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const onToken = options.onToken;
    if (!onToken) {
      const { onToken: _ignored, ...rest } = options;
      return this.chat(messages, rest);
    }
    const body: Record<string, unknown> = {
      model: options.model ?? this.model,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1200,
      stream: true,
    };
    if (options.json) body.response_format = { type: 'json_object' };
    // No wall-clock timeout here: a long answer would be cut mid-stream. Only
    // the caller can abort streaming.
    const response = await this.post(body, options.signal);
    if (!response.ok) throw new ProviderError(await readError(response), response.status);
    return consumeSse(response, onToken);
  }

  async search(_queries: string[], _options?: SearchOptions): Promise<SearchHit[]> {
    throw new ProviderError('OpenCode Go has no web search. Use OpenRouter for Finder.', 400);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.post({
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      if (response.ok) return { ok: true };
      return { ok: false, error: await readError(response) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
