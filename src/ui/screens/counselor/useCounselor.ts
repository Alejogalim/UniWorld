import { create } from 'zustand';
import i18n from 'i18next';
import { useCore } from '@/app/useCore';
import {
  CAREER_IDEAS_MIN_STUDENT_MESSAGES,
  MissingKeyError,
  type CareerPath,
  type CounselorNotes,
  type CounselorWeights,
} from '@/core';
import { createTauriSqlClient } from '@/core/adapters/tauri';
import type { Provider } from '@/core/contracts';
import { getDb } from '@/db/client';
import { SqlCounselorStore } from '@/store/counselor';
import { useProfile } from '@/store/profile';
import { getSecret } from '@/store/secrets';
import { getSetting, setSetting } from '@/store/settings';
import { visibleReply } from '@/core/counselor/replyTag';
import { encodeIntake, intakeOutcome, INTAKE_TOTAL, rebuildConversation } from './intake';
import { chooseSessionProvider, otherProvider } from './providerChoice';

export interface ChatMessage {
  id: string;
  role: 'counselor' | 'student';
  text: string;
  /** A question the UI asked itself (not sent to the AI). */
  local?: boolean;
  streaming?: boolean;
}

export type CounselorStatus = 'idle' | 'sending' | 'thinking-careers';

export interface CounselorError {
  /** Where it happened: the chat composer, the career list, or saving a career. */
  scope: 'chat' | 'careers' | 'save';
  missingKey: boolean;
  message: string;
  /** Set when the other provider has a stored key: the note offers to switch to it and retry. */
  switchTo?: Provider;
}

/** The last student text that did not get a reply, so "Try again" can resend it unchanged. */
interface Pending {
  encoded: string;
  intakeN: number | null;
  /** True when this answers the topic's one follow-up question. */
  followUp: boolean;
}

export const DEFAULT_WEIGHTS: CounselorWeights = { passions: 5, strengths: 5, goals: 5, earning: 5 };

const BATCH_KEY = 'uniworld.counselor.latestBatch';

/**
 * The store keeps every career but not which batch it came from. The ids of the newest batch
 * are remembered per viewer (localStorage, per session). With no record, every career counts as the latest.
 */
function readLatestBatch(sessionId: number | null): number[] | null {
  if (sessionId === null) return null;
  try {
    const raw = window.localStorage.getItem(BATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: unknown; ids?: unknown };
    if (parsed.sessionId !== sessionId || !Array.isArray(parsed.ids)) return null;
    return parsed.ids.filter((id): id is number => typeof id === 'number');
  } catch {
    return null;
  }
}

function writeLatestBatch(sessionId: number, ids: number[]): void {
  try {
    window.localStorage.setItem(BATCH_KEY, JSON.stringify({ sessionId, ids }));
  } catch {
    // Storage can be blocked: the batch then shows as the latest until the next visit.
  }
}

function clearLatestBatch(): void {
  try {
    window.localStorage.removeItem(BATCH_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

interface CounselorState {
  sessionId: number | null;
  messages: ChatMessage[];
  /** 1..6 = the intake question awaiting an answer; 7 = intake done (free-form chat). */
  intakeStep: number;
  /** True when the question awaiting an answer is the current topic's follow-up. */
  followUp: boolean;
  studentCount: number;
  weights: CounselorWeights;
  careers: CareerPath[];
  /** What the counselor has noted so far (plan 30), or null before the first update. */
  notes: CounselorNotes | null;
  /** Ids of the most recent batch of career ideas, or null when no batch is recorded. */
  latestBatchIds: number[] | null;
  status: CounselorStatus;
  error: CounselorError | null;
  pending: Pending | null;
  loaded: boolean;
  ensureLoaded(): Promise<void>;
  sendAnswer(text: string): Promise<void>;
  retry(): Promise<void>;
  switchProviderAndRetry(): Promise<void>;
  generateCareers(): Promise<void>;
  toggleSaved(careerId: number): Promise<void>;
  setWeight(dimension: keyof CounselorWeights, value: number): void;
  reset(): Promise<void>;
}

const tc = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, { ns: 'counselor', ...options }) as string;

let idCounter = 0;
const uid = () => `m${++idCounter}`;

function questionText(n: number): string {
  return tc(`intake.q${n}`, { name: useProfile.getState().profile?.name ?? '' });
}

function questionBubble(n: number): ChatMessage {
  return { id: uid(), role: 'counselor', text: questionText(n), local: true };
}

function isMissingKey(err: unknown): boolean {
  if (err instanceof MissingKeyError) return true;
  // counselorProvider() throws a plain Error when no key is configured at all.
  return err instanceof Error && err.message.startsWith('No AI key configured');
}

function errorFrom(err: unknown, scope: CounselorError['scope']): CounselorError {
  return {
    scope,
    missingKey: isMissingKey(err),
    message: err instanceof Error ? err.message : String(err),
  };
}

/** The other provider, when it has a stored key. Never throws: a failed lookup just means no switch button. */
async function switchOptionFor(sessionId: number | null): Promise<Provider | undefined> {
  if (sessionId === null) return undefined;
  try {
    const db = await getDb();
    const rows = await db.select<{ provider: string }[]>(
      'SELECT provider FROM counselor_session WHERE id = $1',
      [sessionId],
    );
    const current = rows[0]?.provider;
    if (current !== 'openrouter' && current !== 'opencode') return undefined;
    const other = otherProvider(current);
    const key = await getSecret(other);
    return key?.trim() ? other : undefined;
  } catch {
    return undefined;
  }
}

async function failureFrom(
  err: unknown,
  scope: CounselorError['scope'],
  sessionId: number | null,
): Promise<CounselorError> {
  const base = errorFrom(err, scope);
  if (base.missingKey) return base;
  const switchTo = await switchOptionFor(sessionId);
  return switchTo ? { ...base, switchTo } : base;
}

/**
 * Points the session at the provider the user chose in Settings, so it applies to the existing chat.
 * Only switches when the chosen provider has a key; otherwise the session keeps its provider.
 */
async function syncSessionProvider(sessionId: number): Promise<void> {
  const setting = await getSetting('default_provider');
  const [openrouter, opencode] = await Promise.all([getSecret('openrouter'), getSecret('opencode')]);
  const provider = chooseSessionProvider(setting, (p) =>
    Boolean((p === 'openrouter' ? openrouter : opencode)?.trim()),
  );
  if (!provider) return;
  const db = await getDb();
  await db.execute('UPDATE counselor_session SET provider = $1 WHERE id = $2', [provider, sessionId]);
}

let persistence: Promise<SqlCounselorStore> | null = null;
function store(): Promise<SqlCounselorStore> {
  persistence ??= createTauriSqlClient().then((sql) => new SqlCounselorStore(sql));
  return persistence;
}

async function countStudentMessages(sessionId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM counselor_message WHERE session_id = $1 AND role = 'user'",
    [sessionId],
  );
  return Number(rows[0]?.n ?? 0);
}

/**
 * The core stores the student's message before the AI call, so a failed call leaves it in the DB.
 * Resending it unchanged would store it twice. If the newest stored row is that same user message,
 * delete it so the retry stores it once. If the failure came before the write, the newest row is
 * an assistant reply (or another text) and nothing is deleted.
 */
async function dropUnsentDuplicate(sessionId: number, encoded: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ id: number; role: string; content: string }[]>(
    'SELECT id, role, content FROM counselor_message WHERE session_id = $1 ORDER BY id DESC LIMIT 1',
    [sessionId],
  );
  const last = rows[0];
  if (!last || last.role !== 'user' || last.content !== encoded) return;
  await db.execute('DELETE FROM counselor_message WHERE id = $1', [last.id]);
}

async function ensureSession(): Promise<number> {
  const existing = useCounselor.getState().sessionId;
  if (existing !== null) return existing;
  const { sessionId } = await useCore().counselor.start();
  useCounselor.setState({ sessionId });
  return sessionId;
}

/** Notes updates run one at a time, in order. A failure is logged and ignored: it never blocks the chat. */
let notesChain: Promise<void> = Promise.resolve();
function refreshNotes(sessionId: number): void {
  notesChain = notesChain.then(async () => {
    try {
      const notes = await useCore().counselor.updateNotes(sessionId);
      if (notes && useCounselor.getState().sessionId === sessionId) useCounselor.setState({ notes });
    } catch (err) {
      console.warn('Counselor notes were not updated:', err instanceof Error ? err.message : err);
    }
  });
}

/** Streams one exchange with the AI and records what it means for the intake. */
async function runSend(pending: Pending): Promise<void> {
  const counselorId = uid();
  useCounselor.setState((s) => ({
    status: 'sending',
    pending,
    error: null,
    messages: [...s.messages, { id: counselorId, role: 'counselor', text: '', streaming: true }],
  }));

  try {
    const sessionId = await ensureSession();
    await syncSessionProvider(sessionId);
    let raw = '';
    const reply = await useCore().counselor.send(sessionId, pending.encoded, (token) => {
      raw += token;
      const text = visibleReply(raw);
      useCounselor.setState((s) => ({
        messages: s.messages.map((m) => (m.id === counselorId ? { ...m, text } : m)),
      }));
    });

    useCounselor.setState((s) => {
      const outcome = intakeOutcome(pending, reply, s.intakeStep);
      const messages = s.messages.flatMap((m) => {
        if (m.id !== counselorId) return [m];
        return outcome.text ? [{ ...m, text: outcome.text, streaming: false }] : [];
      });
      if (outcome.fallbackQuestion !== null) messages.push(questionBubble(outcome.fallbackQuestion));
      return {
        messages,
        intakeStep: outcome.intakeStep,
        followUp: outcome.followUp,
        status: 'idle' as const,
        pending: null,
      };
    });
    refreshNotes(sessionId);
  } catch (err) {
    const failure = await failureFrom(err, 'chat', useCounselor.getState().sessionId);
    useCounselor.setState((s) => ({
      status: 'idle',
      error: failure,
      messages: s.messages.flatMap((m) => {
        if (m.id !== counselorId) return [m];
        if (m.text === '') return [];
        return [{ ...m, streaming: false }];
      }),
    }));
  } finally {
    // The core stores the student's message before the AI call, so the DB count is the truth.
    const sessionId = useCounselor.getState().sessionId;
    if (sessionId !== null) {
      const studentCount = await countStudentMessages(sessionId);
      useCounselor.setState({ studentCount });
    }
  }
}

export const useCounselor = create<CounselorState>((set, get) => ({
  sessionId: null,
  messages: [],
  intakeStep: 1,
  followUp: false,
  studentCount: 0,
  weights: DEFAULT_WEIGHTS,
  careers: [],
  notes: null,
  latestBatchIds: null,
  status: 'idle',
  error: null,
  pending: null,
  loaded: false,

  ensureLoaded() {
    if (get().loaded) return Promise.resolve();
    loadPromise ??= loadLatest().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  },

  async sendAnswer(raw) {
    const text = raw.trim();
    const { status, intakeStep, followUp } = get();
    if (!text || status !== 'idle') return;

    const intakeN = intakeStep <= INTAKE_TOTAL ? intakeStep : null;
    const asFollowUp = intakeN !== null && followUp;
    const encoded =
      intakeN === null
        ? text
        : encodeIntake(intakeN, questionText(intakeN), text, {
            followUp: asFollowUp,
            nextTopic: intakeN < INTAKE_TOTAL ? questionText(intakeN + 1) : null,
          });
    set((s) => ({
      error: null,
      pending: null,
      messages: [...s.messages, { id: uid(), role: 'student', text }],
    }));
    await runSend({ encoded, intakeN, followUp: asFollowUp });
  },

  async retry() {
    const { error, pending, status, sessionId } = get();
    if (status !== 'idle' || !error) return;
    if (error.scope === 'careers') return get().generateCareers();
    if (error.scope === 'chat' && pending) {
      try {
        if (sessionId !== null) await dropUnsentDuplicate(sessionId, pending.encoded);
      } catch (err) {
        set({ error: errorFrom(err, 'chat') });
        return;
      }
      return runSend(pending);
    }
  },

  async switchProviderAndRetry() {
    const { error } = get();
    if (!error?.switchTo) return;
    try {
      await setSetting('default_provider', error.switchTo);
    } catch (err) {
      set({ error: errorFrom(err, error.scope) });
      return;
    }
    // retry() resends through runSend or generateCareers, which sync the session provider first.
    await get().retry();
  },

  async generateCareers() {
    const { sessionId, status, studentCount, weights } = get();
    if (sessionId === null || status !== 'idle' || studentCount < CAREER_IDEAS_MIN_STUDENT_MESSAGES) return;

    set({ status: 'thinking-careers', error: null });
    try {
      await syncSessionProvider(sessionId);
      const fresh = await useCore().counselor.careers(sessionId, weights);
      const ids = fresh.map((career) => career.id);
      writeLatestBatch(sessionId, ids);
      set((s) => ({ careers: [...s.careers, ...fresh], latestBatchIds: ids, status: 'idle' }));
    } catch (err) {
      const failure = await failureFrom(err, 'careers', sessionId);
      set({ status: 'idle', error: failure });
    }
  },

  async toggleSaved(careerId) {
    const career = get().careers.find((c) => c.id === careerId);
    if (!career) return;
    const saved = !career.saved;
    try {
      await (await store()).setCareerSaved(careerId, saved);
      set((s) => ({
        careers: s.careers.map((c) => (c.id === careerId ? { ...c, saved } : c)),
      }));
    } catch (err) {
      set({ error: errorFrom(err, 'save') });
    }
  },

  setWeight(dimension, value) {
    set((s) => ({ weights: { ...s.weights, [dimension]: value } }));
  },

  async reset() {
    const { sessionId, status } = get();
    if (status !== 'idle') return;
    if (sessionId !== null) {
      // No store method closes a session; mark it so the next launch does not resume it.
      const db = await getDb();
      await db.execute("UPDATE counselor_session SET status = 'closed' WHERE id = $1", [sessionId]);
    }
    set({
      sessionId: null,
      messages: [questionBubble(1)],
      intakeStep: 1,
      followUp: false,
      studentCount: 0,
      careers: [],
      notes: null,
      latestBatchIds: null,
      error: null,
      pending: null,
    });
    clearLatestBatch();
  },
}));

let loadPromise: Promise<void> | null = null;

/** Forgets the counselor on this screen (used when all local data is deleted). */
export function resetCounselorState(): void {
  clearLatestBatch();
  useCounselor.setState({
    sessionId: null,
    messages: [],
    intakeStep: 1,
    followUp: false,
    studentCount: 0,
    weights: DEFAULT_WEIGHTS,
    careers: [],
    notes: null,
    latestBatchIds: null,
    status: 'idle',
    error: null,
    pending: null,
    loaded: false,
  });
}

/** Resumes the newest active session that has messages; otherwise shows question 1 and waits for an answer. */
async function loadLatest(): Promise<void> {
  const profileState = useProfile.getState();
  if (!profileState.loaded) await profileState.load();
  // Without a profile the screen shows an empty state; stay unloaded so a later visit re-checks.
  if (!useProfile.getState().profile) return;

  const db = await getDb();
  const rows = await db.select<{ id: number }[]>(
    "SELECT id FROM counselor_session WHERE status = 'active' ORDER BY id DESC LIMIT 1",
  );
  const sessionId = rows[0] ? Number(rows[0].id) : null;
  if (sessionId === null) {
    useCounselor.setState({ loaded: true, sessionId: null, messages: [questionBubble(1)], intakeStep: 1, followUp: false, studentCount: 0, notes: null });
    return;
  }

  const persisted = await store();
  const stored = await persisted.listMessages(sessionId);
  if (stored.length === 0) {
    useCounselor.setState({ loaded: true, sessionId: null, messages: [questionBubble(1)], intakeStep: 1, followUp: false, studentCount: 0, notes: null });
    return;
  }

  const session = await persisted.getSession(sessionId);
  const careers = await persisted.listCareers(sessionId);
  const notes = await persisted.getNotes(sessionId).catch(() => null);
  const rebuilt = rebuildConversation(stored, questionText);
  const messages: ChatMessage[] = rebuilt.entries.map((entry) => ({ id: uid(), ...entry }));
  // The student's last message never got a reply: keep it, and offer to resend it.
  const unanswered = rebuilt.unanswered;
  useCounselor.setState({
    loaded: true,
    sessionId,
    messages,
    intakeStep: rebuilt.intakeStep,
    followUp: rebuilt.followUp,
    studentCount: stored.filter((m) => m.role === 'user').length,
    weights: session?.weights ?? DEFAULT_WEIGHTS,
    careers,
    notes,
    latestBatchIds: readLatestBatch(sessionId),
    pending: unanswered,
    error: unanswered
      ? { scope: 'chat', missingKey: false, message: tc('errors.noReply') }
      : null,
  });
}
