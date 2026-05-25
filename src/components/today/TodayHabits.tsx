"use client";

import { useTransition } from "react";
import { Check, Coffee, Flame, Star } from "lucide-react";
import type { TraitAxis } from "@prisma/client";
import {
  Card,
  EmptyState,
  Pill,
  SectionHeading,
  Sigil,
  TierBadge,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { logHabit } from "@/lib/actions/week-actions";
import { classFromAxis } from "@/lib/retention/class-axis";
import type { HabitLogStatus } from "@/lib/validators/week";

type HabitToday = {
  id: string;
  name: string;
  axis: TraitAxis;
  minimumVersion: string;
  idealVersion: string | null;
  anchor?: string | null;
  currentStreak?: number;
  status: HabitLogStatus;
};

const NEXT_STATUS: Record<HabitLogStatus, HabitLogStatus> = {
  NONE: "MINIMUM",
  MINIMUM: "IDEAL",
  IDEAL: "SKIPPED",
  SKIPPED: "NONE",
};

export function TodayHabits({
  habits,
  date,
}: {
  habits: HabitToday[];
  date: string;
}) {
  const [pending, startTransition] = useTransition();

  function cycle(habitId: string, current: HabitLogStatus) {
    startTransition(async () => {
      await logHabit({ habitId, date, status: NEXT_STATUS[current] });
    });
  }

  const loggedCount = habits.filter((h) => h.status !== "NONE").length;

  return (
    <Card>
      <SectionHeading
        icon={Flame}
        action={
          <span className="font-[var(--font-mono)] text-[11px] text-bark-500 tabular-nums">
            {loggedCount}/{habits.length} logged
          </span>
        }
      >
        Today&apos;s loadout
      </SectionHeading>
      {habits.length === 0 ? (
        <EmptyState
          icon={Coffee}
          title="No habits due today"
          body="Rest counts. Consistency beats intensity."
        />
      ) : (
        <ul className="flex flex-col gap-[10px] m-0 p-0 list-none">
          {habits.map((habit) => {
            const logged = habit.status !== "NONE";
            const ideal = habit.status === "IDEAL";
            return (
              <li
                key={habit.id}
                className="grid grid-cols-[28px_1fr_auto_auto] gap-3 items-center px-[6px] py-[8px]"
              >
                <Sigil classKey={classFromAxis(habit.axis)} size={28} />
                <div className="min-w-0">
                  <div className="font-semibold text-[14px] text-ink-800">
                    {habit.name}
                  </div>
                  <div className="text-[12px] text-bark-500">
                    Min: {habit.minimumVersion}
                    {habit.anchor ? <> · {habit.anchor}</> : null}
                  </div>
                </div>
                <TierBadge streak={habit.currentStreak ?? 0} />
                {logged ? (
                  <button
                    type="button"
                    onClick={() => cycle(habit.id, habit.status)}
                    disabled={pending}
                    className={cn(
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded",
                    )}
                    aria-label="Cycle habit status"
                  >
                    <Pill tone={ideal ? "done" : "leaf"}>
                      {ideal ? (
                        <Star className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}{" "}
                      {ideal ? "Ideal" : "Min"}
                    </Pill>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cycle(habit.id, habit.status)}
                    disabled={pending}
                    className={cn(
                      "inline-flex items-center gap-[5px] px-[10px] py-[6px] text-[11px] uppercase font-extrabold tracking-[0.06em] rounded-[5px]",
                      "border-2 border-ink-800 bg-coral-500 text-white",
                      "[box-shadow:0_2px_0_var(--ink-800)] active:translate-y-[2px] active:[box-shadow:0_0_0_var(--ink-800)]",
                      "transition-[transform,box-shadow] duration-[120ms]",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    Log
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
