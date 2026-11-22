import { describe, expect, it } from 'bun:test';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { fetchProviderModels } from './models';
import { ProviderError } from './transport';

function jsonResponse(payload: unknown, status = 200): HttpResponseLike {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => payload,
  };
}

class FakeHttp implements HttpClient {
  readonly calls: { url: string; init?: HttpRequestInit }[] = [];

  constructor(private readonly response: HttpResponseLike) {}

  async fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.calls.push({ url, init });
    return this.response;
  }
}

describe('fetchProviderModels', () => {
  it('keeps text models, drops others, fills a missing name and sorts', async () => {
    const http = new FakeHttp(
      jsonResponse({
        data: [
          { id: 'b/model', name: 'Beta', architecture: { output_modalities: ['text'] } },
          { id: 'a/model', name: 'Alpha', architecture: { output_modalities: ['text', 'image'] } },
          { id: 'embed', name: 'Embed', architecture: { output_modalities: ['embeddings'] } },
          { id: 'no-name', architecture: { output_modalities: ['text'] } },
        ],
      }),
    );

    const models = await fetchProviderModels('openrouter', { http, apiKey: 'or-key' });

    expect(models).toEqual([
      { id: 'a/model', name: 'Alpha' },
      { id: 'b/model', name: 'Beta' },
      { id: 'no-name', name: 'no-name' },
    ]);
    expect(http.calls[0]?.url).toBe('https://openrouter.ai/api/v1/models');
    expect(http.calls[0]?.init?.method).toBe('GET');
    // The OpenRouter catalogue is public; never send the key to it.
    expect(http.calls[0]?.init?.headers?.Authorization).toBeUndefined();
  });

  it('uses the OpenCode Go catalogue and ignores non-chat entries', async () => {
    const http = new FakeHttp(
      jsonResponse({
        data: [
          { id: 'deepseek-v4.1-flash', name: 'DeepSeek', type: 'chat' },
          { id: 'embed', name: 'Embedding', type: 'embedding' },
        ],
      }),
    );

    const models = await fetchProviderModels('opencode', { http, apiKey: 'oc-key' });

    expect(models).toEqual([{ id: 'deepseek-v4.1-flash', name: 'DeepSeek' }]);
    expect(http.calls[0]?.url).toBe('https://opencode.ai/inference/go/v1/models');
    expect(http.calls[0]?.init?.headers?.Authorization).toBe('Bearer oc-key');
    expect(http.calls[0]?.init?.headers?.['User-Agent']).toContain('unifinder');
  });

  it('falls back to the default OpenCode model when its catalogue is missing', async () => {
    const http = new FakeHttp(jsonResponse({}, 404));

    const models = await fetchProviderModels('opencode', { http });

    expect(models).toEqual([{ id: 'deepseek-v4.1-flash', name: 'deepseek-v4.1-flash' }]);
  });

  it('turns a rejected request into a ProviderError with the provider message', async () => {
    const http = new FakeHttp(jsonResponse({ error: { message: 'bad key' } }, 401));

    await expect(fetchProviderModels('opencode', { http })).rejects.toBeInstanceOf(ProviderError);
    await expect(fetchProviderModels('opencode', { http })).rejects.toThrow('bad key');
  });
});
