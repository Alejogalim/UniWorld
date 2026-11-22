/**
 * Mock rows for My universities, so the screen can be checked with data in it.
 * Dev-only: run with `bun scripts/seed-my-unis.ts`, then reopen the app. Re-running replaces these rows.
 */
import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';

const db = new Database(join(homedir(), '.config', 'com.uniworld.app', 'uniworld.db'));
db.exec('PRAGMA busy_timeout = 3000');

const MOCK_ROR_IDS = [
  '008ennh25', // University of Amsterdam
  '05a28rw58', // ETH Zurich
  '02kkh8j41', // Technical University of Munich
  '01hx8ne41', // University of Melbourne
  '03h2ebz35', // University of Toronto
  '03m6r1n54', // Universitat Politècnica de Catalunya
];

const rows = [
  {
    ror: '008ennh25',
    name: 'University of Amsterdam',
    city: 'Amsterdam',
    country: 'NL',
    program: 'BSc Artificial Intelligence',
    status: 'applied',
    deadline: '2026-12-01',
    exams: ['IELTS 7.0', 'Maths entrance test'],
    language: 'en',
    notes: 'Portfolio submitted. Waiting on the maths test date.',
  },
  {
    ror: '05a28rw58',
    name: 'ETH Zurich',
    city: 'Zurich',
    country: 'CH',
    program: 'BSc Computer Science',
    status: 'preparing',
    deadline: '2026-12-15',
    exams: ['Reduced exam', 'German B2'],
    language: 'de',
    notes: 'Needs a translated transcript and the reduced entrance exam.',
  },
  {
    ror: '02kkh8j41',
    name: 'Technical University of Munich',
    city: 'Munich',
    country: 'DE',
    program: 'BSc Informatics',
    status: 'considering',
    deadline: '2027-01-15',
    exams: ['TestDaF', 'APS certificate'],
    language: 'de',
    notes: 'APS interview still to book.',
  },
  {
    ror: '01hx8ne41',
    name: 'University of Melbourne',
    city: 'Melbourne',
    country: 'AU',
    program: 'Bachelor of Science',
    status: 'waiting',
    deadline: '2027-03-31',
    exams: ['IELTS 6.5'],
    language: 'en',
    notes: 'Conditional offer; needs the final transcript.',
  },
  {
    ror: '03h2ebz35',
    name: 'University of Toronto',
    city: 'Toronto',
    country: 'CA',
    program: 'BSc Computer Science',
    status: 'admitted',
    deadline: null,
    exams: ['IELTS 6.5', 'Calculus prerequisite'],
    language: 'en',
    notes: 'Offer accepted. Deposit paid.',
  },
  {
    ror: '03m6r1n54',
    name: 'Universitat Politècnica de Catalunya',
    city: 'Barcelona',
    country: 'ES',
    program: 'Grau en Enginyeria Informàtica',
    status: 'rejected',
    deadline: '2026-11-10',
    exams: [],
    language: 'es',
    notes: 'Missed the PAU registration window.',
  },
];

const now = new Date().toISOString();
db.transaction(() => {
  db.prepare(`DELETE FROM tracked_uni WHERE ror_id IN (${MOCK_ROR_IDS.map(() => '?').join(', ')})`).run(...MOCK_ROR_IDS);
  const insert = db.prepare(
    `INSERT INTO tracked_uni
       (ror_id, name, city, country_code, program_name, detail_program, status, deadline,
        required_exams_json, language, notes, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of rows) {
    insert.run(
      r.ror,
      r.name,
      r.city,
      r.country,
      r.program,
      r.program,
      r.status,
      r.deadline,
      JSON.stringify(r.exams),
      r.language,
      r.notes,
      now,
      now,
    );
  }
})();

console.log(`Seeded ${rows.length} mock universities into ${db.filename}`);
db.close();
