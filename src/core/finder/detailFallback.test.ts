import { describe, expect, it } from 'bun:test';
import type { Profile, Provider } from '../contracts';
import { StaticProfile, StaticSettings } from '../adapters/env';
import { InMemoryDetailCache } from '../adapters/memory';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { FIXTURE_RECORDS } from '../grounding/fixtures';
import { RorStore } from '../grounding/rorStore';
import { loadDetail } from './detail';

const profile: Profile = {
  name: 'Ana',
  primaryLang: 'en',
  uiLang: 'en',
  languages: [{ lang: 'en', level: 'C1' }],
  program: 'IB',
};

const ror = new RorStore(FIXTURE_RECORDS);

const HOME = `https://www.ub.edu/`;
const PROGRAMS = `https://www.ub.edu/programs`;
const FEES = `https://www.ub.edu/tuition-fees`;
const ADMISSIONS = `https://www.ub.edu/admissions`;

const homeHtml = `<html><head><title>University of Barcelona</title></head><body>
<p>The University of Barcelona is a public university located in Barcelona, Spain.</p>
<a href="/programs">Programs</a><a href="/tuition-fees">Tuition fees</a><a href="/admissions">Admissions</a>
</body></html>`;

const programsHtml = `<html><head><title>Programs</title></head><body>
<p>The language of instruction is English. The BSc Law programme lasts four years.</p>
</body></html>`;

const feesHtml = `<html><head><title>Fees</title></head><body>
<p>There are no tuition fees for all students.</p>
</body></html>`;

const admissionsHtml = `<html><head><title>Admissions</title></head><body>
<p>Applications close on 15 July 2027. Students need IELTS 6.5 and an IB diploma with 36 points.
Apply online through the university portal.</p>
</body></html>`;

const detailJson = JSON.stringify({
  overview: {
    value: 'A public university in Barcelona',
    sourceUrl: HOME,
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
    sourceUrl: ADMISSIONS,
    quote: 'Applications close on 15 July 2027',
  },
  nextDeadline: {
    value: '15 July 2027',
    sourceUrl: ADMISSIONS,
    quote: 'Applications close on 15 July 2027',
  },
  exams: {
    value: ['IELTS 6.5'],
    sourceUrl: ADMISSIONS,
    quote: 'Students need IELTS 6.5',
  },
  requirements: {
    value: 'IB diploma with 36 points',
    sourceUrl: ADMISSIONS,
    quote: 'an IB diploma with 36 points',
  },
  applyUrl: {
    value: 'https://www.ub.edu/apply',
    sourceUrl: ADMISSIONS,
    quote: 'Apply online through the university portal',
  },
});

class FakeHttp implements HttpClient {
  calls = 0;

  async fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.calls++;
    if (url.startsWith('https://opencode.ai/')) {
      const body = JSON.parse(init?.body ?? '{}') as unknown;
      void body;
      const payload = JSON.stringify({ choices: [{ message: { content: detailJson } }] });
      return {
        ok: true,
        status: 200,
        text: async () => payload,
        json: async () => JSON.parse(payload) as unknown,
      };
    }
    const html =
      url === HOME
        ? homeHtml
        : url === PROGRAMS
          ? programsHtml
          : url === FEES
            ? feesHtml
            : url === ADMISSIONS
              ? admissionsHtml
              : null;
    if (html === null) {
      return { ok: false, status: 404, text: async () => 'no', json: async () => ({}) };
    }
    return { ok: true, status: 200, text: async () => html, json: async () => ({}) };
  }
}

function deps(http: FakeHttp) {
  return {
    http,
    secrets: {
      get: async (provider: Provider) => (provider === 'opencode' ? 'opencode-key' : null),
    },
    settings: new StaticSettings(null, 'opencode'),
    profile: new StaticProfile(profile),
    details: new InMemoryDetailCache(),
    now: () => new Date('2026-11-21T12:00:00.000Z'),
  };
}

describe('loadDetail with OpenCode only', () => {
  it('fetches official pages and verifies every fact against their text', async () => {
    const http = new FakeHttp();
    const detail = await loadDetail(deps(http), ror, 'https://ror.org/000000001', 'BSc Law');

    expect(detail.overview.value).toContain('public university');
    expect(detail.languages.value).toEqual(['English']);
    expect(detail.tuition.value).toBe('Free');
    expect(detail.nextDeadline.value).toBe('15 July 2027');
    expect(detail.exams.value).toEqual(['IELTS 6.5']);
    expect(detail.requirements.value).toBe('IB diploma with 36 points');
    expect(detail.applyUrl.value).toBe('https://www.ub.edu/apply');
    expect(detail.applyUrl.sourceKind).toBe('official');
    expect(detail.scholarships.value).toBeNull();
  });

  it('serves the second call from cache without touching the network', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    await loadDetail(d, ror, 'https://ror.org/000000001', 'BSc Law');
    const afterFirst = http.calls;
    expect(afterFirst).toBeGreaterThan(0);

    const cached = await loadDetail(d, ror, 'https://ror.org/000000001', 'BSc Law');
    expect(cached.tuition.value).toBe('Free');
    expect(http.calls).toBe(afterFirst);
  });

  it('nulls a fact when the quote is not on the fetched pages', async () => {
    const http = new FakeHttp();
    const bad = JSON.parse(detailJson) as { tuition: { quote: string } };
    bad.tuition.quote = 'International students pay €30,000 per year';
    const original = http.fetch.bind(http);
    http.fetch = async (url, init) => {
      const response = await original(url, init);
      if (!url.startsWith('https://opencode.ai/')) return response;
      const payload = JSON.stringify({ choices: [{ message: { content: JSON.stringify(bad) } }] });
      return {
        ok: true,
        status: 200,
        text: async () => payload,
        json: async () => JSON.parse(payload) as unknown,
      };
    };
    const detail = await loadDetail(deps(http), ror, 'https://ror.org/000000001', 'BSc Law');
    expect(detail.tuition.value).toBeNull();
  });
});
