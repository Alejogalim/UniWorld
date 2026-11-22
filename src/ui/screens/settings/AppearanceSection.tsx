import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UiLang } from '@/core/contracts';
import { changeUiLanguage } from '@/app/language';
import { useTheme, type ThemeMode } from '@/app/theme';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { Select } from '@/ui/components/Input';
import { SettingsGroup, SettingsRow, messageOf } from './SettingsGroup';

const LANGS: UiLang[] = ['en', 'es', 'vi'];
const MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** Interface language (same behaviour as the rail switcher) and the color theme. */
export function AppearanceSection() {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const [error, setError] = useState<string | null>(null);
  const langId = useId();
  const themeLabelId = useId();

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup id="settings-appearance" title={t('sections.appearance')}>
        <SettingsRow label={t('appearance.language')} htmlFor={langId}>
          <div className="w-full sm:w-52">
            <Select
              id={langId}
              className="h-9"
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
          </div>
        </SettingsRow>
        <SettingsRow label={t('appearance.theme')} labelId={themeLabelId}>
          <SegmentedControl
            aria-labelledby={themeLabelId}
            value={mode}
            options={MODES.map((m) => ({ value: m, label: t(`common:theme.${m}`) }))}
            onChange={(next) => {
              setError(null);
              setMode(next).catch((err: unknown) => setError(t('common:errors.saveFailed', { error: messageOf(err) })));
            }}
          />
        </SettingsRow>
      </SettingsGroup>
      {error && <ErrorNote message={error} />}
    </div>
  );
}
