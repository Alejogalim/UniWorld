import type { CareerPath, CounselorWeights, Provider } from '../contracts';
import { callJson } from '../ai/json';
import { counselorProvider, createAiClient } from '../ai/index';
import { careersPrompt, counselorSystemPrompt } from '../ai/prompts';
import type { ChatMessage } from '../ai/types';
import { CAREER_IDEAS_MIN_STUDENT_MESSAGES } from '../config';
import type { CoreDeps, CounselorPersistence } from '../ports';
import { careerIdeasSchema } from '../schemas';
import { toCareerPaths } from './careers';

const MAX_HISTORY = 40;

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
    const messages: ChatMessage[] = [
      { role: 'system', content: counselorSystemPrompt(profile, { studentAnswers }) },
      ...stored.slice(-MAX_HISTORY).map((message) => ({ role: message.role, content: message.content })),
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

    const transcript = messages
      .map((message) => `${message.role === 'user' ? 'Student' : 'Counselor'}: ${message.content}`)
      .join('\n');

    const client = await createAiClient(session.provider, this.deps, { sessionId });
    const parsed = await callJson({
      schema: careerIdeasSchema,
      messages: careersPrompt(profile, transcript, weights),
      complete: (request) =>
        client.chat(request, { json: true, temperature: 0.4, maxTokens: 2500 }),
      logger: this.deps.logger,
    });

    const careers = toCareerPaths(parsed, weights);
    return this.store.saveCareers(sessionId, careers);
  }
}
