import type { SearchHit } from '../ai/types';
import type { UniversityRecord } from '../grounding/types';
import { domainCandidates, hostOf, normalizeUrl, registrableDomain } from '../normalize';
import type { HttpClient, Logger } from '../ports';

const MAX_PAGES = 8;
const MAX_TEXT_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 15_000;

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

function scoreLink(href: string, text: string, program: string): number {
  const haystack = `${href} ${text}`.toLowerCase();
  if (SKIP_EXTENSION.test(haystack)) return -1;
  let score = 0;
  const add = (words: string[], weight: number) => {
    if (words.some((word) => haystack.includes(word))) score += weight;
  };

  add(['application', 'apply'], 6);
  add(['admission'], 6);
  add(['tuition', 'fee', 'fees', 'cost', 'scholarship', 'funding', 'bourse'], 6);
  add(['deadline', 'entry requirement', 'admission requirement', "conditions d'admission"], 5);
  add(['taught in english', 'english-taught', 'courses taught in english'], 5);
  add(['full degree', 'full-degree', 'degree student', 'degree-student'], 5);
  add(['program', 'programme', 'course', 'bachelor', 'master', 'undergraduate', 'graduate', 'licence'], 2);
  add(['international'], 0.5);

  for (const word of program.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4 && haystack.includes(word)) score += 4;
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

function urlPriority(url: string, program: string): number {
  const haystack = url.toLowerCase();
  let score = 0;
  if (/(full-degree|degree-student)/.test(haystack)) score += 20;
  if (/(apply|application|admission)/.test(haystack)) score += 15;
  if (/(tuition|fee|scholarship|funding)/.test(haystack)) score += 15;
  if (/(deadline|requirement)/.test(haystack)) score += 10;
  if (/(program|programme|course|bachelor|master|undergraduate|licence)/.test(haystack)) score += 3;
  if (haystack.includes('international')) score += 1;
  for (const word of program.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 4 && haystack.includes(word)) score += 8;
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
): string[] {
  const seen = new Set<string>();
  const scored: { url: string; score: number }[] = [];
  for (const anchor of anchors(html)) {
    const url = resolveUrl(anchor.href, baseUrl);
    if (!url || !isAllowedUrl(url, allowedHosts)) continue;
    const key = normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = scoreLink(url, anchor.text, program);
    if (score > 0) scored.push({ url, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.url);
}

async function fetchPage(
  http: HttpClient,
  url: string,
  logger?: Logger,
): Promise<{ url: string; html: string; text: string; title: string | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await http.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'unifinder/1.0',
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
    if (SKIP_EXTENSION.test(finalUrl) || /^\s*%PDF/i.test(html)) return null;
    if (!/<(?:html|body|div|p|a)\b/i.test(html)) return null;
    const text = htmlToText(html);
    if (text.length < 40) return null;
    return {
      url: finalUrl,
      html,
      text,
      title: pageTitle(html),
    };
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
): Promise<SearchHit[]> {
  const allowed = allowedHostSet(record);
  if (allowed.size === 0) return [];

  const seeds: string[] = [];
  if (record.website) seeds.push(record.website);
  for (const domain of record.domains ?? []) {
    seeds.push(`https://${domain}/`);
    if (!domain.startsWith('www.')) seeds.push(`https://www.${domain}/`);
  }

  let homepage: Awaited<ReturnType<typeof fetchPage>> = null;
  for (const seed of [...new Set(seeds)].slice(0, 5)) {
    homepage = await fetchPage(http, seed, logger);
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
    const signature = `${page.title ?? ''}|${text.length}|${text.slice(0, 200)}`;
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
  ].map((path) => resolveUrl(path, origin));

  const seenQueue = new Set(seen);
  const tryFetch = async (url: string) => {
    const key = normalizeUrl(url);
    if (seenQueue.has(key)) return null;
    seenQueue.add(key);
    logger?.debug?.(`[webFetch] GET ${url}`);
    const page = await fetchPage(http, url, logger);
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
      ? discoverLinks(welcomePage.html, welcomePage.url, allowed, program).slice(0, 5)
      : []),
    ...discoverLinks(homepage.html, homepage.url, allowed, program).slice(0, 3),
    ...subdomainSeeds,
    ...guessedPaths,
  ]);

  while (hits.length < MAX_PAGES && queue.length > 0) {
    queue.sort((a, b) => urlPriority(b, program) - urlPriority(a, program));
    const url = queue.shift();
    if (!url) break;
    const page = await tryFetch(url);
    if (!page) continue;
    addToQueue(discoverLinks(page.html, page.url, allowed, program));
    if (queue.length > 80) queue.length = 80;
  }

  logger?.info?.(`Fetched ${hits.length} official page(s) for ${record.name}.`);
  return hits;
}
