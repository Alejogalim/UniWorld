import { create } from 'zustand';
import i18n from 'i18next';
import { useCore } from '@/app/useCore';
import {
  CAREER_IDEAS_MIN_STUDENT_MESSAGES,
  MissingKeyError,
  type CareerPath,
  type CounselorWeights,
} from '@/core';
import { createTauriSqlClient } from '@/core/adapters/tauri';
import { getDb } from '@/db/client';
import { SqlCounselorStore } from '@/store/counselor';
import { useProfile } from '@/store/profile';
import { decodeIntake, encodeIntake, INTAKE_TOTAL } from './intake';

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
}

/** The last student text that did not get a reply, so "Try again" can resend it unchanged. */
interface Pending {
  encoded: string;
  intakeN: number | null;
}

export const DEFAULT_WEIGHTS: CounselorWeights = { passions: 5, strengths: 5, goals: 5, earning: 5 };

interface CounselorState {
  sessionId: number | null;
  messages: ChatMessage[];
  /** 1..6 = the intake question awaiting an answer; 7 = intake done (free-form chat). */
  intakeStep: number;
  studentCount: number;
  weights: CounselorWeights;
  careers: CareerPath[];
  status: CounselorStatus;
  error: CounselorError | null;
  pending: Pending | null;
  loaded: boolean;
  ensureLoaded(): Promise<void>;
  sendAnswer(text: string): Promise<void>;
  retry(): Promise<void>;
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

async function ensureSession(): Promise<number> {
  const existing = useCounselor.getState().sessionId;
  if (existing !== null) return existing;
  const { sessionId } = await useCore().counselor.start();
  useCounselor.setState({ sessionId });
  return sessionId;
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
    const reply = await useCore().counselor.send(sessionId, pending.encoded, (token) => {
      useCounselor.setState((s) => ({
        messages: s.messages.map((m) => (m.id === counselorId ? { ...m, text: m.text + token } : m)),
      }));
    });

    useCounselor.setState((s) => {
      const messages = s.messages.map((m) =>
        m.id === counselorId ? { ...m, text: reply, streaming: false } : m,
      );
      let intakeStep = s.intakeStep;
      if (pending.intakeN !== null) {
        if (pending.intakeN < INTAKE_TOTAL) {
          messages.push(questionBubble(pending.intakeN + 1));
          intakeStep = pending.intakeN + 1;
        } else {
          intakeStep = INTAKE_TOTAL + 1;
        }
      }
      return { messages, intakeStep, status: 'idle', pending: null };
    });
  } catch (err) {
    useCounselor.setState((s) => ({
      status: 'idle',
      error: errorFrom(err, 'chat'),
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
  studentCount: 0,
  weights: DEFAULT_WEIGHTS,
  careers: [],
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
    const { status, intakeStep } = get();
    if (!text || status !== 'idle') return;

    const intakeN = intakeStep <= INTAKE_TOTAL ? intakeStep : null;
    const encoded = intakeN === null ? text : encodeIntake(intakeN, questionText(intakeN), text);
    set((s) => ({
      error: null,
      pending: null,
      messages: [...s.messages, { id: uid(), role: 'student', text }],
    }));
    await runSend({ encoded, intakeN });
  },

  async retry() {
    const { error, pending, status } = get();
    if (status !== 'idle' || !error) return;
    if (error.scope === 'careers') return get().generateCareers();
    if (error.scope === 'chat' && pending) return runSend(pending);
  },

  async generateCareers() {
    const { sessionId, status, studentCount, weights } = get();
    if (sessionId === null || status !== 'idle' || studentCount < CAREER_IDEAS_MIN_STUDENT_MESSAGES) return;

    set({ status: 'thinking-careers', error: null });
    try {
      const fresh = await useCore().counselor.careers(sessionId, weights);
      set((s) => ({ careers: [...s.careers, ...fresh], status: 'idle' }));
    } catch (err) {
      set({ status: 'idle', error: errorFrom(err, 'careers') });
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
      studentCount: 0,
      careers: [],
      error: null,
      pending: null,
    });
  },
}));

let loadPromise: Promise<void> | null = null;

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
    useCounselor.setState({ loaded: true, sessionId: null, messages: [questionBubble(1)], intakeStep: 1, studentCount: 0 });
    return;
  }

  const persisted = await store();
  const stored = await persisted.listMessages(sessionId);
  if (stored.length === 0) {
    useCounselor.setState({ loaded: true, sessionId: null, messages: [questionBubble(1)], intakeStep: 1, studentCount: 0 });
    return;
  }

  const session = await persisted.getSession(sessionId);
  const careers = await persisted.listCareers(sessionId);
  const messages: ChatMessage[] = [questionBubble(1)];
  let intakeStep = 1;
  let last: Pending | null = null;

  for (const m of stored) {
    if (m.role === 'user') {
      const intake = decodeIntake(m.content);
      messages.push({ id: uid(), role: 'student', text: intake ? intake.answer : m.content });
      last = { encoded: m.content, intakeN: intake?.n ?? null };
      if (intake) intakeStep = intake.n;
      continue;
    }
    messages.push({ id: uid(), role: 'counselor', text: m.content });
    if (last?.intakeN != null) {
      const n = last.intakeN;
      if (n < INTAKE_TOTAL) {
        messages.push(questionBubble(n + 1));
        intakeStep = n + 1;
      } else {
        intakeStep = INTAKE_TOTAL + 1;
      }
    }
    last = null;
  }

  // The student's last message never got a reply: keep it, and offer to resend it.
  const unanswered = last as Pending | null;
  useCounselor.setState({
    loaded: true,
    sessionId,
    messages,
    intakeStep,
    studentCount: stored.filter((m) => m.role === 'user').length,
    weights: session?.weights ?? DEFAULT_WEIGHTS,
    careers,
    pending: unanswered,
    error: unanswered
      ? { scope: 'chat', missingKey: false, message: tc('errors.noReply') }
      : null,
  });
}
