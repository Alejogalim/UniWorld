import { describe, expect, it } from 'bun:test';
import {
  countQuestions,
  detectLanguage,
  findPrescription,
  isDoubleBarrelled,
  mentionsName,
  nameSpacingOk,
  runChecks,
  splitSentences,
  tagCheck,
} from './checks';
import { afterReply, initialDriverState, intakeQuestion, nextTurn } from './driver';
import { PERSONAS } from './personas';
import { renderReport } from './report';

describe('sentence and question helpers', () => {
  it('splits sentences and counts question marks', () => {
    expect(splitSentences('Games are fun. What do you play?')).toEqual(['Games are fun.', 'What do you play?']);
    expect(countQuestions('One? Two?')).toBe(2);
  });
});

describe('isDoubleBarrelled', () => {
  it('flags a second question joined by and/or', () => {
    expect(isDoubleBarrelled('What do you like about it and why do you like it?', 'en')).toBe(true);
    expect(isDoubleBarrelled('What do you like about it, and why?', 'en')).toBe(true);
    expect(isDoubleBarrelled('¿Qué te gusta y por qué?', 'es')).toBe(true);
    expect(isDoubleBarrelled('Bạn thích gì và tại sao?', 'vi')).toBe(true);
  });

  it('lets option lists through', () => {
    expect(isDoubleBarrelled('Were you making something, figuring something out, or spending time with people?', 'en')).toBe(false);
    expect(isDoubleBarrelled('¿Prefieres trabajar sola o en equipo?', 'es')).toBe(false);
    expect(isDoubleBarrelled('Bạn thích làm một mình hay làm nhóm?', 'vi')).toBe(false);
  });
});

describe('detectLanguage', () => {
  it('tells en, es and vi apart', () => {
    expect(detectLanguage('That sounds like a lot of fun. What do you enjoy most about it?')).toBe('en');
    expect(detectLanguage('¿Qué es lo que más te gusta de cocinar para tu familia?')).toBe('es');
    expect(detectLanguage('Bạn thích làm gì nhất khi rảnh rỗi?')).toBe('vi');
    expect(detectLanguage('ok')).toBe('unknown');
  });
});

describe('findPrescription', () => {
  it('catches prescriptions in all three languages', () => {
    expect(findPrescription('You should become a nurse.')).not.toBeNull();
    expect(findPrescription("You'd make a great engineer.")).not.toBeNull();
    expect(findPrescription('Deberías estudiar medicina.')).not.toBeNull();
    expect(findPrescription('Bạn nên trở thành bác sĩ.')).not.toBeNull();
  });

  it('ignores harmless "should"', () => {
    expect(findPrescription('You should feel free to take your time.')).toBeNull();
    expect(findPrescription('What should a good job give you?')).toBeNull();
  });
});

describe('name use', () => {
  it('matches whole words only, accents included', () => {
    expect(mentionsName('Ana, what do you think?', 'Ana')).toBe(true);
    expect(mentionsName('I like bananas.', 'Ana')).toBe(false);
    expect(mentionsName('Hola, Lucía.', 'Lucía')).toBe(true);
  });

  it('allows the name at most once in three replies', () => {
    expect(nameSpacingOk(['Ana?', 'x?', 'y?', 'Ana?'], 3, 'Ana')).toBe(true);
    expect(nameSpacingOk(['Ana?', 'x?', 'Ana?'], 2, 'Ana')).toBe(false);
    expect(nameSpacingOk(['Ana?', 'x?'], 1, 'Ana')).toBe(true);
  });
});

describe('runChecks', () => {
  const base = { lang: 'en' as const, name: 'Ana', previousReplies: [], expectQuestion: true };

  it('passes a good reply', () => {
    const checks = runChecks({
      ...base,
      reply: 'Games can swallow whole afternoons. Think of the last one you got hooked on: what were you doing in it?',
    });
    expect(checks.filter((c) => !c.pass)).toEqual([]);
  });

  it('fails two questions and a double-barrelled one', () => {
    const checks = runChecks({ ...base, reply: 'Great! What do you like and why do you like it? Tell me more?' });
    const failed = checks.filter((c) => !c.pass).map((c) => c.id);
    expect(failed).toContain('questionCount');
    expect(failed).toContain('singleQuestion');
  });

  it('fails a prescription', () => {
    const checks = runChecks({ ...base, reply: 'You should become a doctor. What do you think about that?' });
    expect(checks.find((c) => c.id === 'noPrescription')?.pass).toBe(false);
  });

  it('accepts a reflect-only reply when no question is expected', () => {
    const checks = runChecks({ ...base, expectQuestion: false, reply: 'That sounds like a real skill you have.' });
    expect(checks.filter((c) => !c.pass)).toEqual([]);
  });
});

describe('personas', () => {
  it('have unique ids, at least 8 answers, and a matching language', () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    for (const persona of PERSONAS) {
      expect(persona.answers.length).toBeGreaterThanOrEqual(8);
      expect(persona.profile.primaryLang).toBe(persona.lang);
    }
  });
});

describe('driver', () => {
  const question = (n: number) => intakeQuestion('en', n, 'Ana');

  it('fills the name into the first question', () => {
    expect(question(1)).toContain('Ana');
  });

  it('wraps intake answers and moves to the next question', () => {
    const turn = nextTurn(initialDriverState, 'Drawing', question);
    expect(turn.intakeN).toBe(1);
    expect(turn.encoded.startsWith('[intake 1/6]')).toBe(true);
    const reply = afterReply(initialDriverState, turn, ' Nice. ', question);
    expect(reply.visible).toBe('Nice.');
    expect(reply.state.intakeStep).toBe(2);
    expect(reply.appQuestion).toBe(question(2));
  });

  it('sends free chat unwrapped after the intake', () => {
    const turn = nextTurn({ intakeStep: 7, followUp: false }, 'Hello', question);
    expect(turn).toMatchObject({ encoded: 'Hello', intakeN: null, expectQuestion: true });
  });

  it('uses v2 frames, follows up once and reads the tag', () => {
    const turn = nextTurn(initialDriverState, 'idk', question);
    expect(turn.encoded.startsWith('[intake 1/6] Topic: "')).toBe(true);
    expect(turn.expectTag).toBe(true);
    const follow = afterReply(initialDriverState, turn, 'No rush. Was it games, music, or sport?<follow/>', question);
    expect(follow.state).toEqual({ intakeStep: 1, followUp: true });
    expect(follow.visible).toBe('No rush. Was it games, music, or sport?');
    expect(follow.tag).toBe('follow');
    const again = nextTurn(follow.state, 'games', question);
    expect(again.encoded.startsWith('[intake 1/6 follow-up]')).toBe(true);
    const next = afterReply(follow.state, again, 'Games! Who do you admire?<next/>', question);
    expect(next.state).toEqual({ intakeStep: 2, followUp: false });
    expect(next.appQuestion).toBeNull();
  });
});

describe('tagCheck', () => {
  it('wants exactly one tag at the end of intake replies and none elsewhere', () => {
    expect(tagCheck('What then?<next/>', true).pass).toBe(true);
    expect(tagCheck('What then?', true).pass).toBe(false);
    expect(tagCheck('<next/> What then?', true).pass).toBe(false);
    expect(tagCheck('What then?', false).pass).toBe(true);
    expect(tagCheck('What then?<follow/>', false).pass).toBe(false);
  });
});

describe('renderReport', () => {
  it('renders the summary, failures and the transcript', () => {
    const report = renderReport({ startedAt: '2026-01-01T00:00:00Z', provider: 'openrouter', model: 'm', judge: true }, [
      {
        persona: PERSONAS[0]!,
        replies: [
          {
            turn: 1,
            student: 'idk',
            reply: 'Fair enough. What did you do last weekend?',
            checks: [
              { id: 'questionCount', pass: true },
              { id: 'nameSpacing', pass: false },
            ],
            judge: { grounded: 4, concrete: 5, targetsGap: 3, languageOk: true, notes: 'ok' },
          },
        ],
      },
    ]);
    expect(report).toContain('| vague | 1 | 1/2 (50%) | 4.0 | 5.0 | 3.0 | 1/1 |');
    expect(report).toContain('| nameSpacing | 1 |');
    expect(report).toContain('**1. Student:** idk');
  });

  it('prints the final notes when present', () => {
    const report = renderReport({ startedAt: 'x', provider: 'p', model: 'm', judge: false }, [
      {
        persona: PERSONAS[0]!,
        replies: [],
        notes: { interests: ['games'], strengths: [], values: [], workStyle: [], limits: [], gaps: ['values'] },
      },
    ]);
    expect(report).toContain('**Final notes:**');
    expect(report).toContain('"games"');
  });
});
