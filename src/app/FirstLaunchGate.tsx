import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useProfile } from '@/store/profile';
import { Button } from '@/ui/components/ui/button';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Panel } from '@/ui/components/Panel';
import { Spinner } from '@/ui/components/Spinner';

/** Loads the profile on startup, applies its UI language, and shows a retry if loading fails. */
export function FirstLaunchGate() {
  const { t, i18n } = useTranslation('common');
  const loaded = useProfile((s) => s.loaded);
  const load = useProfile((s) => s.load);
  const [loadError, setLoadError] = useState<string | null>(null);

  const startLoad = useCallback(() => {
    setLoadError(null);
    load()
      .then(() => {
        const profile = useProfile.getState().profile;
        if (profile) return i18n.changeLanguage(profile.uiLang);
      })
      .catch((err: unknown) => {
        console.error('Failed to load profile', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [load, i18n]);

  useEffect(() => {
    startLoad();
  }, [startLoad]);

  if (loadError !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Panel className="max-w-[480px]">
          <ErrorNote
            title={t('error.startupTitle')}
            message={loadError}
            action={
              <Button variant="secondary" size="md" onClick={startLoad}>
                {t('error.tryAgain')}
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label={t('loading')} className="size-8 border-[3px]" />
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
