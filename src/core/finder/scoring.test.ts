import { describe, expect, it } from 'bun:test';
import type { Profile, UniResult } from '../contracts';
import {
  careerFit,
  costFit,
  fallbackWhyFits,
  isFreeTuition,
  languageFitScore,
  overallFit,
  sanitizeWhyFits,
} from './scoring';

const profile: Profile = {
  name: 'Ana',
  primaryLang: 'es',
  uiLang: 'en',
  languages: [
    { lang: 'en', level: 'C1' },
    { lang: 'de', level: 'B1' },
  ],
  program: 'IB',
  citizenship: 'ES',
  grades: { ib: { predictedTotal: 36 } },
};

function result(partial: Partial<UniResult> = {}): UniResult {
  return {
    rorId: 'https://ror.org/000000001',
    name: 'University of Barcelona',
    countryCode: 'ES',
    program: 'BSc Computer Science',
    overview: {
      value: 'A public university in Barcelona',
      sourceUrl: 'https://www.ub.edu/about',
      quote: 'The University of Barcelona is a public university',
      sourceKind: 'official',
      checkedAt: '2026-11-21',
    },
    languages: {
      value: ['English'],
      sourceUrl: 'https://www.ub.edu/programs',
      quote: 'The language of instruction is English',
      sourceKind: 'official',
      checkedAt: '2026-11-21',
    },
    tuition: {
      value: 'Free',
      sourceUrl: 'https://www.ub.edu/fees',
      quote: 'There are no tuition fees for all students',
      sourceKind: 'official',
      checkedAt: '2026-11-21',
    },
    fit: { career: 0.8, admission: 'Unknown', language: 1, cost: 1, overall: 0 },
    whyFits: '',
    sourceCount: 3,
    ...partial,
  };
}

describe('tuition scoring', () => {
  it('recognises free tuition', () => {
    expect(isFreeTuition('Free')).toBe(true);
    expect(isFreeTuition('No tuition fees for EU students')).toBe(true);
    expect(isFreeTuition('€12,000 per year')).toBe(false);
    expect(isFreeTuition(null)).toBe(false);
  });

  it('scores free, EU-dependent and paid tuition', () => {
    expect(costFit('Free', profile)).toBe(1);
    expect(costFit('Free for EU/EEA students', profile)).toBe(1);
    expect(costFit('Free for EU/EEA students', { ...profile, citizenship: 'US' })).toBe(0.15);
    expect(costFit('Free for EU/EEA students', { ...profile, citizenship: undefined })).toBe(
      'depends_on_citizenship',
    );
    expect(costFit('€12,000 per year', profile)).toBe(0.45);
  });

  it('returns depends_on_citizenship when tuition is unknown', () => {
    expect(costFit(null, profile)).toBe('depends_on_citizenship');
  });
});

describe('fit scoring', () => {
  it('scores language fit from the student levels', () => {
    expect(languageFitScore(profile, ['English'])).toBe(1);
    expect(languageFitScore(profile, ['German'])).toBe(0.6);
    expect(languageFitScore(profile, ['French'])).toBe(0);
    expect(languageFitScore(profile, null)).toBe(0);
  });

  it('scores career fit from program tokens', () => {
    expect(careerFit('BSc Computer Science', ['Computer Science'])).toBe(1);
    expect(careerFit('BA History', ['Computer Science'])).toBe(0);
    expect(careerFit('MSc Data Science', ['Data Science'])).toBe(1);
  });

  it('computes an overall fit between 0 and 1', () => {
    const value = overallFit(result());
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('whyFits honesty check', () => {
  const fallback = 'Taught in English (your C1) · tuition-free';

  it('keeps a grounded line', () => {
    expect(sanitizeWhyFits('Taught in English (your C1) · tuition-free', profile, result(), fallback)).toBe(
      'Taught in English (your C1) · tuition-free',
    );
  });

  it('rejects invented numbers', () => {
    expect(
      sanitizeWhyFits('Your IB 44 meets their 36', profile, result(), fallback),
    ).toBe(fallback);
  });

  it('rejects a language the university does not teach in', () => {
    expect(
      sanitizeWhyFits('Taught in French, which you speak', profile, result(), fallback),
    ).toBe(fallback);
  });

  it('rejects a free claim when tuition is not verified free', () => {
    const paid = result({
      tuition: {
        value: '€12,000 per year',
        sourceUrl: 'https://www.ub.edu/fees',
        quote: 'tuition of €12,000 per year',
        sourceKind: 'official',
        checkedAt: '2026-11-21',
      },
    });
    expect(sanitizeWhyFits('Tuition-free and close to home', profile, paid, fallback)).toBe(fallback);
  });

  it('builds a fallback from verified facts only', () => {
    expect(fallbackWhyFits(profile, result())).toBe('Taught in English (your C1) · tuition-free');
  });

  it('mentions a needed language in the fallback', () => {
    const needs = result({
      languages: {
        value: ['French'],
        sourceUrl: 'https://www.ub.edu/programs',
        quote: 'The language of instruction is French',
        sourceKind: 'official',
        checkedAt: '2026-11-21',
      },
      needToLearn: {
        lang: 'fr',
        usualLevel: {
          value: null,
          sourceUrl: null,
          quote: null,
          sourceKind: 'third_party',
          checkedAt: '2026-11-21',
        },
      },
    });
    expect(fallbackWhyFits(profile, needs)).toContain("you'd need to learn French");
  });
});
