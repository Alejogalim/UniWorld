import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/ui/components/Chip';
import { Flag } from '@/ui/components/Flag';
import { Input } from '@/ui/components/Input';
import { countryName } from '@/ui/data/countries';
import { countryOptions } from '@/ui/screens/onboarding/options';
import { useFinder } from './useFinder';

interface CountryPickerProps {
  /** Fires with an ISO code on row hover/focus, and null when the pointer or focus leaves the list. */
  onHoverCountry: (iso: string | null) => void;
}

/** Accent-insensitive, case-insensitive match on the name, or an exact code. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Persistent multi-select country list: a filter input over every country, with rows that
 * toggle in place. Hovering or arrowing onto a row asks the globe to focus that country.
 */
export function CountryPicker({ onHoverCountry }: CountryPickerProps) {
  const { t, i18n } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const toggleCountry = useFinder((s) => s.toggleCountry);
  const reactId = useId();
  const listboxId = `${reactId}-countries`;
  const optionId = (index: number) => `${reactId}-country-${index}`;

  const uiLang = i18n.resolvedLanguage ?? 'en';
  const options = useMemo(() => countryOptions(uiLang), [uiLang]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const chosen = scope.kind === 'countries' ? scope.codes : [];
  const selected = useMemo(() => new Set(chosen), [chosen]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    return options.filter((o) => fold(o.label).includes(q) || o.value.toLowerCase() === q);
  }, [options, query]);

  const activeIndex = filtered.length === 0 ? -1 : Math.min(active, filtered.length - 1);

  const hoverRef = useRef(onHoverCountry);
  hoverRef.current = onHoverCountry;
  useEffect(() => () => hoverRef.current(null), []);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const focusActive = (index: number) => {
    if (index < 0 || index >= filtered.length) return;
    setActive(index);
    onHoverCountry(filtered[index].value);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onMouseLeave={() => onHoverCountry(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHoverCountry(null);
      }}
    >
      <Input
        role="combobox"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={query}
        placeholder={t('scope.filterPlaceholder')}
        aria-label={t('scope.filterPlaceholder')}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusActive(activeIndex < 0 ? 0 : Math.min(activeIndex + 1, filtered.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusActive(activeIndex < 0 ? 0 : Math.max(activeIndex - 1, 0));
          } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            toggleCountry(filtered[activeIndex].value);
          } else if (event.key === 'Escape') {
            setQuery('');
            setActive(0);
          }
        }}
      />

      <div
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('sections.countries')}
        className="grid max-h-[min(60vh,560px)] min-h-0 grid-cols-1 gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[680px]:grid-cols-2 @min-[1000px]:grid-cols-1"
      >
        {filtered.length === 0 ? (
          <p className="col-span-full px-3 py-2 text-sm text-chart-grey">{t('scope.noMatches')}</p>
        ) : (
          filtered.map((option, index) => {
            const isSelected = selected.has(option.value);
            const isActive = index === activeIndex;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => toggleCountry(option.value)}
                onMouseEnter={() => {
                  setActive(index);
                  onHoverCountry(option.value);
                }}
                onFocus={() => onHoverCountry(option.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleCountry(option.value);
                  }
                }}
                className={cn(
                  'flex min-h-9 cursor-pointer items-center gap-2 px-3 text-sm text-foreground transition-colors duration-[120ms]',
                  isActive && 'bg-shoal',
                  isSelected && 'font-semibold',
                )}
              >
                <Flag code={option.value} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="font-mono text-xs font-medium text-chart-grey">{option.value}</span>
                <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
                  {isSelected && <Check className="size-3.5 text-signal" strokeWidth={2.5} />}
                </span>
              </div>
            );
          })
        )}
      </div>

      <SelectedCountries />
    </div>
  );
}

/** Read-only summary of the chosen countries. Deselection happens by toggling a row in the list. */
export function SelectedCountries({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const uiLang = i18n.resolvedLanguage ?? 'en';
  const codes = scope.kind === 'countries' ? scope.codes : [];

  const badges = codes.map((iso) => (
    <Badge key={iso} className="max-w-full gap-1.5">
      <Flag code={iso} className="size-4" />
      <span className="min-w-0 truncate">{countryName(iso, uiLang)}</span>
      <span className="font-mono text-[11px] font-medium text-chart-grey">{iso}</span>
    </Badge>
  ));

  const clear =
    codes.length > 0 ? (
      <button
        type="button"
        onClick={() => setScope({ kind: 'global' })}
        className="text-xs text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        {t('scope.clear')}
      </button>
    ) : null;

  if (compact) {
    return (
      <div aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm text-chart-grey">
        <span>{t('scope.selected')}</span>
        {codes.length === 0 ? <span>{t('scope.selectedEmpty')}</span> : badges}
        {clear}
      </div>
    );
  }

  return (
    <section aria-live="polite" aria-label={t('scope.selected')} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{t('scope.selected')}</h3>
        {clear}
      </div>
      {codes.length === 0 ? (
        <p className="text-sm text-chart-grey">{t('scope.selectedEmpty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">{badges}</div>
      )}
    </section>
  );
}
