import type { CareerPath, CounselorNotes, CounselorWeights, Provider } from '../contracts';
import { callJson } from '../ai/json';
import { counselorProvider, createAiClient } from '../ai/index';
import { careersPrompt, counselorSystemPrompt, notesPrompt } from '../ai/prompts';
import type { ChatMessage } from '../ai/types';
import { CAREER_IDEAS_MIN_STUDENT_MESSAGES, NOTES_MAX_TOKENS, NOTES_RECENT_MESSAGES } from '../config';
import type { CoreDeps, CounselorPersistence } from '../ports';
import { careerIdeasSchema, counselorNotesSchema } from '../schemas';
import { toCareerPaths } from './careers';
import { buildTranscript } from './transcript';

const MAX_HISTORY = 40;

/** The last `max` stored turns, minus any leading assistant turns, so the model's history starts with the student. */
export function recentTurns<T extends { role: string }>(messages: T[], max = MAX_HISTORY): T[] {
  const recent = messages.slice(-max);
  let start = 0;
  while (start < recent.length && recent[start]!.role === 'assistant') start++;
  return recent.slice(start);
}

export class Counselor {
  constructor(
    private readonly deps: CoreDeps,
    private readonly store: CounselorPersistence,
  ) {}

  async start(weights?: CounselorWeights | null): Promise<{ sessionId: number }> {
    const provider: Provider = await counselorProvider(this.deps);
    const sessionId = await this.store.createSession(provider, weights ?? null);
    return { sessionId };
  }

  private async profile() {
    const profile = await this.deps.profile.get();
    if (!profile) throw new Error('Complete onboarding before talking to the counselor.');
    return profile;
  }

  /** Notes only help: a failed read (e.g. migration 004 missing) never blocks the chat or the career ideas. */
  private async notesOrNull(sessionId: number): Promise<CounselorNotes | null> {
    try {
      return await this.store.getNotes(sessionId);
    } catch {
      return null;
    }
  }

  async send(
    sessionId: number,
    text: string,
    onToken?: (token: string) => void,
  ): Promise<string> {
    const session = await this.store.getSession(sessionId);
    if (!session) throw new Error(`Unknown counselor session: ${sessionId}`);
    const profile = await this.profile();

    await this.store.addMessage(sessionId, { role: 'user', content: text });
    const client = await createAiClient(session.provider, this.deps, { sessionId });
    const stored = await this.store.listMessages(sessionId);
    const studentAnswers = stored.filter((message) => message.role === 'user').length;
    const notes = await this.notesOrNull(sessionId);
    const messages: ChatMessage[] = [
      { role: 'system', content: counselorSystemPrompt(profile, { studentAnswers, notes }) },
      ...recentTurns(stored).map((message) => ({ role: message.role, content: message.content })),
    ];

    const reply = await client.stream(messages, {
      temperature: 0.7,
      maxTokens: 500,
      onToken,
    });
    const trimmed = reply.trim();
    await this.store.addMessage(sessionId, { role: 'assistant', content: trimmed });
    return trimmed;
  }

  async careers(sessionId: number, weights: CounselorWeights): Promise<CareerPath[]> {
    const session = await this.store.getSession(sessionId);
    if (!session) throw new Error(`Unknown counselor session: ${sessionId}`);
    const profile = await this.profile();
    await this.store.setWeights(sessionId, weights);

    const messages = await this.store.listMessages(sessionId);
    const studentMessages = messages.filter((message) => message.role === 'user');
    if (studentMessages.length < CAREER_IDEAS_MIN_STUDENT_MESSAGES) {
      throw new Error('Keep chatting a little longer before generating career ideas.');
    }

    const transcript = buildTranscript(messages);
    const notes = await this.notesOrNull(sessionId);

    const client = await createAiClient(session.provider, this.deps, { sessionId });
    const parsed = await callJson({
      schema: careerIdeasSchema,
      messages: careersPrompt(profile, transcript, weights, notes),
      complete: (request) =>
        client.chat(request, { json: true, temperature: 0.4, maxTokens: 2500 }),
      logger: this.deps.logger,
    });

    const careers = toCareerPaths(parsed, weights);
    return this.store.saveCareers(sessionId, careers);
  }

  /** Refreshes the running "what we know" notes from the latest messages: one small JSON call, no retry. */
  async updateNotes(sessionId: number): Promise<CounselorNotes | null> {
    const session = await this.store.getSession(sessionId);
    if (!session) throw new Error(`Unknown counselor session: ${sessionId}`);
    const messages = await this.store.listMessages(sessionId);
    if (!messages.some((message) => message.role === 'user')) return null;
    const profile = await this.profile();
    const previous = await this.notesOrNull(sessionId);

    const client = await createAiClient(session.provider, this.deps, { sessionId });
    const notes = await callJson({
      schema: counselorNotesSchema,
      messages: notesPrompt(profile, previous, buildTranscript(messages.slice(-NOTES_RECENT_MESSAGES))),
      complete: (request) =>
        client.chat(request, { json: true, temperature: 0.1, maxTokens: NOTES_MAX_TOKENS }),
      retries: 0,
      logger: this.deps.logger,
    });
    await this.store.setNotes(sessionId, notes);
    return notes;
  }
}
