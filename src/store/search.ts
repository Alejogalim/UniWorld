import type { SearchInput, UniResult } from '../core/contracts';
import type { CachedSearch, SearchCache, SqlClient } from '../core/ports';

export function searchKeyParts(input: SearchInput): {
  careers_json: string;
  scope_json: string;
  filters_json: string;
} {
  return {
    careers_json: JSON.stringify([...input.careers].map((c) => c.trim()).filter(Boolean).sort()),
    scope_json: JSON.stringify(input.scope),
    filters_json: JSON.stringify(input.filters),
  };
}

interface SearchRow {
  results_json: string;
  rejected_count: number | string;
  created_at: string;
}

/** SQL-backed search cache (table `uni_search`, Design §6). */
export class SqlSearchCache implements SearchCache {
  constructor(private readonly sql: SqlClient) {}

  async get(input: SearchInput): Promise<CachedSearch | null> {
    const parts = searchKeyParts(input);
    const rows = await this.sql.query<SearchRow>(
      'SELECT results_json, rejected_count, created_at FROM uni_search ' +
        'WHERE careers_json = ? AND scope_json = ? AND filters_json = ? ' +
        'ORDER BY id DESC LIMIT 1',
      [parts.careers_json, parts.scope_json, parts.filters_json],
    );
    const row = rows[0];
    if (!row) return null;
    try {
      const results = JSON.parse(row.results_json) as UniResult[];
      return {
        results,
        rejectedCount: Number(row.rejected_count),
        createdAt: row.created_at,
      };
    } catch {
      return null;
    }
  }

  async put(input: SearchInput, value: CachedSearch): Promise<void> {
    const parts = searchKeyParts(input);
    await this.sql.execute(
      'INSERT INTO uni_search (careers_json, scope_json, filters_json, created_at, results_json, rejected_count) ' +
        'VALUES (?, ?, ?, ?, ?, ?)',
      [
        parts.careers_json,
        parts.scope_json,
        parts.filters_json,
        value.createdAt,
        JSON.stringify(value.results),
        value.rejectedCount,
      ],
    );
  }
}
