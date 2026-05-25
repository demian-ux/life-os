import "server-only";
import { prisma } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { traitDisplayLevel } from "./trait-map";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function isoWeekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return DAY_LABELS[date.getUTCDay()];
}

type DetectedInsight = {
  slug: string;
  message: string;
  payload: Record<string, unknown>;
};

type Template = {
  slug: string;
  detect: (userId: string, today: string) => Promise<DetectedInsight | null>;
};

/**
 * Peak-day: after 30 ideal-tier logs total, identify the weekday with the
 * highest concentration of IDEALs.
 */
const peakDay: Template = {
  slug: "peak-day",
  detect: async (userId, today) => {
    const cutoff = addDays(today, -60);
    const logs = await prisma.habitLog.findMany({
      where: {
        habit: { userId },
        status: "IDEAL",
        date: { gte: cutoff, lte: today },
      },
      select: { date: true },
    });
    if (logs.length < 30) return null;

    const byWeekday = new Array<number>(7).fill(0);
    for (const log of logs) {
      const [y, m, d] = log.date.split("-").map(Number);
      const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      byWeekday[wd] += 1;
    }
    let topDay = 0;
    let topCount = 0;
    let total = 0;
    for (let i = 0; i < 7; i += 1) {
      total += byWeekday[i];
      if (byWeekday[i] > topCount) {
        topCount = byWeekday[i];
        topDay = i;
      }
    }
    const otherAvg = (total - topCount) / 6;
    if (topCount < otherAvg * 1.5) return null; // not pronounced enough

    return {
      slug: "peak-day",
      message: `Your strongest day is ${DAY_LABELS[topDay]}. You hit habit ideals there ${Math.round(topCount / Math.max(1, otherAvg))}× more than other days.`,
      payload: { weekday: topDay, count: topCount, total },
    };
  },
};

/**
 * Audacity-spike: AUDACITY trait recently crossed level 3+ AND the user
 * has completed Big Rocks in 2 consecutive weeks.
 */
const audacitySpike: Template = {
  slug: "audacity-spike",
  detect: async (userId) => {
    const trait = await prisma.trait.findUnique({
      where: { userId_axis: { userId, axis: "AUDACITY" } },
    });
    if (!trait || traitDisplayLevel(trait.value) < 3) return null;

    const recentBigRockEvents = await prisma.xpEvent.findMany({
      where: { userId, source: { startsWith: "BIG_ROCK_DONE:" } },
      orderBy: { date: "desc" },
      take: 4,
      select: { date: true },
    });
    if (recentBigRockEvents.length < 2) return null;

    return {
      slug: "audacity-spike",
      message: `Two Big Rocks in a row. Your Audacity just crossed level ${traitDisplayLevel(trait.value)}.`,
      payload: { level: traitDisplayLevel(trait.value) },
    };
  },
};

/**
 * Dark-pattern: same weekday has 3 missed scheduled habit-days for any habit
 * in the last ~21 days. Surfaces as a non-shaming nudge to drop the minimum
 * for that day.
 */
const darkPattern: Template = {
  slug: "dark-pattern",
  detect: async (userId, today) => {
    const cutoff = addDays(today, -21);
    const habits = await prisma.habit.findMany({
      where: { userId, active: true },
      include: {
        scheduleDays: { select: { dayOfWeek: true } },
        logs: {
          where: {
            date: { gte: cutoff, lte: today },
            status: { in: ["MINIMUM", "IDEAL"] },
          },
          select: { date: true },
        },
      },
    });

    for (const h of habits) {
      const scheduled = new Set(h.scheduleDays.map((s) => s.dayOfWeek));
      const logged = new Set(h.logs.map((l) => l.date));
      // Walk last 21 days, count misses per ISO weekday
      const missesByDow = new Map<number, number>();
      for (let off = 0; off <= 21; off += 1) {
        const date = addDays(today, -off);
        const [y, m, d] = date.split("-").map(Number);
        const dowJs = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const dow = dowJs === 0 ? 7 : dowJs;
        if (!scheduled.has(dow)) continue;
        if (!logged.has(date)) {
          missesByDow.set(dow, (missesByDow.get(dow) ?? 0) + 1);
        }
      }
      for (const [dow, count] of missesByDow) {
        if (count >= 3) {
          const dowLabelIdx = dow === 7 ? 0 : dow;
          return {
            slug: "dark-pattern",
            message: `${DAY_LABELS[dowLabelIdx]}s have been hard for ${h.name} (${count} misses in 3 weeks). Want to drop the minimum for that day?`,
            payload: { habitId: h.id, habit: h.name, weekday: dow, count },
          };
        }
      }
    }
    return null;
  },
};

const TEMPLATES: Template[] = [peakDay, audacitySpike, darkPattern];

/**
 * Idempotent. For each template, if no CoachInsight row exists yet, run
 * detect — if it returns a payload, insert as UNSEEN.
 *
 * Each slug fires once per user (across all time) in v1. Re-firing on
 * pattern changes is a Phase J consideration.
 */
export async function detectInsights(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);

  const existing = await prisma.coachInsight.findMany({
    where: { userId },
    select: { slug: true },
  });
  const seen = new Set(existing.map((e) => e.slug));

  for (const template of TEMPLATES) {
    if (seen.has(template.slug)) continue;
    try {
      const found = await template.detect(userId, today);
      if (!found) continue;
      await prisma.coachInsight.create({
        data: {
          userId,
          slug: found.slug,
          payload: { ...found.payload, message: found.message },
          status: "UNSEEN",
        },
      });
    } catch {
      // Insight detection is best-effort; never throw on the read path.
    }
  }
}

/** Return one UNSEEN insight (oldest first) for the Today surface. */
export async function nextInsight(userId: string): Promise<{
  id: string;
  slug: string;
  message: string;
} | null> {
  const row = await prisma.coachInsight.findFirst({
    where: { userId, status: "UNSEEN" },
    orderBy: { createdAt: "asc" },
  });
  if (!row) return null;
  const payload = row.payload as { message?: string };
  return { id: row.id, slug: row.slug, message: payload.message ?? row.slug };
}

// Convenience for analytics/Progress: "today, you noticed this insight".
export { isoWeekdayLabel };
