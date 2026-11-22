import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Show only free tuition". */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Filter switch: hairline track, signal when on, square thumb (no pills). */
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
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-sm border transition-colors duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50",
        checked ? "border-signal bg-signal" : "border-hairline bg-shoal",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-3.5 rounded-sm bg-panel transition-transform duration-[180ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
          checked ? "translate-x-[18px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
