import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import type { UiLang } from '@/core/contracts';

const LANGS: UiLang[] = ['en', 'es', 'vi'];

/** Sidebar-footer language switcher: a 32px icon button over a native select. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current = (i18n.resolvedLanguage ?? 'en') as UiLang;

  return (
    <label className="lang-button" title={t('language.label')}>
      <Languages className="size-4" aria-hidden="true" />
      <select
        aria-label={t('language.label')}
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
