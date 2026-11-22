import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { callJson, AiFormatError, nextTokenBudget } from './json';
import type { ChatMessage } from './types';

const schema = z.object({ answer: z.number() });

function completer(responses: string[]) {
  let index = 0;
  const calls: ChatMessage[][] = [];
  return {
    calls,
    complete: async (messages: ChatMessage[]) => {
      calls.push(messages);
      const response = responses[index] ?? responses[responses.length - 1] ?? '';
      index++;
      return response;
    },
  };
}

describe('callJson', () => {
  it('parses valid JSON and returns the typed result', async () => {
    const fake = completer(['{"answer":42}']);
    const result = await callJson({ schema, messages: [], complete: fake.complete });
    expect(result).toEqual({ answer: 42 });
    expect(fake.calls.length).toBe(1);
  });

  it('strips markdown fences and surrounding prose', async () => {
    const fake = completer(['Here you go:\n```json\n{"answer":7}\n```']);
    const result = await callJson({ schema, messages: [], complete: fake.complete });
    expect(result).toEqual({ answer: 7 });
  });

  it('retries once after invalid JSON and feeds the error back', async () => {
    const fake = completer(['not json', '{"answer":5}']);
    const result = await callJson({ schema, messages: [], complete: fake.complete });
    expect(result).toEqual({ answer: 5 });
    expect(fake.calls.length).toBe(2);
    expect(fake.calls[1]?.some((message) => message.content.includes('not valid JSON'))).toBe(true);
  });

  it('retries once after a schema mismatch', async () => {
    const fake = completer(['{"answer":"five"}', '{"answer":5}']);
    const result = await callJson({ schema, messages: [], complete: fake.complete });
    expect(result).toEqual({ answer: 5 });
    expect(fake.calls[1]?.some((message) => message.content.includes('did not match'))).toBe(true);
  });

  it('throws after exactly one retry', async () => {
    const fake = completer(['nope', 'still nope']);
    await expect(callJson({ schema, messages: [], complete: fake.complete })).rejects.toBeInstanceOf(
      AiFormatError,
    );
    expect(fake.calls.length).toBe(2);
  });

  it('retries an empty reply and reports the increasing attempt', async () => {
    const attempts: number[] = [];
    const complete = async (_messages: ChatMessage[], attempt: number) => {
      attempts.push(attempt);
      return attempt === 0 ? '' : '{"answer":9}';
    };
    const result = await callJson({ schema, messages: [], complete });
    expect(result).toEqual({ answer: 9 });
    expect(attempts).toEqual([0, 1]);
  });

  it('keeps the raw reply and issues on AiFormatError', async () => {
    const fake = completer(['{"answer":"nope"}', '{"answer":"still wrong"}']);
    try {
      await callJson({ schema, messages: [], complete: fake.complete });
      throw new Error('expected callJson to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AiFormatError);
      const formatError = error as AiFormatError;
      expect(formatError.raw).toContain('still wrong');
      expect(formatError.issues).toBeTruthy();
    }
  });
});

describe('nextTokenBudget', () => {
  it('doubles per attempt and caps', () => {
    expect(nextTokenBudget(1000, 0)).toBe(1000);
    expect(nextTokenBudget(1000, 1)).toBe(2000);
    expect(nextTokenBudget(5000, 2, 8000)).toBe(8000);
  });
});
