import { useTranslation } from 'react-i18next';
import { Toggle } from '@/ui/components/Toggle';
import { useFinder, type FinderFilters } from './useFinder';

const FILTERS: (keyof FinderFilters)[] = ['tuitionFreeOnly', 'spokenLanguagesOnly', 'includeNeedToLearn'];

export function Filters() {
  const { t } = useTranslation('finder');
  const filters = useFinder((s) => s.filters);
  const setFilter = useFinder((s) => s.setFilter);
  return (
    <ul className="flex flex-col">
      {FILTERS.map((key) => (
        <li key={key} className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
          <span className="text-sm text-foreground">{t(`filters.${key}`)}</span>
          <Toggle
            checked={filters[key]}
            onCheckedChange={(value) => setFilter(key, value)}
            label={t(`filters.${key}`)}
          />
        </li>
      ))}
    </ul>
  );
}
