"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { awardXp, revokeXp, XP_RULES } from "@/lib/xp";
import {
  createTaskSchema,
  quickCaptureSchema,
  scheduleTaskSchema,
  taskIdSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type QuickCaptureInput,
  type ScheduleTaskInput,
  type UpdateTaskInput,
} from "@/lib/validators/task";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/week");
  revalidatePath("/progress");
}

async function getUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function quickCapture(input: QuickCaptureInput): Promise<Result> {
  const parsed = quickCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const userId = await getUserId();
  if (!userId) return fail("No user found");

  await prisma.task.create({
    data: {
      userId,
      title: parsed.data.title.trim(),
      status: "INBOX",
      source: parsed.data.source ?? "quick",
    },
  });
  revalidate();
  return { ok: true };
}

export async function createTask(input: CreateTaskInput): Promise<Result> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const userId = await getUserId();
  if (!userId) return fail("No user found");

  await prisma.task.create({
    data: {
      userId,
      title: parsed.data.title.trim(),
      notes: parsed.data.notes ?? null,
      priority: parsed.data.priority,
      energy: parsed.data.energy,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      dueDate: parsed.data.dueDate ?? null,
      scheduledDate: parsed.data.scheduledDate ?? null,
      status: parsed.data.scheduledDate ? "SCHEDULED" : "INBOX",
      source: parsed.data.source ?? "form",
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateTask(input: UpdateTaskInput): Promise<Result> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: {
      title: parsed.data.title.trim(),
      notes: parsed.data.notes ?? null,
      priority: parsed.data.priority,
      energy: parsed.data.energy,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      dueDate: parsed.data.dueDate ?? null,
      scheduledDate: parsed.data.scheduledDate ?? null,
    },
  });
  revalidate();
  return { ok: true };
}

export async function toggleTaskComplete(
  input: { taskId: string },
): Promise<Result> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task id");

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
  });
  if (!task) return fail("Task not found");

  if (task.status === "DONE") {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: task.scheduledDate ? "SCHEDULED" : "TODO",
        completedAt: null,
      },
    });
    await revokeXp({
      userId: task.userId,
      source: "TASK_DONE",
      dedupeKey: task.id,
    });
  } else {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    await awardXp({
      userId: task.userId,
      source: "TASK_DONE",
      amount: XP_RULES.TASK_DONE,
      dedupeKey: task.id,
      note: task.title,
    });
  }
  revalidate();
  return { ok: true };
}

export async function scheduleTask(
  input: ScheduleTaskInput,
): Promise<Result> {
  const parsed = scheduleTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: {
      scheduledDate: parsed.data.scheduledDate,
      status: "SCHEDULED",
    },
  });
  revalidate();
  return { ok: true };
}

export async function snoozeToTomorrow(
  input: { taskId: string },
): Promise<Result> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task id");
  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
  });
  if (!task) return fail("Task not found");
  const base = task.scheduledDate ?? task.dueDate;
  if (!base) return fail("Task has no scheduled date to move");
  const next = addDays(base, 1);
  await prisma.task.update({
    where: { id: task.id },
    data: { scheduledDate: next, status: "SCHEDULED" },
  });
  revalidate();
  return { ok: true };
}

export async function moveToSomeday(
  input: { taskId: string },
): Promise<Result> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task id");
  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { status: "SOMEDAY", scheduledDate: null },
  });
  revalidate();
  return { ok: true };
}

export async function archiveTask(
  input: { taskId: string },
): Promise<Result> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task id");
  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { status: "ARCHIVED" },
  });
  revalidate();
  return { ok: true };
}

export async function moveToInbox(
  input: { taskId: string },
): Promise<Result> {
  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task id");
  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { status: "INBOX", scheduledDate: null },
  });
  revalidate();
  return { ok: true };
}
