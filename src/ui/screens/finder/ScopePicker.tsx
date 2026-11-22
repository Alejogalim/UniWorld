import { useTranslation } from 'react-i18next';
import { CONTINENTS, CONTINENT_VIEWS, type GeoView } from '@/ui/globe/geo';
import { Chip } from '@/ui/components/Chip';
import { CountryPicker } from './CountryPicker';
import { useFinder } from './useFinder';
import type { Continent } from '@/core/contracts';

interface ScopePickerProps {
  onFlyTo: (view: GeoView) => void;
  onHoverCountry: (iso: string | null) => void;
  /** Hides the hint line when the picker sits in a narrow column. */
  compact?: boolean;
}

/** World/continent chips plus the persistent country list. The globe follows list hover. */
export function ScopePicker({ onFlyTo, onHoverCountry, compact = false }: ScopePickerProps) {
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
    <div className="flex flex-col gap-4">
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
      {!compact && <p className="text-sm text-chart-grey">{t('scope.hint')}</p>}
      <CountryPicker onHoverCountry={onHoverCountry} />
      {!compact && <p className="text-xs text-chart-grey">{t('scope.hoverHint')}</p>}
    </div>
  );
}
