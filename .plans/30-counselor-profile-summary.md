# 30 — Counselor: running "what I've learned" notes

Prerequisites: plans 28 and 29 are merged (`counselorSystemPrompt(profile, context)`, `src/core/counselor/replyTag.ts`, v2 intake frames, `scripts/eval/**`).
Read first: `.plans/A-build-conventions.md`. Then only the files listed under "Files".

## Rules (read before anything else)
- Haiku builds. No commits, no pushes, no branch switches. No `pkill`/`killall`. Do not start the app.
- Touch ONLY the files listed below. **Owner override:** this plan may edit the listed `src/core/**` files and `src/store/counselor.ts`, even though A-build-conventions forbids it. The override covers only these files.
- Copy prompt text, SQL and i18n strings **exactly**.
- A failed notes call must never block or break the chat or the career ideas: it is caught and ignored.
- `bun test` must never touch the network.
- If a step fails twice, stop and write it under "Builder notes".

## Goal
After each counselor reply the app makes one cheap, non-streaming JSON call (temperature 0.1, max 400 tokens, no retry, last 6 messages + previous notes) that updates short structured notes per checklist area plus the open gaps. Notes are stored per session (`counselor_session.notes_json`, migration 004). The counselor prompt gets them (so it knows the gaps), the career synthesizer gets them in addition to a cleaned transcript (intake frames and control tags removed), and the priorities panel shows them read-only as a small collapsible "What I've learned" list.

## Data format
```ts
// src/core/contracts.ts
export type CounselorNoteArea = 'interests' | 'strengths' | 'values' | 'workStyle' | 'limits';
export interface CounselorNotes {
  interests: string[]; strengths: string[]; values: string[]; workStyle: string[]; limits: string[];
  gaps: CounselorNoteArea[];
}
```
Stored as `JSON.stringify(notes)` in `counselor_session.notes_json` (NULL = no notes yet). Each list holds at most 4 phrases of at most 100 chars (the schema trims, it never rejects for length).

## Files
Create:
- `src/db/migrations/006_counselor_notes.sql`
- `src/core/counselor/transcript.ts`
- `src/core/counselor/transcript.test.ts`

Edit:
- `src-tauri/src/lib.rs` — register migration 4.
- `src/core/contracts.ts` — `CounselorNoteArea`, `CounselorNotes`, `CoreApi.counselor.updateNotes`.
- `src/core/config.ts` — two constants.
- `src/core/schemas.ts` — `COUNSELOR_NOTE_AREAS`, `counselorNotesSchema`.
- `src/core/ports.ts` — `CounselorPersistence.getNotes/setNotes`.
- `src/core/adapters/memory.ts` — implement them.
- `src/store/counselor.ts` — implement them.
- `src/store/stores.test.ts` — DDL column + one test.
- `src/core/ai/prompts.ts` — `notesToText`, `notesPrompt`, notes section in the counselor prompt, `careersPrompt` notes parameter.
- `src/core/ai/prompts.test.ts` — notes tests.
- `src/core/counselor/index.ts` — notes in `send`/`careers`, new `updateNotes`.
- `src/core/counselor/counselor.test.ts` — FakeHttp + 3 tests.
- `src/core/coreApi.ts`, `src/core/stub.ts` — wire `updateNotes`.
- `src/ui/screens/counselor/useCounselor.ts` — `notes` state, refresh after each reply, load, reset.
- `src/ui/screens/counselor/PrioritiesPanel.tsx` — "What I've learned".
- `src/i18n/locales/{en,es,vi}/counselor.json` — `notes.*` keys.
- `scripts/eval-counselor.ts`, `scripts/eval/report.ts`, `scripts/eval/eval.test.ts` — eval updates notes like the app and prints the final notes.

Nothing else.

## Steps

- [x] 1. Create `src/db/migrations/006_counselor_notes.sql`:
```sql
-- Running counselor notes (plan 30): a short JSON summary of what the student has shared, per checklist area.
-- NULL until the first update. Never holds secrets.
ALTER TABLE counselor_session ADD COLUMN notes_json TEXT;
```
  In `src-tauri/src/lib.rs`, append to the `migrations` vec (after version 3, same style):
```rust
    }, Migration {
        version: 4,
        description: "counselor_notes",
        sql: include_str!("../../src/db/migrations/006_counselor_notes.sql"),
        kind: MigrationKind::Up,
```
  (i.e. the closing `}];` of the vec now follows the version-4 entry).

- [x] 2. `src/core/contracts.ts`: add right after the `CounselorWeights` interface:
```ts
/** Checklist areas the counselor keeps notes on (plan 30). */
export type CounselorNoteArea = 'interests' | 'strengths' | 'values' | 'workStyle' | 'limits';

/** Short running notes the counselor keeps about the student, per checklist area. */
export interface CounselorNotes {
  interests: string[];
  strengths: string[];
  values: string[];
  workStyle: string[];
  limits: string[];
  /** Areas with no concrete information yet, most important first. */
  gaps: CounselorNoteArea[];
}
```
  In `CoreApi.counselor`, after `careers(...)`, add:
```ts
    /** Updates the session's running notes from the latest messages (one small JSON call). Null before any answer. */
    updateNotes(sessionId: number): Promise<CounselorNotes | null>;
```

- [x] 3. `src/core/config.ts`: append
```ts
/** Running counselor notes (plan 30): how many recent messages the note-taker reads, and its token cap. */
export const NOTES_RECENT_MESSAGES = 6;
export const NOTES_MAX_TOKENS = 400;
```

- [x] 4. `src/core/schemas.ts`: add `import type { CounselorNoteArea } from './contracts';` below the zod import, and after `export type CareerIdeasAI = …` add:
```ts
// ---------- Counselor notes (plan 30) ----------
export const COUNSELOR_NOTE_AREAS = ['interests', 'strengths', 'values', 'workStyle', 'limits'] as const;

/** Lenient: a missing or null list is empty; extra or long items are trimmed instead of rejected. */
const noteList = z
  .array(z.string())
  .nullish()
  .transform((items) =>
    (items ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 100))
      .slice(0, 4),
  );

export const counselorNotesSchema = z.object({
  interests: noteList,
  strengths: noteList,
  values: noteList,
  workStyle: noteList,
  limits: noteList,
  gaps: z
    .array(z.string())
    .nullish()
    .transform((items) =>
      (items ?? []).filter((item): item is CounselorNoteArea =>
        (COUNSELOR_NOTE_AREAS as readonly string[]).includes(item),
      ),
    ),
});
```

- [x] 5. `src/core/ports.ts`: add `CounselorNotes` to the `import type { … } from './contracts'` list, and add to `interface CounselorPersistence` (after `setWeights`):
```ts
  /** The running notes for a session, or null when none were saved yet. */
  getNotes(sessionId: number): Promise<CounselorNotes | null>;
  setNotes(sessionId: number, notes: CounselorNotes): Promise<void>;
```
  `src/core/adapters/memory.ts`: add `CounselorNotes` to its contracts import; in `InMemoryCounselorStore` add a field `private readonly notes = new Map<number, CounselorNotes>();` and:
```ts
  async getNotes(sessionId: number): Promise<CounselorNotes | null> {
    return this.notes.get(sessionId) ?? null;
  }

  async setNotes(sessionId: number, notes: CounselorNotes): Promise<void> {
    this.notes.set(sessionId, notes);
  }
```
  `src/store/counselor.ts`: add `CounselorNotes` to the contracts import, add `import { counselorNotesSchema } from '../core/schemas';`, and add to `SqlCounselorStore` (after `setWeights`):
```ts
  async getNotes(sessionId: number): Promise<CounselorNotes | null> {
    const rows = await this.sql.query<{ notes_json: string | null }>(
      'SELECT notes_json FROM counselor_session WHERE id = ? LIMIT 1',
      [sessionId],
    );
    const parsed = counselorNotesSchema.safeParse(parseJson<unknown>(rows[0]?.notes_json ?? null, null));
    return parsed.success ? parsed.data : null;
  }

  async setNotes(sessionId: number, notes: CounselorNotes): Promise<void> {
    await this.sql.execute('UPDATE counselor_session SET notes_json = ? WHERE id = ?', [
      JSON.stringify(notes),
      sessionId,
    ]);
  }
```
  Note: `counselorNotesSchema.safeParse(null)` fails, so a NULL column returns null.

- [x] 6. `src/store/stores.test.ts`: in the `DDL` string, change the `counselor_session` table to end with `status TEXT NOT NULL,\n  notes_json TEXT\n);` (add the column). Add inside `describe('SqlCounselorStore')`:
```ts
  it('saves and reads counselor notes', async () => {
    const store = new SqlCounselorStore(client());
    const sessionId = await store.createSession('openrouter');
    expect(await store.getNotes(sessionId)).toBeNull();
    const notes = {
      interests: ['draws comics'],
      strengths: [],
      values: ['freedom'],
      workStyle: [],
      limits: [],
      gaps: ['strengths' as const],
    };
    await store.setNotes(sessionId, notes);
    expect(await store.getNotes(sessionId)).toEqual(notes);
  });
```

- [x] 7. Create `src/core/counselor/transcript.ts`:
```ts
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
```

- [x] 8. Create `src/core/counselor/transcript.test.ts`:
```ts
import { describe, expect, it } from 'bun:test';
import { buildTranscript, readStudentMessage } from './transcript';

const V1 =
  '[intake 2/6] Question: "What do people come to you for?"\nAnswer: Maths homework\n' +
  '(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)';
const V2_FIRST = '[intake 1/6] Topic: "Topic 1?"\nAnswer: Drawing\n(Follow-up allowed: yes. Next topic: "Topic 2?")';
const V2_THIRD = '[intake 3/6] Topic: "Topic 3?"\nAnswer: Line one\n(not the end)\n(Follow-up allowed: yes. Next topic: "Topic 4?")';
const V2_FOLLOW = '[intake 1/6 follow-up] Topic: "Topic 1?"\nAnswer: games\n(Follow-up allowed: no. Next topic: "Topic 2?")';

describe('readStudentMessage', () => {
  it('keeps the app question for v1 frames and the first v2 topic', () => {
    expect(readStudentMessage(V1)).toEqual({ answer: 'Maths homework', appQuestion: 'What do people come to you for?' });
    expect(readStudentMessage(V2_FIRST)).toEqual({ answer: 'Drawing', appQuestion: 'Topic 1?' });
  });

  it('drops the topic when the AI asked the question itself', () => {
    expect(readStudentMessage(V2_THIRD)).toEqual({ answer: 'Line one\n(not the end)', appQuestion: null });
    expect(readStudentMessage(V2_FOLLOW)).toEqual({ answer: 'games', appQuestion: null });
  });

  it('passes plain messages through', () => {
    expect(readStudentMessage('  I like maps ')).toEqual({ answer: 'I like maps', appQuestion: null });
  });
});

describe('buildTranscript', () => {
  it('writes clean lines without frames or tags', () => {
    expect(
      buildTranscript([
        { role: 'user', content: V2_FIRST },
        { role: 'assistant', content: 'Nice. Who do you admire?<next/>' },
        { role: 'user', content: 'My gran' },
      ]),
    ).toBe('Counselor: Topic 1?\nStudent: Drawing\nCounselor: Nice. Who do you admire?\nStudent: My gran');
  });
});
```

- [x] 9. `src/core/ai/prompts.ts`:
  a. Change the contracts import to `import type { CounselorNoteArea, CounselorNotes, Profile, SearchInput, UiLang } from '../contracts';`.
  b. Add above `CounselorPromptContext`:
```ts
const NOTE_LABELS: Record<CounselorNoteArea, string> = {
  interests: 'Interests',
  strengths: 'Strengths',
  values: 'Values',
  workStyle: 'Work style',
  limits: 'Practical limits',
};

/** The notes as plain lines for a prompt. */
export function notesToText(notes: CounselorNotes): string {
  const areas = Object.keys(NOTE_LABELS) as CounselorNoteArea[];
  const lines = areas.map(
    (area) => `${NOTE_LABELS[area]}: ${notes[area].length ? notes[area].join('; ') : '(nothing yet)'}`,
  );
  const gaps = notes.gaps.map((gap) => NOTE_LABELS[gap].toLowerCase());
  lines.push(`Still unknown: ${gaps.length ? gaps.join(', ') : 'nothing major'}`);
  return lines.join('\n');
}
```
  c. In `CounselorPromptContext` add:
```ts
  /** Running notes (plan 30), or null/absent before the first update. */
  notes?: CounselorNotes | null;
```
  d. In `counselorSystemPrompt`, insert this section into `sections` directly after the `YOUR HIDDEN CHECKLIST` section:
```ts
    [
      'WHAT YOU KNOW SO FAR',
      context.notes
        ? `Your private notes from this conversation (they can lag one answer behind; the messages are the source of truth). Use them to find the biggest gap. Never read them out or mention them.\n${notesToText(context.notes)}`
        : 'No notes yet: rely on the messages.',
    ].join('\n'),
```
  e. `careersPrompt`: add a fourth parameter `notes: CounselorNotes | null = null,` and in the user `content` array insert, between the weights line and the `Conversation so far` line:
```ts
        ...(notes
          ? [`Counselor's notes (a summary; quote the conversation, not the notes, in whyYou):\n${notesToText(notes)}`]
          : []),
```
  f. Add after `careersPrompt`:
```ts
/** The cheap note-taker call (plan 30): previous notes + the latest messages in, updated notes out. */
export function notesPrompt(
  profile: Profile,
  previous: CounselorNotes | null,
  transcript: string,
): ChatMessage[] {
  const lang = respondIn(profile);
  const shape = {
    interests: ['string'],
    strengths: ['string'],
    values: ['string'],
    workStyle: ['string'],
    limits: ['string'],
    gaps: ['values'],
  };
  return [
    {
      role: 'system',
      content: [
        "You are UniFinder's counselor note-taker. You keep short private notes about a high-school student during a career-guidance chat.",
        'Update the notes with what the latest messages add. Keep every previous item that is still true; change or drop an item only if the student corrected it.',
        `Each field is a list of at most 4 short phrases (2 to 8 words each), written in ${lang} about the student, for example "draws comics most evenings".`,
        '- interests: activities, topics and media they enjoy or seek out',
        '- strengths: what they are good at or what others come to them for',
        '- values: what they want work to give them',
        '- workStyle: alone or in a team, structured or free, hands-on or abstract',
        '- limits: budget, distance from home, study languages and other practical limits',
        '- gaps: which of "interests", "strengths", "values", "workStyle", "limits" still have no concrete information, most important first',
        "Use only what the student actually said; never guess. Ignore the counselor's suggestions unless the student agreed, and ignore jokes that say nothing real.",
        'Return only JSON matching this shape:',
        JSON.stringify(shape),
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Previous notes:\n${previous ? JSON.stringify(previous) : 'none yet'}`,
        `Latest messages:\n${transcript}`,
        'Return the JSON now.',
      ].join('\n\n'),
    },
  ];
}
```

- [x] 10. `src/core/ai/prompts.test.ts`: change the import to `import { careersPrompt, counselorSystemPrompt, notesPrompt, promptRules } from './prompts';`, add `import type { CounselorNotes, Profile } from '../contracts';` (replacing the `Profile`-only import), and append:
```ts
describe('notes', () => {
  const notes: CounselorNotes = {
    interests: ['draws comics'],
    strengths: [],
    values: ['freedom'],
    workStyle: [],
    limits: [],
    gaps: ['strengths', 'workStyle'],
  };
  const weights = { passions: 5, strengths: 5, goals: 5, earning: 5 };

  it('puts the notes and gaps into the counselor prompt', () => {
    const system = counselorSystemPrompt(en, { studentAnswers: 3, notes });
    expect(system).toContain('Interests: draws comics');
    expect(system).toContain('Strengths: (nothing yet)');
    expect(system).toContain('Still unknown: strengths, work style');
    expect(counselorSystemPrompt(en)).toContain('No notes yet: rely on the messages.');
  });

  it('builds a note-taker request with the previous notes', () => {
    const [system, user] = notesPrompt(en, notes, 'Student: hi');
    expect(system!.content).toContain('counselor note-taker');
    expect(user!.content).toContain('"draws comics"');
    expect(user!.content).toContain('Student: hi');
    expect(notesPrompt(en, null, 'Student: hi')[1]!.content).toContain('none yet');
  });

  it('gives the career synthesizer the notes only when there are some', () => {
    expect(careersPrompt(en, 'Student: hi', weights, notes)[1]!.content).toContain("Counselor's notes");
    expect(careersPrompt(en, 'Student: hi', weights)[1]!.content).not.toContain("Counselor's notes");
  });
});
```

- [x] 11. `src/core/counselor/index.ts`:
  a. Imports: add `CounselorNotes` to the contracts import; `notesPrompt` to the prompts import; `NOTES_MAX_TOKENS, NOTES_RECENT_MESSAGES` to the config import; `counselorNotesSchema` to the schemas import; and `import { buildTranscript } from './transcript';`.
  b. Add this private method after `profile()`:
```ts
  /** Notes only help: a failed read (e.g. migration 004 missing) never blocks the chat or the career ideas. */
  private async notesOrNull(sessionId: number): Promise<CounselorNotes | null> {
    try {
      return await this.store.getNotes(sessionId);
    } catch {
      return null;
    }
  }
```
  c. `send`: after `const studentAnswers = …;` add `const notes = await this.notesOrNull(sessionId);` and change the system message to `counselorSystemPrompt(profile, { studentAnswers, notes })`.
  d. `careers`: replace the `const transcript = messages.map(…).join('\n');` statement with
```ts
    const transcript = buildTranscript(messages);
    const notes = await this.notesOrNull(sessionId);
```
     and change `careersPrompt(profile, transcript, weights)` to `careersPrompt(profile, transcript, weights, notes)`.
  e. Add at the end of the class:
```ts
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
```

- [x] 12. `src/core/counselor/counselor.test.ts`:
  a. Add `import type { CounselorNotes } from '../contracts';` (or extend the existing contracts import).
  b. Add next to `careersJson`:
```ts
const notesJson = JSON.stringify({
  interests: ['builds robots', 'b', 'c', 'd', 'e', 'f'],
  strengths: ['fixes things'],
  values: null,
  workStyle: [],
  limits: [],
  gaps: ['values', 'money'],
});
```
  c. In `FakeHttp`: add a field `requests: { system: string; user: string }[] = [];`; after computing `system`, push `{ system, user: body.messages?.at(-1)?.content ?? '' }`; and choose the content as
```ts
    const content = system.includes('career synthesizer')
      ? careersJson
      : system.includes('counselor note-taker')
        ? notesJson
        : 'That sounds meaningful. What draws you to it?';
```
  d. Add these tests inside `describe('Counselor')`:
```ts
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
```
  (`deps(http, store)` takes `InMemoryCounselorStore`; `BrokenNotesStore` is a subclass, so it fits.)

- [x] 13. `src/core/coreApi.ts`: in `counselor: { … }` add `updateNotes: (sessionId: number) => counselor.updateNotes(sessionId),`. `src/core/stub.ts`: in `counselor: { … }` add `updateNotes: async () => null,`.

- [x] 14. `src/ui/screens/counselor/useCounselor.ts`:
  a. Add `type CounselorNotes,` to the `from '@/core'` import.
  b. `CounselorState`: add after `careers: CareerPath[];`:
```ts
  /** What the counselor has noted so far (plan 30), or null before the first update. */
  notes: CounselorNotes | null;
```
  c. Add above `runSend`:
```ts
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
```
  d. In `runSend`, right after the success `useCounselor.setState((s) => { … });` block (inside `try`), add `refreshNotes(sessionId);`.
  e. Add `notes: null,` after `careers: [],` in: the store's initial state, `reset()`, `resetCounselorState()`, and both early "fresh" `setState` calls in `loadLatest()`.
  f. In `loadLatest()`, after `const careers = await persisted.listCareers(sessionId);` add `const notes = await persisted.getNotes(sessionId).catch(() => null);` and add `notes,` after `careers,` in the final `useCounselor.setState({ … })`.

- [x] 15. `src/ui/screens/counselor/PrioritiesPanel.tsx`:
  a. Add `import { ChevronDown } from "lucide-react";`.
  b. Add below the `DIMENSIONS` constant:
```tsx
const NOTE_AREAS = ["interests", "strengths", "values", "workStyle", "limits"] as const;

/** What the counselor has learned so far, read-only (plan 30). Hidden until there is something to show. */
function LearnedNotes() {
  const { t } = useTranslation("counselor");
  const notes = useCounselor((s) => s.notes);
  if (!notes) return null;
  const rows = NOTE_AREAS.filter((area) => notes[area].length > 0);
  if (rows.length === 0) return null;

  return (
    <details open className="group border-b border-hairline pb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-control text-sm font-medium text-chart-grey transition-colors duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
        {t("notes.title")}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map((area) => (
          <div key={area} className="flex flex-col gap-0.5">
            <dt className="text-xs text-chart-grey">{t(`notes.${area}`)}</dt>
            <dd className="text-sm leading-[1.55] break-words text-foreground">{notes[area].join(" · ")}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-chart-grey">{t("notes.hint")}</p>
    </details>
  );
}
```
  c. Render `<LearnedNotes />` as the first child of the root `<div className="flex flex-col gap-6">` in `PrioritiesPanel`. Change nothing else.

- [x] 16. i18n: add a top-level `"notes"` object to each `counselor.json`, placed right after `"priorities"`:
  - en: `title` "What I've learned", `hint` "From your answers so far. It updates as you chat.", `interests` "Interests", `strengths` "Strengths", `values` "Values", `workStyle` "Work style", `limits` "Practical limits"
  - es: `title` "Lo que he aprendido", `hint` "Según tus respuestas hasta ahora. Se actualiza mientras hablamos.", `interests` "Intereses", `strengths` "Fortalezas", `values` "Valores", `workStyle` "Forma de trabajar", `limits` "Límites prácticos"
  - vi: `title` "Những điều mình biết về bạn", `hint` "Dựa trên các câu trả lời của bạn. Mục này cập nhật khi mình trò chuyện.", `interests` "Sở thích", `strengths` "Thế mạnh", `values` "Giá trị", `workStyle` "Cách làm việc", `limits` "Giới hạn thực tế"

- [x] 17. Eval updates notes like the app.
  a. `scripts/eval/report.ts`: add `import type { CounselorNotes } from '../../src/core/contracts';` and `notes?: CounselorNotes | null;` to `PersonaResult`. At the end of the per-persona loop (after the replies loop, still inside `for (const result of results)`), add:
```ts
    if (result.notes) lines.push('**Final notes:**', '', '```json', JSON.stringify(result.notes, null, 2), '```', '');
```
  b. `scripts/eval-counselor.ts`: in `runPersona`, declare `let sessionId: number | null = null;` before `try`, change `const { sessionId } = await counselor.start();` to `sessionId = (await counselor.start()).sessionId;`, and right after `const raw = await counselor.send(sessionId, turn.encoded);` add
```ts
      await counselor.updateNotes(sessionId).catch(() => null);
```
     Change both returns to include the notes: `return { persona, replies, notes: sessionId === null ? null : await store.getNotes(sessionId) };` and in the catch `return { persona, replies, error: message(error), notes: sessionId === null ? null : await store.getNotes(sessionId) };`.
  c. `scripts/eval/eval.test.ts`: in `describe('renderReport')` add
```ts
  it('prints the final notes when present', () => {
    const report = renderReport({ startedAt: 'x', provider: 'p', model: 'm', judge: false }, [
      {
        persona: PERSONAS[0]!,
        replies: [],
        notes: { interests: ['games'], strengths: [], values: [], workStyle: [], limits: [], gaps: ['values'] },
      },
    ]);
    expect(report).toContain('**Final notes:**');
    expect(report).toContain('"games"');
  });
```

## Verify (paste short results under Builder notes)
```bash
bun run build
bun run check:i18n
bun run typecheck
bun test
(cd src-tauri && cargo check --offline)
OPENROUTER_API_KEY= OPENCODE_API_KEY= bun run eval:counselor   # prints "eval:counselor skipped: …", exit 0
git status --short                                              # only the files listed above (+ pre-existing untracked .impeccable/, graphify-out/)
```
Do not start the app and do not run the eval with a real key. The orchestrator checks the panel in the running app (migration 004 applies on next launch).

## Builder notes
- Steps 1-17 implemented as written, except the deviations below.
- BLOCKED: `bun run typecheck` and `bun run build` fail (exit 2): `src/core/app.ts(59,5)` TS2741, `updateNotes` missing in the `CoreApi` literal in `createAppCore()`. `app.ts` is not in the Files list, so it was not touched. Fix needed (one line, after `careers:`): `updateNotes: async (sessionId) => (await getReady()).counselor.updateNotes(sessionId),`.
- Deviation: step 14e `loadLatest()` fresh states have no `careers` field, so `notes: null,` was added after `studentCount: 0` in both identical lines.
- `bun test`: 214 pass, 0 fail (22 files).
- `bun run check:i18n`: passed (es, vi match en).
- `cargo check --offline` (src-tauri): finished, exit 0.
- `OPENROUTER_API_KEY= OPENCODE_API_KEY= bun run eval:counselor`: "eval:counselor skipped ...", exit 0. No networked eval run.
- `git status --short`: only listed files modified, plus new `006_counselor_notes.sql`, `transcript.ts`, `transcript.test.ts`, and pre-existing `.impeccable/`, `graphify-out/`. Plan file also updated (checkboxes and these notes). Nothing committed.

