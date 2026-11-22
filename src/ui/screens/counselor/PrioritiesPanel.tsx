import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Panel } from "@/ui/components/Panel";
import { Slider } from "@/ui/components/Slider";
import { Button } from "@/ui/components/ui/button";
import { CAREER_IDEAS_MIN_STUDENT_MESSAGES } from "@/core";
import { useCounselor } from "./useCounselor";

const DIMENSIONS = ["passions", "strengths", "goals", "earning"] as const;

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
    <Panel variant="bare" className="flex flex-col gap-6">
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
    </Panel>
  );
}
