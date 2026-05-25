"use client";

import { useTransition } from "react";
import { Flame, Grid3x3 } from "lucide-react";
import type { TraitAxis } from "@prisma/client";
import {
  Card,
  EmptyState,
  Hcell,
  SectionHeading,
  Sigil,
} from "@/components/ui";
import type { HcellState } from "@/components/ui/Hcell";
import { cn } from "@/lib/cn";
import { classFromAxis } from "@/lib/retention/class-axis";
import { logHabit } from "@/lib/actions/week-actions";
import type { HabitLogStatus } from "@/lib/validators/week";

type Habit = {
  id: string;
  name: string;
  axis: TraitAxis;
  scheduleDays: { dayOfWeek: number }[];
};

type HabitLog = {
  habitId: string;
  date: string;
  status: HabitLogStatus;
};

const NEXT_STATUS: Record<HabitLogStatus, HabitLogStatus> = {
  NONE: "MINIMUM",
  MINIMUM: "IDEAL",
  IDEAL: "SKIPPED",
  SKIPPED: "NONE",
};

const DAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function cellState(status: HabitLogStatus, scheduled: boolean): HcellState {
  if (!scheduled && status === "NONE") return "off";
  if (status === "IDEAL") return "ideal";
  if (status === "MINIMUM") return "min";
  if (status === "SKIPPED") return "skip";
  return "miss";
}

export function HabitWeekTable({
  habits,
  habitLogs,
  weekDates,
  todayDate,
}: {
  habits: Habit[];
  habitLogs: HabitLog[];
  weekDates: string[];
  todayDate?: string;
}) {
  const [pending, startTransition] = useTransition();

  const logsByCell = new Map<string, HabitLogStatus>();
  for (const log of habitLogs) {
    logsByCell.set(`${log.habitId}|${log.date}`, log.status);
  }

  function cycleStatus(habitId: string, date: string) {
    const current = logsByCell.get(`${habitId}|${date}`) ?? "NONE";
    const next = NEXT_STATUS[current];
    startTransition(async () => {
      await logHabit({ habitId, date, status: next });
    });
  }

  return (
    <Card>
      <SectionHeading icon={Grid3x3}>Habits this week</SectionHeading>
      {habits.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No active habits"
          body="Visit the Habits page to set one up."
        />
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "8px 6px" }}>
            <thead>
              <tr>
                <th></th>
                {weekDates.map((date, idx) => (
                  <th
                    key={date}
                    className={cn(
                      "text-center font-[var(--font-pixel)] text-[8px] tracking-[0.08em]",
                      todayDate === date ? "text-coral-500" : "text-bark-500",
                    )}
                  >
                    {DAY_HEADERS[idx]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const scheduledDays = new Set(habit.scheduleDays.map((d) => d.dayOfWeek));
                return (
                  <tr key={habit.id}>
                    <td className="pr-2">
                      <div className="flex items-center gap-2">
                        <Sigil classKey={classFromAxis(habit.axis)} size={20} />
                        <span className="text-[13px] text-ink-800 font-medium">
                          {habit.name}
                        </span>
                      </div>
                    </td>
                    {weekDates.map((date, idx) => {
                      const dayOfWeek = idx + 1;
                      const status = logsByCell.get(`${habit.id}|${date}`) ?? "NONE";
                      const scheduled = scheduledDays.has(dayOfWeek);
                      return (
                        <td key={date} className="text-center">
                          <button
                            type="button"
                            onClick={() => cycleStatus(habit.id, date)}
                            disabled={pending}
                            aria-label={`${habit.name} ${date} ${status}`}
                            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded-[6px]"
                          >
                            <Hcell
                              state={cellState(status, scheduled)}
                              isToday={todayDate === date}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-4 text-[11px] text-bark-500 mt-2 flex-wrap">
        <Legend state="ideal" label="Ideal" />
        <Legend state="min" label="Min" />
        <Legend state="miss" label="Missed" />
        <Legend state="skip" label="Skipped" />
        <Legend state="off" label="Off-schedule" />
      </div>
    </Card>
  );
}

function Legend({ state, label }: { state: HcellState; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Hcell state={state} />
      {label}
    </span>
  );
}
