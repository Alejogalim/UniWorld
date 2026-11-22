import * as React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipProps extends Omit<React.ComponentProps<"button">, "type"> {
  selected?: boolean;
  /** Mono ISO-style code shown before the label, e.g. a country code. */
  code?: string;
  /** When given, a remove control is shown; the label names what it removes. */
  onRemove?: () => void;
}

/**
 * DESIGN.md "Chips": 24px rectangular tickets, 2px corners. Selected inverts to ink
 * with a 2px signal tick on the leading edge. Renders a button when clickable.
 */
export function Chip({ selected = false, code, onRemove, onClick, className, children, ...props }: ChipProps) {
  const { t } = useTranslation("common");
  const label = typeof children === "string" ? children : (code ?? "");
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": selected } : {})}
      className={cn(
        "relative inline-flex min-h-6 items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs leading-tight",
        selected
          ? "border-foreground bg-foreground text-panel before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-signal"
          : "border-hairline bg-panel text-foreground",
        onClick && "transition-colors duration-[120ms] hover:bg-shoal",
        className,
      )}
      {...props}
    >
      {code && <span className="font-mono text-[11px] font-medium tracking-[0.01em]">{code}</span>}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("chip.remove", { label })}
          className="-mr-1 grid size-4 place-items-center rounded-sm text-chart-grey outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-signal"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </Tag>
  );
}

/** Read-only label: shoal fill, no stroke (language and tuition badges). */
export function Badge({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-sm bg-shoal px-2 py-0.5 text-xs leading-tight text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
