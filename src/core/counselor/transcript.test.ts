import { describe, expect, it } from 'bun:test';
import { buildTranscript, readStudentMessage } from './transcript';

const V1 =
  '[intake 2/6] Question: "What do people come to you for?"\nAnswer: Maths homework\n' +
  '(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)';
const V2_FIRST = '[intake 1/6] Topic: "Topic 1?"\nAnswer: Drawing\n(Follow-up allowed: yes. Next topic: "Topic 2?")';
const V2_THIRD = '[intake 3/6] Topic: "Topic 3?"\nAnswer: Line one\n(not the end)\n(Follow-up allowed: yes. Next topic: "Topic 4?")';
const V2_FOLLOW = '[intake 1/6 follow-up] Topic: "Topic 1?"\nAnswer: games\n(Follow-up allowed: no. Next topic: "Topic 2?")';

describe('readStudentMessage', () => {
  it('keeps the app question for v1 frames and the first v2 topic', () => {
    expect(readStudentMessage(V1)).toEqual({ answer: 'Maths homework', appQuestion: 'What do people come to you for?' });
    expect(readStudentMessage(V2_FIRST)).toEqual({ answer: 'Drawing', appQuestion: 'Topic 1?' });
  });

  it('drops the topic when the AI asked the question itself', () => {
    expect(readStudentMessage(V2_THIRD)).toEqual({ answer: 'Line one\n(not the end)', appQuestion: null });
    expect(readStudentMessage(V2_FOLLOW)).toEqual({ answer: 'games', appQuestion: null });
  });

  it('passes plain messages through', () => {
    expect(readStudentMessage('  I like maps ')).toEqual({ answer: 'I like maps', appQuestion: null });
  });
});

describe('buildTranscript', () => {
  it('writes clean lines without frames or tags', () => {
    expect(
      buildTranscript([
        { role: 'user', content: V2_FIRST },
        { role: 'assistant', content: 'Nice. Who do you admire?<next/>' },
        { role: 'user', content: 'My gran' },
      ]),
    ).toBe('Counselor: Topic 1?\nStudent: Drawing\nCounselor: Nice. Who do you admire?\nStudent: My gran');
  });
});
