import { prisma } from "@/lib/db";
import { getWeekStart, todayKey } from "@/lib/dates";
import type { WeekRock, DailyRock } from "@prisma/client";

export async function getCurrentWeekRock(userId: string, timezone: string): Promise<WeekRock | null> {
  const today = todayKey(timezone);
  const weekStart = getWeekStart(today);
  return prisma.weekRock.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
}

export async function getTodayDailyRock(userId: string, timezone: string): Promise<DailyRock | null> {
  const date = todayKey(timezone);
  return prisma.dailyRock.findUnique({ where: { userId_date: { userId, date } } });
}

export type WeekDailyRockStats = { done: number; total: number };

export async function getWeekDailyRockStats(userId: string, timezone: string): Promise<WeekDailyRockStats> {
  const today = todayKey(timezone);
  const weekStart = getWeekStart(today);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);
  const rocks = await prisma.dailyRock.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
    select: { status: true },
  });
  return { done: rocks.filter((r) => r.status === "DONE").length, total: rocks.length };
}
