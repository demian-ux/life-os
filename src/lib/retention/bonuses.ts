import { prisma } from "@/lib/db";
import type { XpSource } from "@/lib/xp";

/**
 * Deterministic hash → [0, 1). Same (userId, date, sourceKey) always rolls the
 * same value — refreshing the page can't farm a re-roll, but each new action
 * gets a fresh chance.
 */
function seededRoll(seedParts: string[]): number {
  let h = 2166136261;
  const s = seedParts.join("|");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Mix bits then map to [0, 1)
  const mixed = ((h >>> 0) % 1_000_000) / 1_000_000;
  return mixed;
}

const GOLDEN_PROB = 0.05;
const GOLDEN_MULT = 2.0;
const SURGE_MULT = 1.5;
const COMBO_AMOUNT = 20;

export type BonusOutcome = {
  multiplier: number;
  bonus: boolean;
  note?: string;
};

/**
 * Surge: an IDEAL log after 5+ consecutive minimum-only logs (no IDEAL in
 * the prior 5) — rewards graduating from "just showed up" to "did the real
 * version" after a long minimum streak.
 */
async function checkSurge(
  source: XpSource,
  dedupeKey: string | undefined,
): Promise<boolean> {
  if (source !== "HABIT_IDEAL" || !dedupeKey) return false;
  const habitId = dedupeKey.split(":")[0];
  const date = dedupeKey.split(":")[1];
  if (!habitId || !date) return false;

  // Look at the 5 most recent prior logs (excluding the one currently being
  // awarded). If all five are MINIMUM, surge fires.
  const recent = await prisma.habitLog.findMany({
    where: {
      habitId,
      date: { lt: date },
      status: { in: ["MINIMUM", "IDEAL"] },
    },
    orderBy: { date: "desc" },
    take: 5,
    select: { status: true },
  });
  if (recent.length < 5) return false;
  return recent.every((l) => l.status === "MINIMUM");
}

function checkGolden(
  userId: string,
  dateKey: string,
  source: XpSource,
  dedupeKey: string | undefined,
): boolean {
  // Per-action roll, deterministic so refreshing can't re-roll.
  const roll = seededRoll([userId, dateKey, source, dedupeKey ?? ""]);
  return roll < GOLDEN_PROB;
}

export async function computeBonus(args: {
  userId: string;
  source: XpSource;
  dedupeKey?: string;
  dateKey: string;
}): Promise<BonusOutcome> {
  const surge = await checkSurge(args.source, args.dedupeKey);
  const golden = checkGolden(
    args.userId,
    args.dateKey,
    args.source,
    args.dedupeKey,
  );

  let multiplier = 1;
  const notes: string[] = [];
  if (surge) {
    multiplier *= SURGE_MULT;
    notes.push("surge");
  }
  if (golden) {
    multiplier *= GOLDEN_MULT;
    notes.push("golden");
  }

  // Cap at 4× per the spec — Combo Machine math stays sane.
  if (multiplier > 4) multiplier = 4;

  return {
    multiplier,
    bonus: notes.length > 0,
    note: notes.length > 0 ? notes.join("+") : undefined,
  };
}

const COMBO_SOURCES: XpSource[] = [
  "HABIT_IDEAL",
  "DEEP_WORK_BLOCK_DONE",
  "TASK_DONE",
];

export function isComboContributor(source: XpSource): boolean {
  return COMBO_SOURCES.includes(source);
}

/**
 * Returns true and creates the +20 combo event if the user has at least one
 * of each (habit-ideal, deep-work, task-done) on `dateKey`, and the combo for
 * that date hasn't already been awarded. Idempotent.
 *
 * Combo is a separate XpEvent so it shows up distinctly in the activity log
 * and on Progress as "Surprise drop: combo".
 */
export async function tryAwardCombo(
  userId: string,
  dateKey: string,
): Promise<boolean> {
  const existing = await prisma.xpEvent.findFirst({
    where: { userId, source: `COMBO_TRIPLE:${dateKey}` },
  });
  if (existing) return false;

  const [hasIdeal, hasDeep, hasTask] = await Promise.all([
    prisma.xpEvent.findFirst({
      where: { userId, date: dateKey, source: { startsWith: "HABIT_IDEAL:" } },
      select: { id: true },
    }),
    prisma.xpEvent.findFirst({
      where: {
        userId,
        date: dateKey,
        source: { startsWith: "DEEP_WORK_BLOCK_DONE:" },
      },
      select: { id: true },
    }),
    prisma.xpEvent.findFirst({
      where: { userId, date: dateKey, source: { startsWith: "TASK_DONE:" } },
      select: { id: true },
    }),
  ]);
  if (!hasIdeal || !hasDeep || !hasTask) return false;

  await prisma.xpEvent.create({
    data: {
      userId,
      source: `COMBO_TRIPLE:${dateKey}`,
      amount: COMBO_AMOUNT,
      multiplier: 1,
      bonus: true,
      note: "triple",
      date: dateKey,
    },
  });
  return true;
}
