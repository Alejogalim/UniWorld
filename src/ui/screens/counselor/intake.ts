/** The six fixed intake questions (Design §7.2). Question text lives in the `counselor` namespace. */
export const INTAKE_TOTAL = 6;

const FRAME_START = /^\[intake (\d)\/6\] Question: "/;
const FRAME_END =
  /"\nAnswer: ([\s\S]*)\n\((?:Reply with one short sentence[^\n]*|That was the last intake question[^\n]*)\)$/;

/**
 * Wraps a student's intake answer in the frame the counselor prompt expects.
 * The frame is sent to the AI only; the chat shows the bare answer.
 */
export function encodeIntake(n: number, question: string, answer: string): string {
  const closing =
    n >= INTAKE_TOTAL
      ? "(That was the last intake question. Reflect briefly, then ask your first follow-up question.)"
      : "(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)";
  return `[intake ${n}/${INTAKE_TOTAL}] Question: "${question}"\nAnswer: ${answer}\n${closing}`;
}

/** Reads a framed intake message back into its number, question and answer; null for anything else. */
export function decodeIntake(text: string): { n: number; question: string; answer: string } | null {
  const head = FRAME_START.exec(text);
  if (!head) return null;
  const n = Number(head[1]);
  if (n < 1 || n > INTAKE_TOTAL) return null;

  const rest = text.slice(head[0].length);
  const questionEnd = rest.indexOf('"\nAnswer: ');
  if (questionEnd < 0) return null;
  const question = rest.slice(0, questionEnd);

  const tail = FRAME_END.exec(rest.slice(questionEnd));
  if (!tail) return null;
  return { n, question, answer: tail[1] };
}
