import { describe, expect, it } from 'bun:test';
import type { CounselorNotes, Profile, Provider } from '../contracts';
import { StaticProfile, StaticSettings } from '../adapters/env';
import { InMemoryCounselorStore } from '../adapters/memory';
import type { HttpClient, HttpRequestInit, HttpResponseLike } from '../ports';
import { Counselor } from './index';

const profile: Profile = {
  name: 'Ana',
  primaryLang: 'en',
  uiLang: 'en',
  languages: [{ lang: 'en', level: 'C1' }],
  program: 'IB',
};

const careersJson = JSON.stringify({
  careers: [
    {
      title: 'Software engineer',
      summary: 'Build software products for people.',
      whyYou: 'You said you enjoy solving problems and making things.',
      degreeKeywords: ['Computer Science'],
      scores: { passions: 9, strengths: 8, goals: 8, earning: 8 },
    },
    {
      title: 'Product designer',
      summary: 'Design products that people use.',
      whyYou: 'You said you like making things and helping people.',
      degreeKeywords: ['Design'],
      scores: { passions: 8, strengths: 8, goals: 7, earning: 6 },
    },
    {
      title: 'Data analyst',
      summary: 'Find patterns in data.',
      whyYou: 'You said you enjoy patterns and problem solving.',
      degreeKeywords: ['Data Science'],
      scores: { passions: 7, strengths: 8, goals: 8, earning: 7 },
    },
  ],
});

const notesJson = JSON.stringify({
  interests: ['builds robots', 'b', 'c', 'd', 'e', 'f'],
  strengths: ['fixes things'],
  values: null,
  workStyle: [],
  limits: [],
  gaps: ['values', 'money'],
});

class FakeHttp implements HttpClient {
  calls = 0;
  systems: string[] = [];
  requests: { system: string; user: string }[] = [];

  async fetch(_url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.calls++;
    const body = JSON.parse(init?.body ?? '{}') as {
      messages?: { role: string; content: string }[];
    };
    const system = body.messages?.[0]?.content ?? '';
    this.systems.push(system);
    this.requests.push({ system, user: body.messages?.at(-1)?.content ?? '' });
    const content = system.includes('career synthesizer')
      ? careersJson
      : system.includes('counselor note-taker')
        ? notesJson
        : 'That sounds meaningful. What draws you to it?';
    const payload = JSON.stringify({ choices: [{ message: { content } }] });
    return {
      ok: true,
      status: 200,
      text: async () => payload,
      json: async () => JSON.parse(payload) as unknown,
    };
  }
}

function deps(http: FakeHttp, store: InMemoryCounselorStore) {
  return {
    http,
    secrets: {
      get: async (provider: Provider) => (provider === 'openrouter' ? 'test-key' : null),
    },
    settings: new StaticSettings('test-model'),
    profile: new StaticProfile(profile),
    counselorStore: store,
  };
}

describe('Counselor', () => {
  it('starts a session with the preferred provider', async () => {
    const store = new InMemoryCounselorStore();
    const counselor = new Counselor(deps(new FakeHttp(), store), store);
    const { sessionId } = await counselor.start();
    expect(sessionId).toBe(1);
    expect((await store.getSession(sessionId))?.provider).toBe('openrouter');
  });

  it('persists the student message and the assistant reply', async () => {
    const store = new InMemoryCounselorStore();
    const counselor = new Counselor(deps(new FakeHttp(), store), store);
    const { sessionId } = await counselor.start();

    const tokens: string[] = [];
    const reply = await counselor.send(sessionId, 'I love building things.', (token) =>
      tokens.push(token),
    );

    expect(reply).toContain('What draws you to it');
    expect(tokens.join('')).toBe(reply);
    const messages = await store.listMessages(sessionId);
    expect(messages).toEqual([
      { role: 'user', content: 'I love building things.' },
      { role: 'assistant', content: reply },
    ]);
  });

  it('tells the prompt how many answers the student has given', async () => {
    const store = new InMemoryCounselorStore();
    const http = new FakeHttp();
    const counselor = new Counselor(deps(http, store), store);
    const { sessionId } = await counselor.start();
    await counselor.send(sessionId, 'I love building things.');
    await counselor.send(sessionId, 'Mostly robots.');
    expect(http.systems[0]).toContain('Student answers so far: 1.');
    expect(http.systems[1]).toContain('Student answers so far: 2.');
  });

  it('generates and stores 3-5 career paths with weighted fits', async () => {
    const store = new InMemoryCounselorStore();
    const counselor = new Counselor(deps(new FakeHttp(), store), store);
    const { sessionId } = await counselor.start();
    for (let i = 0; i < 8; i++) {
      await store.addMessage(sessionId, { role: 'user', content: `Answer ${i}` });
    }

    const careers = await counselor.careers(sessionId, {
      passions: 10,
      strengths: 5,
      goals: 7,
      earning: 3,
    });

    expect(careers).toHaveLength(3);
    expect(careers.every((career) => career.id > 0)).toBe(true);
    expect(careers.every((career) => career.saved === false)).toBe(true);
    expect(careers[0]!.fitBreakdown.overall).toBeGreaterThan(0);
    expect((await store.listCareers(sessionId)).length).toBe(3);
    expect((await store.getSession(sessionId))?.weights?.passions).toBe(10);
  });

  it('refuses career ideas before enough student messages', async () => {
    const store = new InMemoryCounselorStore();
    const counselor = new Counselor(deps(new FakeHttp(), store), store);
    const { sessionId } = await counselor.start();
    await expect(
      counselor.careers(sessionId, { passions: 5, strengths: 5, goals: 5, earning: 5 }),
    ).rejects.toThrow('Keep chatting');
  });

  it('updates the running notes and feeds them to the next reply', async () => {
    const store = new InMemoryCounselorStore();
    const http = new FakeHttp();
    const counselor = new Counselor(deps(http, store), store);
    const { sessionId } = await counselor.start();
    expect(await counselor.updateNotes(sessionId)).toBeNull();
    expect(http.calls).toBe(0);

    await counselor.send(sessionId, 'I love building robots.');
    const notes = await counselor.updateNotes(sessionId);
    expect(notes?.interests).toHaveLength(4);
    expect(notes?.values).toEqual([]);
    expect(notes?.gaps).toEqual(['values']);
    expect(await store.getNotes(sessionId)).toEqual(notes);

    await counselor.send(sessionId, 'Mostly at home.');
    expect(http.systems.at(-1)).toContain('Interests: builds robots');
  });

  it('keeps chatting when the notes cannot be read', async () => {
    class BrokenNotesStore extends InMemoryCounselorStore {
      async getNotes(_sessionId: number): Promise<CounselorNotes | null> {
        throw new Error('no such column: notes_json');
      }
    }
    const store = new BrokenNotesStore();
    const counselor = new Counselor(deps(new FakeHttp(), store), store);
    const { sessionId } = await counselor.start();
    expect(await counselor.send(sessionId, 'Hello')).toContain('What draws you');
  });

  it('gives career synthesis a transcript without frames or tags', async () => {
    const store = new InMemoryCounselorStore();
    const http = new FakeHttp();
    const counselor = new Counselor(deps(http, store), store);
    const { sessionId } = await counselor.start();
    await store.addMessage(sessionId, {
      role: 'user',
      content: '[intake 2/6] Topic: "Who do you admire?"\nAnswer: My gran\n(Follow-up allowed: yes. Next topic: "What are you good at?")',
    });
    await store.addMessage(sessionId, { role: 'assistant', content: 'She sounds strong. What are you good at?<next/>' });
    for (let i = 0; i < 7; i++) await store.addMessage(sessionId, { role: 'user', content: `Answer ${i}` });

    await counselor.careers(sessionId, { passions: 5, strengths: 5, goals: 5, earning: 5 });
    const request = http.requests.find((r) => r.system.includes('career synthesizer'));
    expect(request?.user).toContain('Student: My gran');
    expect(request?.user).toContain('Counselor: She sounds strong. What are you good at?');
    expect(request?.user).not.toContain('[intake');
    expect(request?.user).not.toContain('<next/>');
  });
});
