import { useTranslation } from 'react-i18next';
import { CONTINENTS, CONTINENT_VIEWS, type GeoView } from '@/ui/globe/geo';
import { Chip } from '@/ui/components/Chip';
import { CountryPicker, wheelToX } from './CountryPicker';
import { useFinder } from './useFinder';
import type { Continent } from '@/core/contracts';

interface ScopePickerProps {
  onFlyTo: (view: GeoView) => void;
  onHoverCountry: (iso: string | null) => void;
}

/**
 * The countries tab as one compact column: filter, a sideways row of region chips,
 * the removable selected row (only when any are chosen), then the list filling the rest.
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
    <CountryPicker
      fill
      onHoverCountry={onHoverCountry}
      beforeList={
        <div
          role="group"
          aria-label={t('sections.scope')}
          onWheel={wheelToX}
          className="chip-scroll -my-1 flex gap-2 overflow-x-auto py-1 pr-6"
        >
          <Chip
            className="shrink-0 whitespace-nowrap"
            selected={scope.kind === 'global'}
            onClick={() => setScope({ kind: 'global' })}
          >
            {t('scope.world')}
          </Chip>
          {CONTINENTS.map((continent) => (
            <Chip
              key={continent}
              className="shrink-0 whitespace-nowrap"
              selected={active === continent}
              onClick={() => pickContinent(continent)}
            >
              {t(key(continent))}
            </Chip>
          ))}
        </div>
      }
    />
  );
}
