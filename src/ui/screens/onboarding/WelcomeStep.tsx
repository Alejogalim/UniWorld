import { Trans, useTranslation } from "react-i18next";
import { Chip } from "@/ui/components/Chip";

const UI_LANGS = ["en", "es", "vi"] as const;

/** Step 1: a display-size title, one plain line, and the interface language. */
export function WelcomeStep() {
  const { t, i18n } = useTranslation("onboarding");
  const { t: tc } = useTranslation("common");
  const current = i18n.resolvedLanguage;

  return (
    <section className="flex flex-col gap-8">
      {/* Two-tone headline: grey body, with the key phrase in ink (the phrase is set in onboarding.json). */}
      <h2 className="max-w-[92%] text-[2.75rem] leading-[1.08] font-normal tracking-[-0.025em] text-chart-grey">
        <Trans
          i18nKey="welcome.title"
          ns="onboarding"
          components={{ strong: <strong className="font-semibold text-foreground" /> }}
        />
      </h2>
      <p className="max-w-[68ch] text-base leading-[1.6] text-foreground">{t("welcome.subtitle")}</p>
      <div className="flex flex-col gap-2">
        <span id="onboarding-ui-lang" className="text-xs text-foreground">
          {t("welcome.switchLabel")}
        </span>
        <div role="group" aria-labelledby="onboarding-ui-lang" className="flex flex-wrap gap-2">
          {UI_LANGS.map((lng) => (
            <Chip key={lng} selected={current === lng} onClick={() => void i18n.changeLanguage(lng)}>
              {tc(`language.${lng}`)}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
}
