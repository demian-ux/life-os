import "server-only";
import { prisma } from "@/lib/db";
import { computeStreaks } from "@/lib/habits/streaks";
import type { HabitLogStatus } from "@/lib/validators/week";
import { STREAK_TIERS, type StreakTierDef } from "./streak-tiers";

/**
 * After a habit log changes, recompute its current streak and award any new
 * tiers crossed. Tier rows are persistent — once earned, they stay even if
 * the streak resets (history of "you reached this once").
 */
export async function evaluateStreakTiers(
  habitId: string,
  todayDate: string,
): Promise<{ awarded: StreakTierDef[]; current: number; best: number }> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: {
      userId: true,
      scheduleDays: { select: { dayOfWeek: true } },
      logs: {
        where: { date: { gte: addDaysIso(todayDate, -730), lte: todayDate } },
        select: { date: true, status: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!habit) return { awarded: [], current: 0, best: 0 };

  const scheduledDays = habit.scheduleDays.map((s) => s.dayOfWeek);
  const logs = habit.logs.map((l) => ({
    date: l.date,
    status: l.status as HabitLogStatus,
  }));
  const { current, best } = computeStreaks({
    scheduledDays,
    logs,
    todayDate,
  });

  const existingTiers = await prisma.streakTier.findMany({
    where: { userId: habit.userId, habitId },
    select: { tier: true },
  });
  const existingSet = new Set(existingTiers.map((t) => t.tier));

  const awarded: StreakTierDef[] = [];
  for (const tier of STREAK_TIERS) {
    if (current >= tier.days && !existingSet.has(tier.tier)) {
      await prisma.streakTier.create({
        data: {
          userId: habit.userId,
          habitId,
          tier: tier.tier,
          daysAt: current,
        },
      });
      awarded.push(tier);
    }
  }

  return { awarded, current, best };
}

/**
 * Returns the highest tier ever earned for a habit. The visible tier shown
 * to the user — preserved even if the current streak has since broken.
 */
export async function peakTierFor(
  userId: string,
  habitId: string,
): Promise<number> {
  const rows = await prisma.streakTier.findMany({
    where: { userId, habitId },
    orderBy: { tier: "desc" },
    take: 1,
  });
  return rows[0]?.tier ?? 0;
}

function addDaysIso(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
