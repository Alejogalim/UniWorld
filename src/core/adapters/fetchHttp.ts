import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';

/** fetch-backed adapter used by the CLI and tests. */
export class FetchHttpClient implements HttpClient {
  async fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    const response = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.headers,
      body: init?.body,
      signal: init?.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
      json: () => response.json() as Promise<unknown>,
      body: response.body,
      url: response.url,
    };
  }
}
