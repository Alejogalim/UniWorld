import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useStars } from '@/app/stars';

/** Rail-footer control: shows or hides the background stars. Persisted as the `stars` setting. */
export function StarsSwitcher() {
  const { t } = useTranslation('common');
  const on = useStars((s) => s.on);
  const setOn = useStars((s) => s.setOn);
  const state = t(on ? 'stars.on' : 'stars.off');

  return (
    <button
      type="button"
      className="lang-button"
      title={state}
      aria-label={t('stars.label')}
      aria-pressed={on}
      data-state={on ? 'on' : 'off'}
      onClick={() => {
        setOn(!on).catch((err: unknown) => console.error('Failed to save the stars setting', err));
      }}
    >
      <Sparkles className={on ? 'size-4' : 'size-4 text-chart-grey'} aria-hidden="true" />
    </button>
  );
}
