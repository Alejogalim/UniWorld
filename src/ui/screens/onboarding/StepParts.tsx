import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Errors } from "./draftRules";

/** Headline for one question on the sheet, with an optional note under it. */
export function StepHeading({ id, title, note }: { id?: string; title: string; note?: string }) {
  return (
    <header className="flex flex-col gap-2">
      <h2 id={id} className="text-2xl leading-[1.2] font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
      {note && <p className="max-w-[68ch] text-sm leading-[1.55] text-chart-grey">{note}</p>}
    </header>
  );
}

/** Turns the errors for one step into translated text for a given field. */
export function useErrorText(errors: Errors) {
  const { t } = useTranslation("onboarding");
  return (field: string): string | undefined => {
    const error = errors[field];
    return error ? t(error.key, { ...error.values }) : undefined;
  };
}

/** Messages under a row of controls, in the same signal style as Field errors. */
export function RowErrors({ messages }: { messages: (string | undefined)[] }) {
  const present = messages.filter((m): m is string => Boolean(m));
  if (present.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {present.map((m, i) => (
        <p key={i} className="text-xs text-signal">
          {m}
        </p>
      ))}
    </div>
  );
}

export function StepSection({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-6">{children}</section>;
}
