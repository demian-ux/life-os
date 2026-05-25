import type { Quest, QuestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { computeStreaks } from "@/lib/habits/streaks";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import type { HabitLogStatus } from "@/lib/validators/week";
import { traitDisplayLevel } from "./trait-map";

export type QuestSlug =
  | "first-21"
  | "season-1-finisher"
  | "rebuild-discipline"
  | "polymath-quest";

type QuestContext = {
  maxHabitStreak: number;
  hasLostLongStreak: boolean;
  completedSeasonsAbovePebble: number;
  traitsAtLevel3: number;
};

type QuestDef = {
  slug: QuestSlug;
  name: string;
  description: string;
  initialStatus: QuestStatus;
  unlock: (ctx: QuestContext) => boolean;
  complete: (ctx: QuestContext) => boolean;
};

export const QUEST_DEFS: QuestDef[] = [
  {
    slug: "first-21",
    name: "First 21",
    description: "Hit a 21-day streak on any habit.",
    initialStatus: "ACTIVE",
    unlock: () => true,
    complete: (ctx) => ctx.maxHabitStreak >= 21,
  },
  {
    slug: "season-1-finisher",
    name: "First Climb",
    description: "Complete a season above Pebble.",
    initialStatus: "ACTIVE",
    unlock: () => true,
    complete: (ctx) => ctx.completedSeasonsAbovePebble >= 1,
  },
  {
    slug: "rebuild-discipline",
    name: "Phoenix",
    description: "After a setback, get back to a 7-day streak on any habit.",
    initialStatus: "HIDDEN",
    unlock: (ctx) => ctx.hasLostLongStreak,
    complete: (ctx) => ctx.maxHabitStreak >= 7 && ctx.hasLostLongStreak === false,
  },
  {
    slug: "polymath-quest",
    name: "The Five Pillars",
    description: "Bring all five traits to level 3.",
    initialStatus: "HIDDEN",
    unlock: (ctx) => ctx.traitsAtLevel3 >= 3,
    complete: (ctx) => ctx.traitsAtLevel3 >= 5,
  },
];

async function buildContext(userId: string): Promise<QuestContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);

  const [habits, streakTiers, completedSeasons, traits] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, active: true },
      include: {
        scheduleDays: { select: { dayOfWeek: true } },
        logs: {
          select: { date: true, status: true },
          orderBy: { date: "desc" },
          take: 400,
        },
      },
    }),
    prisma.streakTier.findMany({
      where: { userId, daysAt: { gte: 14 } },
      select: { habitId: true, daysAt: true },
    }),
    prisma.season.findMany({
      where: { userId, finalRank: { gte: 10 } },
      select: { id: true },
    }),
    prisma.trait.findMany({ where: { userId }, select: { value: true } }),
  ]);

  // Current streak per habit.
  const currentByHabit = new Map<string, number>();
  let maxStreak = 0;
  for (const h of habits) {
    const { current } = computeStreaks({
      scheduledDays: h.scheduleDays.map((s) => s.dayOfWeek),
      logs: h.logs.map((l) => ({
        date: l.date,
        status: l.status as HabitLogStatus,
      })),
      todayDate: today,
    });
    currentByHabit.set(h.id, current);
    if (current > maxStreak) maxStreak = current;
  }

  // "Lost a long streak": any habit had a 14+ day streak in the past
  // (StreakTier row exists) but current streak is now under 7. This is the
  // condition that reveals Phoenix.
  let hasLostLongStreak = false;
  for (const tier of streakTiers) {
    const current = currentByHabit.get(tier.habitId) ?? 0;
    if (current < 7) {
      hasLostLongStreak = true;
      break;
    }
  }

  const traitsAtLevel3 = traits.filter((t) => traitDisplayLevel(t.value) >= 3)
    .length;

  return {
    maxHabitStreak: maxStreak,
    hasLostLongStreak,
    completedSeasonsAbovePebble: completedSeasons.length,
    traitsAtLevel3,
  };
}

async function seedIfNeeded(userId: string): Promise<void> {
  const existing = await prisma.quest.findMany({
    where: { userId },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((q) => q.slug));
  const toInsert = QUEST_DEFS.filter((d) => !existingSet.has(d.slug));
  if (toInsert.length === 0) return;
  await prisma.quest.createMany({
    data: toInsert.map((d) => ({
      userId,
      slug: d.slug,
      name: d.name,
      description: d.description,
      status: d.initialStatus,
      unlockedAt: d.initialStatus === "ACTIVE" ? new Date() : null,
    })),
  });
}

/**
 * Idempotent. Seeds missing quests, then transitions each based on rules.
 * Call from any action site after state changes. Cheap enough to run inline.
 */
export async function evaluateQuests(userId: string): Promise<void> {
  await seedIfNeeded(userId);
  const ctx = await buildContext(userId);
  const quests = await prisma.quest.findMany({ where: { userId } });
  const bySlug = new Map(quests.map((q) => [q.slug, q]));

  for (const def of QUEST_DEFS) {
    const row = bySlug.get(def.slug);
    if (!row) continue;
    if (row.status === "COMPLETE" || row.status === "ABANDONED") continue;

    if (row.status === "HIDDEN" && def.unlock(ctx)) {
      await prisma.quest.update({
        where: { id: row.id },
        data: { status: "ACTIVE", unlockedAt: new Date() },
      });
    }

    // Re-read status if just transitioned — for in-loop chain reveal.
    const updated = await prisma.quest.findUnique({ where: { id: row.id } });
    if (!updated) continue;

    if (updated.status === "ACTIVE" && def.complete(ctx)) {
      await prisma.quest.update({
        where: { id: row.id },
        data: { status: "COMPLETE", completedAt: new Date() },
      });
    }
  }
}

export type QuestView = Quest;

export async function loadQuests(userId: string): Promise<{
  active: QuestView[];
  hidden: QuestView[];
  completed: QuestView[];
}> {
  const quests = await prisma.quest.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return {
    active: quests.filter((q) => q.status === "ACTIVE"),
    hidden: quests.filter((q) => q.status === "HIDDEN"),
    completed: quests.filter((q) => q.status === "COMPLETE"),
  };
}
