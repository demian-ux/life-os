"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, InlineConfirmation } from "@/components/ui";
import { startNewWeek } from "@/lib/actions/week-actions";

export function StartNewWeekButton({
  userId,
  fromStartDate,
}: {
  userId: string;
  fromStartDate: string;
}) {
  const [pending, startTransition] = useTransition();
  const [startedTick, setStartedTick] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-2">
      {startedTick !== null ? (
        <InlineConfirmation key={startedTick} message="Started" />
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() =>
          startTransition(async () => {
            const result = await startNewWeek({ userId, fromStartDate });
            if (result.ok) setStartedTick(Date.now());
          })
        }
        disabled={pending}
      >
        <Plus className="h-3.5 w-3.5" />
        {pending ? "Creating..." : "Start next week"}
      </Button>
    </div>
  );
}
