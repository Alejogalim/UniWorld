import { describe, expect, it } from 'bun:test';
import type { SearchHit } from '../ai/types';
import { normalizeText } from '../normalize';
import { containsTerm, findProgrammeEvidence, findProgrammeNameEvidence } from './programme';

function hit(url: string, title: string, text: string): SearchHit {
  return { url, title, text };
}

describe('containsTerm', () => {
  it('matches whole words only for Latin text', () => {
    expect(containsTerm(normalizeText('start your application'), normalizeText('art'))).toBe(false);
    expect(containsTerm(normalizeText('charts'), normalizeText('arts'))).toBe(false);
    expect(containsTerm(normalizeText('a degree in arts'), normalizeText('arts'))).toBe(true);
  });

  it('uses substring matching for CJK', () => {
    expect(containsTerm(normalizeText('本专业为软件工程专业'), normalizeText('软件工程'))).toBe(true);
  });
});

describe('findProgrammeEvidence', () => {
  it('returns the matched programme text and a quote', () => {
    const evidence = findProgrammeEvidence(
      [
        hit(
          'https://www.ub.edu/programs',
          'BSc Computer Science — Undergraduate programmes',
          'The BSc Computer Science programme lasts three years.\nStudents study algorithms.',
        ),
      ],
      ['Computer Science'],
    );
    expect(evidence?.program).toBe('BSc Computer Science — Undergraduate programmes');
    expect(evidence?.url).toBe('https://www.ub.edu/programs');
    expect(evidence?.quote).toContain('Computer Science');
  });

  it('matches keywords case- and diacritic-insensitively', () => {
    const evidence = findProgrammeEvidence(
      [hit('https://x.edu/', 'Degrees', 'Our mechatronics engineering degree is new.')],
      ['Mechatrónica', 'Mechatronics'],
    );
    expect(evidence?.quote).toContain('mechatronics');
  });

  it('returns null when no page mentions a keyword', () => {
    const evidence = findProgrammeEvidence(
      [hit('https://x.edu/fees', 'Tuition fees', 'There are no tuition fees for all students.')],
      ['Robotics'],
    );
    expect(evidence).toBeNull();
  });

  it('verifies a non-English programme name that appears verbatim', () => {
    const evidence = findProgrammeNameEvidence(
      [hit('https://x.edu/benke', '本科专业', '本专业为软件工程专业，学制四年。')],
      '软件工程',
    );
    expect(evidence?.program).toBe('软件工程');
    expect(evidence?.url).toBe('https://x.edu/benke');
    expect(evidence?.quote).toContain('软件工程');
  });

  it('rejects a programme name that is not on the page', () => {
    const evidence = findProgrammeNameEvidence(
      [hit('https://x.edu/', 'Home', 'Welcome to our university.')],
      'Robotics',
    );
    expect(evidence).toBeNull();
  });

  it('returns the keyword itself when only the body matches', () => {
    const evidence = findProgrammeEvidence(
      [hit('https://x.edu/study', 'Study', 'Robotics and autonomous systems are taught here.')],
      ['Robotics'],
    );
    expect(evidence?.program).toBe('Robotics');
  });
});
