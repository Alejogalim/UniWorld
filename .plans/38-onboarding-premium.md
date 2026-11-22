# 38 — Onboarding: no box, one column, quiet progress

Branch: `feat/status-track-motion`. Builder: Haiku via `cmd -p`. Read `.plans/A-build-conventions.md` first; the rules below override it where they differ (the DESIGN.md and A-build-conventions edits in Step 9 are owner-approved for this plan).

## Why (owner feedback)
"Remove the background box for all of this section (onboarding). Improve it so it doesn't look AI slop — more premium and professional."

What reads as slop today (welcome step screenshot, route `/onboarding`):
1. Every step sits in a `.panel-ember` card with a heavy orange outer glow.
2. A giant gradient numeral "1 /7" plus a progress underline is decoration, not information.
3. The two-tone headline (grey "Welcome to UniWorld." + bold white second line) is a cliché.
4. Generic pill language chips with an orange dot; an orange gradient pill CTA.
5. Filler copy, and it is wrong: "Six short questions" under a "/7" counter.
6. The shell also prints the page title "Your profile" above the sheet, a second heading competing with the step headline.

## Decisions
- **No card.** Content sits directly on the page ground (stars and ambient haze stay, they live in `AppShell`). One centred **560px column** (`mx-auto w-full max-w-[560px]`) inside a 24/32px side gutter (`px-6 sm:px-8`).
- **Anchored, not centred.** The column starts at `pt-[clamp(2rem,12vh,7rem)]`: visually centred-ish on a normal window, but the top of the column (progress, headline) stays at the same y on every step. True vertical centring would make the headline jump on each step because step heights differ.
- **Shell title hidden on `/onboarding`** (one line in `AppShell.tsx`, like the counselor). Each step headline becomes the page's `h1`.
- **Progress counts questions, not the welcome.** The welcome is not a question, so it shows no progress. Steps 1–6 show a small label "Step 2 of 6" (13px, weight 500, Chart Grey, tabular) over a six-segment bar using the exact classes of the counselor's `IntakeProgress` (`h-1 flex-1 rounded-pill`; done `bg-foreground/60`, current `bg-signal`, upcoming `bg-hairline`). The current segment is the step's **one ember mark**. The slot keeps its 32px height on the welcome so the headline sits at the same y as later steps. The label is the `aria-live="polite"` region (always mounted, empty on the welcome) so step changes are announced; the bar is `aria-hidden`. This makes "Six short questions" accurate. `STEP_COUNT` (7) in `draftRules.ts` is NOT touched; the screen derives `QUESTIONS = STEP_COUNT - 1`.
- **Typography: one headline per step, one weight.** Welcome: `.type-display` (56px/600) with `leading-[1.1]` (room for Vietnamese diacritics on stacked lines) and `text-balance`. Other steps: `.type-headline` (28px/600), `text-balance`. Supporting line: `.type-body` in Chart Grey, `max-w-[52ch]`. No `<strong>`, no `<Trans>`, no grey/white two-tone. "(optional)" moves out of the headlines into the supporting line ("Optional. …").
- **Welcome copy (en):** "Find universities that fit the career you want." / "Six short questions. Then Compass helps you choose a career and Atlas finds real universities that teach it."
- **Interface language: `SegmentedControl`** (the Settings radiogroup, arrow keys, Home/End) instead of chips with an ember dot.
- **Primary action: a solid ink pill, no gradient, no glow.** New `ink` variant on the shared `Button` (white on black in dark, near-black on paper in light, ground-coloured text, hover at 85%). Pill and 40px are kept so it matches every other action in the app (Shape lock). The ember gradient `primary` variant is unchanged everywhere else.
- **Action row, left-aligned under the content:** `[Back]  [Next]  or press Enter`. Back is a quiet `sm` button with `-ml-4`, so its text lines up with the column's left edge (the quiet sm button has 16px padding). On the residence step the hint is replaced by a quiet "Skip". The hint is hidden below `sm` and while saving. Enter already submits the form; behaviour unchanged.
- **Second ember marks removed:** the ember dot on the selected program row (the row already has rim + shoal + a checked radio) and the ember `primary` "Yes, switch" button in the language switch prompt (becomes `secondary sm`).
- **Controls match Settings.** Inputs, selects and comboboxes are the shared primitives already. The Name field and the primary-language field drop `max-w-md` (the 560px column is the measure). Group labels that were `text-xs` ("Other languages", "Subjects", "Exams") become the Field label style (`text-[0.8125rem] font-medium`).
- **Motion:** the existing step transition already is fade + 8px direction-aware slide, 180ms, `cubic-bezier(0.2,0,0,1)`, opacity-only under reduced motion. Kept exactly. Segment colour changes use `transition-colors duration-180`, none under reduced motion.
- **Behaviour, validation, draft logic, keychain handling, prefill from Settings → Edit profile and the return to `/settings` are untouched.** Only the JSX/presentation of `Onboarding.tsx` changes; every handler (`goTo`, `finish`, `next`, `skipResidence`, both effects) is copied verbatim.

## Builder rules
- Work on branch `feat/status-track-motion`. No commits, no branch switches, no `pkill`/`killall`. Do not start the app (`bun tauri dev`, `bun dev`): the orchestrator checks it visually.
- Touch ONLY these files:
  - `src/ui/screens/Onboarding.tsx` (full replacement, Step 1)
  - `src/ui/screens/onboarding/WelcomeStep.tsx` (full replacement, Step 2)
  - `src/ui/screens/onboarding/StepParts.tsx` (one exact edit, Step 3)
  - `src/ui/screens/onboarding/NameStep.tsx` (one exact edit, Step 4)
  - `src/ui/screens/onboarding/LanguagesStep.tsx` (three exact edits, Step 4)
  - `src/ui/screens/onboarding/ProgramStep.tsx` (two exact edits, Step 4)
  - `src/ui/screens/onboarding/GradesStep.tsx` (two exact edits, Step 4)
  - `src/ui/components/ui/button.tsx` (one exact edit, Step 5)
  - `src/ui/layout/AppShell.tsx` (one exact edit, Step 6)
  - `src/i18n/locales/{en,es,vi}/onboarding.json` (Step 7)
  - `DESIGN.md` (exact edits, Step 9)
  - `.plans/A-build-conventions.md` (one exact edit, Step 9)
  - this plan file (checkboxes + Builder notes)
- Do NOT touch `draftRules.ts`, `useOnboardingDraft.ts`, `AiKeyStep.tsx`, `ResidenceStep.tsx`, `options.ts`, `Panel.tsx`, `SegmentedControl.tsx`, `index.css`, or any test.
- Use exact-string edits. Do not reformat, re-indent or reorder code you were not told to change. Keep the files' existing quote style (double quotes in `src/ui/screens/**` and `button.tsx`, single quotes in `AppShell.tsx`).
- If a step fails twice, stop and write it under "Builder notes".

## Steps

- [x] **Step 1 — `src/ui/screens/Onboarding.tsx`: replace the whole file with:**

```tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import type { UiLang } from "@/core/contracts";
import { cn } from "@/lib/utils";
import { useProfile } from "@/store/profile";
import { getSecret } from "@/store/secrets";
import { ErrorNote } from "@/ui/components/ErrorNote";
import { Button } from "@/ui/components/ui/button";
import { Spinner } from "@/ui/components/Spinner";
import { AiKeyStep, saveProviderKeys } from "./onboarding/AiKeyStep";
import { aiKeyMissing, buildProfile, firstInvalidStep, STEP_COUNT, validateStep, type Errors } from "./onboarding/draftRules";
import { GradesStep } from "./onboarding/GradesStep";
import { LanguagesStep } from "./onboarding/LanguagesStep";
import { NameStep } from "./onboarding/NameStep";
import { ProgramStep } from "./onboarding/ProgramStep";
import { ResidenceStep } from "./onboarding/ResidenceStep";
import { useOnboardingDraft } from "./onboarding/useOnboardingDraft";
import { WelcomeStep } from "./onboarding/WelcomeStep";

const LAST = STEP_COUNT - 1;
const RESIDENCE = 5;
/** The welcome is not a question: progress counts the six questions after it. */
const QUESTIONS = STEP_COUNT - 1;
const EASE = [0.2, 0, 0, 1] as const;

function uiLangOf(raw: string | undefined): UiLang {
  return raw === "es" || raw === "vi" ? raw : "en";
}

/**
 * First-run flow: one question per step in a centred 560px column on the ground (no sheet).
 * A quiet "Step n of 6" label and segmented bar on top, the actions left-aligned below.
 * The draft (including keys) lives in memory until Finish saves it.
 */
export function OnboardingScreen() {
  const { t, i18n } = useTranslation("onboarding");
  const navigate = useNavigate();
  const location = useLocation();
  // Opened from Settings ("Edit profile"): Finish returns there instead of the counselor.
  const fromSettings = (location.state as { from?: string } | null)?.from === "settings";
  const reduceMotion = useReducedMotion();
  const draft = useOnboardingDraft();
  const { step } = draft;
  const [dir, setDir] = useState<1 | -1>(1);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Editing an existing profile: fill the draft from it once, without keys.
  useEffect(() => {
    const state = useOnboardingDraft.getState();
    if (!state.prefilled) {
      const existing = useProfile.getState().profile;
      if (existing) state.prefill(existing);
    }
  }, []);

  // Keys already in the keychain need not be typed again. Only presence is read, never the value shown.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getSecret("openrouter"), getSecret("opencode")])
      .then(([openrouter, opencode]) => {
        if (cancelled) return;
        useOnboardingDraft.getState().set({
          storedKeys: { openrouter: Boolean(openrouter?.trim()), opencode: Boolean(opencode?.trim()) },
        });
      })
      .catch((err: unknown) => console.error("Could not read the saved keys", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const errors: Errors = attempted ? validateStep(step, draft) : {};

  const goTo = (to: number, direction: 1 | -1) => {
    setDir(direction);
    setAttempted(false);
    setFinishError(null);
    useOnboardingDraft.getState().set({ step: to });
  };

  const finish = async () => {
    setAttempted(true);
    const current = useOnboardingDraft.getState();
    const invalid = firstInvalidStep(current);
    if (invalid !== null) {
      setDir(-1);
      current.set({ step: invalid });
      return;
    }
    if (Object.keys(validateStep(LAST, current)).length > 0) return;

    setSaving(true);
    setFinishError(null);
    try {
      await saveProviderKeys({
        openrouter: current.openrouterKey.trim(),
        opencode: current.opencodeKey.trim(),
      });
      const profile = buildProfile(current, uiLangOf(i18n.resolvedLanguage));
      if (!profile) throw new Error("Some required answers are missing.");
      await useProfile.getState().save(profile);
      // Navigate first so the screen does not re-prefill from the profile just saved.
      navigate(fromSettings ? "/settings" : "/counselor", { replace: true });
      useOnboardingDraft.getState().reset();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === LAST) return void finish();
    setAttempted(true);
    if (Object.keys(validateStep(step, useOnboardingDraft.getState())).length > 0) return;
    goTo(step + 1, 1);
  };

  const skipResidence = () => {
    useOnboardingDraft.getState().set({ citizenship: null, residence: null });
    goTo(step + 1, 1);
  };

  const variants = {
    enter: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: d * 8 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: d * -8 }),
  };

  const body = (() => {
    switch (step) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <NameStep errors={errors} />;
      case 2:
        return <LanguagesStep errors={errors} />;
      case 3:
        return <ProgramStep errors={errors} />;
      case 4:
        return <GradesStep errors={errors} />;
      case RESIDENCE:
        return <ResidenceStep />;
      default:
        return <AiKeyStep errors={errors} />;
    }
  })();

  const nextLabel = step === 0 ? t("welcome.getStarted") : step === LAST ? t("actions.finish") : t("actions.next");

  return (
    <div className="relative min-h-full w-full px-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-[560px] flex-col pt-[clamp(2rem,12vh,7rem)] pb-16">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex flex-col"
        >
          {/* Progress: a quiet label over six thin segments; the current segment is the step's one ember mark.
              The welcome is not a question, so it shows none, but the slot keeps its height. */}
          <div className="flex min-h-8 flex-col justify-end gap-3">
            <p aria-live="polite" className="type-label text-chart-grey tabular-nums">
              {step > 0 ? t("steps.progress", { current: step, total: QUESTIONS }) : ""}
            </p>
            {step > 0 && (
              <div aria-hidden="true" className="flex w-full gap-1.5">
                {Array.from({ length: QUESTIONS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-pill transition-colors duration-180 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
                      i + 1 < step && "bg-foreground/60",
                      i + 1 === step && "bg-signal",
                      i + 1 > step && "bg-hairline",
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-12">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: EASE }}
              >
                {body}
              </motion.div>
            </AnimatePresence>
          </div>

          {finishError && (
            <div className="mt-8">
              <ErrorNote message={t("errors.saveFailed", { error: finishError })} />
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
            {step > 0 && (
              <Button
                type="button"
                variant="quiet"
                size="sm"
                className="-ml-4"
                disabled={saving}
                onClick={() => goTo(step - 1, -1)}
              >
                {t("actions.back")}
              </Button>
            )}
            <Button
              type="submit"
              variant="ink"
              autoFocus={step === 0}
              disabled={saving || (step === LAST && aiKeyMissing(draft))}
            >
              {saving ? (
                <>
                  <Spinner
                    label={t("actions.saving")}
                    className="size-3.5 border-2 border-background/30 border-t-background"
                  />
                  {t("actions.saving")}
                </>
              ) : (
                nextLabel
              )}
            </Button>
            {step === RESIDENCE ? (
              <Button type="button" variant="quiet" size="sm" disabled={saving} onClick={skipResidence}>
                {t("residence.skip")}
              </Button>
            ) : (
              !saving && (
                <span aria-hidden="true" className="hidden text-[0.8125rem] text-chart-grey sm:inline">
                  {t("actions.enterHint")}
                </span>
              )
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
```

  Check: the logic between `const reduceMotion` and `const nextLabel` is byte-for-byte the old file's logic (only the `QUESTIONS` constant and the `cn` import are added; the `Panel` import is gone).

- [x] **Step 2 — `src/ui/screens/onboarding/WelcomeStep.tsx`: replace the whole file with:**

```tsx
import { useTranslation } from "react-i18next";
import type { UiLang } from "@/core/contracts";
import { SegmentedControl } from "@/ui/components/SegmentedControl";

const UI_LANGS: UiLang[] = ["en", "es", "vi"];

/** Welcome: one display headline, one supporting line, and the interface language as a segmented control. */
export function WelcomeStep() {
  const { t, i18n } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const resolved = i18n.resolvedLanguage;
  const current: UiLang = resolved === "es" || resolved === "vi" ? resolved : "en";

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="type-display leading-[1.1] text-balance text-foreground">{t("welcome.title")}</h1>
        <p className="type-body max-w-[52ch] text-chart-grey">{t("welcome.subtitle")}</p>
      </header>
      <div className="flex flex-col gap-2">
        <span id="onboarding-ui-lang" className="text-[0.8125rem] font-medium text-foreground">
          {t("welcome.switchLabel")}
        </span>
        <SegmentedControl
          aria-labelledby="onboarding-ui-lang"
          options={UI_LANGS.map((lng) => ({ value: lng, label: tc(`language.${lng}`) }))}
          value={current}
          onChange={(lng) => void i18n.changeLanguage(lng)}
          className="self-start"
        />
      </div>
    </section>
  );
}
```

- [x] **Step 3 — `src/ui/screens/onboarding/StepParts.tsx`: replace the `StepHeading` function.**

  Old:
```tsx
/** Headline for one question on the sheet, with an optional note under it. */
export function StepHeading({ id, title, note }: { id?: string; title: string; note?: string }) {
  return (
    <header className="flex flex-col gap-2">
      <h2 id={id} className="text-2xl leading-[1.2] font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
      {note && <p className="max-w-[68ch] text-sm leading-[1.55] text-chart-grey">{note}</p>}
    </header>
  );
}
```
  New:
```tsx
/** The step's one headline (the page h1: the shell hides its title on onboarding), with an optional supporting line. */
export function StepHeading({ id, title, note }: { id?: string; title: string; note?: string }) {
  return (
    <header className="mb-2 flex flex-col gap-3">
      <h1 id={id} className="type-headline text-balance text-foreground">{title}</h1>
      {note && <p className="type-body max-w-[52ch] text-chart-grey">{note}</p>}
    </header>
  );
}
```
  (`mb-2` + the section's `gap-6` = 32px between the headline block and the first control.)

- [x] **Step 4 — step files (exact edits).**

  `src/ui/screens/onboarding/NameStep.tsx`:
  - Old: `<Field label={t("name.label")} hint={t("name.hint")} error={errorText("name")} className="max-w-md">`
  - New: `<Field label={t("name.label")} hint={t("name.hint")} error={errorText("name")}>`

  `src/ui/screens/onboarding/LanguagesStep.tsx`:
  - Old: `<Field label={t("languages.primaryLabel")} error={errorText("primaryLang")} className="max-w-md">`
    New: `<Field label={t("languages.primaryLabel")} error={errorText("primaryLang")}>`
  - Old: `            <Button type="button" onClick={() => void i18n.changeLanguage(promptFor)}>`
    New: `            <Button type="button" variant="secondary" size="sm" onClick={() => void i18n.changeLanguage(promptFor)}>`
  - Old: `        <span className="text-xs text-foreground">{t("languages.extraLabel")}</span>`
    New: `        <span className="text-[0.8125rem] font-medium text-foreground">{t("languages.extraLabel")}</span>`

  `src/ui/screens/onboarding/ProgramStep.tsx`:
  - Old: `/** Step 4: one program, as large radio rows with a signal rule on the selected one. */`
    New: `/** Step 4: one program, as large radio rows; the selected one is raised on shoal with a rim. */`
  - Delete these three lines (the ember dot; the step's one ember mark is the progress segment):
```tsx
                {checked && (
                  <span aria-hidden="true" className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-signal" />
                )}
```

  `src/ui/screens/onboarding/GradesStep.tsx`:
  - Old: `            <span className="text-xs text-foreground">{t("grades.ib.subjects")}</span>`
    New: `            <span className="text-[0.8125rem] font-medium text-foreground">{t("grades.ib.subjects")}</span>`
  - Old: `            <span className="text-xs text-foreground">{t("grades.ap.exams")}</span>`
    New: `            <span className="text-[0.8125rem] font-medium text-foreground">{t("grades.ap.exams")}</span>`

- [x] **Step 5 — `src/ui/components/ui/button.tsx`: add the `ink` variant.**

  Old:
```tsx
        quiet: "text-chart-grey hover:text-foreground hover:underline underline-offset-4",
      },
```
  New:
```tsx
        quiet: "text-chart-grey hover:text-foreground hover:underline underline-offset-4",
        // Solid ink, no gradient and no glow: onboarding's primary action (its one ember mark is the progress segment).
        ink: "bg-foreground text-background hover:bg-foreground/85 disabled:opacity-100 disabled:bg-shoal disabled:text-chart-grey",
      },
```
  Also update the doc comment above `buttonVariants`. Old:
```
 * ember glow); secondary is a panel with a 1px hairline (a flat control); quiet is text only. Press scales to 0.97.
```
  New:
```
 * ember glow); secondary is a panel with a 1px hairline (a flat control); quiet is text only; ink is a solid
 * foreground fill (onboarding). Press scales to 0.97.
```

- [x] **Step 6 — `src/ui/layout/AppShell.tsx`: hide the shell title on onboarding.**

  Old:
```ts
  // The counselor, the Finder and My universities fill the working column: the Finder's globe needs the
  // space above its bottom dock, and the university cards/editor start at the top.
  const hideTitle = onCounselor || location.pathname === '/finder' || location.pathname === '/my-unis';
```
  New:
```ts
  // The counselor, the Finder and My universities fill the working column: the Finder's globe needs the
  // space above its bottom dock, and the university cards/editor start at the top. Onboarding's step
  // headline is its own h1.
  const hideTitle =
    onCounselor ||
    location.pathname === '/finder' ||
    location.pathname === '/my-unis' ||
    location.pathname === '/onboarding';
```

- [x] **Step 7 — i18n (`src/i18n/locales/{en,es,vi}/onboarding.json`).** Replace these values (keys unchanged) and add one key `actions.enterHint` after `actions.saving` in all three files. Edit values only; keep 2-space JSON formatting. No `<strong>` remains anywhere.

  **en**
  | key | new value |
  |---|---|
  | `welcome.title` | `Find universities that fit the career you want.` |
  | `welcome.subtitle` | `Six short questions. Then Compass helps you choose a career and Atlas finds real universities that teach it.` |
  | `name.title` | `What should we call you?` |
  | `name.placeholder` | `First name or nickname` |
  | `grades.title` | `Your grades` |
  | `grades.note` | `Optional. They help us suggest realistic options. Leave blank anything you do not have.` |
  | `residence.title` | `Citizenship and residence` |
  | `residence.note` | `Optional. Tuition-free status often depends on these.` |
  | `actions.enterHint` (new) | `or press Enter` |

  **es**
  | key | new value |
  |---|---|
  | `welcome.title` | `Encuentra universidades que encajen con la carrera que quieres.` |
  | `welcome.subtitle` | `Seis preguntas breves. Después, Brújula te ayuda a elegir una carrera y Atlas encuentra universidades reales que la enseñan.` |
  | `name.title` | `¿Cómo quieres que te llamemos?` |
  | `name.placeholder` | `Nombre o apodo` |
  | `grades.title` | `Tus calificaciones` |
  | `grades.note` | `Opcional. Nos ayudan a sugerirte opciones realistas. Deja en blanco lo que no tengas.` |
  | `residence.title` | `Ciudadanía y residencia` |
  | `residence.note` | `Opcional. La gratuidad de la matrícula suele depender de estos datos.` |
  | `actions.enterHint` (new) | `o pulsa Intro` |

  **vi**
  | key | new value |
  |---|---|
  | `welcome.title` | `Tìm trường đại học phù hợp với nghề nghiệp bạn muốn.` |
  | `welcome.subtitle` | `Sáu câu hỏi ngắn. Sau đó, La bàn giúp bạn chọn nghề nghiệp và Bản đồ tìm các trường đại học thật có dạy ngành đó.` |
  | `name.title` | `Chúng tôi nên gọi bạn là gì?` |
  | `name.placeholder` | `Tên hoặc biệt danh` |
  | `grades.title` | `Điểm số của bạn` |
  | `grades.note` | `Không bắt buộc. Điểm số giúp chúng tôi gợi ý các lựa chọn thực tế. Để trống những gì bạn không có.` |
  | `residence.title` | `Quốc tịch và nơi cư trú` |
  | `residence.note` | `Không bắt buộc. Việc miễn học phí thường phụ thuộc vào những thông tin này.` |
  | `actions.enterHint` (new) | `hoặc nhấn Enter` |

  The `actions` block in en must read:
```json
  "actions": {
    "next": "Next",
    "back": "Back",
    "finish": "Finish",
    "saving": "Saving…",
    "enterHint": "or press Enter"
  },
```
  (es/vi: same shape with their existing values plus the new line.)

- [x] **Step 8 — run the verify commands** (below) and fix only what this plan touched.

- [x] **Step 9 — docs (exact edits).**

  `DESIGN.md`:
  1. Old: `- Headlines are two-tone: grey body text with the key phrase in ink, used on the welcome headline and empty-state titles only.`
     New: `- Headlines are two-tone: grey body text with the key phrase in ink, used on empty-state titles only.`
  2. Old: `- **Display** (600, 56px / 1.0, tracking -0.035em): screen titles, and the large numerals on the onboarding step, the rank and the summary strip (`.type-display`).`
     New: `- **Display** (600, 56px / 1.0, tracking -0.035em): screen titles, the onboarding welcome headline (line height 1.1), and the large numerals on the rank and the summary strip (`.type-display`).`
  3. Old: `**The Two-Tone Rule.** A headline may be two-tone only on the onboarding welcome and on empty-state titles:`
     New: `**The Two-Tone Rule.** A headline may be two-tone only on empty-state titles:`
  4. Old: `**The Numeral Rule.** Large numerals may take the ember gradient (`.numeral-ember`) and only where a number is the point of the line: the onboarding step, a result's rank,`
     New: `**The Numeral Rule.** Large numerals may take the ember gradient (`.numeral-ember`) and only where a number is the point of the line: a result's rank,`
  5. Old: `Onboarding is a single 640px sheet.`
     New: `Onboarding is a single centred 560px column directly on the ground, with no sheet.`
  6. In `### Buttons`, after the `- **Quiet:** …` line insert:
     `- **Ink:** pill, 40px, a solid foreground fill (white in dark, near-black in light) with ground-coloured text; no gradient, no glow, hover at 85%. Onboarding's primary action only, where the step's ember mark is the progress segment.`
  7. Insert a new section directly before `### University detail`:

```markdown
### Onboarding
Implemented in `src/ui/screens/Onboarding.tsx` and `src/ui/screens/onboarding/` (plan 38).
- **No card.** The steps sit directly on the ground (stars and haze) in one centred 560px column with a 24px gutter (32px from 640px). The column's top is anchored at `clamp(2rem, 12vh, 7rem)` so the progress and headline keep the same position on every step. The shell hides its page title here; each step headline is the page `h1`.
- **Progress:** steps 1 to 6 (the welcome is not a question and shows none, keeping the slot's 32px height): a "Step n of 6" label (13px, weight 500, Chart Grey, tabular, `aria-live="polite"`) over six 4px pill segments, the same as the counselor intake: done ink at 60%, current signal, upcoming hairline. The current segment is the step's one ember mark.
- **Type:** one headline per step, one weight. The welcome headline is Display (line height 1.1), every other step Headline, both balanced. At most one supporting line in Body, Chart Grey, 52ch. "Optional" lives in that line, never in the headline.
- **Controls:** the shared Input, Select, Combobox and Field, full column width except short number fields. The interface language on the welcome is a `SegmentedControl`. Group labels use the Field label style (13px, weight 500).
- **Actions:** one left-aligned row under the content, 40px below it: a quiet Back (its text on the column edge), the Ink primary (Get started, Next, Finish), then a quiet "or press Enter" hint (hidden under 640px and while saving), or a quiet Skip on the residence step. Enter submits.
- **One ember mark per step:** the current progress segment. No `.panel-ember`, no `.numeral-ember`, no ember dot on the selected program row, no ember button.
- **Motion:** steps change with a fade and an 8px slide in the direction of travel, 180ms, `cubic-bezier(0.2, 0, 0, 1)`; opacity only under reduced motion. Segments change colour over 180ms (none under reduced motion).
```

  `.plans/A-build-conventions.md`:
  - Old: `- Two-tone headlines (grey body, ink phrase in a `<strong>`) only on the onboarding welcome and empty-state titles.`
    New: `- Two-tone headlines (grey body, ink phrase in a `<strong>`) only on empty-state titles.`

## Verify
```bash
bun run build
bun run check:i18n
bun test
# Presentation-only checks (each must print nothing):
grep -nE "Panel|panel-ember|numeral-ember|type-display" src/ui/screens/Onboarding.tsx
grep -nE "Trans|Chip|<strong" src/ui/screens/onboarding/WelcomeStep.tsx
grep -n "<strong>" src/i18n/locales/*/onboarding.json
grep -n "bg-signal" src/ui/screens/onboarding/ProgramStep.tsx
# Logic untouched (must print nothing):
git diff --stat -- src/ui/screens/onboarding/draftRules.ts src/ui/screens/onboarding/useOnboardingDraft.ts src/ui/screens/onboarding/AiKeyStep.tsx src/ui/screens/onboarding/ResidenceStep.tsx
```
Orchestrator (visual, app started by the orchestrator, not the builder): welcome at 1920x1080 and ~900px wide in dark and light; steps 1–6 show "Step n of 6" with the right segment ember; Back aligns to the column edge; Enter advances; Settings → Edit profile opens prefilled and Finish returns to Settings; switching language on the welcome updates every string; reduced motion shows fade only.

## Builder notes
- `bun run build`: pass (exit 0).
- `bun run check:i18n`: pass (6 namespaces, es and vi match en).
- `bun test`: 269 pass, 0 fail.
- `tsc -p . --noEmit`: no errors in the touched files.
- Presentation greps: checks 1, 3, 4 print nothing; `git diff --stat` on draftRules, useOnboardingDraft, AiKeyStep, ResidenceStep prints nothing; the logic between `const reduceMotion` and `const nextLabel` is identical to HEAD.
- Deviation: check 2 (`grep -nE "Trans|Chip|<strong"` on WelcomeStep.tsx) matches `useTranslation` in the plan's own import line. The intended check (`<Trans|Chip|<strong`) prints nothing.
- Not run: app start, visual checks (orchestrator). No commits made.
