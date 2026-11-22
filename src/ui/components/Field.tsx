import * as React from "react";
import { cn } from "@/lib/utils";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Receives the wiring (id, aria-describedby, aria-invalid) to spread onto the control. */
  children: (control: FieldControlProps) => React.ReactNode;
}

/** A label, its control, an optional hint and an error message, wired for screen readers. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs text-foreground">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-chart-grey">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-signal">
          {error}
        </p>
      )}
    </div>
  );
}
