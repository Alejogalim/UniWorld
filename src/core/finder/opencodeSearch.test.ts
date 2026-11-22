import { describe, expect, it } from 'bun:test';
import type { FinderEvent, Profile, Provider, SearchInput } from '../contracts';
import { StaticProfile, StaticSettings } from '../adapters/env';
import { chooseFinderProvider } from '../ai/index';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { FIXTURE_RECORDS } from '../grounding/fixtures';
import { RorStore } from '../grounding/rorStore';
import { finderSearch } from './index';
import { looksNonBachelor } from './level';
import { groundSuggestions } from './suggest';

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

const input: SearchInput = {
  careers: ['Computer Science'],
  scope: { kind: 'countries', codes: ['ES'] },
  filters: {
    tuitionFreeOnly: true,
    spokenLanguagesOnly: true,
    includeNeedToLearn: false,
  },
};

const HOME = 'https://www.ub.edu/';
const PROGRAMS = 'https://www.ub.edu/programs';
const FEES = 'https://www.ub.edu/tuition-fees';

const PAGES: Record<string, string> = {
  [HOME]: `<html><head><title>University of Barcelona</title></head><body>
<p>The University of Barcelona is a public university located in Barcelona, Spain.</p>
<a href="/programs">Programs</a><a href="/tuition-fees">Tuition fees</a>
</body></html>`,
  [PROGRAMS]: `<html><head><title>Programs</title></head><body>
<p>The language of instruction is English. The BSc Computer Science program lasts three years.</p>
</body></html>`,
  [FEES]: `<html><head><title>Tuition fees</title></head><body>
<p>There are no tuition fees for all students.</p>
</body></html>`,
};

const suggestionsJson = JSON.stringify({
  universities: [
    { name: 'University of Barcelona', country: 'Spain' },
    { name: 'Universidad Inventada Imaginaria', country: 'Spain' },
    { name: 'University of Oxford', country: 'United Kingdom' },
  ],
});

function candidateJson(tuitionQuote: string) {
  return JSON.stringify({
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
          quote: tuitionQuote,
        },
        overview: {
          value: 'A public university in Barcelona',
          sourceUrl: HOME,
          quote: 'The University of Barcelona is a public university located in Barcelona',
        },
        sourceUrls: [HOME, PROGRAMS, FEES],
      },
    ],
  });
}

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

/** Fake transport: OpenCode chat replies by prompt, official sites by URL. */
class FakeOpenCodeHttp implements HttpClient {
  chatCalls = 0;
  pageCalls: string[] = [];

  constructor(private readonly tuitionQuote = 'There are no tuition fees for all students') {}

  async fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    if (url.startsWith('https://opencode.ai/')) {
      this.chatCalls++;
      const body = JSON.parse(init?.body ?? '{}') as { messages?: { content: string }[] };
      const system = body.messages?.[0]?.content ?? '';
      let content = '{}';
      if (system.includes('You suggest real universities')) content = suggestionsJson;
      else if (system.includes('extract university candidates')) content = candidateJson(this.tuitionQuote);
      else if (system.includes('rank universities')) content = rankingJson;
      return response(JSON.stringify({ choices: [{ message: { content } }] }), 200);
    }

    this.pageCalls.push(url);
    const html = PAGES[url];
    if (!html) return response('Not found', 404);
    return response(html, 200, url);
  }
}

function response(payload: string, status: number, url?: string): HttpResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    text: async () => payload,
    json: async () => JSON.parse(payload) as unknown,
  };
}

function deps(http: HttpClient, keys: Partial<Record<Provider, string | null>>, preferred?: Provider) {
  return {
    http,
    secrets: { get: async (provider: Provider) => keys[provider] ?? null },
    settings: new StaticSettings('test-model', preferred ?? null),
    profile: new StaticProfile(profile),
    now: () => new Date('2026-11-21T12:00:00.000Z'),
  };
}

async function run(d: ReturnType<typeof deps>) {
  const events: FinderEvent[] = [];
  await finderSearch({ deps: d, ror }, input, (event) => events.push(event));
  return events;
}

describe('Finder search with OpenCode Go only', () => {
  it('suggests, grounds, reads official pages, verifies and ranks', async () => {
    const http = new FakeOpenCodeHttp();
    const events = await run(deps(http, { opencode: 'k' }));

    const results = events.filter((event) => event.type === 'result');
    const unique = new Set(
      results.flatMap((event) => (event.type === 'result' ? [event.uni.rorId] : [])),
    );
    // Results are streamed unranked and re-emitted ranked: one row per rorId.
    expect(unique.size).toBe(1);
    expect(events.at(-1)).toEqual({
      type: 'done',
      verified: 1,
      removed: 2,
      reasons: { not_in_registry: 1, out_of_scope: 1 },
    });

    const last = results.at(-1);
    const uni = last && last.type === 'result' ? last.uni : null;
    expect(uni?.name).toBe('University of Barcelona');
    expect(uni?.tuition.value).toBe('Free');
    expect(uni?.tuition.sourceKind).toBe('official');
    expect(uni?.languages.value).toEqual(['English']);

    const progress = events
      .filter((event) => event.type === 'progress')
      .map((event) => (event.type === 'progress' ? event.message : ''));
    expect(progress).toContain('Suggesting universities…');
    expect(progress).toContain('Reading official pages (1 of 1)…');
    expect(http.pageCalls.length).toBeGreaterThan(0);
  });

  it('nulls a fact whose quote is not on the fetched page', async () => {
    const http = new FakeOpenCodeHttp('Tuition is five thousand euros per year');
    const events = await run(deps(http, { opencode: 'k' }));

    const results = events.filter((event) => event.type === 'result');
    // The tuition quote is not on the page, so the fact is dropped. The
    // "Free" filter then removes the university.
    expect(results).toHaveLength(0);
    expect(events.at(-1)).toEqual({
      type: 'done',
      verified: 0,
      removed: 3,
      reasons: { not_in_registry: 1, out_of_scope: 1, tuition_not_free: 1 },
    });
  });

  it('uses OpenCode when both keys exist and the setting prefers it', async () => {
    const http = new FakeOpenCodeHttp();
    const events = await run(deps(http, { opencode: 'k', openrouter: 'o' }, 'opencode'));
    expect(events.at(-1)).toEqual({
      type: 'done',
      verified: 1,
      removed: 2,
      reasons: { not_in_registry: 1, out_of_scope: 1 },
    });
    expect(http.chatCalls).toBeGreaterThan(0);
    expect(http.pageCalls.every((url) => !url.includes('openrouter.ai'))).toBe(true);
  });
});

describe('looksNonBachelor', () => {
  it('flags Master/MBA/diploma programmes but keeps bachelor and local names', () => {
    expect(looksNonBachelor('AI in Biomedicine - Master of Science (M.Sc.)')).toBe(true);
    expect(looksNonBachelor('MBA Management in der Medizin')).toBe(true);
    expect(looksNonBachelor('Maestría en Ciencia de Datos')).toBe(true);
    expect(looksNonBachelor('Diplomado en Big Data')).toBe(true);
    expect(looksNonBachelor('Laurea Magistrale in Ingegneria')).toBe(true);
    expect(looksNonBachelor('Mestrado em Informática')).toBe(true);
    expect(looksNonBachelor('BSc Computer Science')).toBe(false);
    expect(looksNonBachelor('Civilingenjör datateknik')).toBe(false);
    expect(looksNonBachelor('MSci Computer Science')).toBe(false);
    expect(looksNonBachelor('MPharm Pharmacy')).toBe(false);
    expect(looksNonBachelor('软件工程')).toBe(false);
  });
});

describe('groundSuggestions', () => {
  it('drops unmatched and out-of-scope names and dedupes by ROR id', () => {
    const grounded = groundSuggestions(
      [
        { name: 'University of Barcelona', country: 'Spain' },
        { name: 'University of Barcelona', country: 'Spain' },
        { name: 'Universidad Inventada Imaginaria', country: 'Spain' },
        { name: 'University of Oxford', country: 'United Kingdom' },
      ],
      ror,
      input,
    );
    expect(grounded.records.map((record) => record.name)).toEqual(['University of Barcelona']);
    expect(grounded.removed).toBe(2);
  });
});

describe('finderProvider rule', () => {
  const cases: [string, Parameters<typeof chooseFinderProvider>[0], Provider | null][] = [
    ['both keys, prefers openrouter', { preferred: 'openrouter', hasOpenRouter: true, hasOpenCode: true }, 'openrouter'],
    ['both keys, prefers opencode', { preferred: 'opencode', hasOpenRouter: true, hasOpenCode: true }, 'opencode'],
    ['both keys, no preference', { preferred: null, hasOpenRouter: true, hasOpenCode: true }, 'openrouter'],
    ['prefers opencode, only openrouter', { preferred: 'opencode', hasOpenRouter: true, hasOpenCode: false }, 'openrouter'],
    ['prefers openrouter, only opencode', { preferred: 'openrouter', hasOpenRouter: false, hasOpenCode: true }, 'opencode'],
    ['only opencode, no preference', { preferred: null, hasOpenRouter: false, hasOpenCode: true }, 'opencode'],
    ['prefers opencode, no keys', { preferred: 'opencode', hasOpenRouter: false, hasOpenCode: false }, null],
    ['no keys', { preferred: null, hasOpenRouter: false, hasOpenCode: false }, null],
  ];
  for (const [name, state, expected] of cases) {
    it(name, () => {
      expect(chooseFinderProvider(state)).toBe(expected);
    });
  }
});
