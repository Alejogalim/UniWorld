import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLang } from '@/core/contracts';
import { changeUiLanguage } from '@/app/language';
import { useTheme, type ThemeMode } from '@/app/theme';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Field } from '@/ui/components/Field';
import { Select } from '@/ui/components/Input';
import { SettingsSection, messageOf } from './SettingsSection';

const LANGS: UiLang[] = ['en', 'es', 'vi'];
const MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** Interface language (same behaviour as the rail switcher) and the color theme. */
export function InterfaceSection() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const [error, setError] = useState<string | null>(null);

  return (
    <SettingsSection id="settings-interface" title={t('sections.interface')} line={t('sections.interfaceLine')}>
      <div className="grid max-w-[640px] gap-5 sm:grid-cols-2">
        <Field label={t('interface.language')}>
          {(c) => (
            <Select
              {...c}
              value={uiLang}
              onChange={(e) => {
                setError(null);
                changeUiLanguage(e.target.value as UiLang).catch((err: unknown) =>
                  setError(t('common:errors.saveFailed', { error: messageOf(err) })),
                );
              }}
            >
              {LANGS.map((lng) => (
                <option key={lng} value={lng}>
                  {t(`common:language.${lng}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('interface.theme')}>
          {(c) => (
            <Select
              {...c}
              value={mode}
              onChange={(e) => {
                setError(null);
                setMode(e.target.value as ThemeMode).catch((err: unknown) =>
                  setError(t('common:errors.saveFailed', { error: messageOf(err) })),
                );
              }}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {t(`common:theme.${m}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {error && <ErrorNote message={error} />}
    </SettingsSection>
  );
}
