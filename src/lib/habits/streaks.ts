import { addDays } from "@/lib/dates";
import type { HabitLogStatus } from "@/lib/validators/week";

export type StreakInputLog = {
  date: string;
  status: HabitLogStatus;
};

export type StreakInput = {
  scheduledDays: number[];
  logs: StreakInputLog[];
  todayDate: string;
  horizonDays?: number;
};

const COUNTS_AS_DONE: Record<HabitLogStatus, boolean> = {
  NONE: false,
  MINIMUM: true,
  IDEAL: true,
  SKIPPED: false,
};

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function computeStreaks({
  scheduledDays,
  logs,
  todayDate,
  horizonDays = 365,
}: StreakInput): { current: number; best: number } {
  if (scheduledDays.length === 0) return { current: 0, best: 0 };

  const scheduled = new Set(scheduledDays);
  const logByDate = new Map<string, HabitLogStatus>(
    logs.map((l) => [l.date, l.status]),
  );

  let current = 0;
  let best = 0;
  let run = 0;
  let currentLocked = false;

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const date = addDays(todayDate, -offset);
    const dow = isoWeekday(date);
    if (!scheduled.has(dow)) continue;

    const status = logByDate.get(date);
    const done = status ? COUNTS_AS_DONE[status] : false;

    if (offset === 0 && !done) {
      continue;
    }

    if (done) {
      run += 1;
      if (run > best) best = run;
      if (!currentLocked) current = run;
    } else {
      currentLocked = true;
      run = 0;
    }
  }

  return { current, best };
}
