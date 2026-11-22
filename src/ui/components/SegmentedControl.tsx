import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Why the option is disabled: shown as a tooltip and read by screen readers. */
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Index of the next enabled option from `from`, stepping by `step` (+1 / -1) and wrapping.
 * Returns `from` when no other option is enabled.
 */
export function nextEnabledIndex(disabled: boolean[], from: number, step: 1 | -1): number {
  const n = disabled.length;
  for (let i = 1; i <= n; i++) {
    const index = (((from + step * i) % n) + n) % n;
    if (!disabled[index]) return index;
  }
  return from;
}

/** The tab stop: the checked option when it is enabled, else the first enabled one, else 0. */
export function tabStopIndex(disabled: boolean[], checked: number): number {
  if (checked >= 0 && !disabled[checked]) return checked;
  const first = disabled.findIndex((d) => !d);
  return first === -1 ? 0 : first;
}

/** A small radiogroup: pill track on shoal, the chosen segment raised on the panel fill with a rim. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  "aria-labelledby": labelledBy,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const disabled = options.map((o) => Boolean(o.disabled));
  const checkedIndex = options.findIndex((o) => o.value === value);
  const tabStop = tabStopIndex(disabled, checkedIndex);

  const select = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    refs.current[index]?.focus();
    if (option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") target = nextEnabledIndex(disabled, index, 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = nextEnabledIndex(disabled, index, -1);
    else if (event.key === "Home") target = nextEnabledIndex(disabled, -1 + options.length, 1);
    else if (event.key === "End") target = nextEnabledIndex(disabled, 0, -1);
    if (target === null) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-pill border border-hairline bg-shoal p-0.5", className)}
    >
      {options.map((option, index) => {
        const checked = index === checkedIndex;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            title={option.disabled ? option.hint : undefined}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-pill border border-transparent px-3 text-[0.8125rem] font-medium leading-tight transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
              checked
                ? "rim bg-panel text-foreground shadow-(--surface-shadow) [--rim-fill:linear-gradient(var(--panel),var(--panel))]"
                : "text-chart-grey hover:text-foreground",
              option.disabled && "cursor-not-allowed opacity-50 hover:text-chart-grey",
            )}
          >
            {option.label}
            {option.disabled && option.hint && <span className="sr-only">{`. ${option.hint}`}</span>}
          </button>
        );
      })}
    </div>
  );
}
