import { cn } from "@/lib/utils";

interface SpinnerProps {
  label: string;
  className?: string;
}

/** Small loading indicator. It turns off under reduced motion; the label is announced. */
export function Spinner({ label, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 rounded-full border-2 border-hairline border-t-foreground motion-safe:animate-spin",
        className,
      )}
    />
  );
}
