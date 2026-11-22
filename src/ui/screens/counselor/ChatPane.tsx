import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Textarea } from "@/ui/components/Input";
import { Button } from "@/ui/components/ui/button";
import { CounselorErrorNote } from "./CounselorErrorNote";
import { PrioritiesPanel } from "./PrioritiesPanel";
import { INTAKE_TOTAL } from "./intake";
import { useCounselor, type ChatMessage } from "./useCounselor";

const SIX_LINES_PX = 6 * 22 + 16; // 6 lines at 1.55 * 14px, plus 8px padding top and bottom

/**
 * The counselor conversation. With no answer yet it is a start screen: the opening question
 * heads a centered block with the composer under it. Once an answer exists the same centered
 * column carries the log.
 */
export function ChatPane() {
  const { t } = useTranslation("counselor");
  const messages = useCounselor((s) => s.messages);
  const intakeStep = useCounselor((s) => s.intakeStep);
  const status = useCounselor((s) => s.status);
  const error = useCounselor((s) => s.error);
  const pending = useCounselor((s) => s.pending);
  const sendAnswer = useCounselor((s) => s.sendAnswer);

  // Messages present at mount are not animated; only ones that arrive afterwards fade in.
  const [initialIds] = useState(() => new Set(messages.map((m) => m.id)));
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const intake = intakeStep <= INTAKE_TOTAL;
  const busy = status !== "idle";
  const canSend = draft.trim().length > 0 && !busy;
  // No student message yet (and the chat has loaded): nothing to scroll, so the opening question heads the screen.
  const fresh = messages.length > 0 && messages.every((m) => m.role === "counselor");
  const opening = messages.find((m) => m.role === "counselor")?.text ?? "";
  // Keyboard hint only where Enter sends: touch layouts have no Shift+Enter on the soft keyboard.
  const [touch] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true,
  );

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [messages]);

  // Re-measure the field whenever the draft changes, including a suggestion filling it.
  useLayoutEffect(() => {
    if (textareaRef.current) resize(textareaRef.current);
  }, [draft]);

  function onLogScroll() {
    const log = logRef.current;
    if (!log) return;
    stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  }

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, SIX_LINES_PX)}px`;
  }

  function submit() {
    const text = draft.trim();
    if (!text || busy) return;
    stickToBottom.current = true;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void sendAnswer(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section
      className={cn(
        // The start screen is centered; a running conversation runs from the top, composer pinned below.
        "mx-auto flex w-full min-w-0 max-w-[44rem] flex-col",
        fresh ? "min-h-[calc(100vh-2.75rem)] justify-center gap-8" : "h-[calc(100vh-2.75rem)] gap-8",
      )}
    >
      {fresh ? (
        <div className="flex flex-col gap-3 px-2 text-center">
          <p className="type-label text-chart-grey">{t("chat.startTitle")}</p>
          <h2 className="type-headline mx-auto max-w-[26ch] text-balance">{opening}</h2>
          {intake && <IntakeProgress step={intakeStep} />}
        </div>
      ) : (
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label={t("chat.log")}
          onScroll={onLogScroll}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pt-6 pr-2"
        >
          {messages.map((m, i) => (
            <MessageView
              key={m.id}
              message={m}
              showLabel={m.role === "counselor" && messages[i - 1]?.role !== "counselor"}
              animate={!initialIds.has(m.id)}
            />
          ))}
          {/* The last question: how much each thing matters, once the intake is done. */}
          {intakeStep > INTAKE_TOTAL && (
            <div className="border-t border-hairline pt-6">
              <PrioritiesPanel />
            </div>
          )}
        </div>
      )}

      {error?.scope === "chat" && (
        <CounselorErrorNote error={error} title="errors.chatTitle" canRetry={pending !== null} />
      )}

      <div className={cn("flex flex-col gap-3", !fresh && "border-t border-hairline pt-5")}>
        {!fresh && intake && <IntakeProgress step={intakeStep} />}
        {/* One pill carries the rim, the focus ring and the field, so the field itself stays bare. */}
        <div className="rim lift flex items-end gap-2 rounded-pill bg-panel py-2 pr-2 pl-4 [--rim-fill:linear-gradient(var(--panel),var(--panel))] focus-within:outline-2 focus-within:outline-signal">
          <Textarea
            ref={textareaRef}
            aria-label={intake ? t("chat.placeholderAnswer") : t("chat.placeholderReply")}
            placeholder={intake ? t(`intake.hint${intakeStep}`) : t("chat.placeholderReply")}
            rows={1}
            value={draft}
            disabled={busy}
            onChange={(e) => {
              setDraft(e.target.value);
              resize(e.target);
            }}
            onKeyDown={onKeyDown}
            className="min-h-10 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:outline-0 focus-visible:shadow-none"
          />
          <Button onClick={submit} disabled={!canSend} className="min-w-24">
            {busy ? t("chat.sending") : t("chat.send")}
          </Button>
        </div>
        {!touch && <p className="text-center text-xs text-chart-grey">{t("chat.enterHint")}</p>}
        {intake && (
          <div className="flex justify-center">
            <Button variant="quiet" onClick={() => void sendAnswer(t("chat.notSure"))} disabled={busy}>
              {t("chat.notSureButton")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

/** The six-step intake progress, centered. */
function IntakeProgress({ step }: { step: number }) {
  const { t } = useTranslation("counselor");
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={INTAKE_TOTAL}
      aria-valuenow={step}
      aria-label={t("intake.progress", { n: step, total: INTAKE_TOTAL })}
      className="mx-auto flex w-full max-w-48 gap-1.5"
    >
      {Array.from({ length: INTAKE_TOTAL }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-pill",
            i + 1 < step && "bg-foreground/60",
            i + 1 === step && "bg-signal",
            i + 1 > step && "bg-hairline",
          )}
        />
      ))}
    </div>
  );
}

function MessageView({
  message,
  showLabel,
  animate,
}: {
  message: ChatMessage;
  showLabel: boolean;
  animate: boolean;
}) {
  const { t } = useTranslation("counselor");
  const animation = animate ? "motion-safe:animate-in motion-safe:fade-in" : undefined;

  if (message.role === "student") {
    return (
      <div className={`ml-auto max-w-[85%] rim rounded-popover bg-shoal px-4 py-2.5 text-[0.9375rem] leading-[1.55] [--rim-fill:linear-gradient(var(--shoal),var(--shoal))] break-words whitespace-pre-wrap text-foreground ${animation ?? ""}`}>
        {message.text}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${animation ?? ""}`}>
      {showLabel && <p className="text-xs text-chart-grey">{t("chat.label")}</p>}
      <p className="max-w-[68ch] text-[0.9375rem] leading-[1.65] break-words whitespace-pre-wrap text-foreground">
        {message.text}
        {message.streaming && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.15em] bg-foreground motion-safe:animate-pulse"
          />
        )}
      </p>
    </div>
  );
}
