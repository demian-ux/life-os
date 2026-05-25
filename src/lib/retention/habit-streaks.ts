import "server-only";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";

/**
 * Compute current streak length for a set of habits, going backward from
 * `today`. A day is "kept" when the habit was scheduled and the log status
 * is MINIMUM, IDEAL, or SKIPPED (skip is intentional rest, doesn't break).
 * A day with no log on a scheduled day breaks the streak.
 *
 * Returns Map<habitId, streakDays>. Habits with no streak get 0.
 */
export async function currentStreaksFor(
  habitIds: string[],
  today: string,
  lookbackDays = 120,
): Promise<Map<string, number>> {
  if (habitIds.length === 0) return new Map();
  const start = addDays(today, -lookbackDays);

  const [schedules, logs] = await Promise.all([
    prisma.habitScheduleDay.findMany({
      where: { habitId: { in: habitIds } },
      select: { habitId: true, dayOfWeek: true },
    }),
    prisma.habitLog.findMany({
      where: {
        habitId: { in: habitIds },
        date: { gte: start, lte: today },
      },
      select: { habitId: true, date: true, status: true },
    }),
  ]);

  const scheduleByHabit = new Map<string, Set<number>>();
  for (const s of schedules) {
    const set = scheduleByHabit.get(s.habitId) ?? new Set<number>();
    set.add(s.dayOfWeek);
    scheduleByHabit.set(s.habitId, set);
  }

  const logByKey = new Map<string, string>();
  for (const l of logs) {
    logByKey.set(`${l.habitId}|${l.date}`, l.status);
  }

  const result = new Map<string, number>();
  for (const habitId of habitIds) {
    const sched = scheduleByHabit.get(habitId);
    if (!sched || sched.size === 0) {
      result.set(habitId, 0);
      continue;
    }
    let streak = 0;
    for (let offset = 0; offset <= lookbackDays; offset += 1) {
      const date = addDays(today, -offset);
      const dow = isoWeekday(date);
      if (!sched.has(dow)) continue;
      const status = logByKey.get(`${habitId}|${date}`);
      if (status === "MINIMUM" || status === "IDEAL" || status === "SKIPPED") {
        streak += 1;
        continue;
      }
      break;
    }
    result.set(habitId, streak);
  }
  return result;
}

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}
