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
