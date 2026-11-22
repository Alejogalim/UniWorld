# 25 — Friendlier counselor intake: better questions, hints, progress

Rules: Haiku builds, no commits. Touch only: `src/ui/screens/counselor/ChatPane.tsx`, `src/i18n/locales/{en,es,vi}/counselor.json`, `DESIGN.md` (Counselor mention if any), and tests only if a test hard-codes question text. Do NOT change the intake logic (`INTAKE_TOTAL` stays 6, `intake.ts`, `useCounselor.ts` frames). Do NOT re-add suggestion chips / example answers (the owner removed them in c9ff00d). No pkill/killall; don't start the app.

## Why
The six questions are long, abstract and sometimes double-barrelled; the box is blank with no guidance; progress is a tiny mono line. It feels like a form interview, not a conversation.

## 1. Rewrite the six questions (all 3 languages; keep the `{{name}}` in q1; keys unchanged `intake.q1..q6`)
en (one idea each, short, concrete, warm):
1. "{{name}}, what do you lose track of time doing?"
2. "What do friends or classmates usually ask you for help with?"
3. "Which school subject do you actually enjoy, and what do you like about it?"
4. "Picture an ordinary Tuesday when you're 30. What are you doing?"
5. "What matters most to you in a job: helping people, stability, creativity, money or freedom?"
6. "Is anything limiting your options, like budget, staying near home or the languages you can study in?"
es and vi: natural, friendly, tú-form in Spanish, informal-polite in Vietnamese; same meaning, same length discipline. Remember saved sessions re-render questions from these keys, so they just change.

## 2. Hints (UI only, never sent to the AI)
New keys `intake.hint1..hint6` (en):
1 "A hobby, a project, anything. There are no wrong answers."
2 "Homework, tech, advice, organizing, cheering them up…"
3 "Name the subject and the part you like, even if it is just one."
4 "Where you are, who you are with, what you are working on."
5 "You can pick more than one, or put them in order."
6 "Rough answers are fine. \"No limits\" is a valid answer."
Show the current step's hint as one muted line (`text-sm text-chart-grey`) directly above the composer pill, only while `intake` is true. In the fresh start screen it sits under the headline instead (centered). Translate to es/vi.

## 2b. Small helpers
- New key `chat.notSure`: en "I'm not sure yet." (es/vi equivalents). Add a quiet text button (ghost, small, `text-chart-grey hover:text-foreground`, label `t('chat.notSureButton')` en "Not sure yet", es/vi translated) at the right end of the progress row during intake; clicking calls `sendAnswer(t('chat.notSure'))` (disabled while busy). 
- New key `chat.enterHint`: en "Enter to send · Shift+Enter for a new line", muted `text-xs`, shown under the composer on non-touch layouts (just render it; keep it one short line, centered in fresh state, left otherwise). Translate to es/vi.

## 3. Progress
Replace the mono "Question n of 6" text by a 6-segment bar: each segment `h-1 flex-1 rounded-pill`; completed (index < intakeStep) `bg-foreground/60`, current `bg-signal`, upcoming `bg-hairline`; container `role="progressbar"` with `aria-valuemin=1 aria-valuemax=6 aria-valuenow={intakeStep}` and `aria-label={t('intake.progress',{n,total})}` (keep that existing key); gap-1.5, max width ~ 12rem, centered in fresh state. Keep the textual progress for screen readers only (`sr-only`) or drop it if redundant with aria-label.

## 4. Copy polish
- `chat.placeholderAnswer`: en "Type your answer…" (es/vi equivalents). `chat.startTitle` stays.
- Fresh headline: keep, but add `text-balance` (already) and allow up to `max-w-[26ch]`.

## Verify (report output)
`bun run build`, `bun run check:i18n` (all three locales must have the same keys), `bun test`. Report the final text of the 6 questions in each language.
