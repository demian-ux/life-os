import "server-only";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import type { HabitLogStatus } from "@/lib/validators/week";
import { computeStreaks } from "@/lib/habits/streaks";

export type PendingNotification = {
  slug: string;
  title: string;
  body: string;
  route?: string;
};

/**
 * Compute notifications that should be dispatched right now, *excluding*
 * those already in NotificationLog. Inserts log rows for the ones returned
 * (idempotent — each slug fires at most once).
 *
 * Triggers in v1:
 *   - morning-briefing:{date}  → 07:00–11:59 local
 *   - habit-overdue:{habitId}:{date}  → ≥21:00 local, scheduled today, NONE
 *   - blocker-active:{date}    → fired once per day when any rule is currently
 *                                blocking and we haven't sent the daily ping
 */
export async function pendingNotifications(
  userId: string,
): Promise<PendingNotification[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user?.timezone || DEFAULT_TIMEZONE;
  const today = todayKey(tz);
  const localHour = new Date().toLocaleString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  });
  const hour = Number(localHour);

  // What's already been sent for this user.
  const sent = await prisma.notificationLog.findMany({
    where: { userId, slug: { contains: today } },
    select: { slug: true },
  });
  const sentSlugs = new Set(sent.map((s) => s.slug));

  const out: PendingNotification[] = [];

  // 1. Morning briefing
  const morningSlug = `morning-briefing:${today}`;
  if (hour >= 7 && hour < 12 && !sentSlugs.has(morningSlug)) {
    const briefing = await composeMorningBriefing(userId, today);
    if (briefing) {
      out.push({
        slug: morningSlug,
        title: "Today",
        body: briefing,
        route: "/today",
      });
    }
  }

  // 2. Habit overdue — at 21:00 local for each scheduled-today habit still NONE.
  if (hour >= 21) {
    const habits = await prisma.habit.findMany({
      where: { userId, active: true },
      include: {
        scheduleDays: { select: { dayOfWeek: true } },
        logs: {
          where: { date: today },
          select: { status: true },
        },
      },
    });
    const dow = isoWeekday(today);
    for (const h of habits) {
      const scheduled = h.scheduleDays.some((s) => s.dayOfWeek === dow);
      if (!scheduled) continue;
      const log = h.logs[0];
      if (log && (log.status === "MINIMUM" || log.status === "IDEAL")) continue;
      const slug = `habit-overdue:${h.id}:${today}`;
      if (sentSlugs.has(slug)) continue;
      out.push({
        slug,
        title: "Habit due today",
        body: `${h.name} not logged yet. The minimum still counts.`,
        route: "/today",
      });
    }
  }

  // 3. Blocker-active daily ping — if any rule is currently blocking and we
  // haven't said anything today.
  const blockerSlug = `blocker-active:${today}`;
  if (!sentSlugs.has(blockerSlug)) {
    const activeBlockingRule = await firstBlockingRule(userId, today);
    if (activeBlockingRule) {
      out.push({
        slug: blockerSlug,
        title: "Block active",
        body: `${activeBlockingRule.name} is blocking sites — ${activeBlockingRule.reason}`,
        route: "/settings",
      });
    }
  }

  // Persist all returned slugs so they don't re-fire.
  for (const n of out) {
    await prisma.notificationLog.upsert({
      where: { userId_slug: { userId, slug: n.slug } },
      update: {},
      create: { userId, slug: n.slug },
    });
  }

  return out;
}

async function composeMorningBriefing(
  userId: string,
  today: string,
): Promise<string | null> {
  const [week, habits, taskCount] = await Promise.all([
    prisma.week.findFirst({
      where: { userId, startDate: { lte: today }, endDate: { gte: today } },
      select: { bigRock: true },
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
      include: { scheduleDays: { select: { dayOfWeek: true } } },
    }),
    prisma.task.count({
      where: {
        userId,
        scheduledDate: today,
        status: { notIn: ["DONE", "ARCHIVED"] },
      },
    }),
  ]);
  const dow = isoWeekday(today);
  const habitsToday = habits.filter((h) =>
    h.scheduleDays.some((s) => s.dayOfWeek === dow),
  ).length;
  if (habitsToday === 0 && taskCount === 0) return null;

  const parts: string[] = [];
  if (habitsToday > 0) {
    parts.push(`${habitsToday} habit${habitsToday === 1 ? "" : "s"}`);
  }
  if (taskCount > 0) {
    parts.push(`${taskCount} task${taskCount === 1 ? "" : "s"}`);
  }
  const lead = parts.join(", ");
  const bigRock = week?.bigRock ? `. Big Rock: ${week.bigRock}` : "";
  return `${lead}${bigRock}.`;
}

async function firstBlockingRule(
  userId: string,
  today: string,
): Promise<{ name: string; reason: string } | null> {
  const rules = await prisma.blockRule.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
  const dow = isoWeekday(today);
  for (const rule of rules) {
    if (rule.guardType !== "HABIT_LOGGED") continue;
    const params = rule.guardParams as { habitId?: string };
    if (!params.habitId) continue;
    const habit = await prisma.habit.findUnique({
      where: { id: params.habitId },
      include: {
        scheduleDays: { select: { dayOfWeek: true } },
        logs: { where: { date: today }, select: { status: true } },
      },
    });
    if (!habit || !habit.active) continue;
    const scheduled = habit.scheduleDays.some((s) => s.dayOfWeek === dow);
    if (!scheduled) continue;
    const log = habit.logs[0];
    const satisfied =
      log && (log.status === "MINIMUM" || log.status === "IDEAL");
    if (!satisfied) {
      return {
        name: rule.name,
        reason: `${habit.name} not logged yet today`,
      };
    }
  }
  return null;
}

// Local helper duplicated from other modules to avoid pulling client/server splits.
function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}
export type { HabitLogStatus };
// Keep computeStreaks referenced so future habit-streak-based notifications
// can be added without re-discovering the import path.
export { computeStreaks };
