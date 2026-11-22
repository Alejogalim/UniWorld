import { create } from 'zustand';
import type { TrackedStatus } from '@/core/contracts';
import { getDb } from '@/db/client';

export interface TrackedUni {
  id: number;
  rorId: string;
  name: string;
  city: string | null;
  countryCode: string;
  programName: string;
  status: TrackedStatus;
  /** YYYY-MM-DD */
  deadline: string | null;
  requiredExams: string[];
  language: string | null;
  notes: string;
  addedAt: string;
  updatedAt: string;
}

export interface TrackedInput {
  rorId: string;
  name: string;
  city: string | null;
  countryCode: string;
  programName: string;
  status?: TrackedStatus;
  deadline: string | null;
  requiredExams: string[];
  language: string | null;
  notes?: string;
}

/** Fields the Uni Manager may edit. */
export type TrackedPatch = Partial<
  Pick<TrackedUni, 'programName' | 'status' | 'deadline' | 'requiredExams' | 'language' | 'notes'>
>;

interface TrackedRow {
  id: number;
  ror_id: string;
  name: string | null;
  city: string | null;
  country_code: string | null;
  program_name: string;
  status: TrackedStatus;
  deadline: string | null;
  required_exams_json: string | null;
  language: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

const COLUMNS =
  'id, ror_id, name, city, country_code, program_name, status, deadline, required_exams_json, language, notes, added_at, updated_at';

function fromRow(row: TrackedRow): TrackedUni {
  let requiredExams: string[] = [];
  if (row.required_exams_json) {
    try {
      const parsed: unknown = JSON.parse(row.required_exams_json);
      if (Array.isArray(parsed)) requiredExams = parsed.filter((x): x is string => typeof x === 'string');
    } catch {
      requiredExams = [];
    }
  }
  return {
    id: row.id,
    rorId: row.ror_id,
    name: row.name ?? '',
    city: row.city,
    countryCode: row.country_code ?? '',
    programName: row.program_name,
    status: row.status,
    deadline: row.deadline,
    requiredExams,
    language: row.language,
    notes: row.notes ?? '',
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

const sameProgram = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface TrackedState {
  items: TrackedUni[];
  loaded: boolean;
  load(): Promise<void>;
  /** Idempotent per (rorId, programName, case-insensitive): returns the existing row instead of duplicating. */
  add(input: TrackedInput): Promise<TrackedUni>;
  /** Optimistic: applies the patch at once; reverts and rethrows if the write fails. */
  update(id: number, patch: TrackedPatch): Promise<void>;
  remove(id: number): Promise<void>;
  find(rorId: string, programName: string): TrackedUni | undefined;
}

export const useTracked = create<TrackedState>((set, get) => ({
  items: [],
  loaded: false,

  async load() {
    const db = await getDb();
    const rows = await db.select<TrackedRow[]>(`SELECT ${COLUMNS} FROM tracked_uni ORDER BY id`);
    set({ items: rows.map(fromRow), loaded: true });
  },

  async add(input) {
    const existing = get().find(input.rorId, input.programName);
    if (existing) return existing;

    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO tracked_uni (ror_id, name, city, country_code, program_name, status, deadline, required_exams_json, language, notes, added_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        input.rorId,
        input.name,
        input.city,
        input.countryCode,
        input.programName,
        input.status ?? 'considering',
        input.deadline,
        JSON.stringify(input.requiredExams),
        input.language,
        input.notes ?? '',
        now,
      ],
    );
    const rows = await db.select<TrackedRow[]>(
      `SELECT ${COLUMNS} FROM tracked_uni WHERE ror_id = $1 AND lower(program_name) = lower($2) ORDER BY id DESC LIMIT 1`,
      [input.rorId, input.programName],
    );
    if (rows.length === 0) throw new Error('The university was not saved. Try again.');
    const added = fromRow(rows[0]);
    set((s) => ({ items: [...s.items.filter((i) => i.id !== added.id), added].sort((a, b) => a.id - b.id) }));
    return added;
  },

  async update(id, patch) {
    const before = get().items.find((i) => i.id === id);
    if (!before) throw new Error('This university is no longer in your list.');
    const next: TrackedUni = { ...before, ...patch, updatedAt: new Date().toISOString() };
    const replace = (uni: TrackedUni) => set((s) => ({ items: s.items.map((i) => (i.id === id ? uni : i)) }));

    replace(next);
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE tracked_uni SET program_name = $1, status = $2, deadline = $3, required_exams_json = $4,
           language = $5, notes = $6, updated_at = $7 WHERE id = $8`,
        [
          next.programName,
          next.status,
          next.deadline,
          JSON.stringify(next.requiredExams),
          next.language,
          next.notes,
          next.updatedAt,
          id,
        ],
      );
    } catch (err) {
      replace(before);
      throw err;
    }
  },

  async remove(id) {
    const before = get().items;
    set({ items: before.filter((i) => i.id !== id) });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM tracked_uni WHERE id = $1', [id]);
    } catch (err) {
      set({ items: before });
      throw err;
    }
  },

  find(rorId, programName) {
    return get().items.find((i) => i.rorId === rorId && sameProgram(i.programName, programName));
  },
}));
