import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Button } from '@/ui/components/ui/button';
import { deleteAllLocalData } from './deleteAllData';
import { messageOf, SettingsSection } from './SettingsSection';

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
    <SettingsSection id="settings-data" title={t('sections.data')} line={t('sections.dataLine')}>
      {!confirming ? (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            {t('data.clear')}
          </Button>
        </div>
      ) : (
        <div className="flex max-w-[68ch] flex-col gap-4 border-l-2 border-hairline pl-4">
          <p className="text-sm text-foreground">{t('data.clearConfirm')}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void erase()}>
              {busy ? t('data.deleting') : t('data.deleteEverything')}
            </Button>
            <Button variant="quiet" disabled={busy} onClick={() => setConfirming(false)}>
              {t('data.cancel')}
            </Button>
          </div>
        </div>
      )}
      {error && <ErrorNote message={error} />}
    </SettingsSection>
  );
}
