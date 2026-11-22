import { Database } from 'bun:sqlite';
import { describe, expect, it } from 'bun:test';
import type { UniDetail, UniResult } from '../core/contracts';
import { BunSqlClient } from '../core/adapters/bunSql';
import { SqlCounselorStore } from './counselor';
import { SqlDetailCache } from './detailCache';
import { SqlSearchCache } from './search';

const DDL = `
CREATE TABLE counselor_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  provider TEXT NOT NULL,
  weights_json TEXT,
  status TEXT NOT NULL,
  notes_json TEXT
);
CREATE TABLE counselor_message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE career_path (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_you TEXT NOT NULL,
  degree_keywords_json TEXT NOT NULL,
  fit_breakdown_json TEXT NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE uni_search (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  careers_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  results_json TEXT NOT NULL,
  rejected_count INTEGER NOT NULL
);
CREATE TABLE uni_detail_cache (
  ror_id TEXT NOT NULL,
  program_key TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (ror_id, program_key)
);
`;

function client(): BunSqlClient {
  const db = new Database(':memory:');
  db.run(DDL);
  return new BunSqlClient(db);
}

const input = {
  careers: ['Computer Science', 'Data Science'],
  scope: { kind: 'countries' as const, codes: ['ES'] },
  filters: {
    tuitionFreeOnly: true,
    spokenLanguagesOnly: true,
    includeNeedToLearn: false,
  },
};

const result: UniResult = {
  rorId: 'https://ror.org/000000001',
  name: 'University of Barcelona',
  countryCode: 'ES',
  program: 'BSc Computer Science',
  overview: {
    value: 'A public university',
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
  fit: { career: 0.8, admission: 'Unknown', language: 1, cost: 1, overall: 0.9 },
  whyFits: 'Taught in English (your C1) · tuition-free',
  sourceCount: 3,
};

const detail: UniDetail = {
  rorId: result.rorId,
  program: result.program,
  overview: result.overview,
  languages: result.languages,
  tuition: result.tuition,
  scholarships: {
    value: null,
    sourceUrl: null,
    quote: null,
    sourceKind: 'third_party',
    checkedAt: '2026-11-21',
  },
  deadlines: {
    value: '15 July 2027',
    sourceUrl: 'https://www.ub.edu/deadlines',
    quote: 'Applications close on 15 July 2027',
    sourceKind: 'official',
    checkedAt: '2026-11-21',
  },
  nextDeadline: {
    value: '15 July 2027',
    sourceUrl: 'https://www.ub.edu/deadlines',
    quote: 'Applications close on 15 July 2027',
    sourceKind: 'official',
    checkedAt: '2026-11-21',
  },
  exams: {
    value: ['IELTS 6.5'],
    sourceUrl: 'https://www.ub.edu/deadlines',
    quote: 'Students need IELTS 6.5',
    sourceKind: 'official',
    checkedAt: '2026-11-21',
  },
  requirements: {
    value: 'IB 36',
    sourceUrl: 'https://www.ub.edu/deadlines',
    quote: 'an IB diploma with 36 points',
    sourceKind: 'official',
    checkedAt: '2026-11-21',
  },
  applyUrl: {
    value: 'https://www.ub.edu/apply',
    sourceUrl: 'https://www.ub.edu/apply',
    quote: 'Apply online through the university portal',
    sourceKind: 'official',
    checkedAt: '2026-11-21',
  },
  checkedAt: '2026-11-21',
};

describe('SqlSearchCache', () => {
  it('stores and retrieves a search by canonical input', async () => {
    const cache = new SqlSearchCache(client());
    expect(await cache.get(input)).toBeNull();
    await cache.put(input, {
      results: [result],
      rejectedCount: 2,
      createdAt: '2026-11-21T00:00:00.000Z',
    });

    const shuffled = { ...input, careers: [...input.careers].reverse() };
    const found = await cache.get(shuffled);
    expect(found?.results).toHaveLength(1);
    expect(found?.results[0]?.name).toBe('University of Barcelona');
    expect(found?.rejectedCount).toBe(2);
  });

  it('does not match a different filter set', async () => {
    const cache = new SqlSearchCache(client());
    await cache.put(input, { results: [result], rejectedCount: 0, createdAt: 'x' });
    const other = { ...input, filters: { ...input.filters, tuitionFreeOnly: false } };
    expect(await cache.get(other)).toBeNull();
  });
});

describe('SqlDetailCache', () => {
  it('upserts and reads a detail', async () => {
    const cache = new SqlDetailCache(client());
    expect(await cache.get(detail.rorId, detail.program)).toBeNull();
    await cache.put(detail);
    const found = await cache.get(detail.rorId, '  BSc Computer Science ');
    expect(found?.detail.tuition.value).toBe('Free');
    expect(found?.checkedAt).toBe('2026-11-21');

    const updated = { ...detail, checkedAt: '2026-12-01' };
    await cache.put(updated);
    expect((await cache.get(detail.rorId, detail.program))?.checkedAt).toBe('2026-12-01');
  });
});

describe('SqlCounselorStore', () => {
  it('persists sessions, messages, weights and careers', async () => {
    const store = new SqlCounselorStore(client());
    const sessionId = await store.createSession('openrouter');
    expect(sessionId).toBeGreaterThan(0);
    expect((await store.getSession(sessionId))?.provider).toBe('openrouter');

    await store.addMessage(sessionId, { role: 'user', content: 'Hello' });
    await store.addMessage(sessionId, { role: 'assistant', content: 'Hi Ana' });
    expect(await store.listMessages(sessionId)).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi Ana' },
    ]);

    await store.setWeights(sessionId, { passions: 9, strengths: 8, goals: 7, earning: 6 });
    expect((await store.getSession(sessionId))?.weights?.earning).toBe(6);

    const saved = await store.saveCareers(sessionId, [
      {
        title: 'Software engineer',
        summary: 'Build products.',
        whyYou: 'You like solving problems.',
        degreeKeywords: ['Computer Science'],
        fitBreakdown: { overall: 88 },
      },
    ]);
    expect(saved[0]?.id).toBeGreaterThan(0);
    expect(saved[0]?.saved).toBe(false);

    await store.setCareerSaved(saved[0]!.id, true);
    const careers = await store.listCareers(sessionId);
    expect(careers[0]?.saved).toBe(true);
    expect(careers[0]?.degreeKeywords).toEqual(['Computer Science']);

    const savedAcrossSessions = await store.listSavedCareers();
    expect(savedAcrossSessions).toHaveLength(1);
    expect(savedAcrossSessions[0]?.title).toBe('Software engineer');
  });

  it('saves and reads counselor notes', async () => {
    const store = new SqlCounselorStore(client());
    const sessionId = await store.createSession('openrouter');
    expect(await store.getNotes(sessionId)).toBeNull();
    const notes = {
      interests: ['draws comics'],
      strengths: [],
      values: ['freedom'],
      workStyle: [],
      limits: [],
      gaps: ['strengths' as const],
    };
    await store.setNotes(sessionId, notes);
    expect(await store.getNotes(sessionId)).toEqual(notes);
  });
});
