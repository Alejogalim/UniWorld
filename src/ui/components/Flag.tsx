import type { ComponentType, SVGProps } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface FlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "EE". */
  code: string;
  className?: string;
}

/**
 * Circular 20px country disc from the bundled SVG set. Never an emoji flag.
 * Unknown codes fall back to a mono code disc.
 */
export function Flag({ code, className }: FlagProps) {
  const upper = code.toUpperCase();
  const Svg = (Flags as unknown as Record<string, FlagComponent | undefined>)[upper];

  return (
    <span
      className={cn(
        "inline-grid size-5 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-foreground/10 ring-inset",
        className,
      )}
      aria-hidden="true"
    >
      {Svg ? (
        <Svg className="size-full object-cover" />
      ) : (
        <span className="font-mono text-[8px] font-medium text-chart-grey">{upper}</span>
      )}
    </span>
  );
}
