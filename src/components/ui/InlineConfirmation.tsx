"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type InlineConfirmationProps = {
  message: string;
  onUndo?: () => void;
  duration?: number; // ms before auto-hide
  className?: string;
};

// Replaces the "toast" pattern with a calmer inline marker.
// Use it next to the action it confirms — e.g. after logging a habit,
// render <InlineConfirmation message="Logged" onUndo={...} /> inside
// the habit card. Fades out after `duration`.
export function InlineConfirmation({
  message,
  onUndo,
  duration = 3000,
  className,
}: InlineConfirmationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(id);
  }, [duration]);

  if (!visible) return null;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 text-meta text-ink-soft transition-opacity duration-200",
        className,
      )}
    >
      <Check className="h-3 w-3 text-status-done" />
      <span>{message}</span>
      {onUndo ? (
        <>
          <span className="text-ink-muted">·</span>
          <button
            type="button"
            onClick={onUndo}
            className="text-accent hover:text-accent-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            undo
          </button>
        </>
      ) : null}
    </span>
  );
}
