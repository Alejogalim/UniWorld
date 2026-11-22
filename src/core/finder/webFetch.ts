import type { SearchHit } from '../ai/types';
import { PAGE_CACHE_TTL_MS, PAGE_FETCH_TIMEOUT_MS } from '../config';
import type { UniversityRecord } from '../grounding/types';
import { domainCandidates, hostOf, normalizeUrl, registrableDomain } from '../normalize';
import type { CachedPage, HttpClient, Logger, PageCache } from '../ports';

const MAX_PAGES = 8;
const MAX_TEXT_CHARS = 20_000;
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
