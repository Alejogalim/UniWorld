import { Database } from 'bun:sqlite';
import type { SqlClient } from '../ports';

type Binding = string | number | bigint | boolean | null | Uint8Array;

/** bun:sqlite adapter used by tests and by the CLI if it needs SQL storage. */
export class BunSqlClient implements SqlClient {
  constructor(private readonly db: Database) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const statement = this.db.query(sql);
    return statement.all(...(params as Binding[])) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ lastInsertId?: number }> {
    const result = this.db.run(sql, params as Binding[]);
    return { lastInsertId: Number(result.lastInsertRowid) };
  }
}
