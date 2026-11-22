import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/ui/components/ui/button';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Panel } from '@/ui/components/Panel';
import { Filters } from './Filters';
import { CareerPicker } from './CareerPicker';
import { useFinder } from './useFinder';

interface FinderControlsProps {
  /** Null while the key check runs. */
  hasKey: boolean | null;
  onSearch: () => void;
}

/** Careers, filters and the search action. The action block is the screen's one ember surface. */
export function FinderControls({ hasKey, onSearch }: FinderControlsProps) {
  const { t } = useTranslation('finder');
  const navigate = useNavigate();
  const careers = useFinder((s) => s.careers);
  const phase = useFinder((s) => s.phase);
  const noCareer = careers.length === 0;
  const canSearch = !noCareer && hasKey === true && phase !== 'searching';
  const reason = noCareer ? t('search.noCareer') : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
          {t('sections.careers')}
        </h2>
        <CareerPicker />
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
          {t('sections.filters')}
        </h2>
        <Filters />
      </section>

      <Panel variant="ember" className="flex flex-col gap-3">
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

        <div>
          <Button onClick={onSearch} disabled={!canSearch}>
            {t('search.button')}
          </Button>
        </div>
        {reason && <p className="text-sm text-chart-grey">{reason}</p>}
      </Panel>
    </div>
  );
}
