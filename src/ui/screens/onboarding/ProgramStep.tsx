import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Program } from "@/core/contracts";
import { useOnboardingDraft } from "./useOnboardingDraft";
import { type Errors } from "./draftRules";
import { StepHeading, StepSection, useErrorText } from "./StepParts";

const PROGRAMS: Program[] = ["IB", "AP", "US"];

/** Step 4: one program, as large radio rows with a signal rule on the selected one. */
export function ProgramStep({ errors }: { errors: Errors }) {
  const { t } = useTranslation("onboarding");
  const errorText = useErrorText(errors);
  const program = useOnboardingDraft((s) => s.program);
  const set = useOnboardingDraft((s) => s.set);
  const error = errorText("program");

  return (
    <StepSection>
      <StepHeading id="onboarding-program-title" title={t("program.title")} />
      <div>
        <div role="radiogroup" aria-labelledby="onboarding-program-title" className="flex flex-col border-t border-hairline">
          {PROGRAMS.map((p, index) => {
            const checked = program === p;
            return (
              <label
                key={p}
                className={cn(
                  "relative flex min-h-12 cursor-pointer items-center gap-3 border-b border-hairline px-4 py-3 text-[1.0625rem] font-semibold text-foreground transition-colors duration-[120ms] hover:bg-shoal focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-signal",
                  checked && "bg-shoal before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-signal",
                )}
              >
                <input
                  type="radio"
                  name="program"
                  value={p}
                  checked={checked}
                  autoFocus={index === 0}
                  onChange={() => set({ program: p })}
                  className="size-4 accent-foreground"
                />
                <span>{t(`program.${p}`)}</span>
              </label>
            );
          })}
        </div>
        {error && <p className="pt-2 text-xs text-signal">{error}</p>}
      </div>
    </StepSection>
  );
}
