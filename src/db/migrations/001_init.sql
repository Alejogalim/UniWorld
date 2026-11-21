-- UniWorld initial schema (Design.md §6).
-- Timestamps are ISO 8601 TEXT.
-- The settings table holds non-secret values only. API keys live in the OS keychain.

CREATE TABLE profile (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  name                TEXT NOT NULL,
  primary_lang        TEXT NOT NULL,
  ui_lang             TEXT NOT NULL CHECK (ui_lang IN ('en', 'es', 'vi')),
  citizenship_country TEXT NULL,
  residence_country   TEXT NULL,
  program             TEXT NOT NULL CHECK (program IN ('IB', 'AP', 'US')),
  grades_json         TEXT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE profile_language (
  lang_code TEXT PRIMARY KEY,
  level     TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'))
);

CREATE TABLE counselor_session (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at   TEXT NOT NULL,
  provider     TEXT NOT NULL,
  weights_json TEXT NULL,
  status       TEXT NOT NULL
);

CREATE TABLE counselor_message (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES counselor_session(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_counselor_message_session ON counselor_message(session_id);

CREATE TABLE career_path (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id            INTEGER NOT NULL REFERENCES counselor_session(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  summary               TEXT NOT NULL,
  why_you               TEXT NOT NULL,
  degree_keywords_json  TEXT NOT NULL,
  fit_breakdown_json    TEXT NOT NULL,
  saved                 INTEGER NOT NULL DEFAULT 0 CHECK (saved IN (0, 1))
);

CREATE TABLE uni_search (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  careers_json    TEXT NOT NULL,
  scope_json      TEXT NOT NULL,
  filters_json    TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  results_json    TEXT NULL,
  rejected_count  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE uni_detail_cache (
  ror_id      TEXT NOT NULL,
  program_key TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  checked_at  TEXT NOT NULL,
  PRIMARY KEY (ror_id, program_key)
);

CREATE TABLE tracked_uni (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  ror_id               TEXT NOT NULL,
  program_name         TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'considering'
                       CHECK (status IN ('considering', 'preparing', 'applied', 'waiting',
                                         'admitted', 'waitlisted', 'rejected')),
  deadline             TEXT NULL,
  required_exams_json  TEXT NULL,
  language             TEXT NULL,
  country_code         TEXT NULL,
  notes                TEXT NULL,
  added_at             TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
CREATE INDEX idx_tracked_uni_deadline ON tracked_uni(deadline);

-- Non-secret settings only. Never store API keys here.
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
