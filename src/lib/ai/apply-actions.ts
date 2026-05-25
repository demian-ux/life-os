import { prisma } from "@/lib/db";
import { addDays, getDayKey, getWeekStart } from "@/lib/dates";
import {
  aiActionProposalSchema,
  type AiActionProposal,
} from "@/lib/validators/ai-actions";

export type ApplyResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

async function ensureDayPlan(userId: string, date: string) {
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);
  const week = await prisma.week.upsert({
    where: { userId_startDate: { userId, startDate: weekStart } },
    update: {},
    create: { userId, startDate: weekStart, endDate: weekEnd },
  });
  return prisma.dayPlan.upsert({
    where: { userId_date: { userId, date } },
    update: { weekId: week.id, dayKey: getDayKey(date) },
    create: {
      userId,
      weekId: week.id,
      date,
      dayKey: getDayKey(date),
    },
  });
}

async function ensureWeek(userId: string, weekStartDate: string) {
  const weekStart = getWeekStart(weekStartDate);
  const weekEnd = addDays(weekStart, 6);
  return prisma.week.upsert({
    where: { userId_startDate: { userId, startDate: weekStart } },
    update: {},
    create: { userId, startDate: weekStart, endDate: weekEnd },
  });
}

export async function applyAiAction(
  userId: string,
  proposal: AiActionProposal,
): Promise<ApplyResult> {
  const parsed = aiActionProposalSchema.safeParse(proposal);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid action payload",
    };
  }
  const action = parsed.data;

  switch (action.type) {
    case "CREATE_TASK": {
      const p = action.payload;
      const task = await prisma.task.create({
        data: {
          userId,
          title: p.title.trim(),
          notes: p.notes ?? null,
          priority: p.priority,
          energy: p.energy,
          estimatedMinutes: p.estimatedMinutes ?? null,
          dueDate: p.dueDate ?? null,
          scheduledDate: p.scheduledDate ?? null,
          status: p.scheduledDate ? "SCHEDULED" : "INBOX",
          source: p.source ?? "ai",
        },
      });
      return {
        ok: true,
        summary: `Created task "${task.title}"${p.scheduledDate ? ` for ${p.scheduledDate}` : ""}`,
      };
    }

    case "SCHEDULE_TASK": {
      const p = action.payload;
      const task = await prisma.task.findUnique({ where: { id: p.taskId } });
      if (!task || task.userId !== userId) {
        return { ok: false, error: "Task not found" };
      }
      await prisma.task.update({
        where: { id: task.id },
        data: { scheduledDate: p.scheduledDate, status: "SCHEDULED" },
      });
      return {
        ok: true,
        summary: `Scheduled "${task.title}" for ${p.scheduledDate}`,
      };
    }

    case "CREATE_TIME_BLOCK": {
      const p = action.payload;
      if (p.startTime >= p.endTime) {
        return { ok: false, error: "End time must be after start time" };
      }
      const dayPlan = await ensureDayPlan(userId, p.date);
      if (p.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: p.taskId },
        });
        if (!task || task.userId !== userId) {
          return { ok: false, error: "Linked task not found" };
        }
      }
      const count = await prisma.timeBlock.count({
        where: { dayPlanId: dayPlan.id },
      });
      await prisma.timeBlock.create({
        data: {
          dayPlanId: dayPlan.id,
          taskId: p.taskId ?? null,
          startTime: p.startTime,
          endTime: p.endTime,
          title: p.title.trim(),
          category: p.category,
          order: count,
        },
      });
      return {
        ok: true,
        summary: `Added block ${p.startTime}-${p.endTime} "${p.title}" on ${p.date}`,
      };
    }

    case "CREATE_WEEKLY_TARGET": {
      const p = action.payload;
      const week = await ensureWeek(userId, p.weekStartDate);
      const count = await prisma.weeklyTarget.count({
        where: { weekId: week.id },
      });
      await prisma.weeklyTarget.create({
        data: {
          weekId: week.id,
          title: p.title.trim(),
          order: count,
        },
      });
      return {
        ok: true,
        summary: `Added weekly target "${p.title}"`,
      };
    }

    case "UPDATE_WEEK": {
      const p = action.payload;
      const week = await ensureWeek(userId, p.weekStartDate);
      await prisma.week.update({
        where: { id: week.id },
        data: {
          bigRock: p.bigRock !== undefined ? p.bigRock || null : undefined,
          reflection:
            p.reflection !== undefined ? p.reflection || null : undefined,
        },
      });
      const parts: string[] = [];
      if (p.bigRock !== undefined) parts.push("Big Rock");
      if (p.reflection !== undefined) parts.push("reflection");
      return {
        ok: true,
        summary: `Updated week (${parts.join(", ") || "no fields"})`,
      };
    }

    case "LOG_HABIT": {
      const p = action.payload;
      const habit = await prisma.habit.findFirst({
        where: { userId, name: p.habitName },
      });
      if (!habit) {
        return { ok: false, error: `Habit "${p.habitName}" not found` };
      }
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: habit.id, date: p.date } },
        update: { status: p.status },
        create: {
          habitId: habit.id,
          date: p.date,
          status: p.status,
        },
      });
      return {
        ok: true,
        summary: `Logged ${habit.name} as ${p.status} on ${p.date}`,
      };
    }
  }
}
