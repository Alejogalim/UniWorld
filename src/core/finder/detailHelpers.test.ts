import { describe, expect, it } from 'bun:test';
import { detailQueries, emptyDetail, fitBudget, foundFactCount, mergeHits } from './detail';

describe('detailQueries', () => {
  it('returns four focused undergraduate queries', () => {
    const queries = detailQueries('Stanford University', 'Robotics');
    expect(queries).toHaveLength(4);
    for (const q of queries) expect(q).toContain('Stanford University');
    for (const q of queries) expect(q).toContain('undergraduate');
    expect(queries[0]).toContain('Robotics');
    const all = queries.join(' ');
    expect(all).toContain('IELTS');
    expect(all).toContain('tuition');
    expect(all).toContain('scholarships');
  });
});

describe('mergeHits', () => {
  it('dedupes by canonical URL, merges text, keeps order and caps the count', () => {
    const merged = mergeHits(
      [
        { url: 'https://a.edu/x', title: 'X', text: 'one' },
        { url: 'https://b.edu/y', title: 'Y', text: 'two' },
        { url: 'https://a.edu/x/', title: 'X again', text: 'three' },
        { url: 'https://c.edu/z', title: 'Z', text: 'four' },
      ],
      2,
    );
    expect(merged.map((h) => h.url)).toEqual(['https://a.edu/x', 'https://b.edu/y']);
    expect(merged[0].text).toBe('one\nthree');
  });
});

describe('fitBudget', () => {
  it('applies the per-hit and total caps like sourceBlock', () => {
    const hits = [
      { url: 'https://a.edu', title: 'A', text: 'a'.repeat(50) },
      { url: 'https://b.edu', title: 'B', text: 'b'.repeat(50) },
      { url: 'https://c.edu', title: 'C', text: 'c'.repeat(50) },
    ];
    const fitted = fitBudget(hits, 30, 70);
    expect(fitted.map((h) => h.text.length)).toEqual([30, 30, 10]);
  });
});

describe('foundFactCount', () => {
  it('counts non-null, non-empty facts', () => {
    const detail = emptyDetail('https://ror.org/x', 'Robotics', '2026-11-21T00:00:00.000Z');
    expect(foundFactCount(detail)).toBe(0);
    detail.tuition = { ...detail.tuition, value: 'Free' };
    detail.exams = { ...detail.exams, value: [] };
    expect(foundFactCount(detail)).toBe(1);
  });
});
