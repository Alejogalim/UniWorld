import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "@/core/contracts";
import { Button } from "@/ui/components/ui/button";
import { Combobox } from "@/ui/components/Combobox";
import { Field } from "@/ui/components/Field";
import { Select } from "@/ui/components/Input";
import { languageName } from "@/ui/data/languages";
import { languageOptions } from "./options";
import { newRowKey, useOnboardingDraft } from "./useOnboardingDraft";
import { type Errors } from "./draftRules";
import { RowErrors, StepHeading, StepSection, useErrorText } from "./StepParts";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2", "native"];
/** Interface languages the switch prompt is offered for (Design 7.1, step 3). */
const PROMPT_LANGS = ["es", "vi"];

/** The language's own name, capitalised, e.g. "español", "Tiếng Việt". */
function nativeName(code: string): string {
  const name = languageName(code, code);
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

/** Step 3: a required primary language, then optional extra languages, each with a level. */
export function LanguagesStep({ errors }: { errors: Errors }) {
  const { t, i18n } = useTranslation("onboarding");
  const errorText = useErrorText(errors);
  const ui = i18n.resolvedLanguage ?? "en";
  const primaryLang = useOnboardingDraft((s) => s.primaryLang);
  const rows = useOnboardingDraft((s) => s.languages);
  const set = useOnboardingDraft((s) => s.set);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const options = useMemo(() => languageOptions(ui), [ui]);

  // Offered only when the primary language is one the interface also ships in, and not yet answered.
  const promptFor =
    primaryLang && PROMPT_LANGS.includes(primaryLang) && primaryLang !== ui && dismissedFor !== primaryLang
      ? primaryLang
      : null;

  const updateRow = (key: number, patch: { lang?: string | null; level?: Level | null }) =>
    useOnboardingDraft.setState((s) => ({
      languages: s.languages.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));

  const removeRow = (key: number) =>
    useOnboardingDraft.setState((s) => ({ languages: s.languages.filter((r) => r.key !== key) }));

  return (
    <StepSection>
      <StepHeading id="onboarding-languages-title" title={t("languages.title")} />

      <Field label={t("languages.primaryLabel")} error={errorText("primaryLang")} className="max-w-md">
        {(c) => (
          <Combobox
            id={c.id}
            aria-describedby={c["aria-describedby"]}
            invalid={c["aria-invalid"]}
            autoFocus
            options={options}
            value={primaryLang}
            onChange={(lang) => set({ primaryLang: lang })}
            placeholder={t("languages.searchPlaceholder")}
            noMatchesLabel={t("languages.noMatches")}
          />
        )}
      </Field>

      {promptFor && (
        <div className="flex flex-col gap-3 rounded-control bg-shoal p-4">
          <p className="text-sm text-foreground">
            {t("languages.switchPrompt", { lang: nativeName(promptFor) })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void i18n.changeLanguage(promptFor)}>
              {t("languages.switchYes")}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={() => setDismissedFor(promptFor)}>
              {t("languages.switchNo")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-xs text-foreground">{t("languages.extraLabel")}</span>
        {rows.map((row) => {
          const langError = errorText(`lang-${row.key}`);
          const levelError = errorText(`level-${row.key}`);
          return (
            <div key={row.key} className="flex flex-col gap-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center">
                <Combobox
                  id={`onboarding-lang-${row.key}`}
                  aria-label={t("languages.extraLabel")}
                  invalid={Boolean(langError)}
                  options={options}
                  value={row.lang}
                  onChange={(lang) => updateRow(row.key, { lang })}
                  placeholder={t("languages.searchPlaceholder")}
                  noMatchesLabel={t("languages.noMatches")}
                />
                <Select
                  aria-label={t("languages.levelLabel")}
                  aria-invalid={Boolean(levelError) || undefined}
                  value={row.level ?? ""}
                  onChange={(e) => updateRow(row.key, { level: (e.target.value || null) as Level | null })}
                >
                  <option value="" disabled>
                    {t("languages.levelPlaceholder")}
                  </option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {t(`levels.${l}`)}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="quiet" size="sm" onClick={() => removeRow(row.key)}>
                  {t("languages.remove")}
                </Button>
              </div>
              <RowErrors messages={[langError, levelError]} />
            </div>
          );
        })}
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => set({ languages: [...rows, { key: newRowKey(), lang: null, level: null }] })}
          >
            {t("languages.addLanguage")}
          </Button>
        </div>
      </div>
    </StepSection>
  );
}
