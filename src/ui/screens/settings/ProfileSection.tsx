import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { UiLang } from '@/core/contracts';
import { useProfile } from '@/store/profile';
import { countryName } from '@/ui/data/countries';
import { languageName } from '@/ui/data/languages';
import { useOnboardingDraft } from '@/ui/screens/onboarding/useOnboardingDraft';
import { Button } from '@/ui/components/ui/button';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

/** One identity row. Editing reuses the onboarding sheet, which returns here on Finish. */
export function ProfileSection() {
  const { t, i18n } = useTranslation(['settings', 'onboarding']);
  const navigate = useNavigate();
  const profile = useProfile((s) => s.profile);
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  if (!profile) {
    return (
      <SettingsGroup id="settings-profile" title={t('sections.profile')}>
        <SettingsRow label={t('profile.empty')}>
          <Button size="sm" onClick={() => navigate('/onboarding')}>
            {t('profile.create')}
          </Button>
        </SettingsRow>
      </SettingsGroup>
    );
  }

  const initial = (Array.from(profile.name.trim())[0] ?? '').toLocaleUpperCase(uiLang);
  const levelText = (level: string) => (level === 'native' ? t('onboarding:levels.native') : level);
  const languages = [
    languageName(profile.primaryLang, uiLang),
    ...profile.languages.map((l) =>
      t('profile.languageLevel', { language: languageName(l.lang, uiLang), level: levelText(l.level) }),
    ),
  ];
  const place = profile.residence ?? profile.citizenship;
  const summary = [
    t(`onboarding:program.${profile.program}`),
    place ? countryName(place, uiLang) : null,
    new Intl.ListFormat(uiLang, { style: 'short', type: 'unit' }).format(languages),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SettingsGroup id="settings-profile" title={t('sections.profile')}>
      <SettingsRow
        leading={
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-shoal text-sm font-semibold text-foreground">
            {initial}
          </span>
        }
        label={<span className="font-medium">{profile.name}</span>}
        description={summary}
      >
        <Button
          size="sm"
          onClick={() => {
            // A draft left from an earlier visit (typed keys included) must not reappear: start from the saved profile.
            useOnboardingDraft.getState().reset();
            navigate('/onboarding', { state: { from: 'settings' } });
          }}
        >
          {t('profile.edit')}
        </Button>
      </SettingsRow>
    </SettingsGroup>
  );
}
