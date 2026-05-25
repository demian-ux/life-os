"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Card,
  InlineConfirmation,
  SectionHeading,
  Textarea,
} from "@/components/ui";
import { updateReflection } from "@/lib/actions/week-actions";

export function WeeklyReflection({
  weekId,
  initialReflection,
}: {
  weekId: string;
  initialReflection: string;
}) {
  const [value, setValue] = useState(initialReflection);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);

  const dirty = value !== initialReflection;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateReflection({
        weekId,
        reflection: value.trim(),
      });
      if (result.ok) {
        setSavedTick(Date.now());
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionHeading>Reflection</SectionHeading>
        <div className="flex items-center gap-2">
          {!dirty && savedTick !== null ? (
            <InlineConfirmation key={savedTick} message="Saved" />
          ) : null}
          {dirty ? (
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          ) : null}
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What worked? What drained? What needs to change?"
        rows={4}
        className="resize-none"
      />
      {error ? (
        <p className="text-meta text-status-missed mt-1">{error}</p>
      ) : null}
    </Card>
  );
}
