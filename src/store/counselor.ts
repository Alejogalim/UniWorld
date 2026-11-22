import type { CareerPath, CounselorNotes, CounselorWeights, Provider } from '../core/contracts';
import type {
  CounselorPersistence,
  CounselorSession,
  SqlClient,
  StoredMessage,
} from '../core/ports';
import { counselorNotesSchema } from '../core/schemas';

interface SessionRow {
  id: number;
  provider: Provider;
  weights_json: string | null;
}

interface MessageRow {
  role: 'user' | 'assistant';
  content: string;
}

interface CareerRow {
  id: number;
  title: string;
  summary: string;
  why_you: string;
  degree_keywords_json: string;
  fit_breakdown_json: string;
  saved: number | boolean;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** SQL-backed counselor history (tables from Design §6). */
export class SqlCounselorStore implements CounselorPersistence {
  constructor(private readonly sql: SqlClient) {}

  /**
   * tauri-plugin-sql returns `lastInsertId` from execute; bun:sqlite provides
   * `lastInsertRowid`. Fall back to last_insert_rowid() for other adapters.
   */
  private async insertId(statement: string, params: unknown[]): Promise<number> {
    const result = await this.sql.execute(statement, params);
    if (result && typeof result.lastInsertId === 'number') return result.lastInsertId;
    const rows = await this.sql.query<{ id: number }>('SELECT last_insert_rowid() AS id');
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('Could not read the inserted row id');
    return Number(id);
  }

  async createSession(provider: Provider, weights?: CounselorWeights | null): Promise<number> {
    return this.insertId(
      'INSERT INTO counselor_session (started_at, provider, weights_json, status) VALUES (?, ?, ?, ?)',
      [new Date().toISOString(), provider, weights ? JSON.stringify(weights) : null, 'active'],
    );
  }

  async getSession(sessionId: number): Promise<CounselorSession | null> {
    const rows = await this.sql.query<SessionRow>(
      'SELECT id, provider, weights_json FROM counselor_session WHERE id = ? LIMIT 1',
      [sessionId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      provider: row.provider,
      weights: parseJson<CounselorWeights | null>(row.weights_json, null),
    };
  }

  async setWeights(sessionId: number, weights: CounselorWeights): Promise<void> {
    await this.sql.execute('UPDATE counselor_session SET weights_json = ? WHERE id = ?', [
      JSON.stringify(weights),
      sessionId,
    ]);
  }

  async getNotes(sessionId: number): Promise<CounselorNotes | null> {
    const rows = await this.sql.query<{ notes_json: string | null }>(
      'SELECT notes_json FROM counselor_session WHERE id = ? LIMIT 1',
      [sessionId],
    );
    const parsed = counselorNotesSchema.safeParse(parseJson<unknown>(rows[0]?.notes_json ?? null, null));
    return parsed.success ? parsed.data : null;
  }

  async setNotes(sessionId: number, notes: CounselorNotes): Promise<void> {
    await this.sql.execute('UPDATE counselor_session SET notes_json = ? WHERE id = ?', [
      JSON.stringify(notes),
      sessionId,
    ]);
  }

  async addMessage(sessionId: number, message: StoredMessage): Promise<void> {
    await this.sql.execute(
      'INSERT INTO counselor_message (session_id, role, content, created_at) VALUES (?, ?, ?, ?)',
      [sessionId, message.role, message.content, new Date().toISOString()],
    );
  }

  async listMessages(sessionId: number): Promise<StoredMessage[]> {
    const rows = await this.sql.query<MessageRow>(
      'SELECT role, content FROM counselor_message WHERE session_id = ? ORDER BY id ASC',
      [sessionId],
    );
    return rows.map((row) => ({ role: row.role, content: row.content }));
  }

  async saveCareers(
    sessionId: number,
    careers: Omit<CareerPath, 'id' | 'saved'>[],
  ): Promise<CareerPath[]> {
    const saved: CareerPath[] = [];
    for (const career of careers) {
      const id = await this.insertId(
        'INSERT INTO career_path (session_id, title, summary, why_you, degree_keywords_json, fit_breakdown_json, saved) ' +
          'VALUES (?, ?, ?, ?, ?, ?, 0)',
        [
          sessionId,
          career.title,
          career.summary,
          career.whyYou,
          JSON.stringify(career.degreeKeywords),
          JSON.stringify(career.fitBreakdown),
        ],
      );
      saved.push({ ...career, id, saved: false });
    }
    return saved;
  }

  async listCareers(sessionId: number): Promise<CareerPath[]> {
    const rows = await this.sql.query<CareerRow>(
      'SELECT id, title, summary, why_you, degree_keywords_json, fit_breakdown_json, saved ' +
        'FROM career_path WHERE session_id = ? ORDER BY id ASC',
      [sessionId],
    );
    return rows.map((row) => this.mapCareer(row));
  }

  async listSavedCareers(): Promise<CareerPath[]> {
    const rows = await this.sql.query<CareerRow>(
      'SELECT id, title, summary, why_you, degree_keywords_json, fit_breakdown_json, saved ' +
        'FROM career_path WHERE saved = 1 ORDER BY id DESC',
    );
    return rows.map((row) => this.mapCareer(row));
  }

  private mapCareer(row: CareerRow): CareerPath {
    return {
      id: Number(row.id),
      title: row.title,
      summary: row.summary,
      whyYou: row.why_you,
      degreeKeywords: parseJson<string[]>(row.degree_keywords_json, []),
      fitBreakdown: parseJson<Record<string, number>>(row.fit_breakdown_json, {}),
      saved: Boolean(row.saved),
    };
  }

  async setCareerSaved(careerId: number, saved: boolean): Promise<void> {
    await this.sql.execute('UPDATE career_path SET saved = ? WHERE id = ?', [saved ? 1 : 0, careerId]);
  }
}
