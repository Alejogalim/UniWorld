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
 * The countries tab as one column (plan 32): the filter field, the world/continent chips,
 * the selected countries as removable chips, then the country list.
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
    <div className="flex h-full min-h-0 flex-col">
      <CountryPicker fill showSelected={false} onHoverCountry={onHoverCountry}>
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
        <div className="max-h-28 shrink-0 overflow-y-auto">
          <SelectedCountries removable />
        </div>
      </CountryPicker>
    </div>
  );
}
