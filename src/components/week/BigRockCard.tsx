"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Mountain, Pencil } from "lucide-react";
import {
  Button,
  Card,
  InlineConfirmation,
  Pill,
  ProgressBar,
  SectionHeading,
  Textarea,
} from "@/components/ui";
import { updateBigRock } from "@/lib/actions/week-actions";

export function BigRockCard({
  weekId,
  initialBigRock,
  targetsDone,
  targetsTotal,
}: {
  weekId: string;
  initialBigRock: string;
  targetsDone: number;
  targetsTotal: number;
}) {
  const [value, setValue] = useState(initialBigRock);
  const [editing, setEditing] = useState(initialBigRock.length === 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);

  const dirty = value !== initialBigRock;
  const fraction = targetsTotal > 0 ? targetsDone / targetsTotal : 0;
  const won = targetsTotal > 0 && targetsDone === targetsTotal;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateBigRock({ weekId, bigRock: value.trim() });
      if (result.ok) {
        setSavedTick(Date.now());
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function cancel() {
    setValue(initialBigRock);
    setEditing(false);
  }

  return (
    <Card variant="lifted">
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <SectionHeading icon={Mountain}>This week&apos;s quest</SectionHeading>
            <div className="flex items-center gap-2">
              {savedTick !== null && !editing ? (
                <InlineConfirmation key={savedTick} message="Saved" />
              ) : null}
              {!editing && initialBigRock ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : null}
            </div>
          </div>

          {editing ? (
            <div className="grid gap-2">
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="One sentence: what makes this week a win?"
                rows={2}
                className="min-h-0 resize-none font-[var(--font-display)] italic text-[16px] bg-cream-50"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={save}
                  disabled={pending || !dirty}
                >
                  {pending ? "Saving..." : "Save"}
                </Button>
                {initialBigRock ? (
                  <Button type="button" size="sm" variant="ghost" onClick={cancel}>
                    Cancel
                  </Button>
                ) : null}
              </div>
              {error ? (
                <p className="text-[12px] text-[color:var(--danger-500)]">{error}</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="font-[var(--font-display)] font-semibold text-[22px] text-ink-800 leading-tight">
                {initialBigRock}
              </p>
              <div className="flex items-center gap-[10px] mt-[10px] flex-wrap">
                <Pill tone="quest">Big Rock</Pill>
                {targetsTotal > 0 ? (
                  <Pill tone={won ? "done" : "leaf"}>
                    {targetsDone}/{targetsTotal} targets
                  </Pill>
                ) : null}
                <Pill tone="ghost">+50 XP on save</Pill>
              </div>
              {targetsTotal > 0 ? (
                <div className="mt-3">
                  <ProgressBar
                    value={fraction}
                    tone="leaf"
                    aria-label={`Big Rock progress: ${targetsDone} of ${targetsTotal} targets`}
                  />
                </div>
              ) : (
                <p className="text-[12px] text-bark-500 mt-3">
                  Add weekly targets below to see progress.
                </p>
              )}
            </>
          )}
        </div>
        <Image
          src="/lifeos/mascot-quill.svg"
          alt=""
          width={120}
          height={120}
        />
      </div>
    </Card>
  );
}
