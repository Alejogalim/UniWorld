import { useTranslation } from 'react-i18next';
import type { UiLang } from '@/core/contracts';

const LANGS: UiLang[] = ['en', 'es', 'vi'];

/** Temporary UI-language switcher in the sidebar footer; fine to keep. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current = (i18n.resolvedLanguage ?? 'en') as UiLang;

  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {t('language.label')}
      <select
        className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {LANGS.map((lng) => (
          <option key={lng} value={lng}>
            {t(`language.${lng}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
