"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TraitAxis } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayKey, getWeekStart } from "@/lib/dates";
import { awardXp, XP_RULES } from "@/lib/xp";
import { DEFAULT_TIMEZONE } from "@/lib/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/home");
  revalidatePath("/me");
}

async function getUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function getTimezone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  return user?.timezone ?? DEFAULT_TIMEZONE;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const TRAIT_VALUES = [
  TraitAxis.DISCIPLINE,
  TraitAxis.FOCUS,
  TraitAxis.AUDACITY,
  TraitAxis.CRAFT,
  TraitAxis.RECOVERY,
] as const;

const setWeekRockSchema = z.object({
  title: z.string().min(1).max(140),
  trait: z.enum([
    TraitAxis.DISCIPLINE,
    TraitAxis.FOCUS,
    TraitAxis.AUDACITY,
    TraitAxis.CRAFT,
    TraitAxis.RECOVERY,
  ]),
});

const setDailyRockSchema = z.object({
  title: z.string().min(1).max(140),
  trait: z.enum([
    TraitAxis.DISCIPLINE,
    TraitAxis.FOCUS,
    TraitAxis.AUDACITY,
    TraitAxis.CRAFT,
    TraitAxis.RECOVERY,
  ]),
  weekRockId: z.string().optional(),
});

const rockIdSchema = z.object({
  id: z.string().min(1),
});

// Suppress unused variable warning — kept for documentation of valid values
void TRAIT_VALUES;

// ---------------------------------------------------------------------------
// WeekRock actions
// ---------------------------------------------------------------------------

export async function setWeekRock(input: {
  title: string;
  trait: TraitAxis;
}): Promise<Result> {
  const parsed = setWeekRockSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const tz = await getTimezone(userId);
  const today = todayKey(tz);
  const weekStart = getWeekStart(today);

  await prisma.weekRock.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      title: parsed.data.title.trim(),
      trait: parsed.data.trait,
    },
    create: {
      userId,
      weekStart,
      title: parsed.data.title.trim(),
      trait: parsed.data.trait,
    },
  });

  revalidate();
  return { ok: true };
}

export async function completeWeekRock(input: { id: string }): Promise<Result> {
  const parsed = rockIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid rock id");

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const rock = await prisma.weekRock.findUnique({ where: { id: parsed.data.id } });
  if (!rock) return fail("Week rock not found");
  if (rock.userId !== userId) return fail("Not authorized");
  if (rock.status === "DONE") return fail("Already completed");

  await prisma.weekRock.update({
    where: { id: rock.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  await awardXp({
    userId,
    source: "BIG_ROCK_DONE",
    amount: rock.xpReward,
    date: rock.weekStart,
    dedupeKey: `week-rock:${rock.id}`,
    note: rock.title,
  });

  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// DailyRock actions
// ---------------------------------------------------------------------------

export async function setDailyRock(input: {
  title: string;
  trait: TraitAxis;
  weekRockId?: string;
}): Promise<Result> {
  const parsed = setDailyRockSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const tz = await getTimezone(userId);
  const date = todayKey(tz);

  await prisma.dailyRock.upsert({
    where: { userId_date: { userId, date } },
    update: {
      title: parsed.data.title.trim(),
      trait: parsed.data.trait,
      weekRockId: parsed.data.weekRockId ?? null,
    },
    create: {
      userId,
      date,
      title: parsed.data.title.trim(),
      trait: parsed.data.trait,
      weekRockId: parsed.data.weekRockId ?? null,
    },
  });

  revalidate();
  return { ok: true };
}

export async function completeDailyRock(input: { id: string }): Promise<Result> {
  const parsed = rockIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid rock id");

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const rock = await prisma.dailyRock.findUnique({ where: { id: parsed.data.id } });
  if (!rock) return fail("Daily rock not found");
  if (rock.userId !== userId) return fail("Not authorized");
  if (rock.status === "DONE") return fail("Already completed");

  await prisma.dailyRock.update({
    where: { id: rock.id },
    data: { status: "DONE", completedAt: new Date() },
  });

  await awardXp({
    userId,
    source: "BIG_ROCK_DONE",
    amount: rock.xpReward,
    date: rock.date,
    dedupeKey: `daily-rock:${rock.id}`,
    note: rock.title,
  });

  // 5-in-a-row +100 DISCIPLINE combo bonus deferred to Phase 1.5

  revalidate();
  return { ok: true };
}
