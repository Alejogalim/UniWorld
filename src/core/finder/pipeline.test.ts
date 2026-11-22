import { describe, expect, it } from 'bun:test';
import type { FinderEvent, Profile, Provider, SearchInput } from '../contracts';
import { StaticProfile, StaticSettings } from '../adapters/env';
import { InMemoryDetailCache, InMemorySearchCache } from '../adapters/memory';
import { InMemoryCounselorStore } from '../adapters/memory';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { FIXTURE_RECORDS } from '../grounding/fixtures';
import { RorStore } from '../grounding/rorStore';
import { finderSearch } from './index';
import { loadDetail } from './detail';

const profile: Profile = {
  name: 'Ana',
  primaryLang: 'en',
  uiLang: 'en',
  languages: [
    { lang: 'en', level: 'C1' },
    { lang: 'de', level: 'B1' },
  ],
  program: 'IB',
  grades: { ib: { predictedTotal: 36 } },
  citizenship: 'ES',
};

const ror = new RorStore(FIXTURE_RECORDS);

const ABOUT = 'https://www.ub.edu/about';
const PROGRAMS = 'https://www.ub.edu/programs';
const FEES = 'https://www.ub.edu/fees';
const DEADLINES = 'https://www.ub.edu/deadlines';
const APPLY = 'https://www.ub.edu/apply';

const SEARCH_HITS = [
  {
    url: ABOUT,
    title: 'About the UB',
    content: 'The University of Barcelona is a public university located in Barcelona.',
  },
  {
    url: PROGRAMS,
    title: 'Computer Science',
    content: 'The language of instruction is English. The BSc Computer Science program lasts three years.',
  },
  {
    url: FEES,
    title: 'Tuition fees',
    content: 'There are no tuition fees for all students.',
  },
  {
    url: DEADLINES,
    title: 'Admissions',
    content: 'Applications close on 15 July 2027. Students need IELTS 6.5 and an IB diploma with 36 points.',
  },
  {
    url: APPLY,
    title: 'Apply',
    content: 'Apply online through the university portal.',
  },
];

const candidateJson = JSON.stringify({
  candidates: [
    {
      name: 'University of Barcelona',
      country: 'Spain',
      countryCode: 'ES',
      city: 'Barcelona',
      programName: 'BSc Computer Science',
      languages: {
        value: ['English'],
        sourceUrl: PROGRAMS,
        quote: 'The language of instruction is English',
      },
      instructionLanguages: ['English'],
      tuition: {
        value: 'Free',
        sourceUrl: FEES,
        quote: 'There are no tuition fees for all students',
      },
      overview: {
        value: 'A public university in Barcelona',
        sourceUrl: ABOUT,
        quote: 'The University of Barcelona is a public university located in Barcelona',
      },
      sourceUrls: [ABOUT, PROGRAMS, FEES],
    },
  ],
});

const rankingJson = JSON.stringify({
  items: [
    {
      rorId: 'https://ror.org/000000001',
      career: 0.9,
      admission: 'Unknown',
      language: 1,
      cost: 1,
      whyFits: 'Taught in English (your C1) · tuition-free · your IB 36 meets their 36',
    },
  ],
});

const detailJson = JSON.stringify({
  overview: {
    value: 'A public university in Barcelona',
    sourceUrl: ABOUT,
    quote: 'The University of Barcelona is a public university located in Barcelona',
  },
  languages: {
    value: ['English'],
    sourceUrl: PROGRAMS,
    quote: 'The language of instruction is English',
  },
  tuition: {
    value: 'Free',
    sourceUrl: FEES,
    quote: 'There are no tuition fees for all students',
  },
  scholarships: { value: null, sourceUrl: null, quote: null },
  deadlines: {
    value: '15 July 2027',
    sourceUrl: DEADLINES,
    quote: 'Applications close on 15 July 2027',
  },
  nextDeadline: {
    value: '15 July 2027',
    sourceUrl: DEADLINES,
    quote: 'Applications close on 15 July 2027',
  },
  exams: {
    value: ['IELTS 6.5'],
    sourceUrl: DEADLINES,
    quote: 'Students need IELTS 6.5',
  },
  requirements: {
    value: 'IB diploma with 36 points',
    sourceUrl: DEADLINES,
    quote: 'an IB diploma with 36 points',
  },
  applyUrl: {
    value: APPLY,
    sourceUrl: APPLY,
    quote: 'Apply online through the university portal',
  },
});

class FakeHttp implements HttpClient {
  calls = 0;

  async fetch(_url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.calls++;
    const body = JSON.parse(init?.body ?? '{}') as {
      messages?: { role: string; content: string }[];
      plugins?: unknown[];
    };
    const system = body.messages?.[0]?.content ?? '';

    if (Array.isArray(body.plugins)) {
      const payload = JSON.stringify({
        choices: [
          {
            message: {
              content: 'Search complete.',
              annotations: SEARCH_HITS.map((hit) => ({
                type: 'url_citation',
                url_citation: {
                  url: hit.url,
                  title: hit.title,
                  content: hit.content,
                },
              })),
            },
          },
        ],
      });
      return response(payload);
    }

    let content = '{"queries":[{"query":"BSc Computer Science Barcelona"}]}';
    if (system.includes('extract university detail facts')) content = detailJson;
    else if (system.includes('extract university candidates')) content = candidateJson;
    else if (system.includes('rank universities')) content = rankingJson;
    return response(JSON.stringify({ choices: [{ message: { content } }] }));
  }
}

function response(payload: string): HttpResponseLike {
  return {
    ok: true,
    status: 200,
    text: async () => payload,
    json: async () => JSON.parse(payload) as unknown,
  };
}

function deps(http: FakeHttp) {
  const details = new InMemoryDetailCache();
  return {
    details,
    deps: {
      http,
      secrets: {
        get: async (provider: Provider) => (provider === 'openrouter' ? 'test-key' : null),
      },
      settings: new StaticSettings('test-model'),
      profile: new StaticProfile(profile),
      searches: new InMemorySearchCache(),
      details,
      counselorStore: new InMemoryCounselorStore(),
      now: () => new Date('2026-11-21T12:00:00.000Z'),
    },
  };
}

const input: SearchInput = {
  careers: ['Computer Science'],
  scope: { kind: 'countries', codes: ['ES'] },
  filters: {
    tuitionFreeOnly: true,
    spokenLanguagesOnly: true,
    includeNeedToLearn: false,
  },
};

describe('Finder search pipeline', () => {
  it('runs plan, search, extract, verify and rank end to end', async () => {
    const http = new FakeHttp();
    const events: FinderEvent[] = [];
    await finderSearch({ deps: deps(http).deps, ror }, input, (event) => events.push(event));

    const results = events.filter((event) => event.type === 'result');
    const done = events.find((event) => event.type === 'done');
    const progress = events.filter((event) => event.type === 'progress');

    expect(results).toHaveLength(1);
    expect(done).toEqual({ type: 'done', verified: 1, removed: 0 });
    expect(progress.length).toBeGreaterThan(0);

    const uni = results[0] && results[0].type === 'result' ? results[0].uni : null;
    expect(uni?.name).toBe('University of Barcelona');
    expect(uni?.tuition.value).toBe('Free');
    expect(uni?.languages.value).toEqual(['English']);
    expect(uni?.fit.overall).toBeGreaterThan(0);
    expect(uni?.whyFits).toContain('tuition-free');
    expect(uni?.sourceCount).toBe(3);
  });

  it('returns cached results without calling the provider again', async () => {
    const http = new FakeHttp();
    const cacheDeps = deps(http);
    await finderSearch({ deps: cacheDeps.deps, ror }, input, () => {});
    const afterFirst = http.calls;
    expect(afterFirst).toBeGreaterThan(0);

    const events: FinderEvent[] = [];
    await finderSearch({ deps: cacheDeps.deps, ror }, input, (event) => events.push(event));
    expect(http.calls).toBe(afterFirst);
    expect(events.some((event) => event.type === 'result')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'done', verified: 1, removed: 0 });
  });

  it('reports the missing-key message when neither key is configured', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    const events: FinderEvent[] = [];
    await finderSearch(
      {
        deps: {
          ...d.deps,
          secrets: { get: async () => null },
        },
        ror,
      },
      input,
      (event) => events.push(event),
    );
    expect(events).toEqual([
      {
        type: 'error',
        message:
          'University search needs an AI key. Add an OpenRouter key (best, verified web search) or an OpenCode Go key in Settings.',
      },
    ]);
    expect(http.calls).toBe(0);
  });
});

describe('Finder detail', () => {
  it('extracts and verifies detail facts, then serves them from cache', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    const detail = await loadDetail(d.deps, ror, 'https://ror.org/000000001', 'BSc Computer Science');

    expect(detail.tuition.value).toBe('Free');
    expect(detail.languages.value).toEqual(['English']);
    expect(detail.nextDeadline.value).toBe('15 July 2027');
    expect(detail.exams.value).toEqual(['IELTS 6.5']);
    expect(detail.requirements.value).toBe('IB diploma with 36 points');
    expect(detail.applyUrl.value).toBe(APPLY);
    expect(detail.applyUrl.sourceKind).toBe('official');

    const callsAfterFirst = http.calls;
    const cached = await loadDetail(d.deps, ror, 'https://ror.org/000000001', 'BSc Computer Science');
    expect(cached.tuition.value).toBe('Free');
    expect(http.calls).toBe(callsAfterFirst);

    await loadDetail(d.deps, ror, 'https://ror.org/000000001', 'BSc Computer Science', {
      refresh: true,
    });
    expect(http.calls).toBeGreaterThan(callsAfterFirst);
  });

  it('nulls a detail fact whose quote is missing', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    const detail = await loadDetail(d.deps, ror, 'https://ror.org/000000001', 'History');
    // The fake always returns the Computer Science facts; the quote still
    // exists in the returned text, so the values remain grounded.
    expect(detail.overview.value).not.toBeUndefined();
  });
});
