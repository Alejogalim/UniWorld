import { describe, expect, it } from 'bun:test';
import type { HttpResponseLike } from '../ports';
import { consumeSse } from './transport';

function response(text: string): HttpResponseLike {
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  };
}

const sse = [
  'data: {"choices":[{"delta":{"content":"Hello"}}]}',
  '',
  'data: {"choices":[{"delta":{"content":" Ana"}}]}',
  '',
  'data: [DONE]',
  '',
].join('\n');

describe('consumeSse', () => {
  it('parses a full SSE payload when the adapter has no stream body', async () => {
    const tokens: string[] = [];
    const full = await consumeSse(response(sse), (token) => tokens.push(token));
    expect(full).toBe('Hello Ana');
    expect(tokens.join('')).toBe('Hello Ana');
  });

  it('falls back to a regular JSON completion', async () => {
    const tokens: string[] = [];
    const full = await consumeSse(
      response('{"choices":[{"message":{"content":"Hi"}}]}'),
      (token) => tokens.push(token),
    );
    expect(full).toBe('Hi');
    expect(tokens).toEqual(['Hi']);
  });
});
