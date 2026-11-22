import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCore } from "@/app/useCore";
import type { Provider } from "@/core/contracts";
import { setSecret } from "@/store/secrets";
import { Badge } from "@/ui/components/Chip";
import { ErrorNote } from "@/ui/components/ErrorNote";
import { Field } from "@/ui/components/Field";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/ui/button";
import { type Errors } from "./draftRules";
import { useOnboardingDraft } from "./useOnboardingDraft";
import { StepHeading, StepSection, useErrorText } from "./StepParts";

const KEYS_PAGE = "https://openrouter.ai/keys";

/**
 * The only place the onboarding touches the keychain. Keys go to the OS keychain
 * (never SQLite, never the profile). An empty OpenCode field removes its stored key.
 */
export async function saveProviderKeys(keys: { openrouter: string; opencode: string }): Promise<void> {
  // An empty field keeps what is stored. Keys are removed in Settings, not by emptying a field.
  if (keys.openrouter) await setSecret("openrouter", keys.openrouter);
  if (keys.opencode) await setSecret("opencode", keys.opencode);
}

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok" } | { status: "fail"; message: string };

interface KeyFieldProps {
  provider: Provider;
  label: ReactNode;
  hint: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  test: TestState;
  onTest: () => void;
  autoFocus?: boolean;
  /** A key is already in the keychain and the field is empty. */
  stored: boolean;
}

function KeyField({ provider, label, hint, error, value, onChange, test, onTest, autoFocus, stored }: KeyFieldProps) {
  const { t } = useTranslation("onboarding");
  const [shown, setShown] = useState(false);
  const testing = test.status === "testing";

  return (
    <div data-provider={provider} className="flex flex-col gap-3">
      <Field label={label} hint={hint} error={error}>
        {(c) => (
          <div className="relative">
            <Input
              {...c}
              autoFocus={autoFocus}
              type={shown ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={value}
              placeholder={t("ai.keyPlaceholder")}
              onChange={(e) => onChange(e.target.value)}
              className="pr-10 font-mono"
            />
            <Button
              type="button"
              variant="quiet"
              size="icon"
              aria-label={shown ? t("ai.hideKey") : t("ai.showKey")}
              onClick={() => setShown((v) => !v)}
              className="absolute top-1/2 right-0.5 -translate-y-1/2"
            >
              {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
        )}
      </Field>
      {stored && value.trim() === "" && <p className="text-xs text-evidence">{t("ai.savedInKeychain")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={value.trim() === "" || testing}
          onClick={onTest}
        >
          {testing ? t("ai.testing") : t("ai.testConnection")}
        </Button>
        {test.status === "ok" && <span className="text-sm text-evidence">{t("ai.connected")}</span>}
      </div>
      {test.status === "fail" && <ErrorNote title={t("ai.failedTitle")} message={test.message} />}
    </div>
  );
}

/** Step 7: the OpenRouter key (required) and the OpenCode Go key (optional, experimental). */
export function AiKeyStep({ errors }: { errors: Errors }) {
  const { t } = useTranslation("onboarding");
  const errorText = useErrorText(errors);
  const core = useCore();
  const openrouterKey = useOnboardingDraft((s) => s.openrouterKey);
  const opencodeKey = useOnboardingDraft((s) => s.opencodeKey);
  const set = useOnboardingDraft((s) => s.set);
  const [tests, setTests] = useState<Record<Provider, TestState>>({
    openrouter: { status: "idle" },
    opencode: { status: "idle" },
  });
  const [openError, setOpenError] = useState<string | null>(null);

  const keyOf = (p: Provider) => (p === "openrouter" ? openrouterKey : opencodeKey);
  const setKey = (p: Provider, value: string) => {
    set(p === "openrouter" ? { openrouterKey: value } : { opencodeKey: value });
    setTests((s) => ({ ...s, [p]: { status: "idle" } }));
  };

  // Save the key to the keychain, then ask the core to check it. Failures are shown, not swallowed.
  const test = async (p: Provider) => {
    setTests((s) => ({ ...s, [p]: { status: "testing" } }));
    try {
      await setSecret(p, keyOf(p).trim());
      const result = await core.testConnection(p);
      setTests((s) => ({
        ...s,
        [p]: result.ok ? { status: "ok" } : { status: "fail", message: result.error?.trim() || t("ai.noDetail") },
      }));
    } catch (err) {
      setTests((s) => ({
        ...s,
        [p]: { status: "fail", message: err instanceof Error ? err.message : String(err) },
      }));
    }
  };

  const openKeysPage = async () => {
    setOpenError(null);
    try {
      await openUrl(KEYS_PAGE);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <StepSection>
      <StepHeading title={t("ai.title")} />

      <KeyField
        provider="openrouter"
        label={t("ai.openrouter.label")}
        hint={t("ai.openrouter.required")}
        error={errorText("openrouterKey")}
        value={openrouterKey}
        onChange={(v) => setKey("openrouter", v)}
        test={tests.openrouter}
        onTest={() => void test("openrouter")}
        autoFocus
        stored={useOnboardingDraft((s) => s.storedKeys.openrouter)}
      />

      <div className="flex flex-col gap-2 text-sm text-chart-grey">
        <div className="flex flex-wrap items-center gap-2">
          <span>{t("ai.getKey")}</span>
          <span className="text-foreground">{KEYS_PAGE}</span>
          <Button type="button" variant="quiet" size="icon" aria-label={t("ai.openKeysPage")} onClick={() => void openKeysPage()}>
            <ExternalLink aria-hidden="true" />
          </Button>
        </div>
        {openError && <p className="text-xs text-signal">{t("ai.openFailed", { error: openError })}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <KeyField
          provider="opencode"
          label={
            <>
              {t("ai.opencode.label")}
              <Badge>{t("ai.opencode.experimental")}</Badge>
            </>
          }
          hint={t("ai.opencode.optional")}
          value={opencodeKey}
          onChange={(v) => setKey("opencode", v)}
          test={tests.opencode}
          onTest={() => void test("opencode")}
          stored={useOnboardingDraft((s) => s.storedKeys.opencode)}
        />
      </div>

      <p className="text-xs text-chart-grey">{t("ai.keyStored")}</p>
    </StepSection>
  );
}
