import { useTranslation } from "react-i18next";
import { Field } from "@/ui/components/Field";
import { Input } from "@/ui/components/Input";
import { useOnboardingDraft } from "./useOnboardingDraft";
import { type Errors } from "./draftRules";
import { StepHeading, StepSection, useErrorText } from "./StepParts";

/** Step 2: the name the AI uses. Required, trimmed, 1 to 60 characters. */
export function NameStep({ errors }: { errors: Errors }) {
  const { t } = useTranslation("onboarding");
  const errorText = useErrorText(errors);
  const name = useOnboardingDraft((s) => s.name);
  const set = useOnboardingDraft((s) => s.set);

  return (
    <StepSection>
      <StepHeading title={t("name.title")} />
      <Field label={t("name.label")} hint={t("name.hint")} error={errorText("name")}>
        {(c) => (
          <Input
            {...c}
            autoFocus
            autoComplete="off"
            value={name}
            placeholder={t("name.placeholder")}
            onChange={(e) => set({ name: e.target.value })}
          />
        )}
      </Field>
    </StepSection>
  );
}
