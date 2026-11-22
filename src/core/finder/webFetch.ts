import type { SearchHit } from '../ai/types';
import { PAGE_CACHE_TTL_MS, PAGE_FETCH_TIMEOUT_MS } from '../config';
import type { UniversityRecord } from '../grounding/types';
import { domainCandidates, hostOf, normalizeUrl, registrableDomain, tokens } from '../normalize';
import type { CachedPage, HttpClient, Logger, PageCache } from '../ports';

const MAX_PAGES = 8;
/** Full page text kept per hit (same limit as the page cache), so keyword excerpts can come from later in the page. */
const MAX_TEXT_CHARS = 60_000;
/** Many sites 403 a bot-like UA; use a normal browser string. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

export interface FetchPagesOptions {
  /** Degree keywords used to score and gate programme pages. */
  keywords?: string[];
  pageCache?: PageCache;
  /** Per-page timeout. */
  timeoutMs?: number;
  /** Absolute deadline (epoch ms) for all pages of one university. */
  deadline?: number;
  /** Hosts the final URL may redirect to (official domains only). */
  allowedHosts?: Set<string>;
}

function pageIsFresh(page: CachedPage, now = Date.now()): boolean {
  const fetched = Date.parse(page.fetchedAt);
  return Number.isFinite(fetched) && now - fetched < PAGE_CACHE_TTL_MS;
}

const SKIP_EXTENSION =
  /\.(pdf|jpe?g|png|gif|svg|webp|zip|rar|docx?|xlsx?|pptx?|mp4|avi|mov|ico|css|js|woff2?)(\?|#|$)/i;

const BLOCK_TAGS = /<\/(?:p|div|li|h[1-6]|tr|section|article|header|footer|main|aside|nav|table|ul|ol|br)\s*>/gi;

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return ' ';
      }
    })
    .replace(/&#(\d+);/g, (_match, dec: string) => {
      try {
        return String.fromCodePoint(Number(dec));
      } catch {
        return ' ';
      }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z][a-z0-9]+;/gi, ' ');
}

/** Very small, dependency-free HTML to visible-text converter for quote checks. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, ' ')
      .replace(BLOCK_TAGS, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function pageTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match?.[1]) return null;
  const title = htmlToText(match[1]).trim();
  return title || null;
}

function anchors(html: string): { href: string; text: string }[] {
  const result: { href: string; text: string }[] = [];
  const regex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(regex)) {
    const href = match[1]?.trim();
    if (!href) continue;
    result.push({ href, text: htmlToText(match[2] ?? '') });
  }
  return result;
}

function allowedHostSet(record: UniversityRecord): Set<string> {
  const allowed = new Set<string>();
  const add = (value: string | null) => {
    if (!value) return;
    for (const candidate of domainCandidates(value.toLowerCase())) allowed.add(candidate);
  };
  for (const domain of record.domains ?? []) add(domain);
  add(record.website ? hostOf(record.website) : null);
  return allowed;
}

function isAllowedUrl(url: string, allowed: Set<string>): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return domainCandidates(host).some((candidate) => allowed.has(candidate));
}

function resolveUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** Local-language programme words and URL slugs, per supported country. */
const COUNTRY_HINTS: Record<string, { words: string[]; urls: string[]; seeds: string[] }> = {
  US: {
    words: ['major', 'majors', 'undergraduate program', 'degree program'],
    urls: ['academics', 'majors', 'programs', 'undergraduate'],
    seeds: ['/academics', '/majors', '/programs', '/undergraduate'],
  },
  CN: {
    words: ['专业', '本科', '招生', '院系', '学院', '学位', '培养', '学科'],
    urls: ['zsxx', 'zhaosheng', 'benke', 'zhuanye', 'yuanxi'],
    seeds: ['/zsxx', '/benke', '/zhuanye', '/yxsz'],
  },
  VN: {
    words: ['ngành', 'đào tạo', 'tuyển sinh', 'chương trình', 'khoa'],
    urls: ['tuyen-sinh', 'dao-tao', 'nganh', 'chuong-trinh', 'khoa'],
    seeds: ['/tuyen-sinh', '/dao-tao', '/nganh'],
  },
  DE: {
    words: ['studiengang', 'studium', 'fakultät', 'fachbereich', 'bewerbung'],
    urls: ['studiengang', 'studium', 'fakultaet', 'bewerbung'],
    seeds: ['/studiengang', '/studium', '/studiengaenge'],
  },
  SE: {
    words: ['utbildning', 'kandidatprogram', 'antagning', 'institution'],
    urls: ['utbildning', 'program', 'antagning', 'kandidat'],
    seeds: ['/utbildning', '/program', '/antagning'],
  },
  ES: {
    words: ['grado', 'grados', 'estudios', 'enseñanza', 'admisión', 'matrícula', 'facultad'],
    urls: ['grado', 'estudios', 'ensenanza', 'admision', 'matricula'],
    seeds: ['/grados', '/estudios', '/admision'],
  },
  CO: {
    words: ['pregrado', 'programas', 'admisiones', 'facultad', 'carrera'],
    urls: ['pregrado', 'programas', 'admisiones', 'carrera'],
    seeds: ['/pregrado', '/programas', '/admisiones'],
  },
};

function countryHints(countryCode?: string | null) {
  return countryCode ? COUNTRY_HINTS[countryCode.toUpperCase()] : undefined;
}

function keywordWords(program: string, keywords: string[]): string[] {
  const words = new Set<string>();
  for (const value of [program, ...keywords]) {
    for (const word of value.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length >= 4) words.add(word);
    }
  }
  return [...words];
}

function scoreLink(
  href: string,
  text: string,
  program: string,
  keywords: string[] = [],
  countryCode?: string | null,
): number {
  const haystack = `${href} ${text}`.toLowerCase();
  if (SKIP_EXTENSION.test(haystack)) return -1;
  const hints = countryHints(countryCode);
  let score = 0;
  const add = (words: string[], weight: number) => {
    if (words.some((word) => haystack.includes(word))) score += weight;
  };

  const programmeFirst = keywords.length > 0;
  if (programmeFirst) {
    add(['program', 'programme', 'course', 'bachelor', 'undergraduate', 'licence', 'major', 'degree', 'academic', 'study', 'school', 'department', 'college'], 7);
    add(['application', 'apply', 'admission'], 3);
    add(['tuition', 'fee', 'fees', 'cost', 'scholarship', 'funding', 'bourse'], 3);
    add(['full degree', 'full-degree', 'degree student', 'degree-student'], 5);
    // Chinese programme words (text of anchors on .cn sites).
    if (/(专业|本科|招生|课程|院系|学院|学位|培养|学科)/.test(haystack)) score += 8;
    // Local-language programme words for the other supported countries.
    if (hints?.words.some((word) => haystack.includes(word.toLowerCase()))) score += 8;
  } else {
    add(['application', 'apply'], 6);
    add(['admission'], 6);
    add(['tuition', 'fee', 'fees', 'cost', 'scholarship', 'funding', 'bourse'], 6);
    add(['deadline', 'entry requirement', 'admission requirement', "conditions d'admission"], 5);
    add(['taught in english', 'english-taught', 'courses taught in english'], 5);
    add(['full degree', 'full-degree', 'degree student', 'degree-student'], 5);
    add(['program', 'programme', 'course', 'bachelor', 'master', 'undergraduate', 'graduate', 'licence', 'major', 'degree'], 2);
  }
  add(['international'], 0.5);

  for (const word of keywordWords(program, keywords)) {
    if (haystack.includes(word)) score += programmeFirst ? 7 : 4;
  }

  if (
    /(privacy|cookie|login|signin|sign-in|password|news|event|alumni|donate|contact|partir|exchange|erasmus|mobility|research|governance|about)/i.test(
      haystack,
    )
  ) {
    score -= 3;
  }
  return score;
}

function urlPriority(
  url: string,
  program: string,
  keywords: string[] = [],
  countryCode?: string | null,
): number {
  const haystack = url.toLowerCase();
  const programmeFirst = keywords.length > 0;
  const hints = countryHints(countryCode);
  let score = 0;
  if (/(full-degree|degree-student)/.test(haystack)) score += 20;
  if (/(program|programme|course|bachelor|master|undergraduate|licence|major|degree|academic|study|school|department|college)/.test(haystack)) {
    score += programmeFirst ? 18 : 3;
  }
  if (programmeFirst && /(zsxx|zhaosheng|benke|zhuanye|yuanxi)/.test(haystack)) score += 14;
  if (programmeFirst && hints?.urls.some((slug) => haystack.includes(slug))) score += 14;
  if (/(apply|application|admission)/.test(haystack)) score += programmeFirst ? 6 : 15;
  if (/(tuition|fee|scholarship|funding)/.test(haystack)) score += programmeFirst ? 6 : 15;
  if (/(deadline|requirement)/.test(haystack)) score += programmeFirst ? 4 : 10;
  if (haystack.includes('international')) score += 1;
  for (const word of keywordWords(program, keywords)) {
    if (haystack.includes(word)) score += programmeFirst ? 14 : 8;
  }
  if (
    /(privacy|cookie|login|news|event|alumni|donate|contact|partir|exchange|erasmus|mobility|research|governance)/.test(
      haystack,
    )
  ) {
    score -= 10;
  }
  return score;
}

/** Relevant same-site links, best first. Exported for tests. */
export function discoverLinks(
  html: string,
  baseUrl: string,
  allowedHosts: Set<string>,
  program: string,
  keywords: string[] = [],
  countryCode?: string | null,
): string[] {
  const seen = new Set<string>();
  const scored: { url: string; score: number }[] = [];
  for (const anchor of anchors(html)) {
    const url = resolveUrl(anchor.href, baseUrl);
    if (!url || !isAllowedUrl(url, allowedHosts)) continue;
    if (SKIP_EXTENSION.test(new URL(url).pathname)) continue;
    const key = normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = scoreLink(url, anchor.text, program, keywords, countryCode);
    if (score > 0) scored.push({ url, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.url);
}

async function fetchPage(
  http: HttpClient,
  url: string,
  logger?: Logger,
  options: FetchPagesOptions = {},
): Promise<{ url: string; html: string; text: string; title: string | null } | null> {
  if (options.deadline && Date.now() >= options.deadline) return null;
  const cache = options.pageCache;
  const cacheKey = normalizeUrl(url);
  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      // Older rows predate the `html` column; refetch so link discovery works.
      const stillOfficial =
        !options.allowedHosts || isAllowedUrl(cached?.url ?? url, options.allowedHosts);
      if (cached && stillOfficial && pageIsFresh(cached) && cached.html) {
        return {
          url: cached.url,
          html: cached.html,
          text: cached.text,
          title: cached.title,
        };
      }
    } catch {
      // A broken cache must never stop a search.
    }
  }

  const controller = new AbortController();
  const timeoutMs = options.deadline
    ? Math.max(250, Math.min(options.timeoutMs ?? PAGE_FETCH_TIMEOUT_MS, options.deadline - Date.now()))
    : (options.timeoutMs ?? PAGE_FETCH_TIMEOUT_MS);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await http.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en, fr;q=0.8',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      logger?.debug?.(`Fetch ${url} -> HTTP ${response.status}`);
      return null;
    }
    const html = await response.text();
    const finalUrl = response.url ?? url;
    if (options.allowedHosts && !isAllowedUrl(finalUrl, options.allowedHosts)) {
      logger?.debug?.(`Fetch ${url} redirected off the official domains: ${finalUrl}`);
      return null;
    }
    if (SKIP_EXTENSION.test(finalUrl) || /^\s*%PDF/i.test(html)) return null;
    if (!/<(?:html|body|div|p|a)\b/i.test(html)) return null;
    const text = htmlToText(html);
    if (text.length < 40) return null;
    const page = {
      url: finalUrl,
      html,
      text,
      title: pageTitle(html),
    };
    if (cache) {
      try {
        await cache.put(cacheKey, {
          url: page.url,
          title: page.title,
          text: page.text.slice(0, 60_000),
          // Cap HTML so the cache stays reasonable; anchors live near the top.
          html: html.slice(0, 150_000),
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        // Ignore cache write failures.
      }
    }
    return page;
  } catch (error) {
    logger?.debug?.(
      `Fetch ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * OpenCode-only fallback for the detail page: fetch the university's own
 * website and a few admissions/tuition/requirements pages, so extraction still
 * has real page text to quote from. No AI knowledge is used for facts.
 */
export async function fetchUniversityPages(
  http: HttpClient,
  record: UniversityRecord,
  program: string,
  logger?: Logger,
  maxPages = MAX_PAGES,
  options: FetchPagesOptions = {},
): Promise<SearchHit[]> {
  const allowed = allowedHostSet(record);
  if (allowed.size === 0) return [];
  const keywords = options.keywords ?? [];
  const pageOptions: FetchPagesOptions = { ...options, allowedHosts: allowed };

  const seeds: string[] = [];
  if (record.website) seeds.push(record.website);
  for (const domain of record.domains ?? []) {
    seeds.push(`https://${domain}/`);
    if (!domain.startsWith('www.')) seeds.push(`https://www.${domain}/`);
  }

  let homepage: Awaited<ReturnType<typeof fetchPage>> = null;
  for (const seed of [...new Set(seeds)].slice(0, 5)) {
    if (options.deadline && Date.now() >= options.deadline) break;
    homepage = await fetchPage(http, seed, logger, pageOptions);
    if (homepage) break;
  }
  if (!homepage) {
    logger?.warn?.(`Could not fetch an official page for ${record.name}.`);
    return [];
  }

  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const seenContent = new Set<string>();
  const push = (page: NonNullable<Awaited<ReturnType<typeof fetchPage>>>): boolean => {
    const key = normalizeUrl(page.url);
    if (seen.has(key)) return false;
    const text = page.text.replace(/\s+/g, ' ').trim();
    const signature = `${page.title ?? ''}|${text}`;
    if (seenContent.has(signature)) return false;
    seen.add(key);
    seenContent.add(signature);
    hits.push({
      url: page.url,
      title: page.title ?? `${record.name} — ${program}`,
      text: page.text.slice(0, MAX_TEXT_CHARS),
    });
    return true;
  };

  push(homepage);

  const origin = new URL(homepage.url).origin;
  const host = hostOf(homepage.url);
  const registrable = host ? registrableDomain(host) : '';
  const welcomeSeed = registrable ? `https://welcome.${registrable}/` : null;
  const subdomainSeeds = registrable
    ? ['study', 'en', 'admissions'].map((sub) => `https://${sub}.${registrable}/`)
    : [];
  const guessedPaths = [
    '/en/',
    '/admissions',
    '/admission',
    '/apply',
    '/application',
    '/tuition-fees',
    '/tuition',
    '/fees',
    '/about',
    '/international/admissions',
    '/courses-taught-in-english',
    '/study',
    '/academics',
    '/admissions/undergraduate',
    '/majors',
    '/programs',
    '/programs/',
    '/undergraduate',
    '/undergraduate-programs',
    '/cost',
    '/financial-aid',
    '/bachelor',
    '/en/education',
    '/study/programmes',
  ].map((path) => resolveUrl(path, origin));
  const countrySeeds = (countryHints(record.country_code)?.seeds ?? []).map((path) =>
    resolveUrl(path, origin),
  );

  const seenQueue = new Set(seen);
  const tryFetch = async (url: string) => {
    const key = normalizeUrl(url);
    if (seenQueue.has(key)) return null;
    seenQueue.add(key);
    if (SKIP_EXTENSION.test(new URL(url).pathname)) return null;
    logger?.debug?.(`[webFetch] GET ${url}`);
    const page = await fetchPage(http, url, logger, pageOptions);
    if (!page) return null;
    if (!push(page)) {
      logger?.debug?.(`[webFetch] duplicate content: ${page.url}`);
      return null;
    }
    return page;
  };

  let welcomePage: Awaited<ReturnType<typeof fetchPage>> = null;
  if (welcomeSeed) {
    welcomePage = await tryFetch(welcomeSeed);
  }

  const queue: string[] = [];
  const queued = new Set<string>();
  const addToQueue = (urls: (string | null)[], limit = 6) => {
    let added = 0;
    for (const url of urls) {
      if (!url || added >= limit) break;
      const key = normalizeUrl(url);
      if (seenQueue.has(key) || queued.has(key) || !isAllowedUrl(url, allowed)) continue;
      queued.add(key);
      queue.push(url);
      added++;
    }
  };

  addToQueue([
    ...(welcomePage
      ? discoverLinks(
          welcomePage.html,
          welcomePage.url,
          allowed,
          program,
          keywords,
          record.country_code,
        ).slice(0, 5)
      : []),
    ...discoverLinks(
      homepage.html,
      homepage.url,
      allowed,
      program,
      keywords,
      record.country_code,
    ).slice(0, 4),
    ...subdomainSeeds,
    ...countrySeeds,
    ...guessedPaths,
  ], 20);

  while (
    hits.length < maxPages &&
    queue.length > 0 &&
    !(options.deadline && Date.now() >= options.deadline)
  ) {
    queue.sort(
      (a, b) =>
        urlPriority(b, program, keywords, record.country_code) -
        urlPriority(a, program, keywords, record.country_code),
    );
    const url = queue.shift();
    if (!url) break;
    const page = await tryFetch(url);
    if (!page) continue;
    addToQueue(
      discoverLinks(page.html, page.url, allowed, program, keywords, record.country_code),
    );
    if (queue.length > 80) queue.length = 80;
  }

  logger?.info?.(`Fetched ${hits.length} official page(s) for ${record.name}.`);
  return hits;
}

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
