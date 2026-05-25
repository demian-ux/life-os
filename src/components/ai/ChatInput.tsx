"use client";

import { useState, useTransition } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui";
import { sendChatMessage } from "@/lib/actions/ai-coach-actions";

export function ChatInput({
  conversationId,
  disabled,
  disabledReason,
}: {
  conversationId?: string;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = value.trim();
    if (!message) return;
    setError(null);
    startTransition(async () => {
      const result = await sendChatMessage({ conversationId, message });
      if (result.ok) {
        setValue("");
      } else {
        setError(result.error);
      }
    });
  }

  if (disabled) {
    return (
      <div className="rounded-card border border-dashed border-line px-3 py-2 text-body-sm text-ink-muted">
        {disabledReason ?? "AI is not configured."}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-card border border-line bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 transition-colors duration-150"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            submit(e);
          }
        }}
        rows={2}
        placeholder="Ask the coach… (Cmd/Ctrl+Enter to send)"
        className="flex-1 bg-transparent text-body focus:outline-none resize-none placeholder:text-ink-muted"
        disabled={pending}
      />
      <Button type="submit" size="sm" disabled={pending || !value.trim()}>
        <SendHorizonal className="h-3.5 w-3.5" />
        {pending ? "Sending..." : "Send"}
      </Button>
      {error ? (
        <span className="text-meta text-status-missed self-center">{error}</span>
      ) : null}
    </form>
  );
}
