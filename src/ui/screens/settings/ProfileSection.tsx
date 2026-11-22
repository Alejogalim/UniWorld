import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { UiLang } from '@/core/contracts';
import { useProfile } from '@/store/profile';
import { countryName } from '@/ui/data/countries';
import { languageName } from '@/ui/data/languages';
import { Button } from '@/ui/components/ui/button';
import { SettingsRow, SettingsSection } from './SettingsSection';

/** A read-only summary of the profile. Editing reuses the onboarding sheet, which returns here on Finish. */
export function ProfileSection() {
  const { t, i18n } = useTranslation(['settings', 'onboarding']);
  const navigate = useNavigate();
  const profile = useProfile((s) => s.profile);
  const uiLang = (i18n.resolvedLanguage ?? 'en') as UiLang;

  if (!profile) {
    return (
      <SettingsSection id="settings-profile" title={t('sections.profile')} line={t('sections.profileLine')}>
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-[68ch] text-sm text-foreground">{t('profile.empty')}</p>
          <Button variant="secondary" onClick={() => navigate('/onboarding')}>
            {t('profile.create')}
          </Button>
        </div>
      </SettingsSection>
    );
  }

  const others = profile.languages.map((l) =>
    t('profile.languageLevel', {
      language: languageName(l.lang, uiLang),
      level: t(`onboarding:levels.${l.level}`),
    }),
  );
  const list = new Intl.ListFormat(uiLang, { style: 'long', type: 'conjunction' });

  return (
    <SettingsSection id="settings-profile" title={t('sections.profile')} line={t('sections.profileLine')}>
      <div className="flex flex-col gap-4">
        <dl className="flex flex-col border-t border-hairline">
          <SettingsRow label={t('profile.name')}>{profile.name}</SettingsRow>
          <SettingsRow label={t('profile.primaryLanguage')}>{languageName(profile.primaryLang, uiLang)}</SettingsRow>
          <SettingsRow label={t('profile.otherLanguages')}>
            {others.length > 0 ? list.format(others) : t('profile.none')}
          </SettingsRow>
          <SettingsRow label={t('profile.program')}>{t(`onboarding:program.${profile.program}`)}</SettingsRow>
          {profile.citizenship && (
            <SettingsRow label={t('profile.citizenship')}>{countryName(profile.citizenship, uiLang)}</SettingsRow>
          )}
          {profile.residence && (
            <SettingsRow label={t('profile.residence')}>{countryName(profile.residence, uiLang)}</SettingsRow>
          )}
        </dl>
        <div>
          <Button variant="secondary" onClick={() => navigate('/onboarding', { state: { from: 'settings' } })}>
            {t('profile.edit')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
