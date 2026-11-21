import { describe, expect, it } from 'bun:test';
import type { CareerPath } from '../contracts';
import { toCareerPaths, weightedFitBreakdown } from './careers';

describe('weightedFitBreakdown', () => {
  it('weights the four dimensions by the sliders', () => {
    const breakdown = weightedFitBreakdown(
      { passions: 10, strengths: 10, goals: 10, earning: 10 },
      { passions: 10, strengths: 10, goals: 10, earning: 10 },
    );
    expect(breakdown).toEqual({ passions: 100, strengths: 100, goals: 100, earning: 100, overall: 100 });
  });

  it('produces a weighted overall score', () => {
    const breakdown = weightedFitBreakdown(
      { passions: 10, strengths: 0, goals: 10, earning: 0 },
      { passions: 10, strengths: 0, goals: 10, earning: 0 },
    );
    expect(breakdown.overall).toBe(100);
    expect(breakdown.passions).toBe(100);
    expect(breakdown.strengths).toBe(0);
  });
});

describe('toCareerPaths', () => {
  it('maps AI careers into contract careers without ids', () => {
    const careers = toCareerPaths(
      {
        careers: [
          {
            title: 'Software engineer',
            summary: 'Build software products.',
            whyYou: 'You said you like solving problems.',
            degreeKeywords: ['Computer Science'],
            scores: { passions: 9, strengths: 8, goals: 7, earning: 8 },
          },
          {
            title: 'Product designer',
            summary: 'Design products.',
            whyYou: 'You like making things.',
            degreeKeywords: ['Design'],
            scores: { passions: 8, strengths: 9, goals: 6, earning: 5 },
          },
          {
            title: 'Data analyst',
            summary: 'Analyse data.',
            whyYou: 'You enjoy patterns.',
            degreeKeywords: ['Data Science'],
            scores: { passions: 7, strengths: 8, goals: 8, earning: 7 },
          },
        ],
      },
      { passions: 10, strengths: 5, goals: 7, earning: 3 },
    );
    const first = careers[0] as Omit<CareerPath, 'id' | 'saved'>;
    expect(careers).toHaveLength(3);
    expect(first.title).toBe('Software engineer');
    expect(first.degreeKeywords).toEqual(['Computer Science']);
    expect(first.fitBreakdown.overall).toBeGreaterThan(0);
    expect('id' in first).toBe(false);
  });
});
