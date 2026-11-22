import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Fact } from "@/core/contracts";
import { cn } from "@/lib/utils";
import { isWebUrl } from "@/lib/url";

interface FactLineProps<T extends string | string[]> {
  label: string;
  fact: Fact<T>;
  format?: (value: T) => ReactNode;
  /** Source number shown in the superscript marker. Defaults to 1. */
  index?: number;
}

/** A fact without a value or without its source link is shown as missing, never as a bare value. */
function hasSourcedValue<T extends string | string[]>(fact: Fact<T>): fact is Fact<T> & { value: T; sourceUrl: string } {
  if (fact.value === null || fact.sourceUrl === null || !isWebUrl(fact.sourceUrl)) return false;
  if (Array.isArray(fact.value)) return fact.value.length > 0;
  return fact.value.trim().length > 0;
}

/**
 * DESIGN.md "Fact Line" (signature): label, value, and a mono source marker that opens
 * the source tag, the quote and the URL. Missing facts keep the row height. Needs a `@container`
 * ancestor: narrower than 36rem, the label stacks above the value.
 */
export function FactLine<T extends string | string[]>({ label, fact, format, index = 1 }: FactLineProps<T>) {
  const { t } = useTranslation("common");
  const sourced = hasSourcedValue(fact);

  return (
    <div className="grid min-h-11 grid-cols-1 items-baseline gap-x-6 gap-y-1 border-b border-hairline py-3 @min-[36rem]:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
      <span className="text-sm leading-[1.55] text-chart-grey">{label}</span>
      {sourced ? (
        // One inline run: the no-break space glues the marker to the last word so it never wraps alone.
        <span className="min-w-0 text-base leading-[1.55] font-medium break-words text-foreground">
          {format ? format(fact.value as T) : Array.isArray(fact.value) ? fact.value.join(", ") : fact.value}
          {"\u00A0"}
          <SourceMarker index={index} sourceUrl={fact.sourceUrl} sourceKind={fact.sourceKind} quote={fact.quote} />
        </span>
      ) : (
        <span className="text-sm leading-[1.55] text-chart-grey underline decoration-dashed decoration-1 underline-offset-4">
          {t("fact.missing")}
        </span>
      )}
    </div>
  );
}

interface SourceMarkerProps {
  index: number;
  sourceUrl: string;
  sourceKind: Fact<string>["sourceKind"];
  quote: string | null;
}

export function SourceMarker({ index, sourceUrl, sourceKind, quote }: SourceMarkerProps) {
  const { t } = useTranslation("common");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const open = hovered || focused || pinned;

  // Escape and outside clicks close the layer, whatever opened it.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHovered(false);
      setFocused(false);
      setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const official = sourceKind === "official";
  const web = isWebUrl(sourceUrl);

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={t("fact.sourceButton", { index })}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="font-mono text-[0.625rem] leading-none font-medium align-super text-chart-grey underline decoration-hairline underline-offset-2 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      >
        {index}
      </button>
      {open && (
        <span
          id={popoverId}
          role="group"
          className="rim surface absolute top-full left-0 z-20 mt-2 flex w-72 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-popover p-4 font-normal shadow-float"
        >
          <span
            className={cn(
              "font-mono text-[0.6875rem] font-medium tracking-[0.01em]",
              official ? "text-evidence" : "text-chart-grey",
            )}
          >
            {official ? t("fact.official") : t("fact.thirdParty")}
          </span>
          {quote && (
            <blockquote className="m-0 border-l-2 border-hairline pl-3 text-[13px] leading-[1.5] text-foreground">
              {quote}
            </blockquote>
          )}
          <a
            href={sourceUrl}
            onClick={(e) => {
              e.preventDefault();
              if (!web) return;
              openUrl(sourceUrl).catch((err: unknown) => console.error("Could not open source link", err));
            }}
            className="break-all text-xs text-chart-grey underline decoration-hairline underline-offset-2 hover:text-foreground"
          >
            {sourceUrl}
          </a>
        </span>
      )}
    </span>
  );
}
