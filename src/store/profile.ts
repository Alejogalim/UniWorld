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
    for (const l of p.languages) {
      const lang: Lang = l.lang;
      await db.execute(
        'INSERT INTO profile_language (lang_code, level) VALUES ($1, $2)',
        [lang, l.level],
      );
    }
    set({ profile: p, loaded: true });
  },
}));
