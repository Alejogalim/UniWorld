import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import type { UiLang } from '@/core/contracts';
import { useProfile } from '@/store/profile';

const LANGS: UiLang[] = ['en', 'es', 'vi'];

/** Sidebar-footer language switcher: a 32px icon button over a native select. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current = (i18n.resolvedLanguage ?? 'en') as UiLang;

  // Changing the language also saves it on the profile, so the next launch opens in it.
  const changeLanguage = (lng: UiLang) => {
    void i18n.changeLanguage(lng);
    const { profile, save } = useProfile.getState();
    if (profile) {
      save({ ...profile, uiLang: lng }).catch((err: unknown) => console.error('Failed to save UI language', err));
    }
  };

  return (
    <label className="lang-button" title={t('language.label')}>
      <Languages className="size-4" aria-hidden="true" />
      <select
        aria-label={t('language.label')}
        value={current}
        onChange={(e) => changeLanguage(e.target.value as UiLang)}
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
