# 12 — Counselor provider switch (UI-only fix)

## Problem
The Counselor failed with OpenRouter "Key limit exceeded (total limit)" while a working OpenCode Go key existed.
Confirmed in core: `Counselor.start()` picks the provider once and stores it in `counselor_session.provider`.
`Counselor.send` and `careers` read `session.provider` via `store.getSession`, so Settings > Counselor provider
(`default_provider`) only affected new sessions.

## Changes (UI layer only; `src/core/**` and B's stores untouched)
- `src/ui/screens/counselor/providerChoice.ts` (new): pure `chooseSessionProvider(setting, hasKey)` and `otherProvider()`.
- `src/ui/screens/counselor/providerChoice.test.ts` (new): 4 unit tests for the pure functions.
- `src/ui/screens/counselor/useCounselor.ts`:
  - `syncSessionProvider(sessionId)` runs before every `counselor.send` (in `runSend`) and `counselor.careers`
    (in `generateCareers`). It applies `default_provider` via `UPDATE counselor_session SET provider`, only when that key is stored.
  - `CounselorError.switchTo?: Provider`, set when the failure is not a missing key and the other provider has a stored key.
  - `switchProviderAndRetry()`: `setSetting('default_provider', other)`, then the existing `retry()`.
- `src/ui/screens/counselor/CounselorErrorNote.tsx`: extra secondary button "Switch to {{provider}} and retry" when `switchTo` is set.
  The raw provider message is still shown.
- `src/ui/screens/settings/AiSection.tsx`: the Counselor provider Field now has a hint (`ai.counselorProvider.hint`).
- i18n (en/es/vi): `counselor.errors.switchAndRetry`, `settings.ai.counselorProvider.hint`.

## Deviations
- Step 2 said "the OTHER provider". Implemented as the opposite of the session's stored provider, read from `counselor_session`,
  since that is the one that failed.
- Provider names in the button are brand names (OpenRouter, OpenCode Go), kept as a constant, not translated.
- Not done (per step 4): no automatic switching when a key is saved.
- `bun tauri dev` smoke test was not run (not in the requested checks).

## Results
- `bun run build`: pass (tsc + vite build)
- `bun run check:i18n`: pass (6 namespaces, es/vi match en)
- `bun test`: 147 pass, 0 fail (includes the 4 new tests)
- `cd src-tauri && cargo check`: pass
