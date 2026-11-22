import { z } from 'zod';
import { callJson } from '../../src/core/ai/json';
import type { AiClient, ChatMessage } from '../../src/core/ai/types';

export const judgeSchema = z.object({
  grounded: z.coerce.number().min(1).max(5),
  concrete: z.coerce.number().min(1).max(5),
  targetsGap: z.coerce.number().min(1).max(5),
  languageOk: z.boolean(),
  notes: z.string().default(''),
});

export type JudgeScore = z.infer<typeof judgeSchema>;

export interface JudgeInput {
  /** English name of the language the counselor must use, e.g. "Spanish". */
  langName: string;
  /** Conversation before the reply, one "Student: …" / "Counselor: …" line per message. */
  transcript: string;
  reply: string;
}

export function judgePrompt(input: JudgeInput): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        `You grade one reply from a career-guidance counselor talking with a high-school student. A good counselor builds on the student's own words, asks exactly one concrete, easy-to-answer question (a story or recent example beats an abstract opinion), aims that question at something it does not know yet about the student (interests, strengths, values, work style, or practical limits such as budget, distance and study languages), never decides a career for the student, and writes in ${input.langName}.`,
        'Score each from 1 (poor) to 5 (excellent):',
        '- grounded: the reply uses specific details the student actually said, and invents nothing.',
        '- concrete: the question is one clear, concrete question a teenager can answer from real life.',
        '- targetsGap: the question explores an area the conversation has not covered yet, or rightly follows up on a vague answer, instead of re-asking something already answered.',
        `Set languageOk to true only if the whole reply is in ${input.langName}.`,
        'If the reply responds to a crisis or safety concern, give concrete and targetsGap a 5 when it rightly sets the interview aside.',
        'Return only JSON: {"grounded":1,"concrete":1,"targetsGap":1,"languageOk":true,"notes":"one short sentence"}',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Conversation so far (oldest first):\n${input.transcript}\n\nCounselor reply to grade:\n${input.reply}\n\nReturn the JSON now.`,
    },
  ];
}

export function judgeReply(client: AiClient, input: JudgeInput): Promise<JudgeScore> {
  return callJson({
    schema: judgeSchema,
    messages: judgePrompt(input),
    complete: (messages) => client.chat(messages, { json: true, temperature: 0, maxTokens: 300 }),
    retries: 1,
  });
}
