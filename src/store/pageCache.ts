import type { CachedPage, PageCache, SqlClient } from '../core/ports';

interface PageRow {
  url: string;
  title: string | null;
  text: string;
  html: string | null;
  fetched_at: string;
}

/**
 * SQL-backed raw page cache (table `page_cache`, migration 004). The TTL is
 * enforced by the fetcher, so stale rows are simply ignored and reused.
 */
export class SqlPageCache implements PageCache {
  constructor(private readonly sql: SqlClient) {}

  async get(url: string): Promise<CachedPage | null> {
    const rows = await this.sql.query<PageRow>(
      'SELECT url, title, text, html, fetched_at FROM page_cache WHERE url = ? LIMIT 1',
      [url],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      url: row.url,
      title: row.title,
      text: row.text,
      html: row.html ?? undefined,
      fetchedAt: row.fetched_at,
    };
  }

  async put(url: string, page: CachedPage): Promise<void> {
    await this.sql.execute(
      'INSERT OR REPLACE INTO page_cache (url, title, text, html, fetched_at) VALUES (?, ?, ?, ?, ?)',
      [url, page.title, page.text, page.html ?? null, page.fetchedAt],
    );
  }
}
