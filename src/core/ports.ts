/**
 * Dependency ports. The core never imports Tauri, Bun or the DOM directly:
 * the app passes adapters backed by tauri-plugin-http / tauri-plugin-sql /
 * the OS keychain, while scripts pass Bun-backed adapters.
 */
import type {
  CareerPath,
  CounselorNotes,
  CounselorWeights,
  Profile,
  Provider,
  SearchInput,
  UniDetail,
  UniResult,
} from './contracts';

export interface HttpRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface HttpResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  /** Present on fetch-compatible adapters; enables token streaming. */
  body?: ReadableStream<Uint8Array> | null;
  /** Final URL after redirects, when the adapter exposes it. */
  url?: string;
}

export interface HttpClient {
  fetch(url: string, init?: HttpRequestInit): Promise<HttpResponseLike>;
}

export interface SqlClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(
    sql: string,
    params?: unknown[],
  ): Promise<{ lastInsertId?: number } | void>;
}

export interface SecretStore {
  /** Returns the API key for a provider, or null when not configured. */
  get(provider: Provider): Promise<string | null>;
}

export interface SettingsStore {
  /** Model ID for one provider; falls back to that provider's built-in default. */
  getModel(provider?: Provider): Promise<string | null>;
  /** Which provider the counselor should prefer. */
  getDefaultProvider?(): Promise<Provider | null>;
}

export interface ProfileStore {
  get(): Promise<Profile | null>;
}

export interface Logger {
  debug?(message: string): void;
  info?(message: string): void;
  warn?(message: string): void;
  error?(message: string): void;
}

// ---------- Persistence ports (SQL in the app, JSON in the CLI) ----------

export interface CachedSearch {
  results: UniResult[];
  rejectedCount: number;
  createdAt: string;
}

export interface SearchCache {
  get(input: SearchInput): Promise<CachedSearch | null>;
  put(input: SearchInput, value: CachedSearch): Promise<void>;
}

export interface CachedDetail {
  detail: UniDetail;
  checkedAt: string;
}

export interface DetailCache {
  get(rorId: string, program: string): Promise<CachedDetail | null>;
  put(detail: UniDetail): Promise<void>;
}

export interface CachedPage {
  /** Final URL after redirects. */
  url: string;
  title: string | null;
  text: string;
  /** Raw HTML (capped) so cached pages can still yield same-site links. */
  html?: string;
  fetchedAt: string;
}

/** Raw fetched page text, so repeat searches and the detail page skip the network. */
export interface PageCache {
  get(url: string): Promise<CachedPage | null>;
  put(url: string, page: CachedPage): Promise<void>;
}

export interface CounselorSession {
  id: number;
  provider: Provider;
  weights: CounselorWeights | null;
}

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CounselorPersistence {
  createSession(provider: Provider, weights?: CounselorWeights | null): Promise<number>;
  getSession(sessionId: number): Promise<CounselorSession | null>;
  setWeights(sessionId: number, weights: CounselorWeights): Promise<void>;
  /** The running notes for a session, or null when none were saved yet. */
  getNotes(sessionId: number): Promise<CounselorNotes | null>;
  setNotes(sessionId: number, notes: CounselorNotes): Promise<void>;
  addMessage(sessionId: number, message: StoredMessage): Promise<void>;
  listMessages(sessionId: number): Promise<StoredMessage[]>;
  saveCareers(sessionId: number, careers: Omit<CareerPath, 'id' | 'saved'>[]): Promise<CareerPath[]>;
  listCareers(sessionId: number): Promise<CareerPath[]>;
  /** Saved career cards across all sessions, newest first (Finder chips). */
  listSavedCareers(): Promise<CareerPath[]>;
  setCareerSaved(careerId: number, saved: boolean): Promise<void>;
}

export interface CoreDeps {
  http: HttpClient;
  secrets: SecretStore;
  settings?: SettingsStore;
  profile: ProfileStore;
  sql?: SqlClient;
  searches?: SearchCache;
  details?: DetailCache;
  pages?: PageCache;
  counselorStore?: CounselorPersistence;
  /** Directory used by the CLI for its JSON cache. Unused in the app. */
  cacheDir?: string;
  logger?: Logger;
  /** Injectable clock for tests. */
  now?: () => Date;
}
