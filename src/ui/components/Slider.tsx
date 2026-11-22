import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

/** Native range input (keyboard accessible), signal-coloured, with the mono current value. */
export function Slider({ label, value, onValueChange, min = 1, max = 10, step = 1, className }: SliderProps) {
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-xs text-foreground">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs font-medium tabular-nums text-foreground">
          {value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="h-5 w-full cursor-pointer accent-signal outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      />
    </div>
  );
}
