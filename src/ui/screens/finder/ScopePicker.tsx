import { useTranslation } from 'react-i18next';
import { CONTINENTS, CONTINENT_VIEWS, type GeoView } from '@/ui/globe/geo';
import { Chip } from '@/ui/components/Chip';
import { CountryPicker, SelectedCountries } from './CountryPicker';
import { useFinder } from './useFinder';
import type { Continent } from '@/core/contracts';

interface ScopePickerProps {
  onFlyTo: (view: GeoView) => void;
  onHoverCountry: (iso: string | null) => void;
}

/**
 * Two panes inside the countries tab: the scrollable country list on the left,
 * and the world/continent chips plus the selected summary on the right.
 */
export function ScopePicker({ onFlyTo, onHoverCountry }: ScopePickerProps) {
  const { t } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const setContinent = useFinder((s) => s.setContinent);
  const active: Continent | null = scope.kind === 'continent' ? scope.continent : null;
  const key = (c: Continent) => `continent.${c}`;

  const pickContinent = (continent: Continent) => {
    const turningOn = active !== continent;
    setContinent(continent);
    if (turningOn) onFlyTo(CONTINENT_VIEWS[continent]);
  };

  return (
    <div className="grid h-full min-h-0 overflow-hidden @max-[679px]:overflow-y-auto @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)] @min-[680px]:gap-4">
      <div className="flex min-h-0 flex-col overflow-hidden">
        <CountryPicker fill showSelected={false} onHoverCountry={onHoverCountry} />
      </div>

      <aside className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
          {t('sections.countries')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Chip selected={scope.kind === 'global'} onClick={() => setScope({ kind: 'global' })}>
            {t('scope.world')}
          </Chip>
          {CONTINENTS.map((continent) => (
            <Chip key={continent} selected={active === continent} onClick={() => pickContinent(continent)}>
              {t(key(continent))}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-chart-grey">{t('scope.hint')}</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SelectedCountries />
        </div>
        <p className="text-xs text-chart-grey">{t('scope.hoverHint')}</p>
      </aside>
    </div>
  );
}
