import type { UniDetail } from '../core/contracts';
import type { CachedDetail, DetailCache, SqlClient } from '../core/ports';

export function programKey(program: string): string {
  return program.trim().toLowerCase();
}

interface DetailRow {
  detail_json: string;
  checked_at: string;
}

/** SQL-backed detail cache (table `uni_detail_cache`, Design §6). */
export class SqlDetailCache implements DetailCache {
  constructor(private readonly sql: SqlClient) {}

  async get(rorId: string, program: string): Promise<CachedDetail | null> {
    const rows = await this.sql.query<DetailRow>(
      'SELECT detail_json, checked_at FROM uni_detail_cache WHERE ror_id = ? AND program_key = ? LIMIT 1',
      [rorId, programKey(program)],
    );
    const row = rows[0];
    if (!row) return null;
    try {
      const detail = JSON.parse(row.detail_json) as UniDetail;
      return { detail, checkedAt: row.checked_at };
    } catch {
      return null;
    }
  }

  async put(detail: UniDetail): Promise<void> {
    await this.sql.execute(
      'INSERT OR REPLACE INTO uni_detail_cache (ror_id, program_key, detail_json, checked_at) VALUES (?, ?, ?, ?)',
      [detail.rorId, programKey(detail.program), JSON.stringify(detail), detail.checkedAt],
    );
  }
}
