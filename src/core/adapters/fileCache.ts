import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SearchInput, UniDetail } from '../contracts';
import type {
  CachedDetail,
  CachedPage,
  CachedSearch,
  DetailCache,
  PageCache,
  SearchCache,
} from '../ports';
import { searchKeyParts } from '../../store/search';
import { programKey } from '../../store/detailCache';

function searchKey(input: SearchInput): string {
  const parts = searchKeyParts(input);
  return `${parts.careers_json}|${parts.scope_json}|${parts.filters_json}`;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

/** JSON-file search cache so CLI retakes are instant. */
export class FileSearchCache implements SearchCache {
  private readonly file: string;

  constructor(cacheDir: string) {
    this.file = path.join(cacheDir, 'search-cache.json');
  }

  async get(input: SearchInput): Promise<CachedSearch | null> {
    const data = await readJson<Record<string, CachedSearch>>(this.file, {});
    return data[searchKey(input)] ?? null;
  }

  async put(input: SearchInput, value: CachedSearch): Promise<void> {
    const data = await readJson<Record<string, CachedSearch>>(this.file, {});
    data[searchKey(input)] = value;
    await writeJson(this.file, data);
  }
}

/** JSON-file raw page cache so CLI searches reuse fetched pages between runs. */
export class FilePageCache implements PageCache {
  private readonly file: string;

  constructor(cacheDir: string) {
    this.file = path.join(cacheDir, 'page-cache.json');
  }

  async get(url: string): Promise<CachedPage | null> {
    const data = await readJson<Record<string, CachedPage>>(this.file, {});
    return data[url] ?? null;
  }

  async put(url: string, page: CachedPage): Promise<void> {
    const data = await readJson<Record<string, CachedPage>>(this.file, {});
    data[url] = page;
    await writeJson(this.file, data);
  }
}

/** JSON-file detail cache with the same 30-day rule handled by the caller. */
export class FileDetailCache implements DetailCache {
  private readonly file: string;

  constructor(cacheDir: string) {
    this.file = path.join(cacheDir, 'detail-cache.json');
  }

  async get(rorId: string, program: string): Promise<CachedDetail | null> {
    const data = await readJson<Record<string, CachedDetail>>(this.file, {});
    return data[`${rorId}|${programKey(program)}`] ?? null;
  }

  async put(detail: UniDetail): Promise<void> {
    const data = await readJson<Record<string, CachedDetail>>(this.file, {});
    data[`${detail.rorId}|${programKey(detail.program)}`] = {
      detail,
      checkedAt: detail.checkedAt,
    };
    await writeJson(this.file, data);
  }
}
