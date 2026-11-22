import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Bookmark, Globe } from "lucide-react";
import type { CareerPath } from "@/core";
import { Badge } from "@/ui/components/Chip";
import { Panel } from "@/ui/components/Panel";
import { ProgressLine } from "@/ui/components/ProgressLine";
import { Button } from "@/ui/components/ui/button";
import { CounselorErrorNote } from "./CounselorErrorNote";
import { useCounselor } from "./useCounselor";

const DIMENSIONS = ["passions", "strengths", "goals", "earning"] as const;
const STAGGER_MS = 24;
const STAGGER_CAP = 8;

const normalizeTitle = (title: string) => title.trim().toLowerCase();

/** Career ideas as a ranked column of panels, not a grid of equal cards. */
export function CareerList() {
  const { t } = useTranslation("counselor");
  const allCareers = useCounselor((s) => s.careers);
  const latestBatchIds = useCounselor((s) => s.latestBatchIds);
  const status = useCounselor((s) => s.status);
  const error = useCounselor((s) => s.error);

  // Only the newest batch is listed in full. Saved careers from earlier batches go to a sub-list.
  const latestSet = latestBatchIds ? new Set(latestBatchIds) : null;
  const careers = latestSet ? allCareers.filter((c) => latestSet.has(c.id)) : allCareers;
  const latestTitles = new Set(careers.map((c) => normalizeTitle(c.title)));
  const earlierSaved = latestSet
    ? dedupeByTitle(
        allCareers
          .filter((c) => c.saved && !latestSet.has(c.id))
          .sort((a, b) => b.id - a.id),
      ).filter((c) => !latestTitles.has(normalizeTitle(c.title)))
    : [];

  const [initialIds] = useState(() => new Set(careers.map((c) => c.id)));
  const firstNew = careers.findIndex((c) => !initialIds.has(c.id));

  const careerError = error && (error.scope === "careers" || error.scope === "save") ? error : null;
  if (careers.length === 0 && earlierSaved.length === 0 && status !== "thinking-careers" && !careerError) return null;

  return (
    <section className="flex flex-col gap-4">
      {careers.length > 0 && (
        <h2 className="text-2xl leading-[1.2] font-semibold tracking-[-0.015em]">{t("careers.heading")}</h2>
      )}
      {status === "thinking-careers" && <ProgressLine message={t("careers.thinking")} />}
      {careerError && (
        <CounselorErrorNote
          error={careerError}
          title={careerError.scope === "save" ? "errors.saveTitle" : "errors.careersTitle"}
          canRetry={careerError.scope === "careers"}
        />
      )}
      <ol className="flex flex-col gap-4">
        {careers.map((career, index) => {
          const isNew = !initialIds.has(career.id);
          const delay = isNew ? Math.min(index - firstNew, STAGGER_CAP) * STAGGER_MS : 0;
          return (
            <li key={career.id}>
              <CareerCard
                career={career}
                rank={index + 1}
                style={isNew ? { animationDelay: `${delay}ms` } : undefined}
                animate={isNew}
              />
            </li>
          );
        })}
      </ol>
      {earlierSaved.length > 0 && <SavedCareers careers={earlierSaved} />}
    </section>
  );
}

/** Keeps the first career for each title (the list is already newest first). */
function dedupeByTitle(careers: CareerPath[]): CareerPath[] {
  const seen = new Set<string>();
  return careers.filter((c) => {
    const key = normalizeTitle(c.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Saved careers from earlier batches: a compact list of titles, each with its own save toggle. */
function SavedCareers({ careers }: { careers: CareerPath[] }) {
  const { t } = useTranslation("counselor");
  const toggleSaved = useCounselor((s) => s.toggleSaved);
  return (
    <section className="flex flex-col gap-3 border-t border-hairline pt-6">
      <h3 className="text-[1.0625rem] leading-[1.35] font-semibold">{t("careers.savedHeading")}</h3>
      <ul className="flex flex-col">
        {careers.map((career) => (
          <li key={career.id} className="flex items-center justify-between gap-4 border-b border-hairline py-2.5">
            <span className="min-w-0 break-words text-sm">{career.title}</span>
            <Button variant="quiet" aria-pressed={true} onClick={() => void toggleSaved(career.id)}>
              <Bookmark className="fill-current" aria-hidden="true" />
              {t("careers.saved")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CareerCard({
  career,
  rank,
  animate,
  style,
}: {
  career: CareerPath;
  rank: number;
  animate: boolean;
  style?: CSSProperties;
}) {
  const { t } = useTranslation("counselor");
  const navigate = useNavigate();
  const toggleSaved = useCounselor((s) => s.toggleSaved);
  const dimensions = DIMENSIONS.filter((d) => d in career.fitBreakdown);

  return (
    <Panel
      className={`flex flex-col gap-4 ${animate ? "motion-safe:animate-in motion-safe:fade-in" : ""}`}
      style={style}
    >
      <div className="flex items-start gap-4">
        <span className="pt-1.5 font-mono text-xs font-medium tabular-nums text-chart-grey" aria-hidden="true">
          {String(rank).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-2xl leading-[1.2] font-semibold tracking-[-0.015em] break-words">{career.title}</h3>
          <p className="text-sm leading-[1.55] break-words">{career.summary}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 pl-8">
        <p className="text-xs text-chart-grey">{t("careers.whyYou")}</p>
        <p className="max-w-[68ch] text-base leading-[1.6] break-words">{career.whyYou}</p>
      </div>

      {career.degreeKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-8">
          {career.degreeKeywords.map((keyword) => (
            <Badge key={keyword}>{keyword}</Badge>
          ))}
        </div>
      )}

      {dimensions.length > 0 && (
        <dl className="grid gap-2 pl-8 sm:grid-cols-2">
          {dimensions.map((dimension) => {
            const value = career.fitBreakdown[dimension] ?? 0;
            return (
              <div key={dimension} className="flex flex-col gap-1">
                <dt className="flex items-baseline justify-between gap-3 text-xs text-foreground">
                  <span>{t(`priorities.${dimension}`)}</span>
                  <span className="font-mono font-medium tabular-nums">{value}%</span>
                </dt>
                <dd className="m-0 h-1.5 w-full overflow-hidden rounded-pill bg-shoal">
                  <div className="h-full rounded-pill bg-foreground" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4 pl-8">
        <Button
          variant="quiet"
          aria-pressed={career.saved}
          onClick={() => void toggleSaved(career.id)}
        >
          <Bookmark className={career.saved ? "fill-current" : undefined} aria-hidden="true" />
          {career.saved ? t("careers.saved") : t("careers.save")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate("/finder", { state: { career: career.title } })}
        >
          <Globe aria-hidden="true" />
          {t("careers.find")}
        </Button>
      </div>
    </Panel>
  );
}
