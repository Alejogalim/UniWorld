import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  /** One line that says what this screen is for, or what to do next. */
  description?: string;
  /** One action, named for what it does. */
  action?: ReactNode;
}

/** DESIGN.md: a question with a next action, in the chart's language. No illustrations. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex max-w-[68ch] flex-col gap-2 border-t border-hairline pt-6">
      <h2 className="text-[1.0625rem] leading-[1.35] font-semibold tracking-[-0.005em] text-foreground">{title}</h2>
      {description && <p className="text-sm leading-[1.55] text-chart-grey">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </section>
  );
}
