import "server-only";
import type { TraitAxis } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const AXIS_LABEL: Record<TraitAxis, string> = {
  DISCIPLINE: "Discipline",
  AUDACITY: "Audacity",
  RECOVERY: "Recovery",
  FOCUS: "Focus",
  CRAFT: "Craft",
};

export type YearStats = {
  year: number;
  inProgress: boolean;
  totalXp: number;
  habitLogs: number;
  bigRocks: number;
  reviews: number;
  surpriseDrops: number;
  surpriseXp: number;
  activeDays: number;
  longestStreakHabit: { name: string; days: number } | null;
  topWeekday: { weekday: number; label: string; count: number } | null;
  topTrait: { axis: TraitAxis; label: string; value: number } | null;
  titlesEarned: number;
  questsCompleted: number;
  highestSeasonRank: number;
};

export type Headline = {
  label: string;
  value: string;
};

function yearBounds(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export async function computeYearStats(
  userId: string,
  year: number,
): Promise<YearStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const currentYear = Number(today.slice(0, 4));
  const inProgress = year === currentYear;
  const { start, end: rawEnd } = yearBounds(year);
  const end = inProgress ? today : rawEnd;

  const [
    xpAgg,
    habitLogs,
    bigRockEvents,
    reviewEvents,
    bonusEvents,
    activeDates,
    titles,
    questsCompleted,
    seasonRows,
    topWeekdayRows,
    traitEvents,
  ] = await Promise.all([
    prisma.xpEvent.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.habitLog.count({
      where: {
        habit: { userId },
        date: { gte: start, lte: end },
        status: { in: ["MINIMUM", "IDEAL"] },
      },
    }),
    prisma.xpEvent.count({
      where: {
        userId,
        date: { gte: start, lte: end },
        source: { startsWith: "BIG_ROCK_DONE:" },
      },
    }),
    prisma.xpEvent.count({
      where: {
        userId,
        date: { gte: start, lte: end },
        source: { startsWith: "WEEKLY_REVIEW_DONE:" },
      },
    }),
    prisma.xpEvent.aggregate({
      where: { userId, bonus: true, date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.xpEvent.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.title.count({
      where: {
        userId,
        earnedAt: { gte: new Date(start), lte: new Date(`${end}T23:59:59`) },
      },
    }),
    prisma.quest.count({
      where: {
        userId,
        status: "COMPLETE",
        completedAt: {
          gte: new Date(start),
          lte: new Date(`${end}T23:59:59`),
        },
      },
    }),
    prisma.season.findMany({
      where: { userId, startDate: { gte: start, lte: end } },
      select: { highestRank: true, finalRank: true },
    }),
    prisma.xpEvent.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true },
    }),
    prisma.traitEvent.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { axis: true, delta: true },
    }),
  ]);

  // Top weekday: count XP events by weekday-of-date.
  const byWeekday = new Array<number>(7).fill(0);
  for (const e of topWeekdayRows) {
    const [y, m, d] = e.date.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    byWeekday[wd] += 1;
  }
  let topWeekday: YearStats["topWeekday"] = null;
  let topCount = 0;
  for (let i = 0; i < 7; i += 1) {
    if (byWeekday[i] > topCount) {
      topCount = byWeekday[i];
      topWeekday = { weekday: i, label: DAY_LABELS[i], count: byWeekday[i] };
    }
  }

  // Top trait: sum trait deltas in window, pick largest growth.
  const traitGrowth = new Map<TraitAxis, number>();
  for (const t of traitEvents) {
    traitGrowth.set(t.axis, (traitGrowth.get(t.axis) ?? 0) + t.delta);
  }
  let topTrait: YearStats["topTrait"] = null;
  for (const [axis, value] of traitGrowth) {
    if (!topTrait || value > topTrait.value) {
      topTrait = { axis, label: AXIS_LABEL[axis], value };
    }
  }

  // Longest streak: peakTier days across all habits, or best from
  // StreakTier table. For v1, take the highest `daysAt` from StreakTier rows
  // earned in the window.
  const peakStreak = await prisma.streakTier.findFirst({
    where: {
      userId,
      reachedAt: { gte: new Date(start), lte: new Date(`${end}T23:59:59`) },
    },
    orderBy: { daysAt: "desc" },
    include: { habit: { select: { name: true } } },
  });
  const longestStreakHabit = peakStreak
    ? { name: peakStreak.habit.name, days: peakStreak.daysAt }
    : null;

  const highestSeasonRank = seasonRows.reduce(
    (max, s) => Math.max(max, s.highestRank, s.finalRank ?? 0),
    0,
  );

  return {
    year,
    inProgress,
    totalXp: xpAgg._sum.amount ?? 0,
    habitLogs,
    bigRocks: bigRockEvents,
    reviews: reviewEvents,
    surpriseDrops: bonusEvents._count,
    surpriseXp: bonusEvents._sum.amount ?? 0,
    activeDays: activeDates.length,
    longestStreakHabit,
    topWeekday,
    topTrait,
    titlesEarned: titles,
    questsCompleted,
    highestSeasonRank,
  };
}

const HEADLINE_CANDIDATES: Array<(s: YearStats) => Headline | null> = [
  (s) =>
    s.totalXp > 0
      ? { label: "Total XP", value: s.totalXp.toLocaleString() }
      : null,
  (s) =>
    s.habitLogs > 0
      ? { label: "Habit-days logged", value: s.habitLogs.toLocaleString() }
      : null,
  (s) =>
    s.longestStreakHabit
      ? {
          label: "Longest streak",
          value: `${s.longestStreakHabit.days} days · ${s.longestStreakHabit.name}`,
        }
      : null,
  (s) =>
    s.topWeekday
      ? { label: "Strongest day", value: `${s.topWeekday.label}s` }
      : null,
  (s) =>
    s.topTrait
      ? { label: "Top trait", value: s.topTrait.label }
      : null,
  (s) =>
    s.bigRocks > 0 ? { label: "Big Rocks shipped", value: String(s.bigRocks) } : null,
  (s) =>
    s.surpriseDrops > 0
      ? {
          label: "Surprise drops",
          value: `${s.surpriseDrops} · +${s.surpriseXp} XP`,
        }
      : null,
  (s) =>
    s.activeDays > 0
      ? { label: "Active days", value: String(s.activeDays) }
      : null,
  (s) =>
    s.highestSeasonRank > 0
      ? { label: "Peak season rank", value: String(s.highestSeasonRank) }
      : null,
  (s) =>
    s.titlesEarned > 0
      ? { label: "Titles earned", value: String(s.titlesEarned) }
      : null,
];

/**
 * Pick one headline at random — refresh = re-roll. Slot-machine pull for the
 * recap page. Server-rendered so the user can't see two side by side.
 */
export function pickHeadline(stats: YearStats): Headline {
  const candidates: Headline[] = [];
  for (const fn of HEADLINE_CANDIDATES) {
    const h = fn(stats);
    if (h) candidates.push(h);
  }
  if (candidates.length === 0) {
    return { label: "Year in progress", value: "Keep going." };
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Template narrative. Replace with AI generation when AI infra is upgraded.
 * The point is identity-reflective prose — what kind of year was this.
 */
export function buildNarrative(stats: YearStats): string {
  if (stats.totalXp === 0) {
    return "A new year. Nothing logged yet — that's a fine starting point.";
  }
  const parts: string[] = [];
  parts.push(
    stats.inProgress
      ? `So far this year you've earned ${stats.totalXp.toLocaleString()} XP across ${stats.activeDays} active days.`
      : `This year you earned ${stats.totalXp.toLocaleString()} XP across ${stats.activeDays} active days.`,
  );
  if (stats.habitLogs > 0) {
    parts.push(`You logged habits ${stats.habitLogs} times.`);
  }
  if (stats.bigRocks > 0) {
    parts.push(
      `You shipped ${stats.bigRocks} Big Rock${stats.bigRocks === 1 ? "" : "s"}.`,
    );
  }
  if (stats.longestStreakHabit) {
    parts.push(
      `Your longest streak was ${stats.longestStreakHabit.days} days on ${stats.longestStreakHabit.name}.`,
    );
  }
  if (stats.topTrait) {
    parts.push(
      `${stats.topTrait.label} grew the most — the axis you most lived this year.`,
    );
  }
  if (stats.topWeekday) {
    parts.push(`${stats.topWeekday.label}s were your strongest day.`);
  }
  if (stats.titlesEarned > 0) {
    parts.push(
      `${stats.titlesEarned} title${stats.titlesEarned === 1 ? "" : "s"} earned.`,
    );
  }
  if (stats.questsCompleted > 0) {
    parts.push(
      `${stats.questsCompleted} quest${stats.questsCompleted === 1 ? "" : "s"} completed.`,
    );
  }
  if (stats.surpriseDrops > 0) {
    parts.push(
      `${stats.surpriseDrops} surprise drops — moments the system noticed something special.`,
    );
  }
  return parts.join(" ");
}

export async function loadRecap(userId: string, year: number) {
  const stats = await computeYearStats(userId, year);
  return {
    stats,
    headline: pickHeadline(stats),
    narrative: buildNarrative(stats),
  };
}

export async function listRecapYears(userId: string): Promise<number[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, createdAt: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const currentYear = Number(today.slice(0, 4));
  const firstYear = user?.createdAt
    ? user.createdAt.getUTCFullYear()
    : currentYear;
  const years: number[] = [];
  for (let y = currentYear; y >= firstYear; y -= 1) years.push(y);
  return years;
}
