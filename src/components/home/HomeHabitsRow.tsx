"use client";

import { useTransition } from "react";
import { Check, Circle, Flame, Star } from "lucide-react";
import type { Habit, HabitLog, HabitLogStatus } from "@prisma/client";
import { Card, SectionHeading } from "@/components/ui";
import { logHabit } from "@/lib/actions/habit-actions";
import { cn } from "@/lib/cn";

type HomeHabitsRowProps = {
  habits: { habit: Habit; log: HabitLog | null }[];
};

function nextStatus(current: HabitLogStatus | null): HabitLogStatus {
  switch (current) {
    case "MINIMUM":
      return "IDEAL";
    case "IDEAL":
      return "NONE";
    default:
      return "MINIMUM";
  }
}

function statusIcon(status: HabitLogStatus | null) {
  if (status === "IDEAL") {
    return (
      <Star
        className="h-4 w-4 text-coral-500"
        fill="currentColor"
        strokeWidth={1.5}
      />
    );
  }
  if (status === "MINIMUM") {
    return <Check className="h-4 w-4 text-leaf-500" strokeWidth={2.5} />;
  }
  return <Circle className="h-4 w-4 text-bark-400" strokeWidth={2} />;
}

export function HomeHabitsRow({ habits }: HomeHabitsRowProps) {
  const [pending, startTransition] = useTransition();

  if (habits.length === 0) {
    return (
      <Card>
        <SectionHeading icon={Flame}>Morning Habits</SectionHeading>
        <p className="text-[13px] text-bark-500 mt-2">
          No active habits yet. Configure them in Settings.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeading icon={Flame}>Morning Habits</SectionHeading>
      <div className="flex flex-wrap gap-2 mt-3">
        {habits.map(({ habit, log }) => {
          const status: HabitLogStatus = log?.status ?? "NONE";
          return (
            <button
              key={habit.id}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await logHabit({
                    habitId: habit.id,
                    status: nextStatus(status),
                  });
                })
              }
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors duration-[120ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
                status === "IDEAL"
                  ? "bg-coral-50 border-coral-300 text-bark-700"
                  : status === "MINIMUM"
                    ? "bg-leaf-50 border-leaf-300 text-bark-700"
                    : "bg-white border-cream-300 text-bark-600 hover:bg-cream-50",
                pending && "opacity-60",
              )}
            >
              {statusIcon(status)}
              <span className="text-[13px] font-medium">{habit.name}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
