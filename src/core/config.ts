export const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const OPENCODE_BASE_URL = 'https://opencode.ai/inference/go/openai/v1';
export const OPENCODE_MODELS_URL = 'https://opencode.ai/inference/go/v1/models';
export const OPENCODE_MODEL = 'deepseek-v4.1-flash';
export const OPENCODE_USER_AGENT = 'unifinder/1.0';

/**
 * Countries whose Finder coverage has been tested end-to-end with the
 * OpenCode official-page path. See `docs/supported-countries.md`.
 */
export const SUPPORTED_COUNTRIES = ['US', 'CN', 'VN', 'DE', 'SE', 'ES', 'CO'] as const;
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

/** Design §14: up to 12 results per search. */
export const MAX_RESULTS = 12;
/** Design §14: detail cache lives for 30 days. */
export const DETAIL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Below this, show "Couldn't verify enough results, try a narrower scope." */
export const MIN_VERIFIED_RESULTS = 3;

/** Grounding thresholds. */
export const ROR_FUZZY_THRESHOLD = 0.78;
export const ROR_FUZZY_MARGIN = 0.04;

export const QUOTE_MIN_WORDS = 3;
export const QUOTE_MAX_WORDS = 40;

/** Web search budget (characters of Exa highlights per query). */
export const SEARCH_MAX_RESULTS_PER_QUERY = 8;
export const SEARCH_MAX_CHARACTERS = 4000;
export const SEARCH_MAX_TOTAL_RESULTS = 24;
/** Extraction receives at most this much text to keep prompts affordable. */
export const EXTRACT_MAX_CHARS_PER_HIT = 6000;
export const EXTRACT_MAX_TOTAL_CHARS = 60_000;
export const EXTRACT_MAX_CANDIDATES = 40;
export const MAX_SEARCH_QUERIES = 3;

/** JSON call token budgets (doubled on retry by `nextTokenBudget`). */
export const SUGGEST_MAX_TOKENS = 2000;
export const EXTRACT_MAX_TOKENS = 4000;
export const DETAIL_MAX_TOKENS = 4000;
export const RANK_MAX_TOKENS = 3000;
export const KEYWORD_MAX_TOKENS = 800;
export const QUERY_PLAN_MAX_TOKENS = 900;

/** Fetch/caching budgets. */
export const PAGE_FETCH_TIMEOUT_MS = 8_000;
export const UNIVERSITY_FETCH_TIMEOUT_MS = 25_000;
export const SEARCH_TIMEOUT_MS = 90_000;
export const PAGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Stop the OpenCode path once this many universities are verified. */
export const SEARCH_TARGET_RESULTS = 8;

/** Ranking weights (Design §13: final tuning is ours). */
export const RANK_WEIGHTS = {
  career: 0.35,
  language: 0.25,
  cost: 0.2,
  admission: 0.2,
} as const;

/** Career synthesis slider dimensions. Design §7.2. */
export const CAREER_DIMENSIONS = ['passions', 'strengths', 'goals', 'earning'] as const;
export const CAREER_MIN = 3;
export const CAREER_MAX = 5;

/** After this many student messages the UI offers "Show my career ideas". */
export const CAREER_IDEAS_MIN_STUDENT_MESSAGES = 8;

export const OFFICIAL_SOURCE_KINDS = ['official', 'third_party'] as const;
