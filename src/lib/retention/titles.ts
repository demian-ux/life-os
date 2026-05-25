import type { TraitAxis } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { traitDisplayLevel } from "./trait-map";

export type TitleSlug =
  | "consistent-builder"
  | "recovery-champion"
  | "strategic-thinker"
  | "deep-worker"
  | "polymath"
  | "quiet-builder";

export const TITLES: Record<
  TitleSlug,
  { name: string; tagline: string }
> = {
  "consistent-builder": {
    name: "The Consistent Builder",
    tagline: "You log the minimum even on bad days. That’s what makes the rest possible.",
  },
  "recovery-champion": {
    name: "The Recovery Champion",
    tagline: "Rest is part of the work. You treat it like it is.",
  },
  "strategic-thinker": {
    name: "The Strategic Thinker",
    tagline: "You look back before you push forward. Four reviews and counting.",
  },
  "deep-worker": {
    name: "The Deep Worker",
    tagline: "Focus is your edge. The hours add up.",
  },
  polymath: {
    name: "The Polymath",
    tagline: "Every axis is moving. You’re building width and depth at once.",
  },
  "quiet-builder": {
    name: "The Quiet Builder",
    tagline: "Thirty days. No fanfare. Just the minimum, every scheduled day.",
  },
};

type Context = {
  userId: string;
  today: string;
  traits: Map<TraitAxis, number>;
  weeklyReviewCount: number;
  thirtyDayCoverageRatio: number;
};

async function buildContext(userId: string): Promise<Context> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const thirtyDaysAgo = addDays(today, -29);

  const [traitRows, weeklyReviewCount, scheduleDays, habitLogs] = await Promise.all([
    prisma.trait.findMany({ where: { userId } }),
    prisma.weeklyReview.count({ where: { week: { userId } } }),
    prisma.habitScheduleDay.findMany({
      where: { habit: { userId, active: true } },
      include: { habit: { select: { id: true } } },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId },
        date: { gte: thirtyDaysAgo, lte: today },
        status: { in: ["MINIMUM", "IDEAL"] },
      },
    }),
  ]);

  const traits = new Map<TraitAxis, number>();
  for (const t of traitRows) traits.set(t.axis, t.value);

  // 30-day coverage: of the (habit × scheduled-day) cells in the last 30 days,
  // how many have a MIN/IDEAL log? Used for quiet-builder.
  const scheduleByHabit = new Map<string, Set<number>>();
  for (const s of scheduleDays) {
    const set = scheduleByHabit.get(s.habit.id) ?? new Set<number>();
    set.add(s.dayOfWeek);
    scheduleByHabit.set(s.habit.id, set);
  }

  const logsByCell = new Set<string>();
  for (const log of habitLogs) {
    logsByCell.add(`${log.habitId}|${log.date}`);
  }

  let scheduledCells = 0;
  let coveredCells = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const date = addDays(today, -offset);
    const dow = isoWeekday(date);
    for (const [habitId, days] of scheduleByHabit) {
      if (!days.has(dow)) continue;
      scheduledCells += 1;
      if (logsByCell.has(`${habitId}|${date}`)) coveredCells += 1;
    }
  }

  const thirtyDayCoverageRatio =
    scheduledCells > 0 ? coveredCells / scheduledCells : 0;

  return { userId, today, traits, weeklyReviewCount, thirtyDayCoverageRatio };
}

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function topAxis(traits: Map<TraitAxis, number>): TraitAxis | null {
  let best: { axis: TraitAxis; value: number } | null = null;
  for (const [axis, value] of traits) {
    if (value <= 0) continue;
    if (!best || value > best.value) best = { axis, value };
  }
  return best?.axis ?? null;
}

function level(traits: Map<TraitAxis, number>, axis: TraitAxis): number {
  return traitDisplayLevel(traits.get(axis) ?? 0);
}

const RULES: Record<TitleSlug, (ctx: Context) => boolean> = {
  "consistent-builder": (ctx) =>
    topAxis(ctx.traits) === "DISCIPLINE" && level(ctx.traits, "DISCIPLINE") >= 3,
  "recovery-champion": (ctx) => level(ctx.traits, "RECOVERY") >= 5,
  "strategic-thinker": (ctx) =>
    ctx.weeklyReviewCount >= 4 && level(ctx.traits, "AUDACITY") >= 3,
  "deep-worker": (ctx) =>
    topAxis(ctx.traits) === "FOCUS" && level(ctx.traits, "FOCUS") >= 3,
  polymath: (ctx) =>
    level(ctx.traits, "DISCIPLINE") >= 3 &&
    level(ctx.traits, "AUDACITY") >= 3 &&
    level(ctx.traits, "RECOVERY") >= 3 &&
    level(ctx.traits, "FOCUS") >= 3 &&
    level(ctx.traits, "CRAFT") >= 3,
  "quiet-builder": (ctx) => ctx.thirtyDayCoverageRatio >= 0.95,
};

/**
 * Idempotent. After any XP/trait change, recompute which titles should be active.
 * Titles are never deleted — losing one flips `active` to false, preserving history.
 */
export async function recomputeTitles(userId: string): Promise<void> {
  const ctx = await buildContext(userId);
  const existing = await prisma.title.findMany({ where: { userId } });
  const existingBySlug = new Map(existing.map((t) => [t.slug, t]));

  for (const slug of Object.keys(RULES) as TitleSlug[]) {
    const shouldBeActive = RULES[slug](ctx);
    const row = existingBySlug.get(slug);

    if (shouldBeActive && !row) {
      await prisma.title.create({
        data: { userId, slug, name: TITLES[slug].name, active: true },
      });
    } else if (shouldBeActive && row && !row.active) {
      await prisma.title.update({
        where: { id: row.id },
        data: { active: true, earnedAt: new Date() },
      });
    } else if (!shouldBeActive && row && row.active) {
      await prisma.title.update({
        where: { id: row.id },
        data: { active: false },
      });
    }
  }
}
