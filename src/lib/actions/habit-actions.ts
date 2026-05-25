"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { awardXp, revokeXp, XP_RULES } from "@/lib/xp";
import {
  createHabitSchema,
  habitIdSchema,
  updateHabitSchema,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "@/lib/validators/habit";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/habits");
  revalidatePath("/today");
  revalidatePath("/week");
}

async function getUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function replaceScheduleDays(habitId: string, days: number[]) {
  const unique = Array.from(new Set(days)).sort();
  await prisma.habitScheduleDay.deleteMany({ where: { habitId } });
  if (unique.length === 0) return;
  await prisma.habitScheduleDay.createMany({
    data: unique.map((dayOfWeek) => ({ habitId, dayOfWeek })),
  });
}

export async function createHabit(input: CreateHabitInput): Promise<Result> {
  const parsed = createHabitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const habit = await prisma.habit.create({
    data: {
      userId,
      name: parsed.data.name.trim(),
      category: parsed.data.category?.trim() || null,
      minimumVersion: parsed.data.minimumVersion.trim(),
      idealVersion: parsed.data.idealVersion?.trim() || null,
      anchor: parsed.data.anchor?.trim() || null,
      difficulty: parsed.data.difficulty,
      axis: parsed.data.axis,
    },
  });
  await replaceScheduleDays(habit.id, parsed.data.days);
  revalidate();
  return { ok: true };
}

export async function updateHabit(input: UpdateHabitInput): Promise<Result> {
  const parsed = updateHabitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await prisma.habit.update({
    where: { id: parsed.data.habitId },
    data: {
      name: parsed.data.name.trim(),
      category: parsed.data.category?.trim() || null,
      minimumVersion: parsed.data.minimumVersion.trim(),
      idealVersion: parsed.data.idealVersion?.trim() || null,
      anchor: parsed.data.anchor?.trim() || null,
      difficulty: parsed.data.difficulty,
      axis: parsed.data.axis,
    },
  });
  await replaceScheduleDays(parsed.data.habitId, parsed.data.days);
  revalidate();
  return { ok: true };
}

export async function setHabitActive(input: {
  habitId: string;
  active: boolean;
}): Promise<Result> {
  const parsed = habitIdSchema.safeParse({ habitId: input.habitId });
  if (!parsed.success) return fail("Invalid habit id");
  await prisma.habit.update({
    where: { id: parsed.data.habitId },
    data: { active: input.active },
  });
  revalidate();
  return { ok: true };
}

export const logHabitSchema = z.object({
  habitId: z.string().min(1),
  status: z.enum(["NONE", "MINIMUM", "IDEAL", "SKIPPED"]),
});

export async function logHabit(input: unknown): Promise<Result<void>> {
  const parsed = logHabitSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, timezone: true },
  });
  if (!user) return fail("No user");

  const habit = await prisma.habit.findUnique({ where: { id: parsed.data.habitId } });
  if (!habit || habit.userId !== user.id) return fail("Not found");

  const date = todayKey(user.timezone);
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date } },
  });

  const previousStatus = existing?.status ?? "NONE";
  const nextStatus = parsed.data.status;
  const value = nextStatus === "IDEAL" ? 2 : nextStatus === "MINIMUM" ? 1 : 0;

  if (existing) {
    await prisma.habitLog.update({
      where: { id: existing.id },
      data: { status: nextStatus, value },
    });
  } else {
    await prisma.habitLog.create({
      data: { habitId: habit.id, date, status: nextStatus, value },
    });
  }

  const dedupeKeyMinimum = `habit-min:${habit.id}:${date}`;
  const dedupeKeyIdeal = `habit-ideal:${habit.id}:${date}`;

  if (previousStatus === "MINIMUM" || previousStatus === "IDEAL") {
    await revokeXp({ userId: user.id, source: "HABIT_MINIMUM", dedupeKey: dedupeKeyMinimum, date });
    if (previousStatus === "IDEAL") {
      await revokeXp({ userId: user.id, source: "HABIT_IDEAL", dedupeKey: dedupeKeyIdeal, date });
    }
  }
  if (nextStatus === "MINIMUM" || nextStatus === "IDEAL") {
    await awardXp({
      userId: user.id,
      source: "HABIT_MINIMUM",
      amount: XP_RULES.HABIT_MINIMUM,
      date,
      dedupeKey: dedupeKeyMinimum,
    });
  }
  if (nextStatus === "IDEAL") {
    await awardXp({
      userId: user.id,
      source: "HABIT_IDEAL",
      amount: XP_RULES.HABIT_IDEAL,
      date,
      dedupeKey: dedupeKeyIdeal,
    });
  }

  revalidatePath("/home");
  revalidatePath("/habits");
  revalidatePath("/me");
  return { ok: true, data: undefined };
}
