import * as React from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends React.ComponentProps<"div"> {
  /** Nested region: shoal instead of chalk paper. */
  inset?: boolean;
}

/** DESIGN.md "Panels & Rows": 6px corners, 1px hairline, flat, 24px padding. */
export function Panel({ inset = false, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline p-6 text-foreground inset-shadow-(--panel-rim)",
        inset ? "bg-shoal" : "bg-panel",
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
