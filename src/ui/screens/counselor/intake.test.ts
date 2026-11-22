import { describe, expect, it } from 'bun:test';
import { decodeIntake, encodeIntake } from './intake';

describe('encodeIntake', () => {
  it('frames a mid-intake answer with the reflect-only instruction', () => {
    expect(encodeIntake(2, 'What do people come to you for?', 'Maths homework')).toBe(
      '[intake 2/6] Question: "What do people come to you for?"\nAnswer: Maths homework\n' +
        '(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)',
    );
  });

  it('uses the closing instruction for question 6', () => {
    const framed = encodeIntake(6, 'Practical limits?', 'Budget under 20k');
    expect(framed.split('\n').at(-1)).toBe(
      '(That was the last intake question. Reflect briefly, then ask your first follow-up question.)',
    );
  });
});

describe('decodeIntake', () => {
  it('round-trips every question number, including multi-line answers', () => {
    for (let n = 1; n <= 6; n++) {
      const answer = `Line one for ${n}\nLine two "quoted"`;
      const framed = encodeIntake(n, `Question ${n}?`, answer);
      expect(decodeIntake(framed)).toEqual({ n, question: `Question ${n}?`, answer });
    }
  });

  it('returns null for plain student text and free-form messages', () => {
    expect(decodeIntake('I like drawing maps')).toBeNull();
    expect(decodeIntake('Can you suggest a career in design?')).toBeNull();
  });

  it('returns null for out-of-range or malformed frames', () => {
    expect(decodeIntake('[intake 7/6] Question: "x"\nAnswer: y\n(anything)')).toBeNull();
    expect(decodeIntake('[intake 0/6] Question: "x"\nAnswer: y\n(anything)')).toBeNull();
    expect(decodeIntake('[intake 3/6] Question: "x"\nAnswer: y')).toBeNull();
  });
});
