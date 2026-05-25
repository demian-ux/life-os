"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { InlineConfirmation } from "@/components/ui";
import { quickCapture } from "@/lib/actions/task-actions";

export function QuickCaptureBar({
  source = "quick",
  placeholder = "Quick capture: type a task and press Enter...",
}: {
  source?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      const result = await quickCapture({ title, source });
      if (result.ok) {
        setValue("");
        setSavedTick(Date.now());
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 transition-colors duration-150"
    >
      <Plus className="h-4 w-4 text-ink-muted shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-body focus:outline-none placeholder:text-ink-muted"
        disabled={pending}
      />
      {error ? (
        <span className="text-meta text-status-missed">{error}</span>
      ) : savedTick !== null ? (
        <InlineConfirmation key={savedTick} message="Added" />
      ) : null}
    </form>
  );
}
