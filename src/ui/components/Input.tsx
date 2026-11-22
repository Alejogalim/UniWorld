import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Controls (plan 16): 14px corners, panel fill, hairline stroke. Focus is the signal ring with an ember glow in dark. */
const controlBase =
  "w-full rounded-control border border-hairline bg-panel text-foreground placeholder:text-chart-grey outline-none transition-[border-color,box-shadow] duration-[120ms] focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal focus-visible:shadow-(--ember-glow) aria-invalid:border-signal disabled:bg-shoal disabled:text-chart-grey disabled:opacity-100";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-10 px-4 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "min-h-24 px-4 py-3 text-sm leading-[1.55]", className)}
      {...props}
    />
  );
}

/** Native select (keyboard and screen-reader behaviour for free), styled to the chart. */
export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(controlBase, "h-10 appearance-none pr-10 pl-4 text-sm", className)}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-chart-grey"
      />
    </div>
  );
}
