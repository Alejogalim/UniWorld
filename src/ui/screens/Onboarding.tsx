import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import type { UiLang } from "@/core/contracts";
import { useProfile } from "@/store/profile";
import { getSecret } from "@/store/secrets";
import { ErrorNote } from "@/ui/components/ErrorNote";
import { Panel } from "@/ui/components/Panel";
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
const EASE = [0.2, 0, 0, 1] as const;

function uiLangOf(raw: string | undefined): UiLang {
  return raw === "es" || raw === "vi" ? raw : "en";
}

/**
 * First-run sheet: one question per step, 640px wide, controls bottom-left.
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
    <div className="isolate relative min-h-full w-full">
      <div className="relative mx-auto flex min-h-full w-full max-w-[640px] flex-col px-12 py-8">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex flex-col"
        >
          <Panel variant="ember" className="flex flex-col gap-8 p-8">
          <div className="flex flex-col gap-3">
            <p className="sr-only">{t("steps.progress", { current: step + 1, total: STEP_COUNT })}</p>
            {/* The step number is the one large numeral on the sheet: "2/7", with the rest of the line in grey. */}
            <p aria-hidden="true" className="flex items-baseline gap-2">
              <span className="numeral-ember type-display">{step + 1}</span>
              <span className="type-title text-chart-grey">/{STEP_COUNT}</span>
            </p>
            <div className="h-px w-full bg-hairline" aria-hidden="true">
              <div
                className="h-px bg-foreground transition-[width] duration-180 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
                style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
              />
            </div>
          </div>

          <div>
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

          {finishError && <ErrorNote message={t("errors.saveFailed", { error: finishError })} />}

          <div className="flex flex-wrap items-center gap-2">
            {step > 0 && (
              <Button type="button" variant="secondary" disabled={saving} onClick={() => goTo(step - 1, -1)}>
                {t("actions.back")}
              </Button>
            )}
            {step === RESIDENCE && (
              <Button type="button" variant="quiet" disabled={saving} onClick={skipResidence}>
                {t("residence.skip")}
              </Button>
            )}
            <Button
              type="submit"
              autoFocus={step === 0}
              disabled={saving || (step === LAST && aiKeyMissing(draft))}
            >
              {saving ? (
                <>
                  <Spinner label={t("actions.saving")} className="size-3.5 border-2" />
                  {t("actions.saving")}
                </>
              ) : (
                nextLabel
              )}
            </Button>
          </div>
          </Panel>
        </form>
      </div>
    </div>
  );
}
