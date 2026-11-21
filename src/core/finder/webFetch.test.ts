import { describe, expect, it } from 'bun:test';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { FIXTURE_RECORDS } from '../grounding/fixtures';
import { discoverLinks, fetchUniversityPages, htmlToText, pageTitle } from './webFetch';

const HOME = `
<!doctype html>
<html><head><title>University of Barcelona</title></head>
<body>
  <script>alert('ignore me')</script>
  <style>.x { color: red }</style>
  <h1>University of Barcelona</h1>
  <p>The University of Barcelona is a public university located in Barcelona, Spain.</p>
  <a href="/admissions">Admissions</a>
  <a href="/tuition-fees">Tuition fees</a>
  <a href="/privacy">Privacy policy</a>
  <a href="/brochure.pdf">Brochure PDF</a>
  <a href="https://evil.example/admissions">External</a>
</body></html>`;

function page(text: string, links = ''): string {
  return `<html><head><title>UB</title></head><body><p>${text}</p>${links}</body></html>`;
}

class FakeHttp implements HttpClient {
  readonly requested: string[] = [];

  async fetch(url: string, _init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.requested.push(url);
    let body: string;
    if (url === 'https://www.ub.edu/') body = HOME;
    else if (url.includes('/admissions')) {
      body = page('Applications close on 15 July 2027. Students need IELTS 6.5.');
    } else if (url.includes('/tuition-fees')) {
      body = page('There are no tuition fees for all students.');
    } else if (url.includes('/programs')) {
      body = page('The language of instruction is English.');
    } else {
      return {
        ok: false,
        status: 404,
        text: async () => 'not found',
        json: async () => ({}),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => body,
      json: async () => ({}),
    };
  }
}

const ub = FIXTURE_RECORDS[0]!;

describe('htmlToText', () => {
  it('strips scripts, styles, tags and decodes entities', () => {
    const text = htmlToText(
      '<div>Hello&nbsp;<b>world</b> &amp; friends</div><script>bad()</script><style>x</style>',
    );
    expect(text).toContain('Hello world & friends');
    expect(text).not.toContain('bad()');
    expect(text).not.toContain('color: red');
  });

  it('reads the title', () => {
    expect(pageTitle('<html><head><title> UB — Law </title></head></html>')).toBe('UB — Law');
  });
});

describe('discoverLinks', () => {
  it('keeps relevant same-site pages and drops external, pdf and privacy links', () => {
    const allowed = new Set(['ub.edu', 'www.ub.edu']);
    const links = discoverLinks(HOME, 'https://www.ub.edu/', allowed, 'Law');
    expect(links).toContain('https://www.ub.edu/admissions');
    expect(links).toContain('https://www.ub.edu/tuition-fees');
    expect(links.some((url) => url.includes('evil.example'))).toBe(false);
    expect(links.some((url) => url.endsWith('.pdf'))).toBe(false);
    expect(links).not.toContain('https://www.ub.edu/privacy');
  });
});

describe('fetchUniversityPages', () => {
  it('fetches the homepage and relevant official pages', async () => {
    const http = new FakeHttp();
    const hits = await fetchUniversityPages(http, ub, 'Law');
    const urls = hits.map((hit) => hit.url);
    expect(urls).toContain('https://www.ub.edu/');
    expect(urls.some((url) => url.includes('/admissions'))).toBe(true);
    expect(urls.some((url) => url.includes('/tuition-fees'))).toBe(true);
    expect(hits.every((hit) => hit.text.length > 40)).toBe(true);
    expect(hits.find((hit) => hit.url.includes('/admissions'))?.text).toContain('15 July 2027');
  });

  it('returns nothing when the university has no domains', async () => {
    const http = new FakeHttp();
    const hits = await fetchUniversityPages(
      http,
      { ...ub, domains: [], website: null },
      'Law',
    );
    expect(hits).toEqual([]);
    expect(http.requested).toHaveLength(0);
  });
});
