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
    <div className="flex min-h-full">
      <div className="flex min-w-0 flex-1 flex-col px-6 py-8 min-[1100px]:px-10">
        <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-8">
          <ChatPane />
          <CareerList />
        </div>
      </div>
      <div aria-hidden="true" className="fixed top-0 right-[240px] bottom-0 hidden w-px bg-hairline min-[900px]:block" />
      <aside className="hidden w-[240px] shrink-0 min-[900px]:flex min-[900px]:flex-col">
        <div className="sticky top-0 flex flex-col px-4 py-8">
          <PrioritiesPanel />
        </div>
      </aside>
    </div>
  );
}
