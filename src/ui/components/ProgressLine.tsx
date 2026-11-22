interface ProgressLineProps {
  /** The live status, in words: what the search is doing right now. */
  message: string;
}

/** One line of live status with a signal dot that pulses (opacity only, and not under reduced motion). */
export function ProgressLine({ message }: ProgressLineProps) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-chart-grey">
      <span aria-hidden="true" className="ember-fill size-2 shrink-0 rounded-full motion-safe:animate-pulse" />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}
