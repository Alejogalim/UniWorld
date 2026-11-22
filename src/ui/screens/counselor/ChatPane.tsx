import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/ui/components/Input";
import { Button } from "@/ui/components/ui/button";
import { CounselorErrorNote } from "./CounselorErrorNote";
import { INTAKE_TOTAL } from "./intake";
import { useCounselor, type ChatMessage } from "./useCounselor";

const SIX_LINES_PX = 6 * 22 + 16; // 6 lines at 1.55 * 14px, plus 8px padding top and bottom

/** The counselor conversation: a log that auto-scrolls, then the composer. */
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

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [messages]);

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
    <section className="flex min-w-0 flex-col gap-4">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t("chat.log")}
        onScroll={onLogScroll}
        className="flex max-h-[min(60vh,560px)] min-h-32 flex-col gap-4 overflow-y-auto pr-2"
      >
        {messages.map((m, i) => (
          <MessageView
            key={m.id}
            message={m}
            showLabel={m.role === "counselor" && messages[i - 1]?.role !== "counselor"}
            animate={!initialIds.has(m.id)}
          />
        ))}
      </div>

      {error?.scope === "chat" && (
        <CounselorErrorNote error={error} title="errors.chatTitle" canRetry={pending !== null} />
      )}

      <div className="flex flex-col gap-2">
        {intake && (
          <p className="font-mono text-xs font-medium tabular-nums text-chart-grey">
            {t("intake.progress", { n: intakeStep, total: INTAKE_TOTAL })}
          </p>
        )}
        <div className="flex items-end gap-3">
          <Textarea
            ref={textareaRef}
            aria-label={intake ? t("chat.placeholderAnswer") : t("chat.placeholderReply")}
            placeholder={intake ? t("chat.placeholderAnswer") : t("chat.placeholderReply")}
            rows={1}
            value={draft}
            disabled={busy}
            onChange={(e) => {
              setDraft(e.target.value);
              resize(e.target);
            }}
            onKeyDown={onKeyDown}
            className="min-h-10 flex-1 resize-none py-2"
          />
          <Button onClick={submit} disabled={!canSend} className="min-w-24">
            {busy ? t("chat.sending") : t("chat.send")}
          </Button>
        </div>
      </div>
    </section>
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
      <div className={`ml-auto max-w-[85%] rounded-lg bg-shoal px-4 py-2.5 text-sm leading-[1.55] break-words whitespace-pre-wrap text-foreground ${animation ?? ""}`}>
        {message.text}
      </div>
    );
  }

  return (
    <div className={`flex max-w-[68ch] flex-col gap-1 ${animation ?? ""}`}>
      {showLabel && <p className="text-xs text-chart-grey">{t("chat.label")}</p>}
      <p className="text-base leading-[1.6] break-words whitespace-pre-wrap text-foreground">
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
