import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Show only free tuition". */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Filter switch (plan 16): a pill track, ember gradient when on, ink thumb. */
export function Toggle({ checked, onCheckedChange, label, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-pill transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-signal [background-image:var(--ember-gradient)]" : "rim bg-shoal",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-4 rounded-pill bg-foreground transition-transform duration-[180ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
          checked ? "translate-x-[18px] dark:bg-background" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
