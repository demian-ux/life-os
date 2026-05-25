import { prisma } from "@/lib/db";
import { addDays, getDayKey, getWeekStart } from "@/lib/dates";

export const ISO_WEEKDAY = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
} as const;

export type DayKeyLiteral = keyof typeof ISO_WEEKDAY;

export async function getOrCreateWeek(userId: string, dateKey: string) {
  const startDate = getWeekStart(dateKey);
  const endDate = addDays(startDate, 6);

  const existing = await prisma.week.findUnique({
    where: { userId_startDate: { userId, startDate } },
  });
  if (existing) return existing;

  return prisma.week.create({
    data: { userId, startDate, endDate },
  });
}

export async function ensureDayPlans(
  userId: string,
  weekId: string,
  startDate: string,
) {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(startDate, offset);
    await prisma.dayPlan.upsert({
      where: { userId_date: { userId, date } },
      update: { weekId, dayKey: getDayKey(date) },
      create: {
        userId,
        weekId,
        date,
        dayKey: getDayKey(date),
      },
    });
  }
}

export async function loadWeekData(userId: string, dateKey: string) {
  const week = await getOrCreateWeek(userId, dateKey);
  await ensureDayPlans(userId, week.id, week.startDate);

  const [hydratedWeek, habits] = await Promise.all([
    prisma.week.findUniqueOrThrow({
      where: { id: week.id },
      include: {
        targets: { orderBy: { order: "asc" } },
        dayPlans: {
          orderBy: { date: "asc" },
          include: {
            timeBlocks: { orderBy: [{ startTime: "asc" }, { order: "asc" }] },
          },
        },
      },
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
      orderBy: { name: "asc" },
      include: {
        scheduleDays: true,
      },
    }),
  ]);

  const endDate = addDays(week.startDate, 6);
  const habitLogs = await prisma.habitLog.findMany({
    where: {
      habit: { userId },
      date: { gte: week.startDate, lte: endDate },
    },
  });

  return { week: hydratedWeek, habits, habitLogs };
}

export type WeekData = Awaited<ReturnType<typeof loadWeekData>>;
