import { describe, expect, it } from 'bun:test';
import type { HttpResponseLike } from '../ports';
import { consumeSse, extractContent, looksTruncated } from './transport';

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

describe('extractContent', () => {
  it('surfaces a truncation finish reason and keeps reasoning out of content', () => {
    const result = extractContent({
      choices: [
        {
          finish_reason: 'length',
          message: { content: '', reasoning_content: 'We need to think about this...' },
        },
      ],
    });
    expect(result.content).toBe('');
    expect(result.finishReason).toBe('length');
    expect(result.reasoning).toContain('think');
    expect(looksTruncated(result.content, result.finishReason)).toBe(true);
  });

  it('treats an empty reply as truncated even without a finish reason', () => {
    const result = extractContent({ choices: [{ message: { content: '' } }] });
    expect(looksTruncated(result.content, result.finishReason)).toBe(true);
  });

  it('does not flag a normal answer as truncated', () => {
    const result = extractContent({
      choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
    });
    expect(looksTruncated(result.content, result.finishReason)).toBe(false);
  });
});

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
