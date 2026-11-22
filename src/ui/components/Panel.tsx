import * as React from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends React.ComponentProps<"div"> {
  /** Nested region: shoal instead of the card surface. */
  inset?: boolean;
  /** `ember`: the one memorable element on a screen, with a soft glow around the outside of the box. */
  variant?: "default" | "ember";
}

/** Plan 16 card: 28px corners, a soft surface, a 1px rim (dark) or a 6% ring (light). No shadow at rest. */
export function Panel({ inset = false, variant = "default", className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rim surface p-6 text-foreground",
        inset && "bg-shoal [--rim-fill:linear-gradient(var(--shoal),var(--shoal))]",
        variant === "ember" && "panel-ember",
        className,
      )}
      {...props}
    />
  );
}

/** A 1px hairline divider. Rules carry the structure; use them instead of boxes. */
export function Rule({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("m-0 h-px w-full border-0 bg-hairline", className)} {...props} />;
}
