/**
 * Shared contract between the UI (Person A) and the core (Person B).
 * Types only, no runtime code and no dependencies. FROZEN after the first sync:
 * change it only after agreeing with the other person.
 * Zod schemas for AI responses live in `src/core/schemas.ts` (B) and must match these types.
 * See Design.md §6 and §7 for the meaning of each field.
 */

// ---------- Basics ----------
export type Lang = string; // ISO 639-1, e.g. "en", "es", "vi"
export type UiLang = 'en' | 'es' | 'vi';
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
export type Program = 'IB' | 'AP' | 'US';
export type Provider = 'openrouter' | 'opencode';

/** One selectable model for the Settings dropdown. */
export interface AiModel {
  id: string;
  name: string;
}
export type Continent =
  | 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania';

// ---------- Grounded fact (Design §6) ----------
/** Every important fact. `value === null` means "Not found — check official site". */
export interface Fact<T> {
  value: T | null;
  sourceUrl: string | null;
  /** Short exact excerpt (about 5–30 words) from the source text that supports `value`. */
  quote: string | null;
  sourceKind: 'official' | 'third_party';
  checkedAt: string; // ISO date
}

// ---------- Profile ----------
export interface Grades {
  ib?: {
    predictedTotal?: number; // /45
    subjects?: { name: string; level: 'HL' | 'SL'; score: number /* 1–7 */ }[];
  };
  ap?: {
    gpa?: number;
    exams?: { name: string; score: number /* 1–5 */ }[];
  };
  us?: {
    gpaUnweighted?: number; // /4.0
    sat?: number;
    act?: number;
  };
}

export interface Profile {
  name: string;
  primaryLang: Lang;
  uiLang: UiLang;
  languages: { lang: Lang; level: Level }[]; // additional languages
  citizenship?: string; // ISO 3166-1 alpha-2
  residence?: string; // ISO 3166-1 alpha-2
  program: Program;
  grades?: Grades;
}

// ---------- Counselor ----------
/** Importance sliders, 1–10 (Design §7.2). */
export interface CounselorWeights {
  passions: number;
  strengths: number;
  goals: number;
  earning: number;
}

export interface CareerPath {
  id: number;
  title: string;
  summary: string;
  whyYou: string; // grounded in the student's own answers
  degreeKeywords: string[]; // e.g. ["Computer Science", "Data Science"]
  fitBreakdown: Record<string, number>; // weighted by the sliders
  saved: boolean;
}

// ---------- Finder ----------
export type Scope =
  | { kind: 'global' }
  | { kind: 'continent'; continent: Continent }
  | { kind: 'countries'; codes: string[] }; // ISO 3166-1 alpha-2

export interface SearchInput {
  careers: string[];
  /** Degree/programme keywords from the saved careers, when the UI can pass them. */
  degreeKeywords?: string[];
  scope: Scope;
  filters: {
    tuitionFreeOnly: boolean; // default false
    spokenLanguagesOnly: boolean; // default true ("speaks" = B2+ or native)
    includeNeedToLearn: boolean; // default false
  };
}

export type AdmissionFit = 'Reach' | 'Match' | 'Safety' | 'Unknown';

export interface UniResult {
  rorId: string;
  name: string;
  countryCode: string;
  city?: string;
  lat?: number;
  lng?: number;
  program: string;
  /** Official page where the programme name was found (evidence). */
  programUrl?: string;
  /** Exact text that matched the programme keyword on that page. */
  programQuote?: string;
  overview: Fact<string>;
  languages: Fact<string[]>;
  tuition: Fact<string>; // e.g. "Free", "~€12,000/yr", "Free for EU/EEA"
  /** Set when the student would have to learn the language of instruction. */
  needToLearn?: { lang: Lang; usualLevel: Fact<string> };
  fit: {
    career: number; // 0–1
    admission: AdmissionFit;
    language: number; // 0–1
    cost: number | 'depends_on_citizenship'; // 0–1
    overall: number; // 0–1, results are sorted by this
  };
  whyFits: string; // one line naming real profile facts
  sourceCount: number;
}

export interface UniDetail {
  rorId: string;
  program: string;
  overview: Fact<string>;
  languages: Fact<string[]>;
  tuition: Fact<string>;
  scholarships: Fact<string>;
  deadlines: Fact<string>; // full list, as sourced text
  nextDeadline: Fact<string>; // next upcoming, international first-year; goes to the tracker
  exams: Fact<string[]>; // SAT/ACT/IB/AP policy, IELTS/TOEFL, etc.
  requirements: Fact<string>;
  applyUrl: Fact<string>;
  checkedAt: string; // ISO date
}

export type RemovalReason =
  | 'not_in_registry'
  | 'out_of_scope'
  | 'site_unreachable'
  | 'programme_not_found'
  | 'not_bachelor'
  | 'language_not_spoken'
  | 'tuition_not_free'
  | 'ai_answer_rejected'
  | 'over_cap';

/** How many candidates each removal reason cost. Only non-zero entries are sent. */
export type RemovalReasons = Partial<Record<RemovalReason, number>>;

export type FinderEvent =
  | { type: 'progress'; message: string }
  | { type: 'result'; uni: UniResult } // streamed as verified, max 12 per search
  | { type: 'done'; verified: number; removed: number; reasons?: RemovalReasons }
  | { type: 'error'; message: string };

// ---------- Tracker (owned by A's store, listed here for reference) ----------
export type TrackedStatus =
  | 'considering' | 'preparing' | 'applied' | 'waiting'
  | 'admitted' | 'waitlisted' | 'rejected';

// ---------- The API the UI calls (B implements, A consumes) ----------
export interface CoreApi {
  testConnection(provider: Provider): Promise<{ ok: boolean; error?: string }>;
  /** Models the provider offers; the key is used when it exists but is not required. */
  listModels(provider: Provider): Promise<AiModel[]>;

  counselor: {
    start(): Promise<{ sessionId: number }>;
    /** Sends a student message; resolves to the full assistant reply. */
    send(
      sessionId: number,
      text: string,
      onToken?: (token: string) => void,
    ): Promise<string>;
    /** Generates 3–5 career ideas from the session so far. */
    careers(sessionId: number, weights: CounselorWeights): Promise<CareerPath[]>;
  };

  finder: {
    search(input: SearchInput, onEvent: (e: FinderEvent) => void): Promise<void>;
    detail(
      rorId: string,
      program: string,
      opts?: { refresh?: boolean },
    ): Promise<UniDetail>;
  };
}
