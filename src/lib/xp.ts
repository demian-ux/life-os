import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { awardTrait, revokeTrait } from "@/lib/retention/award-trait";
import { computeBonus, isComboContributor, tryAwardCombo } from "@/lib/retention/bonuses";
import { recomputeTitles } from "@/lib/retention/titles";
import { DEFAULT_TIMEZONE } from "@/lib/user";

export const XP_RULES = {
  HABIT_MINIMUM: 5,
  HABIT_IDEAL: 10,
  TASK_DONE: 5,
  DEEP_WORK_BLOCK_DONE: 15,
  BIG_ROCK_DONE: 50,
  WEEKLY_REVIEW_DONE: 25,
  CONSISTENCY_BONUS: 20,
} as const;

export type XpSource =
  | "HABIT_MINIMUM"
  | "HABIT_IDEAL"
  | "TASK_DONE"
  | "DEEP_WORK_BLOCK_DONE"
  | "BIG_ROCK_DONE"
  | "WEEKLY_REVIEW_DONE"
  | "CONSISTENCY_BONUS";

// Quadratic level curve: xp_for_level(N) = 25 * N * (N-1).
// Matches the prior hand-tuned table exactly for L1–L14, then continues
// infinitely. No level cap — "max level" was a terminal state we don't want.
export function xpForLevel(level: number): number {
  return 25 * level * (level - 1);
}

export function levelFromXp(xp: number): {
  level: number;
  nextLevelAt: number;
  intoLevel: number;
  toNext: number;
} {
  const safeXp = Math.max(0, xp);
  const level = Math.max(
    1,
    Math.floor((1 + Math.sqrt(1 + (4 * safeXp) / 25)) / 2),
  );
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  return {
    level,
    nextLevelAt: nextThreshold,
    intoLevel: safeXp - currentThreshold,
    toNext: nextThreshold - safeXp,
  };
}

async function recomputeProfile(userId: string) {
  const total = await prisma.xpEvent.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  const xp = total._sum.amount ?? 0;
  const { level } = levelFromXp(xp);
  await prisma.gameProfile.upsert({
    where: { userId },
    update: { xp, level },
    create: { userId, xp, level },
  });
}

async function dateKeyForUser(userId: string, date?: string): Promise<string> {
  if (date) return date;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return todayKey(user?.timezone || DEFAULT_TIMEZONE);
}

export async function awardXp({
  userId,
  source,
  amount,
  note,
  date,
  dedupeKey,
}: {
  userId: string;
  source: XpSource;
  amount: number;
  note?: string;
  date?: string;
  dedupeKey?: string;
}): Promise<{ awarded: boolean }> {
  if (amount <= 0) return { awarded: false };
  const dateKey = await dateKeyForUser(userId, date);
  const sourceKey = dedupeKey ? `${source}:${dedupeKey}` : source;

  if (dedupeKey) {
    const existing = await prisma.xpEvent.findFirst({
      where: { userId, source: sourceKey, date: dateKey },
    });
    if (existing) return { awarded: false };
  }

  // Variable reward layer (Phase I — Craving Machine).
  // Surge: ideal after 5 minimums. Golden: 5% per action.
  const bonus = await computeBonus({ userId, source, dedupeKey, dateKey });
  const finalAmount = Math.round(amount * bonus.multiplier);
  const mergedNote = [note, bonus.note].filter(Boolean).join(" · ") || null;

  await prisma.xpEvent.create({
    data: {
      userId,
      source: sourceKey,
      amount: finalAmount,
      multiplier: bonus.multiplier,
      bonus: bonus.bonus,
      note: mergedNote,
      date: dateKey,
    },
  });

  await awardTrait({ userId, source, dedupeKey, dateKey });

  // Combo: if this action is one of {HABIT_IDEAL, DEEP_WORK, TASK_DONE} and
  // all three are now present today, fire the +20 triple bonus once per day.
  if (isComboContributor(source)) {
    await tryAwardCombo(userId, dateKey);
  }

  await recomputeProfile(userId);
  await recomputeTitles(userId);
  return { awarded: true };
}

export async function revokeXp({
  userId,
  source,
  dedupeKey,
  date,
}: {
  userId: string;
  source: XpSource;
  dedupeKey: string;
  date?: string;
}): Promise<{ revoked: boolean }> {
  const dateKey = await dateKeyForUser(userId, date);
  const sourceKey = `${source}:${dedupeKey}`;
  const removed = await prisma.xpEvent.deleteMany({
    where: { userId, source: sourceKey, date: dateKey },
  });
  if (removed.count === 0) return { revoked: false };
  await revokeTrait({ userId, source, dedupeKey, dateKey });
  await recomputeProfile(userId);
  await recomputeTitles(userId);
  return { revoked: true };
}

export function isDeepWorkCategory(category: string): boolean {
  return category === "DEEP_WORK";
}
