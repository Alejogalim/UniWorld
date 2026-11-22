import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flag } from "./Flag";
import { Input } from "./Input";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Mono code shown at the trailing edge, e.g. "ES". */
  code?: string;
  /** ISO 3166-1 alpha-2; when set the option shows the circular flag disc. */
  flag?: string;
}

interface ComboboxProps {
  id: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  noMatchesLabel: string;
  autoFocus?: boolean;
  invalid?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  className?: string;
}

/** Accent-insensitive, case-insensitive match on the label, or an exact code. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matches(option: ComboboxOption, query: string): boolean {
  if (query === "") return true;
  return fold(option.label).includes(query) || option.value.toLowerCase() === query;
}

/**
 * Searchable single select. Arrows move, Enter picks, Escape closes (and stops
 * propagation, so a dialog around it stays open). Enter with the list closed is
 * left alone, so the surrounding step can submit.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  noMatchesLabel,
  autoFocus = false,
  invalid = false,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
  className,
}: ComboboxProps) {
  const reactId = useId();
  const listboxId = `${id}-${reactId}-listbox`;
  const optionId = (index: number) => `${id}-${reactId}-option-${index}`;

  const selected = options.find((o) => o.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return open ? options.filter((o) => matches(o, q)) : [];
  }, [options, query, open]);

  const activeIndex = filtered.length === 0 ? -1 : Math.min(active, filtered.length - 1);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openList = () => {
    const index = selected ? options.indexOf(selected) : 0;
    setQuery("");
    setActive(Math.max(index, 0));
    setOpen(true);
  };

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? "")}
          onFocus={openList}
          onClick={() => {
            if (!open) openList();
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) return openList();
              setActive(Math.min(activeIndex + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return openList();
              setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === "Enter" && open && activeIndex >= 0) {
              e.preventDefault();
              choose(filtered[activeIndex]);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setQuery("");
            } else if (e.key === "Tab") {
              setOpen(false);
            }
          }}
          className="pr-10"
        />
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-chart-grey"
        />
      </div>

      {open && (
        <div className="rim surface absolute inset-x-0 top-full z-20 mt-1 rounded-popover p-1 shadow-float">
          <div id={listboxId} role="listbox" className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-chart-grey">{noMatchesLabel}</p>
            ) : (
              filtered.map((option, index) => {
                const isActive = index === activeIndex;
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    // Keep focus in the input; the choice is made on click.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "relative flex min-h-9 cursor-pointer items-center gap-2 rounded-control px-3 text-sm text-foreground",
                      isActive && "bg-shoal",
                      isSelected && "font-semibold pl-5 before:absolute before:top-1/2 before:left-2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-signal",
                    )}
                  >
                    {option.flag && <Flag code={option.flag} />}
                    <span className="min-w-0 flex-1 break-words">{option.label}</span>
                    {option.code && (
                      <span className="font-mono text-xs font-medium text-chart-grey">{option.code.toUpperCase()}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
