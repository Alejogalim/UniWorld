import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { EmptyState } from "@/ui/components/EmptyState";
import { ErrorNote } from "@/ui/components/ErrorNote";
import { ProgressLine } from "@/ui/components/ProgressLine";
import { Button } from "@/ui/components/ui/button";
import { useProfile } from "@/store/profile";
import { CareerList } from "./counselor/CareerList";
import { ChatPane } from "./counselor/ChatPane";
import { PrioritiesPanel } from "./counselor/PrioritiesPanel";
import { useCounselor } from "./counselor/useCounselor";

/** Design §7.2: intake chat on the left, importance sliders on the right, career ideas below the chat. */
export function CounselorScreen() {
  const { t } = useTranslation(["counselor", "common"]);
  const navigate = useNavigate();
  const profile = useProfile((s) => s.profile);
  const profileLoaded = useProfile((s) => s.loaded);
  const loaded = useCounselor((s) => s.loaded);
  const ensureLoaded = useCounselor((s) => s.ensureLoaded);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    ensureLoaded().catch((err: unknown) => {
      setLoadError(err instanceof Error ? err.message : String(err));
    });
  }, [ensureLoaded]);

  if (profileLoaded && !profile) {
    return (
      <div className="max-w-[1120px] px-12 py-8">
        <EmptyState
          title={t("noProfile.title")}
          description={t("noProfile.description")}
          action={<Button onClick={() => navigate("/onboarding")}>{t("noProfile.action")}</Button>}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-[1120px] px-12 py-8">
        <ErrorNote message={loadError} />
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="max-w-[1120px] px-12 py-8">
        <ProgressLine message={t("common:loading")} />
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] px-12 py-8">
      <div className="grid gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          <ChatPane />
          <CareerList />
        </div>
        <aside className="min-[1100px]:sticky min-[1100px]:top-8 min-[1100px]:self-start">
          <PrioritiesPanel />
        </aside>
      </div>
    </div>
  );
}
