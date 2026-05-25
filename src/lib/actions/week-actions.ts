"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { addDays, getDayKey } from "@/lib/dates";
import { evaluateStreakTiers } from "@/lib/retention/evaluate-streaks";
import { evaluateQuests } from "@/lib/retention/quests";
import { awardXp, revokeXp, XP_RULES } from "@/lib/xp";
import {
  addTimeBlockSchema,
  addWeeklyTargetSchema,
  logHabitSchema,
  startNewWeekSchema,
  targetIdSchema,
  timeBlockIdSchema,
  updateBigRockSchema,
  updateReflectionSchema,
  updateTimeBlockSchema,
  type AddTimeBlockInput,
  type LogHabitInput,
  type UpdateTimeBlockInput,
} from "@/lib/validators/week";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

const WEEK_PATH = "/week";

export async function updateBigRock(
  input: { weekId: string; bigRock: string },
): Promise<Result> {
  const parsed = updateBigRockSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await prisma.week.update({
    where: { id: parsed.data.weekId },
    data: { bigRock: parsed.data.bigRock || null },
  });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function updateReflection(
  input: { weekId: string; reflection: string },
): Promise<Result> {
  const parsed = updateReflectionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await prisma.week.update({
    where: { id: parsed.data.weekId },
    data: { reflection: parsed.data.reflection || null },
  });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function addWeeklyTarget(
  input: { weekId: string; title: string },
): Promise<Result> {
  const parsed = addWeeklyTargetSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const count = await prisma.weeklyTarget.count({
    where: { weekId: parsed.data.weekId },
  });
  await prisma.weeklyTarget.create({
    data: {
      weekId: parsed.data.weekId,
      title: parsed.data.title.trim(),
      order: count,
    },
  });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function toggleWeeklyTarget(
  input: { targetId: string },
): Promise<Result> {
  const parsed = targetIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid target id");
  const target = await prisma.weeklyTarget.findUnique({
    where: { id: parsed.data.targetId },
  });
  if (!target) return fail("Target not found");
  await prisma.weeklyTarget.update({
    where: { id: target.id },
    data: { status: target.status === "DONE" ? "TODO" : "DONE" },
  });
  await reconcileBigRockBonus(target.weekId);
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

async function reconcileBigRockBonus(weekId: string) {
  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week) return;
  const totals = await prisma.weeklyTarget.findMany({ where: { weekId } });
  if (totals.length === 0) {
    await revokeXp({
      userId: week.userId,
      source: "BIG_ROCK_DONE",
      dedupeKey: weekId,
      date: week.startDate,
    });
    return;
  }
  const allDone = totals.every((t) => t.status === "DONE");
  if (allDone) {
    await awardXp({
      userId: week.userId,
      source: "BIG_ROCK_DONE",
      amount: XP_RULES.BIG_ROCK_DONE,
      dedupeKey: weekId,
      date: week.startDate,
      note: week.bigRock ?? `Week ${week.startDate}`,
    });
  } else {
    await revokeXp({
      userId: week.userId,
      source: "BIG_ROCK_DONE",
      dedupeKey: weekId,
      date: week.startDate,
    });
  }
}

export async function deleteWeeklyTarget(
  input: { targetId: string },
): Promise<Result> {
  const parsed = targetIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid target id");
  const existing = await prisma.weeklyTarget.findUnique({
    where: { id: parsed.data.targetId },
    select: { weekId: true },
  });
  await prisma.weeklyTarget.delete({ where: { id: parsed.data.targetId } });
  if (existing) await reconcileBigRockBonus(existing.weekId);
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function addTimeBlock(input: AddTimeBlockInput): Promise<Result> {
  const parsed = addTimeBlockSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (parsed.data.startTime >= parsed.data.endTime) {
    return fail("End time must be after start time");
  }
  const count = await prisma.timeBlock.count({
    where: { dayPlanId: parsed.data.dayPlanId },
  });
  await prisma.timeBlock.create({
    data: {
      dayPlanId: parsed.data.dayPlanId,
      title: parsed.data.title.trim(),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      category: parsed.data.category,
      order: count,
    },
  });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function updateTimeBlock(
  input: UpdateTimeBlockInput,
): Promise<Result> {
  const parsed = updateTimeBlockSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  if (parsed.data.startTime >= parsed.data.endTime) {
    return fail("End time must be after start time");
  }
  await prisma.timeBlock.update({
    where: { id: parsed.data.timeBlockId },
    data: {
      title: parsed.data.title.trim(),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      category: parsed.data.category,
    },
  });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function toggleTimeBlockDone(
  input: { timeBlockId: string },
): Promise<Result> {
  const parsed = timeBlockIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid block id");
  const block = await prisma.timeBlock.findUnique({
    where: { id: parsed.data.timeBlockId },
  });
  if (!block) return fail("Block not found");
  const dayPlan = await prisma.dayPlan.findUnique({
    where: { id: block.dayPlanId },
    select: { userId: true, date: true },
  });
  await prisma.timeBlock.update({
    where: { id: block.id },
    data: { status: block.status === "DONE" ? "PLANNED" : "DONE" },
  });
  if (dayPlan && block.category === "DEEP_WORK") {
    if (block.status === "DONE") {
      await revokeXp({
        userId: dayPlan.userId,
        source: "DEEP_WORK_BLOCK_DONE",
        dedupeKey: block.id,
        date: dayPlan.date,
      });
    } else {
      await awardXp({
        userId: dayPlan.userId,
        source: "DEEP_WORK_BLOCK_DONE",
        amount: XP_RULES.DEEP_WORK_BLOCK_DONE,
        dedupeKey: block.id,
        date: dayPlan.date,
        note: block.title,
      });
    }
  }
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function deleteTimeBlock(
  input: { timeBlockId: string },
): Promise<Result> {
  const parsed = timeBlockIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid block id");
  await prisma.timeBlock.delete({ where: { id: parsed.data.timeBlockId } });
  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function logHabit(input: LogHabitInput): Promise<Result> {
  const parsed = logHabitSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const habit = await prisma.habit.findUnique({
    where: { id: parsed.data.habitId },
    select: { userId: true, name: true },
  });
  if (!habit) return fail("Habit not found");

  if (parsed.data.status === "NONE") {
    await prisma.habitLog.deleteMany({
      where: { habitId: parsed.data.habitId, date: parsed.data.date },
    });
  } else {
    await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId: parsed.data.habitId,
          date: parsed.data.date,
        },
      },
      update: { status: parsed.data.status },
      create: {
        habitId: parsed.data.habitId,
        date: parsed.data.date,
        status: parsed.data.status,
      },
    });
  }

  const dedupeKey = `${parsed.data.habitId}:${parsed.data.date}`;
  await revokeXp({
    userId: habit.userId,
    source: "HABIT_MINIMUM",
    dedupeKey,
    date: parsed.data.date,
  });
  await revokeXp({
    userId: habit.userId,
    source: "HABIT_IDEAL",
    dedupeKey,
    date: parsed.data.date,
  });
  if (parsed.data.status === "MINIMUM") {
    await awardXp({
      userId: habit.userId,
      source: "HABIT_MINIMUM",
      amount: XP_RULES.HABIT_MINIMUM,
      dedupeKey,
      date: parsed.data.date,
      note: habit.name,
    });
  } else if (parsed.data.status === "IDEAL") {
    await awardXp({
      userId: habit.userId,
      source: "HABIT_IDEAL",
      amount: XP_RULES.HABIT_IDEAL,
      dedupeKey,
      date: parsed.data.date,
      note: habit.name,
    });
  }

  await evaluateStreakTiers(parsed.data.habitId, parsed.data.date);
  await evaluateQuests(habit.userId);

  revalidatePath(WEEK_PATH);
  revalidatePath("/progress");
  return { ok: true };
}

export async function startNewWeek(input: {
  userId: string;
  fromStartDate: string;
}): Promise<Result<{ startDate: string }>> {
  const parsed = startNewWeekSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const nextStart = addDays(parsed.data.fromStartDate, 7);
  const nextEnd = addDays(nextStart, 6);

  const existing = await prisma.week.findUnique({
    where: {
      userId_startDate: {
        userId: parsed.data.userId,
        startDate: nextStart,
      },
    },
  });
  if (existing) {
    revalidatePath(WEEK_PATH);
    return { ok: true, data: { startDate: nextStart } };
  }

  const week = await prisma.week.create({
    data: {
      userId: parsed.data.userId,
      startDate: nextStart,
      endDate: nextEnd,
    },
  });

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(nextStart, offset);
    await prisma.dayPlan.upsert({
      where: { userId_date: { userId: parsed.data.userId, date } },
      update: { weekId: week.id, dayKey: getDayKey(date) },
      create: {
        userId: parsed.data.userId,
        weekId: week.id,
        date,
        dayKey: getDayKey(date),
      },
    });
  }

  revalidatePath(WEEK_PATH);
  return { ok: true, data: { startDate: nextStart } };
}
