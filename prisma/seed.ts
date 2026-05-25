import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import {
  addDays,
  getDayKey,
  getWeekStart,
  todayKey,
  type DateKey,
} from "../src/lib/dates";

const TIMEZONE = "America/Argentina/Buenos_Aires";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

type TraitAxisSeed =
  | "DISCIPLINE"
  | "AUDACITY"
  | "RECOVERY"
  | "FOCUS"
  | "CRAFT";

type HabitSeed = {
  name: string;
  category: string;
  minimumVersion: string;
  idealVersion: string;
  anchor: string;
  days: number[];
  difficulty: number;
  axis: TraitAxisSeed;
};

const HABITS: HabitSeed[] = [
  {
    name: "Meditation",
    category: "health",
    minimumVersion: "5 minutes",
    idealVersion: "10 minutes",
    anchor: "after brushing teeth",
    days: [1, 2, 3, 4, 5],
    difficulty: 1,
    axis: "RECOVERY",
  },
  {
    name: "Reading",
    category: "learning",
    minimumVersion: "5 pages",
    idealVersion: "20 pages",
    anchor: "before sleep",
    days: [1, 2, 3, 4, 5, 6, 7],
    difficulty: 1,
    axis: "CRAFT",
  },
  {
    name: "Phone out of bedroom",
    category: "sleep",
    minimumVersion: "phone charges outside bedroom",
    idealVersion: "no phone 30 minutes before bed",
    anchor: "when going to bed",
    days: [1, 2, 3, 4, 5, 6, 7],
    difficulty: 2,
    axis: "RECOVERY",
  },
  {
    name: "Functional training",
    category: "health",
    minimumVersion: "20 minutes",
    idealVersion: "full session",
    anchor: "scheduled block",
    days: [1, 3, 5],
    difficulty: 3,
    axis: "DISCIPLINE",
  },
  {
    name: "Gym",
    category: "health",
    minimumVersion: "30 minutes",
    idealVersion: "full workout",
    anchor: "scheduled block",
    days: [2, 4, 6],
    difficulty: 3,
    axis: "DISCIPLINE",
  },
  {
    name: "Stretching",
    category: "recovery",
    minimumVersion: "5 minutes",
    idealVersion: "15 minutes",
    anchor: "after training or before bed",
    days: [1, 2, 3, 4, 5, 6, 7],
    difficulty: 1,
    axis: "RECOVERY",
  },
  {
    name: "French",
    category: "learning",
    minimumVersion: "5 minutes",
    idealVersion: "20 minutes",
    anchor: "after lunch",
    days: [1, 2, 3, 4, 5],
    difficulty: 2,
    axis: "CRAFT",
  },
  {
    name: "Illustration",
    category: "creative",
    minimumVersion: "10 minutes",
    idealVersion: "45 minutes",
    anchor: "evening creative block",
    days: [2, 4, 6],
    difficulty: 2,
    axis: "CRAFT",
  },
  {
    name: "Networking",
    category: "work",
    minimumVersion: "send one message",
    idealVersion: "send three good messages",
    anchor: "outreach block",
    days: [2, 4],
    difficulty: 2,
    axis: "AUDACITY",
  },
];

type DayTemplate = {
  offset: number;
  dayKey: ReturnType<typeof getDayKey>;
  label: string;
  focus: string;
  blocks: { start: string; end: string; title: string; category: string }[];
};

const DAY_TEMPLATES: DayTemplate[] = [
  {
    offset: 0,
    dayKey: "MON",
    label: "Strategy and setup",
    focus: "Plan the week and start the most important work.",
    blocks: [
      {
        start: "09:00",
        end: "10:00",
        title: "Weekly planning",
        category: "ADMIN",
      },
      {
        start: "10:30",
        end: "12:00",
        title: "Deep work",
        category: "DEEP_WORK",
      },
      { start: "15:00", end: "16:00", title: "Admin", category: "ADMIN" },
    ],
  },
  {
    offset: 1,
    dayKey: "TUE",
    label: "Sales and outreach",
    focus: "Outreach block plus follow-ups.",
    blocks: [
      { start: "09:30", end: "11:00", title: "Outreach", category: "FLEXIBLE" },
      {
        start: "11:30",
        end: "13:00",
        title: "Follow-ups",
        category: "FLEXIBLE",
      },
      { start: "15:00", end: "16:00", title: "Admin", category: "ADMIN" },
    ],
  },
  {
    offset: 2,
    dayKey: "WED",
    label: "Account and project work",
    focus: "Long deep-work session on the main project.",
    blocks: [
      {
        start: "09:30",
        end: "12:00",
        title: "Deep work",
        category: "DEEP_WORK",
      },
      {
        start: "14:30",
        end: "16:00",
        title: "Project work",
        category: "DEEP_WORK",
      },
    ],
  },
  {
    offset: 3,
    dayKey: "THU",
    label: "Outreach and follow-ups",
    focus: "Outreach plus a creative or learning block.",
    blocks: [
      { start: "09:30", end: "11:00", title: "Outreach", category: "FLEXIBLE" },
      {
        start: "11:30",
        end: "12:30",
        title: "Follow-ups",
        category: "FLEXIBLE",
      },
      {
        start: "15:00",
        end: "16:00",
        title: "Creative or learning",
        category: "CREATIVE",
      },
    ],
  },
  {
    offset: 4,
    dayKey: "FRI",
    label: "Cleanup and reflection",
    focus: "Tidy the inbox, run the weekly review, plan next week.",
    blocks: [
      { start: "09:30", end: "11:00", title: "Cleanup", category: "ADMIN" },
      {
        start: "11:30",
        end: "12:30",
        title: "Weekly review",
        category: "ADMIN",
      },
      {
        start: "15:00",
        end: "16:00",
        title: "Plan next week",
        category: "ADMIN",
      },
    ],
  },
];

async function main() {
  const today: DateKey = todayKey(TIMEZONE);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);

  const user = await prisma.user.upsert({
    where: { id: "demian" },
    update: {},
    create: {
      id: "demian",
      name: "Demian",
      timezone: TIMEZONE,
    },
  });

  await prisma.gameProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  for (const habit of HABITS) {
    const existing = await prisma.habit.findFirst({
      where: { userId: user.id, name: habit.name },
    });
    const record = existing
      ? await prisma.habit.update({
          where: { id: existing.id },
          data: {
            category: habit.category,
            minimumVersion: habit.minimumVersion,
            idealVersion: habit.idealVersion,
            anchor: habit.anchor,
            difficulty: habit.difficulty,
            axis: habit.axis,
          },
        })
      : await prisma.habit.create({
          data: {
            userId: user.id,
            name: habit.name,
            category: habit.category,
            minimumVersion: habit.minimumVersion,
            idealVersion: habit.idealVersion,
            anchor: habit.anchor,
            difficulty: habit.difficulty,
            axis: habit.axis,
          },
        });

    await prisma.habitScheduleDay.deleteMany({
      where: { habitId: record.id },
    });
    await prisma.habitScheduleDay.createMany({
      data: habit.days.map((dayOfWeek) => ({
        habitId: record.id,
        dayOfWeek,
      })),
    });
  }

  const week = await prisma.week.upsert({
    where: { userId_startDate: { userId: user.id, startDate: weekStart } },
    update: { endDate: weekEnd },
    create: {
      userId: user.id,
      startDate: weekStart,
      endDate: weekEnd,
      bigRock: "Default Big Rock",
      label: "Current week",
    },
  });

  // Seed default block rule — Social media unless Meditation logged.
  const meditation = await prisma.habit.findFirst({
    where: { userId: user.id, name: "Meditation" },
    select: { id: true },
  });
  if (meditation) {
    const existingRule = await prisma.blockRule.findFirst({
      where: { userId: user.id, guardType: "HABIT_LOGGED" },
    });
    const SOCIAL_DOMAINS = [
      "instagram.com",
      "www.instagram.com",
      "tiktok.com",
      "www.tiktok.com",
      "twitter.com",
      "www.twitter.com",
      "x.com",
      "www.x.com",
      "facebook.com",
      "www.facebook.com",
      "m.facebook.com",
      "reddit.com",
      "www.reddit.com",
      "old.reddit.com",
      "threads.net",
      "www.threads.net",
      "snapchat.com",
      "www.snapchat.com",
    ];
    if (!existingRule) {
      await prisma.blockRule.create({
        data: {
          userId: user.id,
          name: "Social media",
          domains: SOCIAL_DOMAINS,
          guardType: "HABIT_LOGGED",
          guardParams: { habitId: meditation.id },
          active: true,
        },
      });
    }
  }

  for (const template of DAY_TEMPLATES) {
    const date = addDays(weekStart, template.offset);
    const dayPlan = await prisma.dayPlan.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {
        weekId: week.id,
        dayKey: template.dayKey,
        label: template.label,
        focus: template.focus,
      },
      create: {
        userId: user.id,
        weekId: week.id,
        date,
        dayKey: template.dayKey,
        label: template.label,
        focus: template.focus,
      },
    });

    await prisma.timeBlock.deleteMany({ where: { dayPlanId: dayPlan.id } });
    await prisma.timeBlock.createMany({
      data: template.blocks.map((block, idx) => ({
        dayPlanId: dayPlan.id,
        startTime: block.start,
        endTime: block.end,
        title: block.title,
        category: block.category as
          | "FIXED"
          | "FLEXIBLE"
          | "FREE"
          | "DEEP_WORK"
          | "ADMIN"
          | "RECOVERY"
          | "SOCIAL"
          | "HEALTH"
          | "CREATIVE",
        order: idx,
      })),
    });
  }

  console.log(
    `Seeded user=${user.name} week=${weekStart}..${weekEnd} habits=${HABITS.length} dayPlans=${DAY_TEMPLATES.length}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
