import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** DESIGN.md "Inputs & Fields": panel fill, hairline stroke, ink focus, signal error. */
const controlBase =
  "w-full rounded-md border border-hairline bg-panel text-foreground placeholder:text-chart-grey outline-none transition-colors duration-[120ms] focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal aria-invalid:border-signal disabled:bg-shoal disabled:text-chart-grey disabled:opacity-100";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-9 px-3 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "min-h-24 px-3 py-2 text-sm leading-[1.55]", className)}
      {...props}
    />
  );
}

/** Native select (keyboard and screen-reader behaviour for free), styled to the chart. */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(controlBase, "h-9 appearance-none pr-9 pl-3 text-sm", className)}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-chart-grey"
      />
    </div>
  );
}
