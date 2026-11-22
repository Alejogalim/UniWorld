import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ErrorNote } from "@/ui/components/ErrorNote";
import { Button } from "@/ui/components/ui/button";
import { useCounselor, type CounselorError } from "./useCounselor";

interface CounselorErrorNoteProps {
  error: CounselorError;
  /** i18n key (in the counselor namespace) for the note's title. */
  title: string;
  canRetry: boolean;
}

/** A designed error: says what went wrong, then offers the one action that fixes it. */
export function CounselorErrorNote({ error, title, canRetry }: CounselorErrorNoteProps) {
  const { t } = useTranslation("counselor");
  const navigate = useNavigate();
  const retry = useCounselor((s) => s.retry);
  const busy = useCounselor((s) => s.status !== "idle");

  return (
    <ErrorNote
      title={t(title)}
      message={error.missingKey ? t("errors.missingKey") : error.message || t("errors.noReply")}
      action={
        error.missingKey || canRetry ? (
          <div className="flex flex-wrap gap-2">
            {error.missingKey && (
              <Button variant="secondary" onClick={() => navigate("/settings")}>
                {t("errors.openSettings")}
              </Button>
            )}
            {canRetry && (
              <Button variant="secondary" disabled={busy} onClick={() => void retry()}>
                {t("errors.tryAgain")}
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
