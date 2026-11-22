import { describe, expect, it } from 'bun:test';
import type { Profile, Provider } from '../contracts';
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

class FakeHttp implements HttpClient {
  calls = 0;
  systems: string[] = [];

  async fetch(_url: string, init?: HttpRequestInit): Promise<HttpResponseLike> {
    this.calls++;
    const body = JSON.parse(init?.body ?? '{}') as {
      messages?: { role: string; content: string }[];
    };
    const system = body.messages?.[0]?.content ?? '';
    this.systems.push(system);
    const content = system.includes('career synthesizer')
      ? careersJson
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
});
