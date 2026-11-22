# 05 — Counselor (Design §7.2)

Read first: `.plans/A-build-conventions.md`, `DESIGN.md`, `Design.md` §7.2, `src/core/contracts.ts` (`CoreApi.counselor`, `CareerPath`, `CounselorWeights`), `src/core/counselor/index.ts` (how `send`/`careers` behave — read only), `src/store/counselor.ts` (B's `SqlCounselorStore` — use, don't edit), `src/ui/components/index.ts`.

## How the core behaves (important)
- `core.counselor.start()` → `{sessionId}`. `send(sessionId, text, onToken)` stores the user message, streams the AI reply via `onToken`, resolves to the full reply. Every `send` calls the AI.
- `careers(sessionId, weights)` throws unless the session has ≥ `CAREER_IDEAS_MIN_STUDENT_MESSAGES` (import from `@/core`, = 8) user messages.
- If no key is configured it throws `MissingKeyError` (import from `@/core`).

## Intake design (UI-side, fixed 6 questions)
- The 6 questions (Design §7.2: passions, strengths, favourite subjects and why, life at 30, values, practical limits) live in `counselor.json` (en/es/vi), written warmly and plainly, one sentence each, addressing the student by `{{name}}` in the first one only.
- The UI shows question 1 as a counselor bubble (local, not sent). When the student answers question N, the UI calls `send` with an **encoded** message (helpers in `src/ui/screens/counselor/intake.ts`):
  ```
  [intake N/6] Question: "<question text>"
  Answer: <student answer>
  (Reply with one short sentence that reflects this back in your own words. Do not ask a question: the app asks the next one.)
  ```
  For N = 6 the last line is instead: `(That was the last intake question. Reflect briefly, then ask your first follow-up question.)`
- After the streamed reply for N < 6, the UI shows question N+1 as a local counselor bubble. After N = 6 the chat is free-form `send` (Socratic follow-ups).
- `decodeIntake(text)` → `{n, answer} | null`; the chat always displays only the student's answer, never the frame. Unit-test both helpers in `src/ui/screens/counselor/intake.test.ts` (bun test).

## Steps
- [x] 1. `src/ui/screens/counselor/useCounselor.ts` — Zustand store (in-memory, survives navigation): `{ sessionId, messages: {id, role:'counselor'|'student', text, local?: boolean, streaming?: boolean}[], intakeStep (1..7, 7 = done), studentCount, weights: CounselorWeights (default 5 each), careers: CareerPath[], status: 'idle'|'sending'|'thinking-careers', error }` with actions `ensureSession()`, `sendAnswer(text)`, `generateCareers()`, `toggleSaved(id)`, `reset()`.
      - On first open, resume the latest session with status `active` if it has messages (query `counselor_session` ordered by id desc via `getDb()`, then `SqlCounselorStore.listMessages` with `createTauriSqlClient()`), rebuilding the visible chat with `decodeIntake`, the local question bubbles, `intakeStep` and `studentCount`; also load its careers with `listCareers`. Otherwise start fresh (call `start()` lazily on the first answer, not on screen open).
      - `toggleSaved` uses `SqlCounselorStore.setCareerSaved`.
- [x] 2. `src/ui/screens/Counselor.tsx` layout (page wrapper `px-12`, max 1120px): two columns ≥1100px, stacked below.
      - **Left: chat** (max 68ch). Counselor bubbles: no bubble fill, just ink text with a small "Counselor" label in chart-grey above the first of a run; student messages: shoal fill, 6px radius, right-aligned within the column. Streaming reply shows tokens as they arrive with a blinking caret (static under reduced motion). New messages animate in with a short fade (only messages, not on reload). Auto-scroll to bottom while streaming unless the user scrolled up.
      - Composer at the bottom: `Textarea` (auto-grow to 6 lines, Enter sends, Shift+Enter newline), primary "Send" button, disabled while sending. During intake the placeholder is "Your answer"; after, "Reply to the counselor".
      - Intake progress: a mono "Question 3 of 6" line above the composer during intake only.
      - **Right: "Your priorities" panel**: the 4 `Slider`s (Passions, Strengths, Goals, Earning potential; 1–10) with one line explaining they weight the career ideas. Below: primary "Show my career ideas" enabled when `studentCount >= 8`; when disabled, a chart-grey line "Answer a few more questions first ({{count}} of 8)". Secondary "Start a new conversation" (asks for inline confirmation: "This clears the chat on screen. Your saved careers stay." with Confirm/Cancel — no `window.confirm`).
- [x] 3. **Career ideas**: after `generateCareers()` (show a `ProgressLine` "Thinking about careers that fit your answers…"), render 3–5 careers **below the chat as a ranked list** (not a grid of equal cards): each item is a `Panel` with the title (Headline), summary (body), "Why you" (prose, labelled), degree keywords as `Badge`s, and the fit breakdown as 4 small horizontal mono-labelled bars (`passions 8/10` etc.; bars in ink on shoal, no color coding). Actions: quiet toggle "Save" / "Saved" (bookmark icon), and secondary "Find universities" with a globe icon → `navigate('/finder', { state: { career: career.title } })`. Items arrive with a 24ms stagger (cap 8), no re-animation.
- [x] 4. Errors: `MissingKeyError` → `ErrorNote` "Add an AI key in Settings to talk to the counselor." with a secondary button to `/settings`. Other errors → `ErrorNote` with the message and "Try again" re-sending the last answer (don't duplicate the student bubble). If no profile exists → `EmptyState` linking to onboarding.
- [x] 5. i18n: new `counselor` namespace (en/es/vi) registered in `src/i18n/index.ts`; all strings above.

## Slice checks
- Conventions' Verify passes, including the new `intake.test.ts`.

## Builder notes
- Built: `src/ui/screens/counselor/{intake.ts,intake.test.ts,useCounselor.ts,ChatPane.tsx,PrioritiesPanel.tsx,CareerList.tsx,CounselorErrorNote.tsx}`, screen in `src/ui/screens/Counselor.tsx`, locales `src/i18n/locales/{en,es,vi}/counselor.json` registered in `src/i18n/index.ts`.
- `bun run build`: pass (tsc + vite build).
- `bun run check:i18n`: pass (common, onboarding, counselor match en in es and vi).
- `bun test`: 131 pass, 0 fail (B's 126 + 5 intake tests).
- `cd src-tauri && cargo check`: pass.
- `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: stayed up for 90s, no panic. Log errors are `__TAURI_INTERNALS__` undefined from `getDb()` in theme, profile and FirstLaunchGate (pre-existing, expected outside the Tauri window). Nothing from the counselor code.
- Not visually checked in the live window (no way to drive the Tauri webview here); layout is per DESIGN.md and not screenshot-verified.

### Deviations
- `scripts/check-i18n.ts`: added `counselor` to its hard-coded namespace list, otherwise `check:i18n` would not cover the new namespace.
- Missing key: `counselorProvider()` throws a plain Error ("No AI key configured…") from `start()`, not `MissingKeyError`. The UI detects both.
- "Start a new conversation" marks the old session `status = 'closed'` with a direct SQL UPDATE, because no store method closes a session. Resume only picks `active` sessions.
- Career ideas accumulate across "Show my career ideas" clicks (core appends rows and returns only the new batch; resume loads all rows, so the screen keeps all of them to match).
- Retry after a failed send can store the student's message twice in `counselor_message`: core stores the user message before the AI call, and the retry resends it. Core behaviour, not changed.
- The Finder navigation passes `state: { career }`; the Finder does not read it yet (Finder slice).
