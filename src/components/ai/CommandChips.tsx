"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { sendChatMessage } from "@/lib/actions/ai-coach-actions";

const CHIPS = [
  "Plan my week",
  "Simplify today",
  "What should I do next?",
  "Move unfinished tasks",
  "Review my week",
  "Make tomorrow realistic",
] as const;

export function CommandChips({
  conversationId,
  disabled,
}: {
  conversationId?: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (disabled) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() =>
            startTransition(async () => {
              await sendChatMessage({ conversationId, message: chip });
            })
          }
          disabled={pending}
          className={cn(
            "px-2.5 py-1 rounded-pill text-meta border border-line bg-surface text-ink-soft",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
            "hover:border-accent hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
