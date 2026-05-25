"use client";

import { useState, useTransition } from "react";
import { Focus } from "lucide-react";
import { Button, Card, SectionHeading, Textarea } from "@/components/ui";
import { setDayFocus } from "@/lib/actions/today-actions";

export function TodayFocus({
  dayPlanId,
  initialFocus,
}: {
  dayPlanId: string;
  initialFocus: string;
}) {
  const [value, setValue] = useState(initialFocus);
  const [editing, setEditing] = useState(initialFocus.length === 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setDayFocus({ dayPlanId, focus: value.trim() });
      if (result.ok) {
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <SectionHeading icon={Focus}>Today&apos;s focus</SectionHeading>
      {editing ? (
        <div className="grid gap-2 mt-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="One sentence. What's the day actually about?"
            rows={2}
            className="min-h-0 resize-none font-[var(--font-display)] italic text-[16px] bg-cream-50"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="primary" onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
            {initialFocus ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setValue(initialFocus);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="text-[12px] text-[color:var(--danger-500)]">{error}</p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-[var(--font-display)] italic text-[16px] text-left w-full text-ink-800 mt-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40"
        >
          {initialFocus || (
            <span className="text-bark-500 not-italic font-[var(--font-body)] text-[14px]">
              Click to set today&apos;s focus.
            </span>
          )}
        </button>
      )}
    </Card>
  );
}
