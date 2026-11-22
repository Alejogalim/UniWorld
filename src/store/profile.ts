import { create } from 'zustand';
import type { Grades, Profile, Level, Lang } from '@/core/contracts';
import { getDb } from '@/db/client';

interface ProfileState {
  profile: Profile | null;
  loaded: boolean;
  load(): Promise<void>;
  save(p: Profile): Promise<void>;
}

interface ProfileRow {
  name: string;
  primary_lang: string;
  ui_lang: Profile['uiLang'];
  citizenship_country: string | null;
  residence_country: string | null;
  program: Profile['program'];
  grades_json: string | null;
}

interface LanguageRow {
  lang_code: string;
  level: Level;
}

export const useProfile = create<ProfileState>((set) => ({
  profile: null,
  loaded: false,

  async load() {
    const db = await getDb();
    const rows = await db.select<ProfileRow[]>(
      'SELECT name, primary_lang, ui_lang, citizenship_country, residence_country, program, grades_json FROM profile WHERE id = 1',
    );
    if (rows.length === 0) {
      set({ profile: null, loaded: true });
      return;
    }
    const row = rows[0];
    const langRows = await db.select<LanguageRow[]>(
      'SELECT lang_code, level FROM profile_language ORDER BY lang_code',
    );
    const profile: Profile = {
      name: row.name,
      primaryLang: row.primary_lang,
      uiLang: row.ui_lang,
      languages: langRows.map((l) => ({ lang: l.lang_code, level: l.level })),
      program: row.program,
    };
    if (row.citizenship_country) profile.citizenship = row.citizenship_country;
    if (row.residence_country) profile.residence = row.residence_country;
    if (row.grades_json) profile.grades = JSON.parse(row.grades_json) as Grades;
    set({ profile, loaded: true });
  },

  async save(p) {
    const db = await getDb();
    const now = new Date().toISOString();
    const grades = p.grades ? JSON.stringify(p.grades) : null;
    // lang_code is the primary key: a repeated code would fail the insert and lose the list, so keep one row per code.
    const languages = [...new Map(p.languages.map((l) => [l.lang as Lang, l.level])).entries()];
    try {
      await db.execute(
        `INSERT INTO profile (id, name, primary_lang, ui_lang, citizenship_country, residence_country, program, grades_json, created_at, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $8)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           primary_lang = excluded.primary_lang,
           ui_lang = excluded.ui_lang,
           citizenship_country = excluded.citizenship_country,
           residence_country = excluded.residence_country,
           program = excluded.program,
           grades_json = excluded.grades_json,
           updated_at = excluded.updated_at`,
        [
          p.name,
          p.primaryLang,
          p.uiLang,
          p.citizenship ?? null,
          p.residence ?? null,
          p.program,
          grades,
          now,
        ],
      );
      await db.execute('DELETE FROM profile_language');
      if (languages.length > 0) {
        // One multi-row insert: a single statement, so the list is written all at once.
        const placeholders = languages.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(', ');
        await db.execute(
          `INSERT INTO profile_language (lang_code, level) VALUES ${placeholders}`,
          languages.flat(),
        );
      }
    } catch (err) {
      // Some of the write may have landed: reload so the store shows what the database really holds.
      await useProfile.getState().load().catch(() => undefined);
      throw err;
    }
    set({ profile: p, loaded: true });
  },
}));
