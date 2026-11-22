import type { ReactNode } from "react";

interface ErrorNoteProps {
  title?: string;
  /** What went wrong, then what to do. */
  message: string;
  action?: ReactNode;
}

/** Designed error: a signal left rule, the message, and an optional action. */
export function ErrorNote({ title, message, action }: ErrorNoteProps) {
  return (
    <div role="alert" className="flex flex-col gap-2 border-l-2 border-signal pl-4 text-foreground">
      {title && <p className="text-[1.0625rem] leading-[1.35] font-semibold">{title}</p>}
      <p className="text-sm leading-[1.55] break-words text-foreground">{message}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
