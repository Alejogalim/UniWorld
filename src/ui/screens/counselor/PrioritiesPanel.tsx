import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/ui/components/Slider";
import { Button } from "@/ui/components/ui/button";
import { CAREER_IDEAS_MIN_STUDENT_MESSAGES } from "@/core";
import { useCounselor } from "./useCounselor";

const DIMENSIONS = ["passions", "strengths", "goals", "earning"] as const;

const NOTE_AREAS = ["interests", "strengths", "values", "workStyle", "limits"] as const;

/** What the counselor has learned so far, read-only (plan 30). Hidden until there is something to show. */
function LearnedNotes() {
  const { t } = useTranslation("counselor");
  const notes = useCounselor((s) => s.notes);
  if (!notes) return null;
  const rows = NOTE_AREAS.filter((area) => notes[area].length > 0);
  if (rows.length === 0) return null;

  return (
    <details open className="group border-b border-hairline pb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-control text-sm font-medium text-chart-grey transition-colors duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
        {t("notes.title")}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map((area) => (
          <div key={area} className="flex flex-col gap-0.5">
            <dt className="text-xs text-chart-grey">{t(`notes.${area}`)}</dt>
            <dd className="text-sm leading-[1.55] break-words text-foreground">{notes[area].join(" · ")}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-chart-grey">{t("notes.hint")}</p>
    </details>
  );
}

/** Importance sliders, the career-ideas trigger, and the clear-chat action. */
export function PrioritiesPanel() {
  const { t } = useTranslation("counselor");
  const weights = useCounselor((s) => s.weights);
  const setWeight = useCounselor((s) => s.setWeight);
  const studentCount = useCounselor((s) => s.studentCount);
  const status = useCounselor((s) => s.status);
  const generateCareers = useCounselor((s) => s.generateCareers);
  const reset = useCounselor((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  const enoughAnswers = studentCount >= CAREER_IDEAS_MIN_STUDENT_MESSAGES;
  const idle = status === "idle";

  return (
    <div className="flex flex-col gap-6">
      <LearnedNotes />
      <div className="flex flex-col gap-2">
        <h2 className="text-[1.0625rem] leading-[1.35] font-semibold tracking-[-0.005em]">{t("priorities.title")}</h2>
        <p className="text-sm leading-[1.55] text-chart-grey">{t("priorities.hint")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {DIMENSIONS.map((dimension) => (
          <Slider
            key={dimension}
            label={t(`priorities.${dimension}`)}
            value={weights[dimension]}
            onValueChange={(value) => setWeight(dimension, value)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button className="w-full" disabled={!enoughAnswers || !idle} onClick={() => void generateCareers()}>
          {t("priorities.show")}
        </Button>
        {!enoughAnswers && (
          <p className="font-mono text-xs tabular-nums text-chart-grey">
            {t("priorities.need", { count: studentCount, min: CAREER_IDEAS_MIN_STUDENT_MESSAGES })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline pt-6">
        {!confirming ? (
          <Button variant="secondary" className="w-full" disabled={!idle} onClick={() => setConfirming(true)}>
            {t("reset.start")}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-[1.55] text-foreground">{t("reset.line")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!idle}
                onClick={() => {
                  setConfirming(false);
                  void reset();
                }}
              >
                {t("reset.confirm")}
              </Button>
              <Button variant="quiet" onClick={() => setConfirming(false)}>
                {t("reset.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
