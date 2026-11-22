import i18n from '@/i18n';
import type { UiLang } from '@/core/contracts';
import { useProfile } from '@/store/profile';

/** Changes the interface language and, when a profile exists, saves it so the next launch opens in it. */
export async function changeUiLanguage(lng: UiLang): Promise<void> {
  await i18n.changeLanguage(lng);
  const { profile, save } = useProfile.getState();
  if (profile) await save({ ...profile, uiLang: lng });
}
