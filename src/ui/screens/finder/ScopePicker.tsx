import { useTranslation } from 'react-i18next';
import { CONTINENTS, CONTINENT_VIEWS, type GeoView } from '@/ui/globe/geo';
import { Chip } from '@/ui/components/Chip';
import { Flag } from '@/ui/components/Flag';
import { countryName } from '@/ui/data/countries';
import { useFinder } from './useFinder';
import type { Continent } from '@/core/contracts';

interface ScopePickerProps {
  onFlyTo: (view: GeoView) => void;
  /** Hides the hint line when the chips sit in the narrow column. */
  compact?: boolean;
}

/** Continent chips and the current scope as removable chips. Countries are picked on the globe. */
export function ScopePicker({ onFlyTo, compact = false }: ScopePickerProps) {
  const { t, i18n } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const setContinent = useFinder((s) => s.setContinent);
  const toggleCountry = useFinder((s) => s.toggleCountry);
  const uiLang = i18n.resolvedLanguage ?? 'en';
  const active: Continent | null = scope.kind === 'continent' ? scope.continent : null;
  const key = (c: Continent) => `continent.${c}`;

  const pickContinent = (continent: Continent) => {
    const turningOn = active !== continent;
    setContinent(continent);
    if (turningOn) onFlyTo(CONTINENT_VIEWS[continent]);
  };

  return (
    <div className="flex flex-col gap-3">
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
      {scope.kind === 'countries' && (
        <div className="flex flex-wrap gap-2" aria-label={t('scope.current')}>
          {scope.codes.map((iso) => (
            <Chip
              key={iso}
              code={iso}
              selected
              onRemove={() => toggleCountry(iso)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Flag code={iso} className="size-4" />
                {countryName(iso, uiLang)}
              </span>
            </Chip>
          ))}
        </div>
      )}
      {scope.kind === 'continent' && (
        <div className="flex flex-wrap gap-2">
          <Chip selected onRemove={() => setScope({ kind: 'global' })}>
            {t(key(scope.continent))}
          </Chip>
        </div>
      )}
    </div>
  );
}
