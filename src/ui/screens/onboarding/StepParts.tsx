import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Errors } from "./draftRules";

/** The step's one headline (the page h1: the shell hides its title on onboarding), with an optional supporting line. */
export function StepHeading({ id, title, note }: { id?: string; title: string; note?: string }) {
  return (
    <header className="mb-2 flex flex-col gap-3">
      <h1 id={id} className="type-headline text-balance text-foreground">{title}</h1>
      {note && <p className="type-body max-w-[52ch] text-chart-grey">{note}</p>}
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
