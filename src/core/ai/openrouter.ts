import type { Provider } from '../contracts';
import {
  DEFAULT_MODEL,
  OPENROUTER_BASE_URL,
  SEARCH_MAX_CHARACTERS,
  SEARCH_MAX_RESULTS_PER_QUERY,
} from '../config';
import { canonicalJson, normalizeUrl } from '../normalize';
import type { HttpClient } from '../ports';
import { consumeSse, extractContent, ProviderError, readError } from './transport';
import type { AiClient, ChatMessage, ChatOptions, SearchHit, SearchOptions } from './types';

export interface OpenRouterOptions {
  http: HttpClient;
  apiKey: string;
  model?: string;
}

interface UrlCitation {
  url?: string;
  title?: string;
  content?: string;
  start_index?: number;
  end_index?: number;
}

interface Annotation {
  type?: string;
  url?: string;
  title?: string;
  content?: string;
  url_citation?: UrlCitation;
}

function citationsFrom(payload: unknown, fallbackText: string): SearchHit[] {
  const { annotations } = extractContent(payload);
  const hits: SearchHit[] = [];
  for (const raw of annotations) {
    const annotation = raw as Annotation;
    const citation = annotation.url_citation;
    const url = citation?.url ?? annotation.url;
    if (!url) continue;
    const content =
      citation?.content ??
      annotation.content ??
      (citation?.start_index !== undefined && citation?.end_index !== undefined
        ? fallbackText.slice(citation.start_index, citation.end_index)
        : '');
    hits.push({
      url,
      title: citation?.title ?? annotation.title ?? url,
      text: content ?? '',
    });
  }
  return hits;
}

/** Last-resort fallback when the provider returns links in markdown only. */
function markdownLinks(text: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const regex = /\[([^\]]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
  for (const match of text.matchAll(regex)) {
    const title = match[1] ?? '';
    const url = match[2];
    if (!url) continue;
    hits.push({ url, title: title || url, text });
  }
  return hits;
}

export class OpenRouterClient implements AiClient {
  readonly provider: Provider = 'openrouter';
  private readonly http: HttpClient;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenRouterOptions) {
    this.http = options.http;
    this.apiKey = options.apiKey;
    this.model = options.model || DEFAULT_MODEL;
  }

  private headers(json = true): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      'HTTP-Referer': 'https://github.com/unifinder',
      'X-Title': 'UniFinder',
    };
  }

  private async post(body: Record<string, unknown>, signal?: AbortSignal) {
    return this.http.fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal,
    });
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (options.onToken) return this.stream(messages, options);

    const base: Record<string, unknown> = {
      model: options.model ?? this.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
      provider: { zdr: true },
    };
    if (options.json) base.response_format = { type: 'json_object' };

    let response = await this.post(base, options.signal);
    if (!response.ok && response.status === 400 && options.json) {
      delete base.response_format;
      response = await this.post(base, options.signal);
    }
    if (!response.ok) {
      throw new ProviderError(await readError(response), response.status);
    }
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
      provider: { zdr: true },
    };
    if (options.json) body.response_format = { type: 'json_object' };
    const response = await this.post(body, options.signal);
    if (!response.ok) throw new ProviderError(await readError(response), response.status);
    return consumeSse(response, onToken);
  }

  private async searchOne(query: string, options: SearchOptions): Promise<SearchHit[]> {
    const maxResults = options.maxResults ?? SEARCH_MAX_RESULTS_PER_QUERY;
    const system =
      'You are a web search executor. Search the web for the query. ' +
      'Do not answer the question and do not add facts. Reply with one short sentence.';
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: `Search the web for: ${query}` },
    ];

    const plugin: Record<string, unknown> = {
      id: 'web',
      engine: 'exa',
      max_results: maxResults,
    };
    if (options.allowedDomains?.length) plugin.allowed_domains = options.allowedDomains;

    const base: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0,
      max_tokens: 300,
      plugins: [plugin],
      provider: { zdr: true },
    };
    if (options.maxCharacters ?? SEARCH_MAX_CHARACTERS) {
      base.web_search_options = {
        search_context_size: 'medium',
      };
    }

    let response = await this.post(base, options.signal);
    if (!response.ok && response.status === 400) {
      delete base.web_search_options;
      response = await this.post(base, options.signal);
    }
    if (!response.ok && response.status === 400) {
      return this.searchWithServerTool(messages, maxResults, options);
    }
    if (!response.ok) throw new ProviderError(await readError(response), response.status);

    const payload: unknown = await response.json();
    const content = extractContent(payload).content;
    const hits = citationsFrom(payload, content);
    if (hits.length > 0) return hits;

    return this.searchWithServerTool(messages, maxResults, options);
  }

  private async searchWithServerTool(
    messages: ChatMessage[],
    maxResults: number,
    options: SearchOptions,
  ): Promise<SearchHit[]> {
    const toolBody: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0,
      max_tokens: 600,
      tools: [
        {
          type: 'openrouter:web_search',
          parameters: {
            engine: 'exa',
            max_results: maxResults,
            ...(options.allowedDomains?.length
              ? { allowed_domains: options.allowedDomains }
              : {}),
          },
        },
      ],
      provider: { zdr: true },
    };
    const toolResponse = await this.post(toolBody, options.signal);
    if (!toolResponse.ok) {
      return markdownLinks(
        await toolResponse.text().catch(() => ''),
      );
    }
    const toolPayload: unknown = await toolResponse.json();
    const toolContent = extractContent(toolPayload).content;
    const toolHits = citationsFrom(toolPayload, toolContent);
    return toolHits.length > 0 ? toolHits : markdownLinks(toolContent);
  }

  async search(queries: string[], options: SearchOptions = {}): Promise<SearchHit[]> {
    const byUrl = new Map<string, SearchHit>();
    for (const query of queries) {
      const hits = await this.searchOne(query, options);
      for (const hit of hits) {
        const key = normalizeUrl(hit.url);
        const existing = byUrl.get(key);
        if (existing) {
          const merged = `${existing.text}\n${hit.text}`.trim();
          if (merged !== existing.text) existing.text = merged;
        } else {
          byUrl.set(key, { ...hit });
        }
      }
    }
    return [...byUrl.values()];
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.http.fetch(`${OPENROUTER_BASE_URL}/key`, {
        method: 'GET',
        headers: this.headers(false),
      });
      if (response.ok) return { ok: true };
      if (response.status === 404 || response.status === 405) {
        const fallback = await this.post({
          model: this.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          provider: { zdr: true },
        });
        return fallback.ok ? { ok: true } : { ok: false, error: await readError(fallback) };
      }
      return { ok: false, error: await readError(response) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Stable cache key helper for tests and debugging. */
  static key(messages: ChatMessage[]): string {
    return canonicalJson(messages);
  }
}
