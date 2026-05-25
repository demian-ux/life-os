"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  IconButton,
  Input,
  SectionHeading,
  Tooltip,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addWeeklyTarget,
  deleteWeeklyTarget,
  toggleWeeklyTarget,
} from "@/lib/actions/week-actions";

type Target = {
  id: string;
  title: string;
  status: string;
};

export function WeeklyTargets({
  weekId,
  targets,
}: {
  weekId: string;
  targets: Target[];
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      const result = await addWeeklyTarget({ weekId, title });
      if (result.ok) {
        setDraft("");
      } else {
        setError(result.error);
      }
    });
  }

  function toggle(targetId: string) {
    setError(null);
    startTransition(async () => {
      const result = await toggleWeeklyTarget({ targetId });
      if (!result.ok) setError(result.error);
    });
  }

  function remove(targetId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteWeeklyTarget({ targetId });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <SectionHeading className="mb-3">Weekly targets</SectionHeading>
      {targets.length === 0 ? (
        <p className="text-body-sm text-ink-muted mb-3">
          No targets yet. Add 1-3 outcomes for the week.
        </p>
      ) : (
        <ul className="grid gap-1 mb-3">
          {targets.map((target) => {
            const done = target.status === "DONE";
            return (
              <li key={target.id} className="flex items-center gap-2 group">
                <button
                  type="button"
                  onClick={() => toggle(target.id)}
                  disabled={pending}
                  aria-label={done ? "Mark not done" : "Mark done"}
                  className={cn(
                    "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
                    done
                      ? "bg-accent border-accent text-bg"
                      : "border-line hover:border-ink-soft",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : null}
                </button>
                <span
                  className={cn(
                    "flex-1 text-body",
                    done ? "line-through text-ink-muted" : "text-ink",
                  )}
                >
                  {target.title}
                </span>
                <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Tooltip label="Delete">
                    <IconButton
                      label="Delete target"
                      size="sm"
                      onClick={() => remove(target.id)}
                      disabled={pending}
                      className="hover:text-status-missed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </Tooltip>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={submitNew} className="flex gap-2">
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a target"
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !draft.trim()}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
      {error ? (
        <p className="text-meta text-status-missed mt-2">{error}</p>
      ) : null}
    </Card>
  );
}
