import type { ReactNode } from "react";

interface EmptyStateProps {
  /** A string, or a ReactNode for a two-tone headline (grey body, ink phrase in a `<strong>`). */
  title: ReactNode;
  /** One line that says what this screen is for, or what to do next. */
  description?: string;
  /** One action, named for what it does. */
  action?: ReactNode;
}

/** DESIGN.md: a question with a next action, in the chart's language. No illustrations. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex max-w-[68ch] flex-col gap-2 border-t border-hairline pt-6">
      <h2 className="type-headline text-foreground">{title}</h2>
      {description && <p className="text-sm leading-[1.55] text-chart-grey">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </section>
  );
}
