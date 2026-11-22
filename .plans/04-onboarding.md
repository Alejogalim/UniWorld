# 04 — Onboarding (Design §7.1)

Read first: `.plans/A-build-conventions.md`, `DESIGN.md` (Layout: onboarding is a centered 640px sheet, one question per step, controls bottom-left of that measure), `Design.md` §7.1, `src/core/contracts.ts` (`Profile`, `Grades`, `Level`, `Program`), `src/ui/components/index.ts` (use these primitives), `src/store/profile.ts`, `src/store/secrets.ts`.
Existing strings: `src/i18n/locales/*/onboarding.json` (extend/rename keys freely, keep en/es/vi in sync).

## Steps
- [x] 1. Reference data in `src/ui/data/`:
      - `languages.ts`: array of all ISO 639-1 codes (all ~184). `languageName(code, uiLang)` via `Intl.DisplayNames([uiLang], {type:'language'})`, falling back to the code.
      - `countries.ts`: array of all ISO 3166-1 alpha-2 codes (all 249). `countryName(code, uiLang)` via `Intl.DisplayNames([uiLang], {type:'region'})`.
- [x] 2. `src/ui/components/Combobox.tsx`: searchable single-select (input + floating list with `--shadow-float`, keyboard: arrows/Enter/Escape, `role="combobox"`/`listbox`/`option`, `aria-activedescendant`). Options `{value, label, hint?}`; filter is accent-insensitive (`normalize('NFD')`), matches label or code. Used for primary language, extra languages and countries. Country options show the `Flag` disc.
- [x] 3. Onboarding draft state: `src/ui/screens/onboarding/useOnboardingDraft.ts` (Zustand, in-memory) holding step index + a partial `Profile` + key inputs, so Back/Next keeps values.
- [x] 4. `src/ui/screens/Onboarding.tsx` → a stepper with 7 steps, each its own component in `src/ui/screens/onboarding/`:
      1. **Welcome**: display-size title, one line of subtitle, the UI language choice as three `Chip`s (English / Español / Tiếng Việt) that call `i18n.changeLanguage` immediately. Primary button "Get started".
      2. **Name**: `Field` + `Input`, required (trimmed, 1–60 chars). Hint: the AI uses it to address you.
      3. **Languages**: primary language `Combobox` (required). Then "Other languages": list of rows `[Combobox language][Select level A1–C2/Native][quiet Remove]` + secondary "Add language". No duplicates, and the primary can't be repeated. **If the primary is `es` or `vi` and the UI language differs, show an inline prompt** ("Switch the interface to Español?") with "Yes, switch" (primary) and "Keep English" (quiet); answering hides it.
      4. **Program**: three selectable options (IB Diploma / AP / US standard) as large radio rows (`role="radiogroup"`, hairline rows, signal left rule on the selected one per DESIGN.md "Selected states are drawn"). Required.
      5. **Grades (optional)**: form depends on the program from step 4. Note: "Helps us suggest realistic options." IB: predicted total (0–45) + subject rows (name, HL/SL, score 1–7). AP: GPA (0–5.0) + exam rows (name, score 1–5). US: unweighted GPA (0–4.0), SAT (400–1600), ACT (1–36). All optional; invalid numbers show a field error and block Next. Empty fields are omitted from `grades` (no zeros, no empty objects).
      6. **Citizenship and residence (optional)**: two country `Combobox`es + the note "Tuition-free status often depends on these." + "Skip" quiet button.
      7. **AI key**: OpenRouter key (`type="password"` input with a show/hide icon button, required) and OpenCode Go key (optional, an "Experimental" `Badge`). Each has "Test connection" (secondary). Test = `await setSecret(provider, key.trim())` then `await core.testConnection(provider)`; show result inline: ok → evidence-green text "Connection works"; fail → `ErrorNote` with the error message. A line under the keys: "Stored in your system keychain, never in the database." A quiet link-style line telling the user where to get an OpenRouter key: show the URL `https://openrouter.ai/keys` as text plus an icon button that opens it via `openUrl` from `@tauri-apps/plugin-opener`. Primary "Finish" is enabled when the OpenRouter field is non-empty.
- [x] 5. Stepper chrome: top of the sheet shows "Step 2 of 7" in mono + a 1px hairline progress rule with the filled part in ink (this is a real sequence, so numbering is allowed). Bottom-left: Back (secondary, hidden on step 1) + Next/Finish (primary). Enter submits the step when valid. Step changes animate with the same feel as page transitions (fade + 8px horizontal slide in the direction of travel, 180ms; opacity-only under reduced motion). Focus moves to the step's first field on enter.
- [x] 6. **Finish**: save keys that are non-empty (`setSecret`; an emptied optional OpenCode field → `deleteSecret('opencode')`), then `useProfile.getState().save({ name, primaryLang, uiLang: i18n.resolvedLanguage, languages, program, grades?, citizenship?, residence? })`, then `navigate('/counselor', { replace: true })`. Errors show in an `ErrorNote` on the step; the button shows a spinner while saving. Keys never go into the profile, the draft store after finish (clear the draft), or logs.
- [x] 7. If a profile already exists when `/onboarding` is opened, prefill the draft from it (so it can serve as "edit profile" later). Don't prefill keys.
- [x] 8. Translate all new strings (en/es/vi) in the `onboarding` namespace. The welcome subtitle should be plain and specific, e.g. "Answer seven short questions. Then a counselor helps you think about careers, and the Finder looks for real universities that teach them." (no marketing tone, no "calm").

## Slice checks
- Conventions' Verify passes.
- `grep -rn "setSecret\|getSecret" src/ui` → only in the AI-key step (and nothing logs a key).

## Builder notes

- Built: `src/ui/data/{languages,countries}.ts` (184 / 249 ISO codes, names via `Intl.DisplayNames`); `src/ui/components/Combobox.tsx` (exported from `components/index.ts`); `src/ui/screens/onboarding/` (draft store, pure rules, 7 step components, `options.ts`, `StepParts.tsx`); `src/ui/screens/Onboarding.tsx` rewritten as the stepper; `onboarding.json` in en/es/vi.
- Verify: `bun run build` OK; `bun run check:i18n` OK; `bun test` 126 pass / 0 fail; `cargo check` exit 0; `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev` stayed up twice, no panic. Only console errors are the `__TAURI_INTERNALS__` ones from the existing profile/theme loaders (expected outside the Tauri window).
- Slice check: `grep -rn "setSecret\|getSecret" src/ui` hits only `onboarding/AiKeyStep.tsx`.
- Rules check: a scratch script (outside the repo) exercised the validation, grades and profile builders. It found a key mismatch (`grades.errorRange` vs `grades.range`), now fixed; a re-run of the rules and an i18n key audit come back clean.
- Not verified: no click-through of the onboarding UI. It cannot render in a plain browser (profile load needs Tauri), so layout, focus, Enter/Escape and motion are checked by code review only. Worth one manual pass in `tauri dev`.
- Deviations:
  1. Welcome subtitle says "Six short questions" (the plan's example said seven; the flow has six questions after the welcome).
  2. Finish stays disabled until the OpenRouter key is non-empty (as the plan says).
  3. Added step headings (`name.title`, `languages.title`, `program.title`) and error copy; removed unused keys (`residence.optional`, `grades.add`); `ai.failed` became `ai.failedTitle`.
  4. Shared primitives extended, not replaced: `Field` label accepts a node (for the Experimental badge); `Combobox` accepts `aria-label`.
  5. Residence "Skip" sits in the footer; it clears both fields and advances.
  6. Program rows have no description lines (no copy for them in the plan).
  7. Grades for the program not selected are dropped on save.
  8. Enter with the combobox list open picks the highlighted option; with the list closed it submits the step.
  9. Language and country code lists were written by hand; each code was checked against Intl (none unknown).
