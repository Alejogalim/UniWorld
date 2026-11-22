import type { ReactNode } from "react";

interface SettingsSectionProps {
  id: string;
  title: string;
  /** One short line on what the section controls. */
  line: string;
  children: ReactNode;
}

/** A settings group: title, one line, then the controls. No cards. */
export function SettingsSection({ id, title, line, children }: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 id={id} className="text-[1.0625rem] leading-[1.35] font-semibold text-foreground">
          {title}
        </h2>
        <p className="max-w-[68ch] text-sm leading-[1.55] text-chart-grey">{line}</p>
      </header>
      {children}
    </section>
  );
}

/** Label and value on one hairline row; stacks on narrow windows. */
export function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-hairline py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-chart-grey">{label}</dt>
      <dd className="m-0 min-w-0 text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
