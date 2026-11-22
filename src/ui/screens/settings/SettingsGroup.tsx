import type { ReactNode } from "react";

interface SettingsGroupProps {
  /** Id of the heading; the section is labelled by it. */
  id: string;
  title: string;
  /** One short muted line under the group. Use sparingly. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A settings section: a small sentence-case heading over one rounded group whose rows are split by hairlines.
 * No overflow clipping: the model combobox's list must be able to open past the group's edge.
 */
export function SettingsGroup({ id, title, footer, children }: SettingsGroupProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="px-4 text-sm font-medium text-chart-grey">
        {title}
      </h2>
      <div className="rim surface rounded-control divide-y divide-hairline">{children}</div>
      {footer && <div className="px-4 text-[0.8125rem] leading-[1.45] text-chart-grey">{footer}</div>}
    </section>
  );
}

interface SettingsRowProps {
  label: ReactNode;
  /** Native control (select, input, combobox input): the label becomes `<label htmlFor>`. */
  htmlFor?: string;
  /** Id on the label, for `aria-labelledby` (segmented control). */
  labelId?: string;
  /** One short muted line under the label. */
  description?: ReactNode;
  descriptionId?: string;
  /** Before the label, e.g. the profile initial. */
  leading?: ReactNode;
  /** The control or value at the trailing edge. */
  children?: ReactNode;
  /** Full-width content under the row line: a disclosure panel, a confirm, a note. */
  below?: ReactNode;
}

/** One 48px row: label (and optional muted line) left, control right. Wraps on narrow windows. */
export function SettingsRow({ label, htmlFor, labelId, description, descriptionId, leading, children, below }: SettingsRowProps) {
  const labelClass = "text-sm break-words text-foreground";
  return (
    <div className="px-4">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leading}
          <div className="flex min-w-0 flex-col gap-0.5">
            {htmlFor ? (
              <label htmlFor={htmlFor} id={labelId} className={labelClass}>
                {label}
              </label>
            ) : (
              <span id={labelId} className={labelClass}>
                {label}
              </span>
            )}
            {description && (
              <p id={descriptionId} className="text-[0.8125rem] leading-[1.45] break-words text-chart-grey">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>}
      </div>
      {below && <div className="flex flex-col gap-3 pb-4">{below}</div>}
    </div>
  );
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
