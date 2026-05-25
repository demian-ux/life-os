import { prisma } from "@/lib/db";
import { addDays, getWeekStart, todayKey } from "@/lib/dates";
import { computeStreaks } from "@/lib/habits/streaks";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { levelFromXp } from "@/lib/xp";
import type { HabitLogStatus } from "@/lib/validators/week";

export type ProgressData = Awaited<ReturnType<typeof loadProgress>>;

export async function loadProgress(
  userId: string,
  timezone = DEFAULT_TIMEZONE,
) {
  const today = todayKey(timezone);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [profile, week, recentEvents, habits, weekHabitLogs] = await Promise.all([
    prisma.gameProfile.findUnique({ where: { userId } }),
    prisma.week.findUnique({
      where: { userId_startDate: { userId, startDate: weekStart } },
      include: { targets: true },
    }),
    prisma.xpEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
      include: {
        scheduleDays: true,
        logs: {
          where: { date: { gte: addDays(today, -90), lte: today } },
          orderBy: { date: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId },
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
  ]);

  const xp = profile?.xp ?? 0;
  const levelInfo = levelFromXp(xp);

  const streakRows = habits.map((h) => {
    const scheduledDays = h.scheduleDays
      .map((s) => s.dayOfWeek)
      .sort((a, b) => a - b);
    const logs = h.logs.map((l) => ({
      date: l.date,
      status: l.status as HabitLogStatus,
    }));
    const { current, best } = computeStreaks({
      scheduledDays,
      logs,
      todayDate: today,
    });
    return { id: h.id, name: h.name, current, best };
  });

  const currentStreak = streakRows.reduce(
    (max, h) => (h.current > max ? h.current : max),
    0,
  );
  const bestStreak = streakRows.reduce(
    (max, h) => (h.best > max ? h.best : max),
    0,
  );

  // Weekly consistency: out of (sum of scheduled habit-days this week), how many were MIN/IDEAL?
  let scheduledCount = 0;
  let doneCount = 0;
  for (const habit of habits) {
    const scheduled = new Set(habit.scheduleDays.map((s) => s.dayOfWeek));
    weekDates.forEach((date, idx) => {
      const dow = idx + 1;
      if (!scheduled.has(dow)) return;
      scheduledCount += 1;
      const log = weekHabitLogs.find(
        (l) => l.habitId === habit.id && l.date === date,
      );
      if (log && (log.status === "MINIMUM" || log.status === "IDEAL")) {
        doneCount += 1;
      }
    });
  }
  const consistencyPct =
    scheduledCount > 0 ? Math.round((doneCount / scheduledCount) * 100) : 0;

  // Big rock progress = % of weekly targets done
  const targets = week?.targets ?? [];
  const bigRockDone = targets.filter((t) => t.status === "DONE").length;
  const bigRockTotal = targets.length;
  const bigRockPct =
    bigRockTotal > 0 ? Math.round((bigRockDone / bigRockTotal) * 100) : 0;

  return {
    xp,
    level: levelInfo.level,
    intoLevel: levelInfo.intoLevel,
    toNext: levelInfo.toNext,
    nextLevelAt: levelInfo.nextLevelAt,
    currentStreak,
    bestStreak,
    streakRows,
    consistencyPct,
    consistencyDone: doneCount,
    consistencyTotal: scheduledCount,
    bigRockTitle: week?.bigRock ?? null,
    bigRockDone,
    bigRockTotal,
    bigRockPct,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      source: e.source,
      amount: e.amount,
      note: e.note,
      date: e.date,
      createdAt: e.createdAt,
    })),
    weekStart,
    weekEnd,
  };
}
