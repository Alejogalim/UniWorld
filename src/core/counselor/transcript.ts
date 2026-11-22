import type { StoredMessage } from '../ports';
import { stripReplyTags } from './replyTag';

const FRAME_HEAD = /^\[intake (\d)\/6( follow-up)?\] (Question|Topic): "/;
const ANSWER = '\nAnswer: ';

export interface StudentTurn {
  answer: string;
  /** The question the app showed itself before this answer (it is never stored as a message), or null. */
  appQuestion: string | null;
}

/** Unwraps an intake frame (plans 05 and 29) into the student's own words; plain messages pass through. */
export function readStudentMessage(content: string): StudentTurn {
  const head = FRAME_HEAD.exec(content);
  const answerAt = content.indexOf(ANSWER);
  const closingAt = content.lastIndexOf('\n(');
  if (!head || answerAt < 0 || closingAt <= answerAt) return { answer: content.trim(), appQuestion: null };
  const question = content.slice(head[0].length, answerAt - 1);
  const answer = content.slice(answerAt + ANSWER.length, closingAt).trim();
  const legacy = head[3] === 'Question';
  const firstTopic = head[1] === '1' && head[2] === undefined;
  return { answer, appQuestion: legacy || firstTopic ? question : null };
}

/** "Student: …" / "Counselor: …" lines without intake frames or control tags. */
export function buildTranscript(messages: StoredMessage[]): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (message.role === 'assistant') {
      lines.push(`Counselor: ${stripReplyTags(message.content)}`);
      continue;
    }
    const turn = readStudentMessage(message.content);
    if (turn.appQuestion) lines.push(`Counselor: ${turn.appQuestion}`);
    lines.push(`Student: ${turn.answer}`);
  }
  return lines.join('\n');
}
