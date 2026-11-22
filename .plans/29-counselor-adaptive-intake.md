# 29 — Counselor: adaptive intake (AI asks in its own words, one follow-up per topic) + new topics

Prerequisite: plan 28 is merged (new `counselorSystemPrompt` with `counselorIntakeSection()`, `scripts/eval/**`).
Read first: `.plans/A-build-conventions.md`. Then only the files listed under "Files".

## Rules (read before anything else)
- Haiku builds. No commits, no pushes, no branch switches. No `pkill`/`killall`. Do not start the app.
- Touch ONLY the files listed below. **Owner override:** this plan may edit/create the listed `src/core/**` files even though A-build-conventions forbids editing `src/core`. The override covers only these files.
- Copy prompt text, i18n strings and frame formats **exactly**.
- Keep 6 topics (`INTAKE_TOTAL = 6`) and the 6-segment progress bar as they are. Do not restyle anything.
- `bun test` must never touch the network.
- If a step fails twice, stop and write it under "Builder notes".

## Goal
- During the intake the AI now asks each next question **in its own words**, building on the answer. The fixed i18n question stays as the topic definition sent to the AI, as the first question (local bubble, as today), and as the fallback when the AI reply contains no question.
- When an answer is too vague the AI may ask **one** follow-up on the same topic; that does not advance the progress bar.
- The AI tells the app what it did with a tag at the very end of its reply: `<next/>` (moved on) or `<follow/>` (stayed on the topic). The app strips the tag before display (also while streaming). Replies are stored raw (with tag) so a resumed session can be rebuilt; old saved sessions (v1 frames) still load.
- New topics (Career Construction Interview ideas + essentials), new fallback questions and UI-only hints (shown as the composer placeholder during the intake) in en/es/vi.

## Design (for reference; the code below implements it)
Frame v2 (user message the app sends; the chat shows only the answer):
```
[intake N/6] Topic: "<fallback question N>"
Answer: <student answer, may be multi-line>
(Follow-up allowed: yes. Next topic: "<fallback question N+1>")
```
- Answer to the follow-up: header `[intake N/6 follow-up]` and `Follow-up allowed: no`.
- Topic 6: last line `(Follow-up allowed: yes. Next topic: none, this was the last intake topic.)` (or `no` for the follow-up answer).
- v1 frames (saved before this plan): `[intake N/6] Question: "…"\nAnswer: …\n(Reply with one short sentence…)` / `(That was the last intake question…)`. Still decoded; their bubbles are rebuilt the old way.

What the app does after a reply to an intake answer (`intakeOutcome`):
| Reply | Result |
|---|---|
| empty after stripping tags | advance; show the next fallback question (if N < 6) |
| `<follow/>`, no `?` in text (e.g. safety reply) | stay on N, follow-up state unchanged |
| `<follow/>`, has `?`, follow-up not used yet | stay on N, `followUp = true` |
| `<follow/>` but follow-up already used | advance (budget is one) |
| `<next/>` or no tag | advance to N+1 (N=6 → 7, free chat); if the text has no `?` and N < 6, show fallback question N+1 |

Network/AI errors keep today's behaviour (error note + Try again resends the same frame). The fallback question is for replies that are unusable, not for failed calls.

## Files
Create:
- `src/core/counselor/replyTag.ts`
- `src/core/counselor/replyTag.test.ts`

Edit:
- `src/core/ai/prompts.ts` — replace `counselorIntakeSection()` only.
- `src/core/ai/prompts.test.ts` — one test updated.
- `src/ui/screens/counselor/intake.ts` — rewrite (full file below).
- `src/ui/screens/counselor/intake.test.ts` — rewrite (full file below).
- `src/ui/screens/counselor/useCounselor.ts` — follow-up state, tag-aware streaming, rebuild on load.
- `src/ui/screens/counselor/ChatPane.tsx` — placeholder shows the topic hint.
- `src/i18n/locales/en/counselor.json`, `src/i18n/locales/es/counselor.json`, `src/i18n/locales/vi/counselor.json` — `intake.q1..q6` replaced, `intake.hint1..hint6` added.
- `scripts/eval/driver.ts`, `scripts/eval/checks.ts`, `scripts/eval/report.ts`, `scripts/eval-counselor.ts`, `scripts/eval/eval.test.ts` — eval follows the v2 flow.

Nothing else. (Design.md §7.2 still lists the old topics; it is read-only for builders. Leave it.)

## Steps

- [ ] 1. Create `src/core/counselor/replyTag.ts`:

```ts
/** Control tags the counselor appends to intake replies (plan 29). Never shown to the student. */
export type ReplyTag = 'next' | 'follow';

const TAGS = /<\s*(next|follow)\s*\/?\s*>/gi;
const FULL_TAGS = ['<next/>', '<follow/>'];

/** The last control tag in a reply, or null when there is none. */
export function readReplyTag(raw: string): ReplyTag | null {
  let tag: ReplyTag | null = null;
  for (const match of raw.matchAll(TAGS)) tag = match[1]!.toLowerCase() as ReplyTag;
  return tag;
}

/** The finished reply without control tags. */
export function stripReplyTags(raw: string): string {
  return raw.replace(TAGS, '').trim();
}

/** For streaming: strips finished tags and hides an unfinished one at the very end ("<", "<fol", "<next/"). */
export function visibleReply(raw: string): string {
  const text = raw.replace(TAGS, '');
  const partial = /<[a-z/\s]*$/i.exec(text);
  if (partial) {
    const compact = partial[0].replace(/\s/g, '').toLowerCase();
    if (FULL_TAGS.some((tag) => tag.startsWith(compact))) return text.slice(0, partial.index).trimEnd();
  }
  return text.trimEnd();
}
```

- [ ] 2. Create `src/core/counselor/replyTag.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';
import { readReplyTag, stripReplyTags, visibleReply } from './replyTag';

describe('readReplyTag', () => {
  it('reads the last tag, tolerating spaces and case', () => {
    expect(readReplyTag('Nice. What then?<next/>')).toBe('next');
    expect(readReplyTag('No rush. Which one?<follow/>')).toBe('follow');
    expect(readReplyTag('Which one? < next />')).toBe('next');
    expect(readReplyTag('Which one?<NEXT/>')).toBe('next');
    expect(readReplyTag('<follow/> and then <next/>')).toBe('next');
    expect(readReplyTag('Plain question?')).toBeNull();
  });
});

describe('stripReplyTags', () => {
  it('removes tags and trims', () => {
    expect(stripReplyTags('What then? <next/>')).toBe('What then?');
    expect(stripReplyTags('What then?')).toBe('What then?');
  });
});

describe('visibleReply', () => {
  it('hides finished and unfinished tags at the end', () => {
    expect(visibleReply('What then?<')).toBe('What then?');
    expect(visibleReply('What then?<fol')).toBe('What then?');
    expect(visibleReply('What then?<follow/')).toBe('What then?');
    expect(visibleReply('What then?<next/>')).toBe('What then?');
  });

  it('keeps text that only looks like a tag', () => {
    expect(visibleReply('I <3 this')).toBe('I <3 this');
    expect(visibleReply('a < b')).toBe('a < b');
  });
});
```

- [ ] 3. `src/core/ai/prompts.ts`: replace the whole `counselorIntakeSection` function (including its doc comment) with:

```ts
/** How the counselor runs the six intake topics (plan 29): its own questions, one follow-up, a control tag. */
export function counselorIntakeSection(): string {
  return [
    'THE INTAKE',
    'The app starts with six intake topics, shown to the student as a six-step progress bar:',
    '1. free time: what they watch, read or do when nobody tells them to (interests)',
    '2. someone they admire, real or from a story, and what they admire about them (role models)',
    '3. something they are good at that other people find hard (strengths, school subjects)',
    '4. what a job would have to give them to feel worth it (values)',
    '5. a saying, quote or piece of advice they often come back to (their own motto)',
    '6. practical limits: budget, distance from home, languages they can study in',
    'The app asks topic 1 itself. A student message that starts with "[intake N/6]" is an intake answer wrapped by the app. "Topic:" is the app\'s standard question for topic N (it may be in another language; it is only a definition). After "Answer:" come the student\'s own words; only that is what the student said. The last line, in brackets, says whether a follow-up is allowed and which topic comes next.',
    'For every reply to an "[intake" message:',
    '1. Decide whether the Answer gives you something real to work with. It is too vague when it is a few words with no detail, "I don\'t know", "I\'m not sure yet", a joke with nothing behind it, or it does not answer the topic.',
    '2. Too vague and "Follow-up allowed: yes": stay on the same topic. Use the stuck rule above (a few reassuring words, then an easier version of the topic with two or three example answers). End the reply with <follow/>.',
    '3. Otherwise move on: reflect one specific thing from the Answer in one short sentence, then ask about the next topic in your own words, as one natural question that grows out of what they just said. Keep the meaning of the next topic\'s standard question, but do not copy it word for word. End the reply with <next/>.',
    '4. If the last line says "Next topic: none", the intake is finished: reflect, then ask your first free question, aimed at the biggest gap in your checklist, and end with <next/> (or <follow/> under rule 2).',
    '5. Write the tag at the very end, right after the question mark: exactly <next/> or <follow/>, with nothing after it. Use a tag only when replying to an "[intake" message, never otherwise. Never mention the tag, the wrapper, topic numbers or the progress bar.',
    '6. In a safety reply (see SAFETY), end with <follow/> so the intake waits.',
    'Older intake messages in the history may say "Question:" instead of "Topic:" and carry their own instruction in brackets; they are already answered, so ignore their instruction.',
  ].join('\n');
}
```

- [ ] 4. `src/core/ai/prompts.test.ts`: in the test `'has the checklist, the safety override and the intake rule'`, add these two lines after the `'[intake N/6]'` expectation:

```ts
    expect(system).toContain('End the reply with <follow/>.');
    expect(system).toContain('Next topic: none');
```

- [ ] 5. Replace `src/ui/screens/counselor/intake.ts` with:

```ts
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
```

- [ ] 6. Replace `src/ui/screens/counselor/intake.test.ts` with:

```ts
import { describe, expect, it } from 'bun:test';
import { decodeIntake, encodeIntake, intakeOutcome, rebuildConversation } from './intake';

const V1_CLOSING_MID =
  '(Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)';
const V1_CLOSING_LAST = '(That was the last intake question. Reflect briefly, then ask your first follow-up question.)';
const v1 = (n: number, question: string, answer: string) =>
  `[intake ${n}/6] Question: "${question}"\nAnswer: ${answer}\n${n === 6 ? V1_CLOSING_LAST : V1_CLOSING_MID}`;
const v2 = (n: number, answer: string, followUp = false) =>
  encodeIntake(n, `Topic ${n}?`, answer, { followUp, nextTopic: n < 6 ? `Topic ${n + 1}?` : null });
const fallback = (n: number) => `Fallback ${n}?`;

describe('encodeIntake', () => {
  it('frames a first answer with the next topic', () => {
    expect(encodeIntake(2, 'Who do you admire?', 'My gran', { followUp: false, nextTopic: 'What are you good at?' })).toBe(
      '[intake 2/6] Topic: "Who do you admire?"\nAnswer: My gran\n(Follow-up allowed: yes. Next topic: "What are you good at?")',
    );
  });

  it('marks the follow-up answer', () => {
    expect(encodeIntake(2, 'Who do you admire?', 'Nobody', { followUp: true, nextTopic: 'What are you good at?' })).toBe(
      '[intake 2/6 follow-up] Topic: "Who do you admire?"\nAnswer: Nobody\n(Follow-up allowed: no. Next topic: "What are you good at?")',
    );
  });

  it('says when the last topic was answered', () => {
    const framed = encodeIntake(6, 'Limits?', 'None', { followUp: false, nextTopic: null });
    expect(framed.split('\n').at(-1)).toBe('(Follow-up allowed: yes. Next topic: none, this was the last intake topic.)');
  });
});

describe('decodeIntake', () => {
  it('round-trips v2 frames, follow-ups and multi-line answers', () => {
    for (let n = 1; n <= 6; n++) {
      for (const followUp of [false, true]) {
        const answer = `Line one for ${n}\nLine two "quoted"\n(not the end)`;
        expect(decodeIntake(v2(n, answer, followUp))).toEqual({ n, question: `Topic ${n}?`, answer, followUp, version: 2 });
      }
    }
  });

  it('still reads frames saved before plan 29', () => {
    expect(decodeIntake(v1(2, 'What do people come to you for?', 'Maths homework'))).toEqual({
      n: 2,
      question: 'What do people come to you for?',
      answer: 'Maths homework',
      followUp: false,
      version: 1,
    });
    expect(decodeIntake(v1(6, 'Practical limits?', 'Budget under 20k'))?.answer).toBe('Budget under 20k');
  });

  it('returns null for plain text and malformed frames', () => {
    expect(decodeIntake('I like drawing maps')).toBeNull();
    expect(decodeIntake('[intake 7/6] Topic: "x"\nAnswer: y\n(Follow-up allowed: yes. Next topic: none, this was the last intake topic.)')).toBeNull();
    expect(decodeIntake('[intake 0/6] Question: "x"\nAnswer: y\n(anything)')).toBeNull();
    expect(decodeIntake('[intake 3/6] Topic: "x"\nAnswer: y')).toBeNull();
    expect(decodeIntake(`[intake 3/6 follow-up] Question: "x"\nAnswer: y\n${V1_CLOSING_MID}`)).toBeNull();
  });
});

describe('intakeOutcome', () => {
  const first = { intakeN: 2, followUp: false };
  const second = { intakeN: 2, followUp: true };

  it('moves on after <next/>', () => {
    expect(intakeOutcome(first, 'Nice. What are you good at?<next/>', 2)).toEqual({
      text: 'Nice. What are you good at?',
      intakeStep: 3,
      followUp: false,
      fallbackQuestion: null,
    });
  });

  it('stays for one follow-up', () => {
    expect(intakeOutcome(first, 'No rush. Was it A, B, or C?<follow/>', 2)).toMatchObject({ intakeStep: 2, followUp: true });
  });

  it('moves on when the follow-up was already used', () => {
    expect(intakeOutcome(second, 'Still vague? Okay, next one?<follow/>', 2)).toMatchObject({ intakeStep: 3, followUp: false });
  });

  it('stays without spending the follow-up when <follow/> asks nothing', () => {
    expect(intakeOutcome(first, 'I am glad you told me. Please talk to a trusted adult today.<follow/>', 2)).toMatchObject({
      intakeStep: 2,
      followUp: false,
      fallbackQuestion: null,
    });
  });

  it('treats a missing tag as moving on', () => {
    expect(intakeOutcome(first, 'Nice. What are you good at?', 2)).toMatchObject({ intakeStep: 3, fallbackQuestion: null });
  });

  it('asks the fallback question when the reply asked none', () => {
    expect(intakeOutcome(first, 'Nice.<next/>', 2)).toMatchObject({ text: 'Nice.', intakeStep: 3, fallbackQuestion: 3 });
    expect(intakeOutcome(first, '<follow/>', 2)).toMatchObject({ text: '', intakeStep: 3, fallbackQuestion: 3 });
  });

  it('ends the intake after topic 6 without a fallback', () => {
    expect(intakeOutcome({ intakeN: 6, followUp: false }, 'Got it.<next/>', 6)).toMatchObject({ intakeStep: 7, fallbackQuestion: null });
  });

  it('leaves free chat alone but strips tags', () => {
    expect(intakeOutcome({ intakeN: null, followUp: false }, 'Hi?<next/>', 7)).toEqual({
      text: 'Hi?',
      intakeStep: 7,
      followUp: false,
      fallbackQuestion: null,
    });
  });
});

describe('rebuildConversation', () => {
  it('rebuilds a v1 session with the questions saved in its frames', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v1(1, 'Q one?', 'Drawing') },
        { role: 'assistant', content: 'Drawing sounds fun.' },
        { role: 'user', content: v1(2, 'Q two?', 'Maths') },
        { role: 'assistant', content: 'Maths it is.' },
      ],
      fallback,
    );
    expect(rebuilt.entries).toEqual([
      { role: 'counselor', text: 'Q one?', local: true },
      { role: 'student', text: 'Drawing' },
      { role: 'counselor', text: 'Drawing sounds fun.' },
      { role: 'counselor', text: 'Q two?', local: true },
      { role: 'student', text: 'Maths' },
      { role: 'counselor', text: 'Maths it is.' },
      { role: 'counselor', text: 'Fallback 3?', local: true },
    ]);
    expect(rebuilt.intakeStep).toBe(3);
    expect(rebuilt.unanswered).toBeNull();
  });

  it('rebuilds a v2 follow-up without advancing twice', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v2(1, 'idk') },
        { role: 'assistant', content: 'No rush. Was it more like games, music, or sport?<follow/>' },
        { role: 'user', content: v2(1, 'games', true) },
        { role: 'assistant', content: 'Games, nice. Who do you look up to in them?<next/>' },
      ],
      fallback,
    );
    expect(rebuilt.entries).toEqual([
      { role: 'counselor', text: 'Topic 1?', local: true },
      { role: 'student', text: 'idk' },
      { role: 'counselor', text: 'No rush. Was it more like games, music, or sport?' },
      { role: 'student', text: 'games' },
      { role: 'counselor', text: 'Games, nice. Who do you look up to in them?' },
    ]);
    expect(rebuilt.intakeStep).toBe(2);
    expect(rebuilt.followUp).toBe(false);
  });

  it('adds the fallback question when a v2 reply asked none', () => {
    const rebuilt = rebuildConversation(
      [
        { role: 'user', content: v2(1, 'Drawing') },
        { role: 'assistant', content: 'Nice.<next/>' },
      ],
      fallback,
    );
    expect(rebuilt.entries.at(-1)).toEqual({ role: 'counselor', text: 'Fallback 2?', local: true });
    expect(rebuilt.intakeStep).toBe(2);
  });

  it('keeps an unanswered follow-up answer for Try again', () => {
    const stored = [
      { role: 'user' as const, content: v2(1, 'idk') },
      { role: 'assistant' as const, content: 'No rush. Was it A, B, or C?<follow/>' },
      { role: 'user' as const, content: v2(1, 'B', true) },
    ];
    const rebuilt = rebuildConversation(stored, fallback);
    expect(rebuilt.intakeStep).toBe(1);
    expect(rebuilt.followUp).toBe(true);
    expect(rebuilt.unanswered).toEqual({ encoded: stored[2]!.content, intakeN: 1, followUp: true });
  });
});
```

- [ ] 7. `src/ui/screens/counselor/useCounselor.ts` — make exactly these changes:
  a. Imports: replace `import { decodeIntake, encodeIntake, INTAKE_TOTAL } from './intake';` with
     `import { encodeIntake, intakeOutcome, INTAKE_TOTAL, rebuildConversation } from './intake';`
     and add `import { visibleReply } from '@/core/counselor/replyTag';` next to the other `@/core` imports.
  b. `interface Pending`: add after `intakeN: number | null;`:
     ```ts
     /** True when this answers the topic's one follow-up question. */
     followUp: boolean;
     ```
  c. `interface CounselorState`: add after the `intakeStep` line:
     ```ts
     /** True when the question awaiting an answer is the current topic's follow-up. */
     followUp: boolean;
     ```
  d. In `runSend`, replace the `const reply = await useCore().counselor.send(...)` call and the success `useCounselor.setState((s) => { ... })` block that follows it with:
     ```ts
    let raw = '';
    const reply = await useCore().counselor.send(sessionId, pending.encoded, (token) => {
      raw += token;
      const text = visibleReply(raw);
      useCounselor.setState((s) => ({
        messages: s.messages.map((m) => (m.id === counselorId ? { ...m, text } : m)),
      }));
    });

    useCounselor.setState((s) => {
      const outcome = intakeOutcome(pending, reply, s.intakeStep);
      const messages = s.messages.flatMap((m) => {
        if (m.id !== counselorId) return [m];
        return outcome.text ? [{ ...m, text: outcome.text, streaming: false }] : [];
      });
      if (outcome.fallbackQuestion !== null) messages.push(questionBubble(outcome.fallbackQuestion));
      return {
        messages,
        intakeStep: outcome.intakeStep,
        followUp: outcome.followUp,
        status: 'idle' as const,
        pending: null,
      };
    });
     ```
     Leave the `catch` and `finally` blocks unchanged.
  e. Store initial state (`create<CounselorState>(…)`): add `followUp: false,` after `intakeStep: 1,`.
  f. `sendAnswer`: replace its body from `const { status, intakeStep } = get();` to the final `await runSend(...)` with:
     ```ts
    const { status, intakeStep, followUp } = get();
    if (!text || status !== 'idle') return;

    const intakeN = intakeStep <= INTAKE_TOTAL ? intakeStep : null;
    const asFollowUp = intakeN !== null && followUp;
    const encoded =
      intakeN === null
        ? text
        : encodeIntake(intakeN, questionText(intakeN), text, {
            followUp: asFollowUp,
            nextTopic: intakeN < INTAKE_TOTAL ? questionText(intakeN + 1) : null,
          });
    set((s) => ({
      error: null,
      pending: null,
      messages: [...s.messages, { id: uid(), role: 'student', text }],
    }));
    await runSend({ encoded, intakeN, followUp: asFollowUp });
     ```
  g. `reset()` and `resetCounselorState()`: add `followUp: false,` right after each `intakeStep: 1,`.
  h. `loadLatest()`: in both early `useCounselor.setState({ loaded: true, sessionId: null, … })` calls add `followUp: false,`. Then replace everything from `const messages: ChatMessage[] = [questionBubble(1)];` down to (and including) the final `useCounselor.setState({ … })` with:
     ```ts
  const rebuilt = rebuildConversation(stored, questionText);
  const messages: ChatMessage[] = rebuilt.entries.map((entry) => ({ id: uid(), ...entry }));
  // The student's last message never got a reply: keep it, and offer to resend it.
  const unanswered = rebuilt.unanswered;
  useCounselor.setState({
    loaded: true,
    sessionId,
    messages,
    intakeStep: rebuilt.intakeStep,
    followUp: rebuilt.followUp,
    studentCount: stored.filter((m) => m.role === 'user').length,
    weights: session?.weights ?? DEFAULT_WEIGHTS,
    careers,
    latestBatchIds: readLatestBatch(sessionId),
    pending: unanswered,
    error: unanswered
      ? { scope: 'chat', missingKey: false, message: tc('errors.noReply') }
      : null,
  });
     ```
  If `tsc` reports `status: 'idle' as const` as unnecessary, keep it anyway; if it reports a type error on the setState return, type the callback return as `Partial<CounselorState>`.

- [ ] 8. `src/ui/screens/counselor/ChatPane.tsx`: change only the Textarea `placeholder` prop to
  ```tsx
  placeholder={intake ? t(`intake.hint${intakeStep}`) : t("chat.placeholderReply")}
  ```
  Keep the `aria-label` exactly as it is (`chat.placeholderAnswer` during the intake).

- [ ] 9. i18n — in each `counselor.json`, replace `intake.q1`..`intake.q6` with the text below and add `intake.hint1`..`intake.hint6` right after `q6` (before `progress`). Keep `progress` and every other key unchanged. Keep `{{name}}` in q1. JSON-escape the inner double quotes in en/vi `hint6`.

  en:
  - q1 `{{name}}, when nobody is telling you what to do, what do you end up watching, reading or doing?`
  - q2 `Think of someone you admire, real or from a book, film or game. What is it about them that you admire?`
  - q3 `What's something you're good at that other people find hard, at school or outside it?`
  - q4 `Picture a job you'd be happy to go to most days. What does it give you: helping people, security, creativity, money, freedom or something else?`
  - q5 `What's a saying, quote or piece of advice that you often come back to?`
  - q6 `Is anything limiting your options, like budget, how far from home you can go or the languages you can study in?`
  - hint1 `A show, a channel, a game, a hobby…`
  - hint2 `Family, a teacher, an athlete, a character…`
  - hint3 `Explaining things, fixing stuff, drawing…`
  - hint4 `Pick one or more, or put them in order.`
  - hint5 `A song lyric, a family saying, anything.`
  - hint6 `Rough answers are fine. "None" works too.`

  es (tú):
  - q1 `{{name}}, cuando nadie te dice qué hacer, ¿qué acabas viendo, leyendo o haciendo?`
  - q2 `Piensa en alguien a quien admires, real o de un libro, una película o un juego. ¿Qué es lo que admiras de esa persona?`
  - q3 `¿Qué se te da bien que a otras personas les cuesta, en el colegio o fuera de él?`
  - q4 `Imagina un trabajo al que irías con ganas casi todos los días. ¿Qué te aporta: ayudar a la gente, seguridad, creatividad, dinero, libertad u otra cosa?`
  - q5 `¿Qué frase, cita o consejo te repites a menudo?`
  - q6 `¿Hay algo que limite tus opciones, como el presupuesto, lo lejos de casa que puedes ir o los idiomas en los que puedes estudiar?`
  - hint1 `Una serie, un canal, un juego, un hobby…`
  - hint2 `Tu familia, un profe, una deportista, un personaje…`
  - hint3 `Explicar cosas, arreglar cosas, dibujar…`
  - hint4 `Elige una o varias, o ponlas en orden.`
  - hint5 `Una letra de canción, un dicho de casa, lo que sea.`
  - hint6 `Vale una respuesta aproximada. «Ninguno» también sirve.`

  vi (informal-polite, "bạn"):
  - q1 `{{name}} ơi, khi không ai bảo phải làm gì, bạn thường xem, đọc hay làm gì?`
  - q2 `Hãy nghĩ về một người bạn ngưỡng mộ, ngoài đời thật hoặc trong sách, phim hay game. Điều gì ở họ khiến bạn ngưỡng mộ?`
  - q3 `Có việc gì bạn làm khá tốt mà người khác lại thấy khó, ở trường hay ngoài trường?`
  - q4 `Hãy tưởng tượng một công việc mà hầu như ngày nào bạn cũng vui khi đi làm. Công việc đó mang lại cho bạn điều gì: giúp đỡ người khác, sự ổn định, sáng tạo, tiền bạc, tự do hay điều gì khác?`
  - q5 `Có câu nói, câu trích dẫn hay lời khuyên nào mà bạn hay nhắc lại với chính mình?`
  - q6 `Có điều gì đang giới hạn lựa chọn của bạn không, như ngân sách, việc học xa nhà đến đâu hoặc các ngôn ngữ bạn có thể học?`
  - hint1 `Một bộ phim, một kênh, một trò chơi, một sở thích…`
  - hint2 `Người thân, thầy cô, vận động viên, nhân vật…`
  - hint3 `Giảng bài, sửa đồ, vẽ…`
  - hint4 `Chọn một hay nhiều điều, hoặc xếp theo thứ tự.`
  - hint5 `Một câu hát, một câu nói trong nhà, gì cũng được.`
  - hint6 `Trả lời đại khái cũng được. "Không có" cũng ổn.`

- [ ] 10. Eval follows the v2 flow.
  a. `scripts/eval/driver.ts`: replace the intake import with
     `import { encodeIntake, intakeOutcome, INTAKE_TOTAL } from '../../src/ui/screens/counselor/intake';`
     and add `import { readReplyTag, stripReplyTags, type ReplyTag } from '../../src/core/counselor/replyTag';`.
     Add `expectTag: boolean;` to `DriverTurn` and `tag: ReplyTag | null;` to `DriverReply`. Replace `nextTurn` and `afterReply` with:
     ```ts
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
     ```
  b. `scripts/eval/checks.ts`: add `| 'tag'` to `CheckId`; add to `CheckInput`:
     ```ts
  /** The raw reply (with control tags) and whether it must end with one; both set from plan 29 on. */
  raw?: string;
  expectTag?: boolean;
     ```
     Add this exported function above `runChecks`:
     ```ts
const ANY_TAG = /<\s*(?:next|follow)\s*\/?\s*>/gi;

/** Intake replies end with exactly one <next/> or <follow/>; free-chat replies carry none. */
export function tagCheck(raw: string, expectTag: boolean): CheckResult {
  const count = (raw.match(ANY_TAG) ?? []).length;
  if (!expectTag) return { id: 'tag', pass: count === 0, detail: `${count} tags in a free-chat reply` };
  const atEnd = /<(?:next|follow)\/>\s*$/.test(raw);
  return { id: 'tag', pass: count === 1 && atEnd, detail: `${count} tags, last at end: ${atEnd}` };
}
     ```
     and at the end of `runChecks`, before `return results;`:
     ```ts
  if (input.raw !== undefined && input.expectTag !== undefined) results.push(tagCheck(input.raw, input.expectTag));
     ```
  c. `scripts/eval/report.ts`: add `tag?: 'next' | 'follow' | null;` to `ReplyResult`, and change the counselor line to
     ```ts
      lines.push(`**${reply.turn}. Student:** ${oneLine(reply.student)}`, '', `**Counselor:** ${oneLine(reply.reply)}${reply.tag === 'follow' ? ' _(follow-up)_' : ''}`, '');
     ```
  d. `scripts/eval-counselor.ts`: in the `runChecks({...})` call add `raw,` and `expectTag: turn.expectTag,`; in `replies.push({...})` add `tag: outcome.tag,`.
  e. `scripts/eval/eval.test.ts`: add `tagCheck` to the `./checks` import, and add inside `describe('driver')`:
     ```ts
  it('uses v2 frames, follows up once and reads the tag', () => {
    const turn = nextTurn(initialDriverState, 'idk', question);
    expect(turn.encoded.startsWith('[intake 1/6] Topic: "')).toBe(true);
    expect(turn.expectTag).toBe(true);
    const follow = afterReply(initialDriverState, turn, 'No rush. Was it games, music, or sport?<follow/>', question);
    expect(follow.state).toEqual({ intakeStep: 1, followUp: true });
    expect(follow.visible).toBe('No rush. Was it games, music, or sport?');
    expect(follow.tag).toBe('follow');
    const again = nextTurn(follow.state, 'games', question);
    expect(again.encoded.startsWith('[intake 1/6 follow-up]')).toBe(true);
    const next = afterReply(follow.state, again, 'Games! Who do you admire?<next/>', question);
    expect(next.state).toEqual({ intakeStep: 2, followUp: false });
    expect(next.appQuestion).toBeNull();
  });
     ```
     and a new block:
     ```ts
describe('tagCheck', () => {
  it('wants exactly one tag at the end of intake replies and none elsewhere', () => {
    expect(tagCheck('What then?<next/>', true).pass).toBe(true);
    expect(tagCheck('What then?', true).pass).toBe(false);
    expect(tagCheck('<next/> What then?', true).pass).toBe(false);
    expect(tagCheck('What then?', false).pass).toBe(true);
    expect(tagCheck('What then?<follow/>', false).pass).toBe(false);
  });
});
     ```
     The existing driver test `'wraps intake answers and moves to the next question'` must still pass unchanged ("Nice." has no question, so the fallback question 2 is shown).

## Verify (paste short results under Builder notes)
```bash
bun run build
bun run check:i18n
bun run typecheck
bun test
OPENROUTER_API_KEY= OPENCODE_API_KEY= bun run eval:counselor   # prints "eval:counselor skipped: …", exit 0
grep -c '"hint' src/i18n/locales/{en,es,vi}/counselor.json     # 6 each
git status --short                                              # only the files listed above (+ pre-existing untracked .impeccable/, graphify-out/)
```
No Rust or migration changes, so no cargo check. Do not run the eval with a real key.

## Builder notes
