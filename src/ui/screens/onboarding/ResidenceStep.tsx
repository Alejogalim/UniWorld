import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/ui/components/Combobox";
import { Field } from "@/ui/components/Field";
import { countryOptions } from "./options";
import { useOnboardingDraft } from "./useOnboardingDraft";
import { StepHeading, StepSection } from "./StepParts";

/** Step 6 (optional): citizenship and residence. Skip is in the footer and clears both. */
export function ResidenceStep() {
  const { t, i18n } = useTranslation("onboarding");
  const ui = i18n.resolvedLanguage ?? "en";
  const citizenship = useOnboardingDraft((s) => s.citizenship);
  const residence = useOnboardingDraft((s) => s.residence);
  const set = useOnboardingDraft((s) => s.set);
  const options = useMemo(() => countryOptions(ui), [ui]);

  return (
    <StepSection>
      <StepHeading title={t("residence.title")} note={t("residence.note")} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label={t("residence.citizenship")}>
          {(c) => (
            <Combobox
              id={c.id}
              autoFocus
              options={options}
              value={citizenship}
              onChange={(code) => set({ citizenship: code })}
              placeholder={t("languages.searchPlaceholder")}
              noMatchesLabel={t("languages.noMatches")}
            />
          )}
        </Field>
        <Field label={t("residence.residence")}>
          {(c) => (
            <Combobox
              id={c.id}
              options={options}
              value={residence}
              onChange={(code) => set({ residence: code })}
              placeholder={t("languages.searchPlaceholder")}
              noMatchesLabel={t("languages.noMatches")}
            />
          )}
        </Field>
      </div>
    </StepSection>
  );
}
