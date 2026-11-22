import i18n from '@/i18n';
import { resetCounselorState } from '@/ui/screens/counselor/useCounselor';
import { resetFinderState } from '@/ui/screens/finder/useFinder';
import { useOnboardingDraft } from '@/ui/screens/onboarding/useOnboardingDraft';
import { useTheme } from '@/app/theme';
import { getDb } from '@/db/client';
import { useProfile } from '@/store/profile';
import { deleteSecret } from '@/store/secrets';
import { useTracked } from '@/store/tracked';

/** Child tables first, so the foreign keys never block a delete. `settings` goes last. */
const TABLES = [
  'counselor_message',
  'career_path',
  'counselor_session',
  'uni_search',
  'uni_detail_cache',
  'tracked_uni',
  'profile_language',
  'profile',
  'settings',
];

/**
 * Deletes everything UniWorld keeps on this computer, then resets every in-memory store so
 * the app behaves like a first launch. Keys are removed from the OS keychain as well.
 */
export async function deleteAllLocalData(): Promise<void> {
  // Written first so the theme row is then removed with the rest of the settings.
  await useTheme.getState().setMode('system');

  const db = await getDb();
  for (const table of TABLES) {
    await db.execute(`DELETE FROM ${table}`);
  }
  await deleteSecret('openrouter');
  await deleteSecret('opencode');

  useProfile.setState({ profile: null, loaded: true });
  useTracked.setState({ items: [], loaded: false });
  resetFinderState();
  resetCounselorState();
  useOnboardingDraft.getState().reset();
  await i18n.changeLanguage('en');
}
