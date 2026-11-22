import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { createTauriSqlClient } from '@/core/adapters/tauri';
import { SqlCounselorStore } from '@/store/counselor';
import { Chip } from '@/ui/components/Chip';
import { Input } from '@/ui/components/Input';
import { useFinder } from './useFinder';

/** Saved careers from the Counselor as toggles, plus free-text careers that are removable chips. */
export function CareerPicker() {
  const { t } = useTranslation('finder');
  const location = useLocation();
  const careers = useFinder((s) => s.careers);
  const addCareer = useFinder((s) => s.addCareer);
  const removeCareer = useFinder((s) => s.removeCareer);
  const toggleCareer = (career: string) =>
    careers.includes(career) ? removeCareer(career) : addCareer(career);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    createTauriSqlClient()
      .then((client) => new SqlCounselorStore(client).listSavedCareers())
      .then((rows) => {
        if (!cancelled) setSaved(rows.map((row) => row.title));
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A career sent from the Counselor is added once, on arrival.
  useEffect(() => {
    const state = location.state as { career?: unknown } | null;
    if (state && typeof state.career === 'string') addCareer(state.career);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCareer(draft);
    setDraft('');
  };

  const custom = careers.filter((c) => !(saved ?? []).includes(c));

  return (
    <div className="flex flex-col gap-3">
      {loadError && <p role="alert" className="text-sm text-foreground">{loadError}</p>}
      {saved && saved.length === 0 && custom.length === 0 && (
        <p className="text-sm text-chart-grey">{t('careers.none')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {(saved ?? []).map((career) => (
          <Chip key={career} selected={careers.includes(career)} onClick={() => toggleCareer(career)}>
            {career}
          </Chip>
        ))}
        {custom.map((career) => (
          <Chip key={career} selected onRemove={() => removeCareer(career)}>
            {career}
          </Chip>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('careers.placeholder')}
        aria-label={t('careers.placeholder')}
        className="max-w-md"
      />
    </div>
  );
}
