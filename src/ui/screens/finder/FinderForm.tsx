import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/ui/components/ui/button';
import { ErrorNote } from '@/ui/components/ErrorNote';
import type { GeoView } from '@/ui/globe/geo';
import { Filters } from './Filters';
import { CareerPicker } from './CareerPicker';
import { ScopePicker } from './ScopePicker';
import { useFinder } from './useFinder';

interface FinderFormProps {
  /** Null while the key check runs. */
  hasKey: boolean | null;
  onSearch: () => void;
  onFlyTo: (view: GeoView) => void;
  /** Rendered between the careers and the scope (the globe). */
  globe: ReactNode;
}

/** Careers, scope, filters and the search action. Used at rest and while editing a search. */
export function FinderForm({ hasKey, onSearch, onFlyTo, globe }: FinderFormProps) {
  const { t } = useTranslation('finder');
  const navigate = useNavigate();
  const careers = useFinder((s) => s.careers);
  const phase = useFinder((s) => s.phase);
  const noCareer = careers.length === 0;
  const canSearch = !noCareer && hasKey === true && phase !== 'searching';
  const reason = noCareer ? t('search.noCareer') : null;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">{t('sections.careers')}</h2>
        <CareerPicker />
      </section>

      <section className="flex flex-col gap-4">
        {globe}
        <ScopePicker onFlyTo={onFlyTo} />
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">{t('sections.filters')}</h2>
        <Filters />
      </section>

      {hasKey === false && (
        <ErrorNote
          message={t('key.message')}
          action={
            <Button variant="secondary" onClick={() => navigate('/settings')}>
              {t('key.openSettings')}
            </Button>
          }
        />
      )}

      <div className="flex flex-col gap-2">
        <div>
          <Button onClick={onSearch} disabled={!canSearch}>
            {t('search.button')}
          </Button>
        </div>
        {reason && <p className="text-sm text-chart-grey">{reason}</p>}
      </div>
    </div>
  );
}
