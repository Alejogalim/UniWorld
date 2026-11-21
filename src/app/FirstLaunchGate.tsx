import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/store/profile';

/** Loads the profile on startup and shows a spinner until it is known. */
export function FirstLaunchGate() {
  const { t } = useTranslation('common');
  const loaded = useProfile((s) => s.loaded);
  const load = useProfile((s) => s.load);

  useEffect(() => {
    load().catch((err) => console.error('Failed to load profile', err));
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          role="status"
          aria-label={t('loading')}
          className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
        />
      </div>
    );
  }
  return <Outlet />;
}

/** `/` goes to onboarding on first launch, otherwise to the counselor. */
export function RootRedirect() {
  const profile = useProfile((s) => s.profile);
  return <Navigate to={profile === null ? '/onboarding' : '/counselor'} replace />;
}
