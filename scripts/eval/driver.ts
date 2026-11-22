import en from '../../src/i18n/locales/en/counselor.json';
import es from '../../src/i18n/locales/es/counselor.json';
import vi from '../../src/i18n/locales/vi/counselor.json';
import type { UiLang } from '../../src/core/contracts';
import { readReplyTag, stripReplyTags, type ReplyTag } from '../../src/core/counselor/replyTag';
import { encodeIntake, intakeOutcome, INTAKE_TOTAL } from '../../src/ui/screens/counselor/intake';

const LOCALES: Record<UiLang, { intake: Record<string, string> }> = { en, es, vi };

/** The app's intake question n in the student's UI language, with the name filled in. */
export function intakeQuestion(uiLang: UiLang, n: number, name: string): string {
  return (LOCALES[uiLang].intake[`q${n}`] ?? '').replace('{{name}}', name);
}

export interface DriverState {
  /** 1..6 = intake topic awaiting an answer; 7 = free chat. */
  intakeStep: number;
  followUp: boolean;
}

export const initialDriverState: DriverState = { intakeStep: 1, followUp: false };

export interface DriverTurn {
  encoded: string;
  intakeN: number | null;
  followUp: boolean;
  expectQuestion: boolean;
  expectTag: boolean;
}

export interface DriverReply {
  state: DriverState;
  /** The reply as the student sees it. */
  visible: string;
  /** A question the app shows itself after the reply, or null. */
  appQuestion: string | null;
  tag: ReplyTag | null;
}

export function nextTurn(state: DriverState, answer: string, question: (n: number) => string): DriverTurn {
  const intakeN = state.intakeStep <= INTAKE_TOTAL ? state.intakeStep : null;
  const followUp = intakeN !== null && state.followUp;
  const encoded =
    intakeN === null
      ? answer
      : encodeIntake(intakeN, question(intakeN), answer, {
          followUp,
          nextTopic: intakeN < INTAKE_TOTAL ? question(intakeN + 1) : null,
        });
  return { encoded, intakeN, followUp, expectQuestion: true, expectTag: intakeN !== null };
}

export function afterReply(
  state: DriverState,
  turn: DriverTurn,
  raw: string,
  question: (n: number) => string,
): DriverReply {
  const tag = readReplyTag(raw);
  if (turn.intakeN === null) return { state, visible: stripReplyTags(raw), appQuestion: null, tag };
  const outcome = intakeOutcome({ intakeN: turn.intakeN, followUp: turn.followUp }, raw, state.intakeStep);
  return {
    state: { intakeStep: outcome.intakeStep, followUp: outcome.followUp },
    visible: outcome.text,
    appQuestion: outcome.fallbackQuestion === null ? null : question(outcome.fallbackQuestion),
    tag,
  };
}
