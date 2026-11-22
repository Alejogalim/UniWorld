import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
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
  /** Fill the parent height and let only the list scroll (used by the countries tab). */
  fill?: boolean;
  /** Show the removable selected-countries row above the list (default). */
  showSelected?: boolean;
  /** Rendered between the filter and the list (the Finder's region chips). */
  beforeList?: ReactNode;
}

/** Accent-insensitive, case-insensitive match on the name, or an exact code. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Lets a vertical wheel scroll a one-line chip row sideways (the rows hide their scrollbar). */
export function wheelToX(event: WheelEvent<HTMLElement>) {
  const el = event.currentTarget;
  if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  el.scrollLeft += event.deltaY;
}

/**
 * Persistent multi-select country list: a filter input over every country, with rows that
 * toggle in place. Hovering or arrowing onto a row asks the globe to focus that country.
 */
export function CountryPicker({
  onHoverCountry,
  fill = false,
  showSelected = true,
  beforeList,
}: CountryPickerProps) {
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

  // Scroll the list only: scrollIntoView would also scroll the dock and clip the filter field.
  useEffect(() => {
    if (activeIndex < 0) return;
    const list = document.getElementById(listboxId);
    const row = document.getElementById(optionId(activeIndex));
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [activeIndex]);

  const focusActive = (index: number) => {
    if (index < 0 || index >= filtered.length) return;
    setActive(index);
    onHoverCountry(filtered[index].value);
  };

  return (
    <div
      className={cn('flex flex-col gap-3', fill && 'h-full min-h-0')}
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

      {/* Region chips and the selected row sit between the filter and the list; focusing them clears the globe focus. */}
      <div className="flex shrink-0 flex-col gap-3 empty:hidden" onFocus={() => onHoverCountry(null)}>
        {beforeList}
        {showSelected && <SelectedCountries />}
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={t('sections.countries')}
        onMouseLeave={() => onHoverCountry(null)}
        className={cn(
          'relative grid min-h-0 grid-cols-1 content-start gap-x-1 overflow-y-auto rounded-control border border-hairline @min-[560px]:grid-cols-2',
          fill ? 'flex-1' : 'max-h-[min(38vh,360px)]',
        )}
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
    </div>
  );
}

/** The chosen countries: a removable chip row (countries tab), or a compact inline summary (results header). */
export function SelectedCountries({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation('finder');
  const scope = useFinder((s) => s.scope);
  const setScope = useFinder((s) => s.setScope);
  const toggleCountry = useFinder((s) => s.toggleCountry);
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
        className="shrink-0 whitespace-nowrap text-xs text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
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

  if (codes.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t('scope.selected')}
      onWheel={wheelToX}
      className="chip-scroll -my-1 flex items-center gap-2 overflow-x-auto py-1 pr-6"
    >
      {codes.map((iso) => {
        const name = countryName(iso, uiLang);
        return (
          <span
            key={iso}
            className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-shoal py-0.5 pr-1 pl-2 text-[0.8125rem] leading-tight text-foreground"
          >
            <Flag code={iso} className="size-4" />
            <span className="whitespace-nowrap">{name}</span>
            <button
              type="button"
              onClick={() => toggleCountry(iso)}
              aria-label={t('scope.remove', { name })}
              className="grid size-5 place-items-center rounded-full text-chart-grey outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal"
            >
              <X className="size-3" strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        );
      })}
      {clear}
    </div>
  );
}
