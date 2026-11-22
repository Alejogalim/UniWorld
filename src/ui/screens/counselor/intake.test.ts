import { describe, expect, it } from 'bun:test';
import { decodeIntake, encodeIntake, intakeOutcome, rebuildConversation } from './intake';

const V1_CLOSING_MID =
  '(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)';
const V1_CLOSING_LAST = '(That was the last intake question. Reflect briefly, then ask your first follow-up question.)';
const v1 = (n: number, question: string, answer: string) =>
  `[intake ${n}/6] Question: "${question}"\nAnswer: ${answer}\n${n === 6 ? V1_CLOSING_LAST : V1_CLOSING_MID}`;
const v2 = (n: number, answer: string, followUp = false) =>
  encodeIntake(n, `Topic ${n}?`, answer, { followUp, nextTopic: n < 6 ? `Topic ${n + 1}?` : null });
const fallback = (n: number) => `Fallback ${n}?`;

describe('encodeIntake', () => {
  it('frames a first answer with the next topic', () => {
    expect(encodeIntake(2, 'Who do you admire?', 'My gran', { followUp: false, nextTopic: 'What are you good at?' })).toBe(
      '[intake 2/6] Topic: "Who do you admire?"\nAnswer: My gran\n(Follow-up allowed: yes. Next topic: "What are you good at?")',
    );
  });

  it('marks the follow-up answer', () => {
    expect(encodeIntake(2, 'Who do you admire?', 'Nobody', { followUp: true, nextTopic: 'What are you good at?' })).toBe(
      '[intake 2/6 follow-up] Topic: "Who do you admire?"\nAnswer: Nobody\n(Follow-up allowed: no. Next topic: "What are you good at?")',
    );
  });

  it('says when the last topic was answered', () => {
    const framed = encodeIntake(6, 'Limits?', 'None', { followUp: false, nextTopic: null });
    expect(framed.split('\n').at(-1)).toBe('(Follow-up allowed: yes. Next topic: none, this was the last intake topic.)');
  });
});

describe('decodeIntake', () => {
  it('round-trips v2 frames, follow-ups and multi-line answers', () => {
    for (let n = 1; n <= 6; n++) {
      for (const followUp of [false, true]) {
        const answer = `Line one for ${n}\nLine two "quoted"\n(not the end)`;
        expect(decodeIntake(v2(n, answer, followUp))).toEqual({ n, question: `Topic ${n}?`, answer, followUp, version: 2 });
      }
    }
  });

  it('still reads frames saved before plan 29', () => {
    expect(decodeIntake(v1(2, 'What do people come to you for?', 'Maths homework'))).toEqual({
      n: 2,
      question: 'What do people come to you for?',
      answer: 'Maths homework',
      followUp: false,
      version: 1,
    });
    expect(decodeIntake(v1(6, 'Practical limits?', 'Budget under 20k'))?.answer).toBe('Budget under 20k');
  });

  it('returns null for plain text and malformed frames', () => {
    expect(decodeIntake('I like drawing maps')).toBeNull();
    expect(decodeIntake('[intake 7/6] Topic: "x"\nAnswer: y\n(Follow-up allowed: yes. Next topic: none, this was the last intake topic.)')).toBeNull();
    expect(decodeIntake('[intake 0/6] Question: "x"\nAnswer: y\n(anything)')).toBeNull();
    expect(decodeIntake('[intake 3/6] Topic: "x"\nAnswer: y')).toBeNull();
    expect(decodeIntake(`[intake 3/6 follow-up] Question: "x"\nAnswer: y\n${V1_CLOSING_MID}`)).toBeNull();
  });
});

describe('intakeOutcome', () => {
  const first = { intakeN: 2, followUp: false };
  const second = { intakeN: 2, followUp: true };

  it('moves on after <next/>', () => {
    expect(intakeOutcome(first, 'Nice. What are you good at?<next/>', 2)).toEqual({
      text: 'Nice. What are you good at?',
      intakeStep: 3,
      followUp: false,
      fallbackQuestion: null,
    });
  });

  it('stays for one follow-up', () => {
    expect(intakeOutcome(first, 'No rush. Was it A, B, or C?<follow/>', 2)).toMatchObject({ intakeStep: 2, followUp: true });
  });

  it('moves on when the follow-up was already used', () => {
    expect(intakeOutcome(second, 'Still vague? Okay, next one?<follow/>', 2)).toMatchObject({ intakeStep: 3, followUp: false });
  });

  it('stays without spending the follow-up when <follow/> asks nothing', () => {
    expect(intakeOutcome(first, 'I am glad you told me. Please talk to a trusted adult today.<follow/>', 2)).toMatchObject({
      intakeStep: 2,
      followUp: false,
      fallbackQuestion: null,
    });
  });

  it('treats a missing tag as moving on', () => {
    expect(intakeOutcome(first, 'Nice. What are you good at?', 2)).toMatchObject({ intakeStep: 3, fallbackQuestion: null });
  });

  it('asks the fallback question when the reply asked none', () => {
    expect(intakeOutcome(first, 'Nice.<next/>', 2)).toMatchObject({ text: 'Nice.', intakeStep: 3, fallbackQuestion: 3 });
    expect(intakeOutcome(first, '<follow/>', 2)).toMatchObject({ text: '', intakeStep: 3, fallbackQuestion: 3 });
  });

  it('ends the intake after topic 6 without a fallback', () => {
    expect(intakeOutcome({ intakeN: 6, followUp: false }, 'Got it.<next/>', 6)).toMatchObject({ intakeStep: 7, fallbackQuestion: null });
  });

  it('leaves free chat alone but strips tags', () => {
    expect(intakeOutcome({ intakeN: null, followUp: false }, 'Hi?<next/>', 7)).toEqual({
      text: 'Hi?',
      intakeStep: 7,
      followUp: false,
      fallbackQuestion: null,
    });
  });
});

describe('rebuildConversation', () => {
  it('rebuilds a v1 session with the questions saved in its frames', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v1(1, 'Q one?', 'Drawing') },
        { role: 'assistant', content: 'Drawing sounds fun.' },
        { role: 'user', content: v1(2, 'Q two?', 'Maths') },
        { role: 'assistant', content: 'Maths it is.' },
      ],
      fallback,
    );
    expect(rebuilt.entries).toEqual([
      { role: 'counselor', text: 'Q one?', local: true },
      { role: 'student', text: 'Drawing' },
      { role: 'counselor', text: 'Drawing sounds fun.' },
      { role: 'counselor', text: 'Q two?', local: true },
      { role: 'student', text: 'Maths' },
      { role: 'counselor', text: 'Maths it is.' },
      { role: 'counselor', text: 'Fallback 3?', local: true },
    ]);
    expect(rebuilt.intakeStep).toBe(3);
    expect(rebuilt.unanswered).toBeNull();
  });

  it('rebuilds a v2 follow-up without advancing twice', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v2(1, 'idk') },
        { role: 'assistant', content: 'No rush. Was it more like games, music, or sport?<follow/>' },
        { role: 'user', content: v2(1, 'games', true) },
        { role: 'assistant', content: 'Games, nice. Who do you look up to in them?<next/>' },
      ],
      fallback,
    );
    expect(rebuilt.entries).toEqual([
      { role: 'counselor', text: 'Topic 1?', local: true },
      { role: 'student', text: 'idk' },
      { role: 'counselor', text: 'No rush. Was it more like games, music, or sport?' },
      { role: 'student', text: 'games' },
      { role: 'counselor', text: 'Games, nice. Who do you look up to in them?' },
    ]);
    expect(rebuilt.intakeStep).toBe(2);
    expect(rebuilt.followUp).toBe(false);
  });

  it('adds the fallback question when a v2 reply asked none', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v2(1, 'Drawing') },
        { role: 'assistant', content: 'Nice.<next/>' },
      ],
      fallback,
    );
    expect(rebuilt.entries.at(-1)).toEqual({ role: 'counselor', text: 'Fallback 2?', local: true });
    expect(rebuilt.intakeStep).toBe(2);
  });

  it('keeps an unanswered follow-up answer for Try again', () => {
    const stored = [
      { role: 'user' as const, content: v2(1, 'idk') },
      { role: 'assistant' as const, content: 'No rush. Was it A, B, or C?<follow/>' },
      { role: 'user' as const, content: v2(1, 'B', true) },
    ];
    const rebuilt = rebuildConversation(stored, fallback);
    expect(rebuilt.intakeStep).toBe(1);
    expect(rebuilt.followUp).toBe(true);
    expect(rebuilt.unanswered).toEqual({ encoded: stored[2]!.content, intakeN: 1, followUp: true });
  });
});
