import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Button } from '@/ui/components/ui/button';
import { deleteAllLocalData } from './deleteAllData';
import { messageOf, SettingsGroup, SettingsRow } from './SettingsGroup';

/** Deletes everything stored on this computer, behind an inline confirmation. */
export function DataSection() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const erase = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAllLocalData();
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(t('data.deleteFailed', { error: messageOf(err) }));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SettingsGroup id="settings-data" title={t('sections.data')}>
        <SettingsRow
          label={t('data.clear')}
          below={
            confirming ? (
              <div className="flex flex-col gap-3 border-l-2 border-hairline pl-4">
                <p className="text-sm text-foreground">{t('data.clearConfirm')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" className="text-signal" disabled={busy} onClick={() => void erase()}>
                    {busy ? t('data.deleting') : t('data.deleteEverything')}
                  </Button>
                  <Button variant="quiet" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
                    {t('data.cancel')}
                  </Button>
                </div>
              </div>
            ) : undefined
          }
        >
          {!confirming && (
            <Button
              variant="quiet"
              size="sm"
              aria-label={t('data.clear')}
              className="text-signal hover:text-signal-deep"
              onClick={() => setConfirming(true)}
            >
              {t('data.delete')}
            </Button>
          )}
        </SettingsRow>
      </SettingsGroup>
      {error && <ErrorNote message={error} />}
    </div>
  );
}
