# 39 — Detail coverage: better sources, tolerant quote matching, short cache for sparse results

Branch: `feat/status-track-motion`. Builder: Haiku via `cmd -p`.
This plan edits `src/core/**` on purpose (owner-approved). It overrides the "never edit src/core" rule in `.plans/A-build-conventions.md` for the files listed below only.

## Why
The university detail page is mostly "Not found — check official site" (e.g. Stanford + Robotics: only overview and scholarships). Causes:
1. Only 2 generic search queries, 8 results, short Exa snippets. Central undergraduate admissions/tuition pages are missed.
2. The programme may not exist at bachelor level, so the hits are graduate pages.
3. Snippets are short; the real facts live in the full page.
4. Exact-quote validation rejects near misses (invisible characters, soft hyphens, ligatures, quotes shortened with "…").
5. A near-empty result is cached for 30 days.

## Decisions
- **A. Quote matching** (`citationValidator.ts`): new `normalizeQuoteText` = existing `normalizeText` (already: lowercase, diacritics, curly/straight quotes and apostrophes, dashes and all punctuation → space, whitespace collapse) **plus** removal of zero-width chars / word joiner / BOM / soft hyphen and expansion of ligatures `ﬀ ﬁ ﬂ ﬃ ﬄ ﬅ ﬆ`. Digits are never changed. Used for both the index text and the quote. If the whole quote does not match, a quote containing `...`/`…` passes only when every piece has ≥2 words and appears verbatim. `normalizeText` in `normalize.ts` is NOT changed (other matchers use it).
- **B. Cache**: keep `put` as is; on read, a cached detail with fewer than 3 found facts is fresh for 1 day only (`DETAIL_SPARSE_CACHE_TTL_MS`), otherwise 30 days. No store/schema change.
- **C. Search (OpenRouter)**: 4 focused queries run in parallel (`Promise.allSettled`, one `client.search([q])` each), `maxResults: 12`, allowed domains first, fallback without domains when zero hits. Merged and deduped by `normalizeUrl`, capped at 16 hits. If every query rejects, the first error is thrown (provider/auth errors still surface).
- **D. Full page text**: the first 4 hits on the official domains (not PDFs) are fetched with the existing `fetchPage` (page cache, 8s per page, 15s overall, failures ignored). Hit text becomes `snippet (≤3000 chars) + "\n[...]\n" + keyword excerpts` within the per-hit budget. Enriched hits move to the front. OpenCode pages longer than the budget get `focusText` (first 1500 chars + keyword excerpts) instead of a blind slice.
- **Same text for model and validator**: `fitBudget` applies exactly `sourceBlock`'s per-hit/total slicing to the hits **before** both the prompt and `CitationIndex.fromHits`, so the index holds exactly what the model saw.
- New budgets (detail only; `EXTRACT_MAX_*` for Finder unchanged): `DETAIL_MAX_CHARS_PER_HIT = 9000`, `DETAIL_MAX_TOTAL_CHARS = 72_000`, `DETAIL_MAX_HITS = 16`, `DETAIL_SEARCH_MAX_RESULTS = 12`, `DETAIL_ENRICH_PAGES = 4`, `DETAIL_ENRICH_TIMEOUT_MS = 15_000`.
- **E. Prompt**: undergraduate / international first-year framing; admissions facts may come from university-wide undergraduate pages; overview describes the undergraduate programme or factually says none by that name appears in the sources; all quote rules kept.
- No UI change. No i18n change.

## Builder rules
- Work on branch `feat/status-track-motion`. No commits, no branch switches, no `pkill`/`killall`. Do not start the app. Do not run anything that hits the network (tests use fakes only).
- Touch ONLY these files:
  - `src/core/config.ts` (Step 1, append)
  - `src/core/grounding/citationValidator.ts` (Step 2, exact edits)
  - `src/core/grounding/citationValidator.test.ts` (Step 2, append)
  - `src/core/finder/webFetch.ts` (Step 3, exact edits + append)
  - `src/core/finder/webFetch.test.ts` (Step 3, import edit + append)
  - `src/core/ai/prompts.ts` (Step 4, one exact edit)
  - `src/core/finder/detail.ts` (Step 5, full replacement)
  - `src/core/finder/detailHelpers.test.ts` (Step 6, new)
  - `src/core/finder/detailFallback.test.ts` (Step 6, import edit + append)
  - this plan file (checkboxes + "Builder notes" only)
- If a step fails twice, stop and write it under "Builder notes".

---

## Step 1 — `src/core/config.ts` (append at end of file)

```ts

/** Detail page budgets (plan 39). Finder extraction keeps EXTRACT_MAX_*. */
export const DETAIL_SEARCH_MAX_RESULTS = 12;
export const DETAIL_MAX_HITS = 16;
export const DETAIL_MAX_CHARS_PER_HIT = 9000;
export const DETAIL_MAX_TOTAL_CHARS = 72_000;
/** How many official-domain hits get their full page fetched, and the overall time box. */
export const DETAIL_ENRICH_PAGES = 4;
export const DETAIL_ENRICH_TIMEOUT_MS = 15_000;
/** A detail with fewer found facts than this is only trusted from cache for a day. */
export const DETAIL_SPARSE_MIN_FACTS = 3;
export const DETAIL_SPARSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
```

- [x] Step 1 done

## Step 2 — `src/core/grounding/citationValidator.ts`

### 2a. Add after the `import { languageName, languagesInText } from './languages';` line

```ts

/** Invisible characters some sites put inside words: zero-width space/joiners, word joiner, BOM, soft hyphen. */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
/** Typographic ligatures (U+FB00..U+FB06, e.g. the fi ligature) become plain letters. Digits are never touched. */
const LIGATURES = /[\uFB00-\uFB06]/g;
/** A quote shortened by the model with "..." or "…" (optionally in brackets). */
const ELLIPSIS = /\s*\[?(?:\.\.\.|…)\]?\s*/;

/**
 * Quote/source normalisation: `normalizeText` (case, diacritics, quotes,
 * apostrophes, dashes, punctuation, whitespace) plus invisible characters
 * removed and ligatures expanded. Applied to both sides of every quote check.
 */
export function normalizeQuoteText(input: string): string {
  return normalizeText(
    input.replace(INVISIBLE, '').replace(LIGATURES, (char) => char.normalize('NFKC')),
  );
}

/**
 * Exact match after normalisation. A quote the model shortened with "..." /
 * "…" passes only when every piece (2+ words each) appears verbatim.
 */
function quoteInText(quote: string, normalizedText: string): boolean {
  const whole = normalizeQuoteText(quote);
  if (!whole) return false;
  if (normalizedText.includes(whole)) return true;
  if (!ELLIPSIS.test(quote)) return false;
  const pieces = quote.split(ELLIPSIS).map(normalizeQuoteText).filter(Boolean);
  if (pieces.length < 2) return false;
  return pieces.every((piece) => piece.split(' ').length >= 2 && normalizedText.includes(piece));
}
```

### 2b. In `CitationIndex.fromHits`

old:
```ts
    for (const entry of index.entries.values()) entry.normalized = normalizeText(entry.text);
```
new:
```ts
    for (const entry of index.entries.values()) entry.normalized = normalizeQuoteText(entry.text);
```

### 2c. In `validateFact`

old:
```ts
  const normalizedQuote = normalizeText(quote);
  if (!normalizedQuote || !normalizedText.includes(normalizedQuote)) {
    return nullFact<T>(checkedAt, sourceKind);
  }
```
new:
```ts
  if (!quoteInText(quote, normalizedText)) {
    return nullFact<T>(checkedAt, sourceKind);
  }
```

(`normalizeText` is still imported and used elsewhere in the file; keep the import.)

### 2d. `src/core/grounding/citationValidator.test.ts`

Change the import line to:
```ts
import {
  CitationIndex,
  normalizeQuoteText,
  validateStringArrayFact,
  validateStringFact,
} from './citationValidator';
```

Append at end of file:
```ts

describe('quote normalisation (plan 39)', () => {
  const SRC = 'https://www.example.edu/admission/deadlines';
  const idx = CitationIndex.fromHits([
    {
      url: SRC,
      title: 'Deadlines',
      text:
        'Regular Decision \u2014 the application deadline is January\u00A05, 2027. ' +
        'Students\u2019 test scores: we accept the SAT and ACT. ' +
        'Finan\u00ADcial aid is need-\u200Bbased. ' +
        'Our \uFB01nancial aid office helps international students.',
    },
  ]);

  it('normalises invisible characters, dashes, quotes and case but keeps digits', () => {
    expect(normalizeQuoteText('Ad\u200Bmis\u00ADsion \u2014 \u201CFees\u201D')).toBe('admission fees');
    expect(normalizeQuoteText('Fee: 1,234 €')).toBe('fee 1 234');
    expect(normalizeQuoteText('\uFB01nancial')).toBe('financial');
  });

  it('accepts a quote with a plain dash and space where the page has an em dash and nbsp', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2027',
        sourceUrl: SRC,
        quote: 'Regular Decision - the application deadline is January 5, 2027',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBe('January 5, 2027');
  });

  it('accepts different case and a straight apostrophe', () => {
    const fact = validateStringArrayFact(
      { value: ['SAT'], sourceUrl: SRC, quote: "STUDENTS' TEST SCORES: we accept the SAT and ACT" },
      idx,
      { kind: 'exams' },
    );
    expect(fact.value).toEqual(['SAT']);
  });

  it('accepts a quote across a soft hyphen and a ligature', () => {
    const soft = validateStringFact(
      { value: 'Need-based financial aid', sourceUrl: SRC, quote: 'Financial aid is need-based' },
      idx,
      { kind: 'text' },
    );
    expect(soft.value).toBe('Need-based financial aid');
    const lig = validateStringFact(
      {
        value: 'Financial aid office for international students',
        sourceUrl: SRC,
        quote: 'Our financial aid office helps international students',
      },
      idx,
      { kind: 'text' },
    );
    expect(lig.value).not.toBeNull();
  });

  it('never changes digits: a different year is rejected', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2028',
        sourceUrl: SRC,
        quote: 'the application deadline is January 5, 2028',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBeNull();
  });

  it('accepts a quote shortened with an ellipsis when every piece is verbatim', () => {
    const fact = validateStringFact(
      {
        value: 'January 5, 2027',
        sourceUrl: SRC,
        quote: 'Regular Decision … deadline is January 5, 2027',
      },
      idx,
      { kind: 'date' },
    );
    expect(fact.value).toBe('January 5, 2027');
  });

  it('rejects ellipsis quotes with a one-word piece or an invented piece', () => {
    const oneWord = validateStringFact(
      { value: '2027', sourceUrl: SRC, quote: 'Regular Decision the application ... 2027' },
      idx,
      { kind: 'date' },
    );
    expect(oneWord.value).toBeNull();
    const invented = validateStringFact(
      { value: 'March 1', sourceUrl: SRC, quote: 'Regular Decision … deadline is March 1' },
      idx,
      { kind: 'date' },
    );
    expect(invented.value).toBeNull();
  });
});
```

- [x] Step 2 done

## Step 3 — `src/core/finder/webFetch.ts`

### 3a. Import line

old:
```ts
import { domainCandidates, hostOf, normalizeUrl, registrableDomain } from '../normalize';
```
new:
```ts
import { domainCandidates, hostOf, normalizeUrl, registrableDomain, tokens } from '../normalize';
```

### 3b. Append at the end of the file

```ts

/** Words that mark the facts the detail page needs (plan 39). Regex fragments. */
const DETAIL_KEYWORDS = [
  'deadlines?',
  'tuition',
  'fees?',
  'costs? of attendance',
  'costs?',
  'scholarships?',
  'financial aid',
  'ielts',
  'toefl',
  'sat',
  'duolingo',
  'language of instruction',
  'taught in',
  'requirements?',
  'required',
  'apply',
  'application',
  'admissions?',
];

export const EXCERPT_SEPARATOR = '\n[...]\n';

const PROGRAM_GENERIC = new Set([
  'bachelor',
  'bachelors',
  'master',
  'masters',
  'science',
  'sciences',
  'degree',
  'programme',
  'program',
  'studies',
  'honours',
  'honors',
]);

/** Distinctive words of a programme name ("BSc Robotics" -> ["robotics"]). */
export function programKeywords(program: string): string[] {
  return [...new Set(tokens(program).filter((t) => t.length >= 4 && !PROGRAM_GENERIC.has(t)))];
}

/**
 * Pure: windows of `radius` chars around detail keywords (plus `extraKeywords`),
 * merged when they overlap, snapped to whitespace, best windows (most distinct
 * keywords) kept until `maxChars`, returned in page order joined by
 * EXCERPT_SEPARATOR. Every piece is a verbatim substring of `text`.
 * Returns `text` when it already fits, '' when nothing matches.
 */
export function keywordExcerpts(
  text: string,
  maxChars: number,
  extraKeywords: string[] = [],
  radius = 350,
): string {
  if (maxChars <= 0 || !text) return '';
  if (text.length <= maxChars) return text;
  const extras = extraKeywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 4)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${[...DETAIL_KEYWORDS, ...extras].join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  );
  const windows: { start: number; end: number; keys: Set<string> }[] = [];
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    const start = Math.max(0, at - radius);
    const end = Math.min(text.length, at + match[0].length + radius);
    const key = match[0].toLowerCase();
    const last = windows[windows.length - 1];
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
      last.keys.add(key);
    } else {
      windows.push({ start, end, keys: new Set([key]) });
    }
  }
  if (windows.length === 0) return '';

  const snapped = windows
    .map((w) => {
      let start = w.start;
      let end = Math.min(w.end, w.start + maxChars);
      if (start > 0) {
        const ws = text.slice(start, end).search(/\s/);
        if (ws >= 0) start += ws + 1;
      }
      if (end < text.length) {
        const cut = text.slice(start, end);
        const ws = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'));
        if (ws > 0) end = start + ws;
      }
      return { start, end, score: w.keys.size };
    })
    .filter((w) => w.end > w.start);

  const order = snapped
    .map((_, i) => i)
    .sort((a, b) => snapped[b].score - snapped[a].score || a - b);
  const chosen: number[] = [];
  let used = 0;
  for (const i of order) {
    const w = snapped[i];
    const cost = w.end - w.start + (chosen.length > 0 ? EXCERPT_SEPARATOR.length : 0);
    if (used + cost > maxChars) continue;
    chosen.push(i);
    used += cost;
  }
  return chosen
    .sort((a, b) => a - b)
    .map((i) => text.slice(snapped[i].start, snapped[i].end).trim())
    .filter(Boolean)
    .join(EXCERPT_SEPARATOR);
}

/**
 * Pure: the page head (intro, usually the overview) plus keyword excerpts of
 * the rest, within `maxChars`. Falls back to a plain slice when nothing matches.
 */
export function focusText(
  text: string,
  maxChars: number,
  extraKeywords: string[] = [],
  headChars = 1500,
): string {
  if (text.length <= maxChars) return text;
  let head = text.slice(0, Math.min(headChars, maxChars));
  const cut = Math.max(head.lastIndexOf(' '), head.lastIndexOf('\n'));
  if (cut > 0) head = head.slice(0, cut);
  const rest = keywordExcerpts(
    text.slice(head.length),
    maxChars - head.length - EXCERPT_SEPARATOR.length,
    extraKeywords,
  );
  return rest ? `${head.trim()}${EXCERPT_SEPARATOR}${rest}` : text.slice(0, maxChars);
}

export interface EnrichHitsOptions {
  maxCharsPerHit: number;
  maxPages?: number;
  /** Characters of the original search snippet kept in front of the excerpts. */
  snippetChars?: number;
  keywords?: string[];
  pageCache?: PageCache;
  timeoutMs?: number;
  deadline?: number;
  logger?: Logger;
}

/**
 * Detail page (plan 39): fetch the full text of the first official-domain hits
 * (page cache, timeouts, failures ignored) and append keyword excerpts to each
 * snippet. Enriched hits move to the front; hit URLs never change.
 */
export async function enrichHitsWithPages(
  http: HttpClient,
  record: UniversityRecord,
  hits: SearchHit[],
  options: EnrichHitsOptions,
): Promise<SearchHit[]> {
  const allowed = allowedHostSet(record);
  if (allowed.size === 0 || hits.length === 0) return hits;
  const maxPages = options.maxPages ?? 4;
  const snippetChars = options.snippetChars ?? 3000;
  const targets = hits
    .map((hit, index) => ({ hit, index }))
    .filter(({ hit }) => isAllowedUrl(hit.url, allowed) && !SKIP_EXTENSION.test(hit.url))
    .slice(0, maxPages);
  const pageOptions: FetchPagesOptions = {
    pageCache: options.pageCache,
    timeoutMs: options.timeoutMs,
    deadline: options.deadline,
    allowedHosts: allowed,
  };
  const pages = await Promise.all(
    targets.map(({ hit }) =>
      fetchPage(http, hit.url, options.logger, pageOptions).catch(() => null),
    ),
  );
  const out = hits.map((hit) => ({ ...hit }));
  const enriched = new Set<number>();
  targets.forEach(({ index }, n) => {
    const page = pages[n];
    if (!page) return;
    const snippet = out[index].text.slice(0, snippetChars).trim();
    const budget =
      options.maxCharsPerHit - snippet.length - (snippet ? EXCERPT_SEPARATOR.length : 0);
    const excerpts = keywordExcerpts(page.text, budget, options.keywords ?? []);
    if (!excerpts) return;
    out[index].text = snippet ? `${snippet}${EXCERPT_SEPARATOR}${excerpts}` : excerpts;
    enriched.add(index);
  });
  options.logger?.info?.(`Detail: read ${enriched.size} full official page(s) for ${record.name}.`);
  return [
    ...out.filter((_, i) => enriched.has(i)),
    ...out.filter((_, i) => !enriched.has(i)),
  ];
}
```

(`SearchHit`, `HttpClient`, `Logger`, `PageCache`, `UniversityRecord`, `SKIP_EXTENSION`, `allowedHostSet`, `isAllowedUrl`, `fetchPage`, `FetchPagesOptions` already exist in this file.)

### 3c. `src/core/finder/webFetch.test.ts`

Change the import line to:
```ts
import {
  discoverLinks,
  EXCERPT_SEPARATOR,
  fetchUniversityPages,
  focusText,
  htmlToText,
  keywordExcerpts,
  pageTitle,
  programKeywords,
} from './webFetch';
```

Append at end of file:
```ts

describe('keywordExcerpts (plan 39)', () => {
  const filler = 'Home About News Events Contact '.repeat(200);

  it('returns short text unchanged', () => {
    expect(keywordExcerpts('Tuition is free.', 1000)).toBe('Tuition is free.');
  });

  it('keeps the keyword paragraph from a long page, verbatim and within budget', () => {
    const fact = 'International students pay tuition of $65,127 per year for undergraduate study.';
    const text = `${filler}${fact} ${filler}`;
    const out = keywordExcerpts(text, 1500);
    expect(out.length).toBeLessThanOrEqual(1500);
    expect(out).toContain('tuition of $65,127 per year');
    for (const piece of out.split(EXCERPT_SEPARATOR)) expect(text.includes(piece)).toBe(true);
  });

  it('matches whole words only (SAT is not satisfactory)', () => {
    expect(keywordExcerpts('satisfactory progress '.repeat(300), 1000)).toBe('');
  });

  it('prefers the window with the most distinct keywords when the budget is tight', () => {
    const text =
      `${filler}Apply now. ${filler}` +
      `The application deadline is 1 January; IELTS or TOEFL scores are required. ${filler}`;
    const out = keywordExcerpts(text, 900);
    expect(out).toContain('IELTS or TOEFL');
    expect(out).not.toContain('Apply now');
    expect(out.length).toBeLessThanOrEqual(900);
  });

  it('also matches programme keywords', () => {
    const text = `${filler}The Robotics major is offered by Mechanical Engineering. ${filler}`;
    expect(keywordExcerpts(text, 1000, programKeywords('BSc Robotics'))).toContain('Robotics major');
  });
});

describe('programKeywords', () => {
  it('drops generic degree words and short tokens', () => {
    expect(programKeywords('Bachelor of Science in Robotics')).toEqual(['robotics']);
  });
});

describe('focusText', () => {
  it('keeps the page head and adds keyword excerpts within budget', () => {
    const filler = 'Home About News Events Contact '.repeat(200);
    const text =
      'Stanford is a private research university in California. ' +
      `${filler}Undergraduate tuition is $65,127 per year. ${filler}`;
    const out = focusText(text, 2500);
    expect(out.startsWith('Stanford is a private research university')).toBe(true);
    expect(out).toContain('tuition is $65,127 per year');
    expect(out.length).toBeLessThanOrEqual(2500);
  });

  it('returns short text unchanged', () => {
    expect(focusText('Short page.', 2500)).toBe('Short page.');
  });
});
```

- [x] Step 3 done

## Step 4 — `src/core/ai/prompts.ts` (in `detailPrompt`, system message)

old:
```ts
        'You extract university detail facts for UniFinder from official university pages.',
        'Use ONLY information present in the provided search results.',
        'If a field is absent, return value: null, sourceUrl: null, quote: null. Never guess.',
        'Every non-null fact must cite one of the given URLs and include an exact quote copied from that URL\'s TEXT.',
        'The quote must be 5-30 words and must contain or clearly imply the value.',
        'nextDeadline must be the next upcoming deadline for an international first-year applicant. If the year is unclear, return null.',
        'The overview must be a factual one-line description of the university or programme, never a ranking or marketing sentence.',
```
new:
```ts
        'You extract university detail facts for UniFinder from official university pages.',
        'The student is an international first-year applicant to an undergraduate (bachelor\'s) degree.',
        'Use ONLY information present in the provided search results.',
        'If a field is absent, return value: null, sourceUrl: null, quote: null. Never guess.',
        'Every non-null fact must cite one of the given URLs and include an exact quote copied from that URL\'s TEXT.',
        'The quote must be 5-30 words, copied character for character from one passage of TEXT, and must contain or clearly imply the value.',
        'tuition, deadlines, nextDeadline, exams, requirements and applyUrl may come from university-wide undergraduate admissions, tuition or financial-aid pages when the programme page does not state them.',
        'Prefer undergraduate figures; never report a graduate (master\'s or PhD) figure for these fields.',
        'nextDeadline must be the next upcoming deadline for an international first-year applicant. If the year is unclear, return null.',
        'The overview must be a factual one-line description of the undergraduate programme. If the sources show the programme only at graduate level, or show no undergraduate programme by that name, say so factually with a quote that shows it. If the sources say nothing about the programme, describe the university instead. Never a ranking or marketing sentence, never invented.',
```

- [x] Step 4 done

## Step 5 — `src/core/finder/detail.ts` (full replacement)

```ts
import type { Fact, UniDetail } from '../contracts';
import { AiFormatError, callJson, nextTokenBudget } from '../ai/json';
import { detailPrompt } from '../ai/prompts';
import { createAiClient, pickFinderProvider } from '../ai/index';
import type { AiClient, SearchHit, SearchOptions } from '../ai/types';
import {
  DETAIL_CACHE_TTL_MS,
  DETAIL_ENRICH_PAGES,
  DETAIL_ENRICH_TIMEOUT_MS,
  DETAIL_MAX_CHARS_PER_HIT,
  DETAIL_MAX_HITS,
  DETAIL_MAX_TOKENS,
  DETAIL_MAX_TOTAL_CHARS,
  DETAIL_SEARCH_MAX_RESULTS,
  DETAIL_SPARSE_CACHE_TTL_MS,
  DETAIL_SPARSE_MIN_FACTS,
  PAGE_FETCH_TIMEOUT_MS,
} from '../config';
import {
  CitationIndex,
  validateStringArrayFact,
  validateStringFact,
  type FactKind,
} from '../grounding/citationValidator';
import type { RorStore } from '../grounding/rorStore';
import { hostOf, normalizeUrl } from '../normalize';
import type { CoreDeps, Logger } from '../ports';
import { uniDetailAiSchema, type UniDetailAi } from '../schemas';
import {
  enrichHitsWithPages,
  fetchUniversityPages,
  focusText,
  programKeywords,
} from './webFetch';

function emptyFact<T>(checkedAt: string): Fact<T> {
  return { value: null, sourceUrl: null, quote: null, sourceKind: 'third_party', checkedAt };
}

export function emptyDetail(rorId: string, program: string, checkedAt: string): UniDetail {
  return {
    rorId,
    program,
    overview: emptyFact<string>(checkedAt),
    languages: emptyFact<string[]>(checkedAt),
    tuition: emptyFact<string>(checkedAt),
    scholarships: emptyFact<string>(checkedAt),
    deadlines: emptyFact<string>(checkedAt),
    nextDeadline: emptyFact<string>(checkedAt),
    exams: emptyFact<string[]>(checkedAt),
    requirements: emptyFact<string>(checkedAt),
    applyUrl: emptyFact<string>(checkedAt),
    checkedAt,
  };
}

/** How many of the nine facts were found (non-null, non-empty). */
export function foundFactCount(detail: UniDetail): number {
  const facts: Fact<string | string[]>[] = [
    detail.overview,
    detail.languages,
    detail.tuition,
    detail.scholarships,
    detail.deadlines,
    detail.nextDeadline,
    detail.exams,
    detail.requirements,
    detail.applyUrl,
  ];
  return facts.filter(
    (fact) => fact.value !== null && !(Array.isArray(fact.value) && fact.value.length === 0),
  ).length;
}

function isFresh(checkedAt: string, now: Date, ttlMs: number): boolean {
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return false;
  return now.getTime() - timestamp < ttlMs;
}

function nextDeadlineIsUpcoming(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return true;
  return timestamp >= now.getTime() - 24 * 60 * 60 * 1000;
}

/** Plan 39: four focused searches for an international undergraduate applicant. */
export function detailQueries(universityName: string, program: string): string[] {
  return [
    `${universityName} undergraduate ${program} bachelor degree program`,
    `${universityName} undergraduate admissions international first-year applicants application deadlines requirements IELTS TOEFL SAT`,
    `${universityName} undergraduate tuition fees cost of attendance international students`,
    `${universityName} undergraduate scholarships financial aid international students`,
  ];
}

/** Dedupe by canonical URL (first one wins, texts merged), keep order, cap the count. */
export function mergeHits(hits: SearchHit[], maxHits = DETAIL_MAX_HITS): SearchHit[] {
  const byUrl = new Map<string, SearchHit>();
  for (const hit of hits) {
    const key = normalizeUrl(hit.url);
    const existing = byUrl.get(key);
    if (existing) {
      if (hit.text && !existing.text.includes(hit.text)) {
        existing.text = `${existing.text}\n${hit.text}`.trim();
      }
    } else {
      byUrl.set(key, { ...hit });
    }
  }
  return [...byUrl.values()].slice(0, maxHits);
}

/**
 * The exact slicing `sourceBlock` applies, done up front so the prompt and the
 * CitationIndex hold the same text.
 */
export function fitBudget(hits: SearchHit[], maxCharsPerHit: number, maxTotal: number): SearchHit[] {
  const out: SearchHit[] = [];
  let used = 0;
  for (const hit of hits) {
    if (used >= maxTotal) break;
    const text = hit.text.slice(0, Math.max(0, Math.min(maxCharsPerHit, maxTotal - used)));
    used += text.length;
    out.push({ ...hit, text });
  }
  return out;
}

async function searchAll(
  client: AiClient,
  queries: string[],
  options: SearchOptions,
  logger?: Logger,
): Promise<SearchHit[]> {
  const settled = await Promise.allSettled(queries.map((query) => client.search([query], options)));
  const fulfilled = settled.filter(
    (result): result is PromiseFulfilledResult<SearchHit[]> => result.status === 'fulfilled',
  );
  if (fulfilled.length === 0) {
    const first = settled[0];
    throw first && first.status === 'rejected' ? first.reason : new Error('Detail search failed.');
  }
  for (const result of settled) {
    if (result.status === 'rejected') {
      logger?.warn?.(
        `Detail search query failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
    }
  }
  return mergeHits(fulfilled.flatMap((result) => result.value));
}

export interface DetailOptions {
  refresh?: boolean;
}

/**
 * OpenRouter provides verified web search. If it is not configured but an
 * OpenCode key is, detail still works by fetching the university's own pages
 * and extracting facts from that same text (the quote check never relaxes).
 */
async function detailProvider(deps: CoreDeps): Promise<'openrouter' | 'opencode'> {
  const provider = await pickFinderProvider(deps);
  if (provider) return provider;
  throw new Error(
    'University detail needs an OpenRouter key (verified web search) or an OpenCode key (direct official-page fetch).',
  );
}

/**
 * Design §7.3 detail page: focused searches aimed at the university's own
 * domain, full text of the best official pages, the same quote check, and a
 * 30-day cache (1 day when fewer than 3 facts were found).
 */
export async function loadDetail(
  deps: CoreDeps,
  ror: RorStore,
  rorId: string,
  program: string,
  options: DetailOptions = {},
): Promise<UniDetail> {
  const now = deps.now?.() ?? new Date();
  const checkedAt = now.toISOString();
  const record = ror.byRorId(rorId);
  if (!record) {
    throw new Error(
      `Unknown ROR id: ${rorId}. Only active organizations with types: education are ` +
        'bundled in data/universities.json; use an ID from Finder results.',
    );
  }

  if (!options.refresh && deps.details) {
    const cached = await deps.details.get(record.ror_id, program);
    if (cached) {
      const ttl =
        foundFactCount(cached.detail) < DETAIL_SPARSE_MIN_FACTS
          ? DETAIL_SPARSE_CACHE_TTL_MS
          : DETAIL_CACHE_TTL_MS;
      if (isFresh(cached.checkedAt, now, ttl)) return cached.detail;
    }
  }

  const provider = await detailProvider(deps);
  const client = await createAiClient(provider, deps);
  const keywords = programKeywords(program);

  let hits: SearchHit[] = [];
  if (provider === 'openrouter') {
    const allowedDomains = [
      ...new Set([
        ...record.domains,
        ...(record.website ? [hostOf(record.website)].filter((h): h is string => Boolean(h)) : []),
      ]),
    ];
    const queries = detailQueries(record.name, program);
    hits = await searchAll(
      client,
      queries,
      { allowedDomains, maxResults: DETAIL_SEARCH_MAX_RESULTS },
      deps.logger,
    );
    if (hits.length === 0) {
      hits = await searchAll(client, queries, { maxResults: DETAIL_SEARCH_MAX_RESULTS }, deps.logger);
    }
    hits = await enrichHitsWithPages(deps.http, record, hits, {
      maxCharsPerHit: DETAIL_MAX_CHARS_PER_HIT,
      maxPages: DETAIL_ENRICH_PAGES,
      keywords,
      pageCache: deps.pages,
      timeoutMs: PAGE_FETCH_TIMEOUT_MS,
      deadline: Date.now() + DETAIL_ENRICH_TIMEOUT_MS,
      logger: deps.logger,
    });
  } else {
    deps.logger?.info?.(
      `OpenRouter key not set; fetching ${record.name}'s official pages for OpenCode extraction.`,
    );
    const pages = await fetchUniversityPages(deps.http, record, program, deps.logger, undefined, {
      pageCache: deps.pages,
      timeoutMs: PAGE_FETCH_TIMEOUT_MS,
      deadline: Date.now() + 60_000,
    });
    hits = pages.map((hit) => ({
      ...hit,
      text: focusText(hit.text, DETAIL_MAX_CHARS_PER_HIT, keywords),
    }));
  }

  if (hits.length === 0) {
    deps.logger?.warn?.(`No detail sources for ${record.name}`);
    return emptyDetail(record.ror_id, program, checkedAt);
  }

  // The prompt and the quote check see exactly the same text.
  hits = fitBudget(hits, DETAIL_MAX_CHARS_PER_HIT, DETAIL_MAX_TOTAL_CHARS);

  let parsed: UniDetailAi;
  try {
    parsed = await callJson({
      schema: uniDetailAiSchema,
      messages: detailPrompt(
        record.name,
        program,
        hits,
        DETAIL_MAX_CHARS_PER_HIT,
        DETAIL_MAX_TOTAL_CHARS,
      ),
      complete: (messages, attempt) =>
        client.chat(messages, {
          json: true,
          temperature: 0.1,
          maxTokens: nextTokenBudget(DETAIL_MAX_TOKENS, attempt),
        }),
      logger: deps.logger,
    });
  } catch (error) {
    // A malformed AI reply must not turn the page into "could not load"; a real
    // provider/network error still surfaces.
    if (!(error instanceof AiFormatError)) throw error;
    deps.logger?.error?.(
      `Detail extraction failed for ${record.name}: ${error.message}`,
    );
    return emptyDetail(record.ror_id, program, checkedAt);
  }

  const index = CitationIndex.fromHits(hits);
  const domains = [...record.domains, ...(record.website ? [record.website] : [])];
  const optionsFor = (kind: FactKind) => ({ kind, officialDomains: domains, checkedAt });

  const nextDeadlineRaw = validateStringFact(parsed.nextDeadline, index, optionsFor('date'));
  const nextDeadline =
    nextDeadlineRaw.value !== null && !nextDeadlineIsUpcoming(nextDeadlineRaw.value, now)
      ? emptyFact<string>(checkedAt)
      : nextDeadlineRaw;

  const detail: UniDetail = {
    rorId: record.ror_id,
    program,
    overview: validateStringFact(parsed.overview, index, optionsFor('text')),
    languages: validateStringArrayFact(parsed.languages, index, optionsFor('languages')),
    tuition: validateStringFact(parsed.tuition, index, optionsFor('tuition')),
    scholarships: validateStringFact(parsed.scholarships, index, optionsFor('text')),
    deadlines: validateStringFact(parsed.deadlines, index, optionsFor('text')),
    nextDeadline,
    exams: validateStringArrayFact(parsed.exams, index, optionsFor('exams')),
    requirements: validateStringFact(parsed.requirements, index, optionsFor('text')),
    applyUrl: validateStringFact(parsed.applyUrl, index, optionsFor('url')),
    checkedAt,
  };

  if (foundFactCount(detail) < DETAIL_SPARSE_MIN_FACTS) {
    deps.logger?.info?.(
      `Detail for ${record.name} found ${foundFactCount(detail)} fact(s); cached for a day only.`,
    );
  }
  if (deps.details) await deps.details.put(detail);
  return detail;
}
```

Notes for the builder:
- If `Logger` is not exported from `../ports`, check `src/core/ports.ts` (webFetch.ts imports `Logger` from `'../ports'`, so it is). If `AiClient`/`SearchOptions` names differ, they are in `src/core/ai/types.ts`.
- If `tsc` complains that `Fact<string | string[]>[]` does not accept `Fact<string>`, change that annotation to `Array<{ value: string | string[] | null }>`.
- `EXTRACT_MAX_CHARS_PER_HIT` / `EXTRACT_MAX_TOTAL_CHARS` are no longer imported here (Finder's `extract.ts` still uses them). Do not remove them from config.

- [x] Step 5 done

## Step 6 — tests

### 6a. New file `src/core/finder/detailHelpers.test.ts`

```ts
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
```

### 6b. `src/core/finder/detailFallback.test.ts`

old:
```ts
import { loadDetail } from './detail';
```
new:
```ts
import { emptyDetail, loadDetail } from './detail';
```

Append inside the existing `describe('loadDetail with OpenCode only', () => { ... })` block, right before its closing `});`:
```ts

  it('refetches a sparse cached detail after a day', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    await d.details.put(
      emptyDetail('https://ror.org/000000001', 'BSc Law', '2026-11-19T12:00:00.000Z'),
    );
    const detail = await loadDetail(d, ror, 'https://ror.org/000000001', 'BSc Law');
    expect(http.calls).toBeGreaterThan(0);
    expect(detail.tuition.value).toBe('Free');
  });

  it('serves a sparse cached detail within a day', async () => {
    const http = new FakeHttp();
    const d = deps(http);
    await d.details.put(
      emptyDetail('https://ror.org/000000001', 'BSc Law', '2026-11-21T06:00:00.000Z'),
    );
    const detail = await loadDetail(d, ror, 'https://ror.org/000000001', 'BSc Law');
    expect(http.calls).toBe(0);
    expect(detail.tuition.value).toBeNull();
  });
```

(`deps()` already returns `details: new InMemoryDetailCache()` and `now` = `2026-11-21T12:00:00.000Z`.)

- [x] Step 6 done

## Verify (run all, all must pass)

```bash
bun run build
bun run check:i18n
bun test
```

- If an existing test in `pipeline.test.ts` or `detailFallback.test.ts` fails, do NOT change the test's expectations; fix the implementation and note it under Builder notes.
- `git status --short` must show only the files listed in "Builder rules" (plus pre-existing untracked `.impeccable/`, `design/`, `graphify-out/`).

## Done when
- All verify commands pass.
- Detail for a sparse result is re-fetched after a day; full results keep 30 days.
- OpenRouter path runs 4 queries, reads up to 4 official pages, and the model and validator see identical text.
- Quotes with invisible characters, soft hyphens, ligatures or "…" pieces validate; digits stay strict.

## Builder notes
Verify: `bun run build` exit 0 (tsc + vite build). `bun run check:i18n` passed. `bun test`: 290 pass, 0 fail, 29 files.
Scope: `git status` shows only the 8 listed modified files plus new `src/core/finder/detailHelpers.test.ts`, plus pre-existing untracked `.impeccable/`, `design/`, `graphify-out/`. No commits, no branch change, app not started, no network calls.
Deviations: none in the code. Plan code was applied verbatim; the `\u` escapes in the regexes and test strings were verified as escapes (no literal invisible characters or non-breaking spaces in the files).
