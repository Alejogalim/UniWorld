import { useTranslation } from "react-i18next";
import { Button } from "@/ui/components/ui/button";
import { Field } from "@/ui/components/Field";
import { Input, Select } from "@/ui/components/Input";
import { newRowKey, useOnboardingDraft } from "./useOnboardingDraft";
import { type Errors } from "./draftRules";
import { RowErrors, StepHeading, StepSection, useErrorText } from "./StepParts";

const IB_COLS = "sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto]";
const AP_COLS = "sm:grid-cols-[minmax(0,1fr)_7rem_auto]";

/** Step 5 (optional): the form follows the program chosen in step 4. Empty fields are omitted on save. */
export function GradesStep({ errors }: { errors: Errors }) {
  const { t } = useTranslation("onboarding");
  const errorText = useErrorText(errors);
  const program = useOnboardingDraft((s) => s.program);
  const g = useOnboardingDraft((s) => s.grades);
  const setGrades = useOnboardingDraft((s) => s.setGrades);

  return (
    <StepSection>
      <StepHeading title={t("grades.title")} note={t("grades.note")} />

      {program === "IB" && (
        <>
          <Field label={t("grades.ib.predictedTotal")} error={errorText("ibPredicted")} className="max-w-48">
            {(c) => (
              <Input
                {...c}
                autoFocus
                inputMode="numeric"
                value={g.ibPredicted}
                onChange={(e) => setGrades({ ibPredicted: e.target.value })}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-foreground">{t("grades.ib.subjects")}</span>
            <div className={`hidden gap-2 text-xs text-chart-grey sm:grid ${IB_COLS}`}>
              <span>{t("grades.ib.subjectName")}</span>
              <span>{t("grades.ib.subjectLevel")}</span>
              <span>{t("grades.ib.subjectScore")}</span>
              <span className="sr-only">{t("grades.ib.removeSubject")}</span>
            </div>
            {g.ibSubjects.map((row) => {
              const nameError = errorText(`subject-${row.key}-name`);
              const scoreError = errorText(`subject-${row.key}-score`);
              const update = (patch: Partial<typeof row>) =>
                setGrades({ ibSubjects: g.ibSubjects.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) });
              return (
                <div key={row.key} className="flex flex-col gap-1">
                  <div className={`grid grid-cols-1 gap-2 ${IB_COLS} sm:items-center`}>
                    <Input
                      aria-label={t("grades.ib.subjectName")}
                      aria-invalid={Boolean(nameError) || undefined}
                      value={row.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Select
                      aria-label={t("grades.ib.subjectLevel")}
                      value={row.level}
                      onChange={(e) => update({ level: e.target.value as "HL" | "SL" })}
                    >
                      <option value="HL">HL</option>
                      <option value="SL">SL</option>
                    </Select>
                    <Input
                      aria-label={t("grades.ib.subjectScore")}
                      aria-invalid={Boolean(scoreError) || undefined}
                      inputMode="numeric"
                      value={row.score}
                      onChange={(e) => update({ score: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => setGrades({ ibSubjects: g.ibSubjects.filter((r) => r.key !== row.key) })}
                    >
                      {t("grades.ib.removeSubject")}
                    </Button>
                  </div>
                  <RowErrors messages={[nameError, scoreError]} />
                </div>
              );
            })}
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setGrades({ ibSubjects: [...g.ibSubjects, { key: newRowKey(), name: "", level: "HL", score: "" }] })
                }
              >
                {t("grades.ib.addSubject")}
              </Button>
            </div>
          </div>
        </>
      )}

      {program === "AP" && (
        <>
          <Field label={t("grades.ap.gpa")} error={errorText("apGpa")} className="max-w-48">
            {(c) => (
              <Input
                {...c}
                autoFocus
                inputMode="decimal"
                value={g.apGpa}
                onChange={(e) => setGrades({ apGpa: e.target.value })}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-foreground">{t("grades.ap.exams")}</span>
            <div className={`hidden gap-2 text-xs text-chart-grey sm:grid ${AP_COLS}`}>
              <span>{t("grades.ap.examName")}</span>
              <span>{t("grades.ap.examScore")}</span>
              <span className="sr-only">{t("grades.ap.removeExam")}</span>
            </div>
            {g.apExams.map((row) => {
              const nameError = errorText(`exam-${row.key}-name`);
              const scoreError = errorText(`exam-${row.key}-score`);
              const update = (patch: Partial<typeof row>) =>
                setGrades({ apExams: g.apExams.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) });
              return (
                <div key={row.key} className="flex flex-col gap-1">
                  <div className={`grid grid-cols-1 gap-2 ${AP_COLS} sm:items-center`}>
                    <Input
                      aria-label={t("grades.ap.examName")}
                      aria-invalid={Boolean(nameError) || undefined}
                      value={row.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <Input
                      aria-label={t("grades.ap.examScore")}
                      aria-invalid={Boolean(scoreError) || undefined}
                      inputMode="numeric"
                      value={row.score}
                      onChange={(e) => update({ score: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => setGrades({ apExams: g.apExams.filter((r) => r.key !== row.key) })}
                    >
                      {t("grades.ap.removeExam")}
                    </Button>
                  </div>
                  <RowErrors messages={[nameError, scoreError]} />
                </div>
              );
            })}
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGrades({ apExams: [...g.apExams, { key: newRowKey(), name: "", score: "" }] })}
              >
                {t("grades.ap.addExam")}
              </Button>
            </div>
          </div>
        </>
      )}

      {program === "US" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Field label={t("grades.us.gpaUnweighted")} error={errorText("usGpa")}>
            {(c) => (
              <Input
                {...c}
                autoFocus
                inputMode="decimal"
                value={g.usGpa}
                onChange={(e) => setGrades({ usGpa: e.target.value })}
              />
            )}
          </Field>
          <Field label={t("grades.us.sat")} error={errorText("usSat")}>
            {(c) => (
              <Input {...c} inputMode="numeric" value={g.usSat} onChange={(e) => setGrades({ usSat: e.target.value })} />
            )}
          </Field>
          <Field label={t("grades.us.act")} error={errorText("usAct")}>
            {(c) => (
              <Input {...c} inputMode="numeric" value={g.usAct} onChange={(e) => setGrades({ usAct: e.target.value })} />
            )}
          </Field>
        </div>
      )}
    </StepSection>
  );
}
