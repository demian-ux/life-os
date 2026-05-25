import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import type { Habit, HabitLog, Task } from "@prisma/client";

export type TodayHabit = {
  habit: Habit;
  log: HabitLog | null;
};

export async function getTodayHabits(userId: string, timezone: string): Promise<TodayHabit[]> {
  const date = todayKey(timezone);
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
  const logs = await prisma.habitLog.findMany({
    where: { habitId: { in: habits.map((h) => h.id) }, date },
  });
  const byHabit = new Map(logs.map((l) => [l.habitId, l]));
  return habits.map((h) => ({ habit: h, log: byHabit.get(h.id) ?? null }));
}

export async function getTodayTasks(userId: string, timezone: string): Promise<Task[]> {
  const date = todayKey(timezone);
  return prisma.task.findMany({
    where: {
      userId,
      OR: [
        { scheduledDate: date },
        { dueDate: date, status: { notIn: ["DONE", "ARCHIVED"] } },
      ],
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    take: 12,
  });
}
