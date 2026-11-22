import { readReplyTag, stripReplyTags } from '../../../core/counselor/replyTag';

/** The six intake topics (plan 29). Their standard questions live in the `counselor` namespace as intake.q1..q6. */
export const INTAKE_TOTAL = 6;

export interface IntakeFrame {
  n: number;
  /** v2: the topic's standard question. v1 (sessions saved before plan 29): the question the app asked. */
  question: string;
  answer: string;
  /** True when this answers the topic's one follow-up. Always false for v1. */
  followUp: boolean;
  version: 1 | 2;
}

const FRAME_START = /^\[intake (\d)\/6( follow-up)?\] (Question|Topic): "/;
const FRAME_END =
  /"\nAnswer: ([\s\S]*)\n\((?:Reply with one short sentence[^\n]*|That was the last intake question[^\n]*|Follow-up allowed: (?:yes|no)\. Next topic: [^\n]*)\)$/;

/**
 * Wraps a student's intake answer in the frame the counselor prompt expects (v2).
 * The frame is sent to the AI only; the chat shows the bare answer.
 */
export function encodeIntake(
  n: number,
  topic: string,
  answer: string,
  options: { followUp: boolean; nextTopic: string | null },
): string {
  const head = `[intake ${n}/${INTAKE_TOTAL}${options.followUp ? ' follow-up' : ''}] Topic: "${topic}"`;
  const next = options.nextTopic === null ? 'none, this was the last intake topic.' : `"${options.nextTopic}"`;
  return `${head}\nAnswer: ${answer}\n(Follow-up allowed: ${options.followUp ? 'no' : 'yes'}. Next topic: ${next})`;
}

/** Reads a framed intake message (v1 or v2) back; null for anything else. */
export function decodeIntake(text: string): IntakeFrame | null {
  const head = FRAME_START.exec(text);
  if (!head) return null;
  const n = Number(head[1]);
  if (n < 1 || n > INTAKE_TOTAL) return null;
  const version = head[3] === 'Topic' ? 2 : 1;
  const followUp = head[2] !== undefined;
  if (version === 1 && followUp) return null;

  const rest = text.slice(head[0].length);
  const questionEnd = rest.indexOf('"\nAnswer: ');
  if (questionEnd < 0) return null;
  const question = rest.slice(0, questionEnd);

  const tail = FRAME_END.exec(rest.slice(questionEnd));
  if (!tail) return null;
  return { n, question, answer: tail[1] ?? '', followUp, version };
}

export interface IntakeOutcome {
  /** The reply as the student sees it (tags removed). */
  text: string;
  intakeStep: number;
  /** True when the question now awaiting an answer is the topic's follow-up. */
  followUp: boolean;
  /** Topic whose standard question the app shows itself because the reply asked none; null otherwise. */
  fallbackQuestion: number | null;
}

/** What a counselor reply means for the intake (see the table in plan 29). */
export function intakeOutcome(
  pending: { intakeN: number | null; followUp: boolean },
  raw: string,
  currentStep: number,
): IntakeOutcome {
  const text = stripReplyTags(raw);
  const n = pending.intakeN;
  if (n === null) return { text, intakeStep: currentStep, followUp: false, fallbackQuestion: null };

  const asks = text.includes('?');
  const tag = readReplyTag(raw);
  if (text && tag === 'follow' && !asks) {
    return { text, intakeStep: n, followUp: pending.followUp, fallbackQuestion: null };
  }
  if (text && tag === 'follow' && !pending.followUp) {
    return { text, intakeStep: n, followUp: true, fallbackQuestion: null };
  }
  return {
    text,
    intakeStep: n + 1,
    followUp: false,
    fallbackQuestion: n < INTAKE_TOTAL && !asks ? n + 1 : null,
  };
}

export interface StoredTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface RebuiltEntry {
  role: 'counselor' | 'student';
  text: string;
  local?: boolean;
}

export interface UnansweredTurn {
  encoded: string;
  intakeN: number | null;
  followUp: boolean;
}

export interface RebuiltConversation {
  entries: RebuiltEntry[];
  intakeStep: number;
  followUp: boolean;
  /** The last student message when it never got a reply. */
  unanswered: UnansweredTurn | null;
}

/** Rebuilds the visible chat and the intake state from stored messages (v1 and v2 frames). */
export function rebuildConversation(
  stored: StoredTurn[],
  fallbackQuestion: (n: number) => string,
): RebuiltConversation {
  const frames = stored.map((m) => (m.role === 'user' ? decodeIntake(m.content) : null));
  // The question the app showed for topic k: the one saved in its frame, else today's text.
  const questionFor = (k: number): string =>
    frames.find((f) => f !== null && f.n === k && !f.followUp)?.question ?? fallbackQuestion(k);

  const entries: RebuiltEntry[] = [{ role: 'counselor', text: questionFor(1), local: true }];
  let intakeStep = 1;
  let followUp = false;
  let last: (UnansweredTurn & { version: 1 | 2 | null }) | null = null;

  for (const [i, m] of stored.entries()) {
    if (m.role === 'user') {
      const frame = frames[i] ?? null;
      entries.push({ role: 'student', text: frame ? frame.answer : m.content });
      last = {
        encoded: m.content,
        intakeN: frame?.n ?? null,
        followUp: frame?.followUp ?? false,
        version: frame?.version ?? null,
      };
      if (frame) {
        intakeStep = frame.n;
        followUp = frame.followUp;
      }
      continue;
    }

    const prev = last as (UnansweredTurn & { version: 1 | 2 | null }) | null;
    if (prev && prev.intakeN !== null && prev.version === 1) {
      entries.push({ role: 'counselor', text: m.content });
      if (prev.intakeN < INTAKE_TOTAL) {
        entries.push({ role: 'counselor', text: questionFor(prev.intakeN + 1), local: true });
        intakeStep = prev.intakeN + 1;
      } else {
        intakeStep = INTAKE_TOTAL + 1;
      }
      followUp = false;
    } else if (prev && prev.intakeN !== null) {
      const outcome = intakeOutcome(prev, m.content, intakeStep);
      if (outcome.text) entries.push({ role: 'counselor', text: outcome.text });
      if (outcome.fallbackQuestion !== null) {
        entries.push({ role: 'counselor', text: questionFor(outcome.fallbackQuestion), local: true });
      }
      intakeStep = outcome.intakeStep;
      followUp = outcome.followUp;
    } else {
      entries.push({ role: 'counselor', text: stripReplyTags(m.content) });
    }
    last = null;
  }

  const open = last as (UnansweredTurn & { version: 1 | 2 | null }) | null;
  const unanswered = open ? { encoded: open.encoded, intakeN: open.intakeN, followUp: open.followUp } : null;
  return { entries, intakeStep, followUp, unanswered };
}
