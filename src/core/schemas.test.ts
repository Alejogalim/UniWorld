import { describe, expect, it } from 'bun:test';
import {
  careerIdeasSchema,
  extractionSchema,
  queryPlanSchema,
  rankingSchema,
  uniDetailAiSchema,
} from './schemas';

const career = (title: string) => ({
  title,
  summary: 'A summary long enough to pass validation.',
  whyYou: 'You said you enjoy solving problems and building things.',
  degreeKeywords: ['Computer Science'],
  scores: { passions: 8, strengths: 7, goals: 9, earning: 6 },
});

describe('careerIdeasSchema', () => {
  it('accepts 3 to 5 careers', () => {
    expect(
      careerIdeasSchema.safeParse({ careers: [career('Alpha'), career('Beta'), career('Gamma')] })
        .success,
    ).toBe(true);
  });

  it('rejects fewer than 3 careers', () => {
    expect(careerIdeasSchema.safeParse({ careers: [career('Alpha')] }).success).toBe(false);
  });

  it('rejects more than 5 careers', () => {
    const careers = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map(career);
    expect(careerIdeasSchema.safeParse({ careers }).success).toBe(false);
  });

  it('rejects scores outside 0-10', () => {
    const bad = career('Alpha');
    bad.scores.passions = 11;
    expect(
      careerIdeasSchema.safeParse({ careers: [bad, career('Beta'), career('Gamma')] }).success,
    ).toBe(false);
  });
});

describe('queryPlanSchema', () => {
  it('accepts 2-3 queries', () => {
    expect(
      queryPlanSchema.safeParse({
        queries: [{ query: 'computer science Germany' }, { query: 'computer science tuition free' }],
      }).success,
    ).toBe(true);
  });

  it('rejects a single query', () => {
    expect(queryPlanSchema.safeParse({ queries: [{ query: 'computer science Germany' }] }).success).toBe(
      false,
    );
  });

  it('rejects an empty plan', () => {
    expect(queryPlanSchema.safeParse({ queries: [] }).success).toBe(false);
  });
});

describe('extractionSchema', () => {
  const candidate = {
    name: 'University of Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    programName: 'Computer Science',
    languages: { value: ['English'], sourceUrl: 'https://www.ub.edu/x', quote: 'Taught in English' },
    instructionLanguages: ['English'],
    tuition: { value: 'Free', sourceUrl: 'https://www.ub.edu/x', quote: 'no tuition fees' },
    overview: { value: 'Public university', sourceUrl: 'https://www.ub.edu/x', quote: 'public university' },
    sourceUrls: ['https://www.ub.edu/x'],
  };

  it('accepts a candidate', () => {
    expect(extractionSchema.safeParse({ candidates: [candidate] }).success).toBe(true);
  });

  it('accepts null facts', () => {
    const nullable = {
      ...candidate,
      tuition: { value: null, sourceUrl: null, quote: null },
    };
    expect(extractionSchema.safeParse({ candidates: [nullable] }).success).toBe(true);
  });

  it('rejects a non-ISO country code', () => {
    expect(extractionSchema.safeParse({ candidates: [{ ...candidate, countryCode: 'Spain' }] }).success).toBe(
      false,
    );
  });
});

describe('rankingSchema', () => {
  it('accepts depends_on_citizenship and valid scores', () => {
    const parsed = rankingSchema.safeParse({
      items: [
        {
          rorId: 'https://ror.org/012345678',
          career: 0.8,
          admission: 'Match',
          language: 1,
          cost: 'depends_on_citizenship',
          whyFits: 'Taught in English (your C1)',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a score above 1', () => {
    const parsed = rankingSchema.safeParse({
      items: [
        {
          rorId: 'x',
          career: 1.5,
          admission: 'Unknown',
          language: 0,
          cost: 0,
          whyFits: 'why',
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('uniDetailAiSchema', () => {
  it('accepts the detail shape', () => {
    const fact = (value: string | string[] | null) => ({
      value,
      sourceUrl: value === null ? null : 'https://www.ub.edu/x',
      quote: value === null ? null : 'source text',
    });
    const parsed = uniDetailAiSchema.safeParse({
      overview: fact('overview'),
      languages: fact(['English']),
      tuition: fact('Free'),
      scholarships: fact(null),
      deadlines: fact('15 July 2026'),
      nextDeadline: fact('15 July 2026'),
      exams: fact(['IELTS']),
      requirements: fact('IB 36'),
      applyUrl: fact('https://www.ub.edu/apply'),
    });
    expect(parsed.success).toBe(true);
  });
});
