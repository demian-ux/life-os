import { prisma } from "@/lib/db";
import { addDays, formatDateLabel, getWeekStart, todayKey } from "@/lib/dates";
import { loadIdentity } from "@/lib/retention/queries";
import { currentSeasonView } from "@/lib/retention/seasons";
import { DEFAULT_TIMEZONE } from "@/lib/user";

const ISO_WEEKDAY: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

const AXIS_LABELS: Record<string, string> = {
  DISCIPLINE: "Discipline",
  AUDACITY: "Audacity",
  RECOVERY: "Recovery",
  FOCUS: "Focus",
  CRAFT: "Craft",
};

function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

function compactJson(value: unknown): string {
  const text = JSON.stringify(value);
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export type ContextOptions = {
  userId: string;
  todayDate?: string;
  habitLogDays?: number;
};

export async function buildAppContext(opts: ContextOptions): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  const today = opts.todayDate ?? todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const habitLogDays = opts.habitLogDays ?? 14;
  const habitLogStart = addDays(today, -habitLogDays);

  const [
    week,
    dayPlans,
    openTasks,
    recentDoneTasks,
    habits,
    habitLogs,
    identity,
    season,
    activeQuests,
    dismissedInsights,
  ] =
    await Promise.all([
      prisma.week.findUnique({
        where: {
          userId_startDate: { userId: opts.userId, startDate: weekStart },
        },
        include: { targets: { orderBy: { order: "asc" } } },
      }),
      prisma.dayPlan.findMany({
        where: {
          userId: opts.userId,
          date: { gte: weekStart, lte: weekEnd },
        },
        orderBy: { date: "asc" },
        include: { timeBlocks: { orderBy: { startTime: "asc" } } },
      }),
      prisma.task.findMany({
        where: {
          userId: opts.userId,
          status: { notIn: ["DONE", "ARCHIVED"] },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 50,
      }),
      prisma.task.findMany({
        where: {
          userId: opts.userId,
          status: "DONE",
          completedAt: {
            gte: new Date(`${addDays(today, -7)}T00:00:00.000Z`),
          },
        },
        orderBy: { completedAt: "desc" },
        take: 25,
      }),
      prisma.habit.findMany({
        where: { userId: opts.userId, active: true },
        orderBy: { name: "asc" },
        include: { scheduleDays: true },
      }),
      prisma.habitLog.findMany({
        where: {
          habit: { userId: opts.userId },
          date: { gte: habitLogStart, lte: today },
        },
        orderBy: { date: "desc" },
      }),
      loadIdentity(opts.userId),
      currentSeasonView(opts.userId),
      prisma.quest.findMany({
        where: { userId: opts.userId, status: "ACTIVE" },
        orderBy: { unlockedAt: "desc" },
        take: 5,
      }),
      prisma.coachInsight.findMany({
        where: { userId: opts.userId, status: "DISMISSED" },
        orderBy: [{ shownAt: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
    ]);

  const todayPlan = dayPlans.find((d) => d.date === today);

  const userBlock = user
    ? lines(
        `User: ${user.name}`,
        `Timezone: ${user.timezone}`,
        `Today: ${today} (${formatDateLabel(today)})`,
      )
    : `Today: ${today}`;

  const weekBlock = week
    ? lines(
        `Week ${week.startDate} - ${week.endDate}`,
        week.bigRock ? `Big Rock: ${week.bigRock}` : "Big Rock: (none)",
        `Targets:`,
        ...(week.targets.length > 0
          ? week.targets.map(
              (t) => `  - [${t.status}] ${t.title} (id: ${t.id})`,
            )
          : ["  (none)"]),
        week.reflection ? `Reflection: ${week.reflection}` : null,
      )
    : `Week ${weekStart} - ${weekEnd}: (no week record)`;

  const dayPlanBlock = lines(
    "Day plans this week:",
    ...dayPlans.map((d) => {
      const blocks =
        d.timeBlocks.length > 0
          ? d.timeBlocks
              .map(
                (b) =>
                  `      ${b.startTime}-${b.endTime} ${b.title} (${b.category}, ${b.status})`,
              )
              .join("\n")
          : "      (no blocks)";
      const focusLine = d.focus ? `    focus: ${d.focus}` : "";
      const energyLine = d.energy ? `    energy: ${d.energy}` : "";
      return [
        `  ${DAY_LABELS[d.dayKey] ?? d.dayKey} ${d.date}${d.label ? ` - ${d.label}` : ""}`,
        focusLine,
        energyLine,
        blocks,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  );

  const todayTasks = openTasks.filter((t) => t.scheduledDate === today);
  const weekTasks = openTasks.filter(
    (t) =>
      t.scheduledDate &&
      t.scheduledDate >= weekStart &&
      t.scheduledDate <= weekEnd,
  );
  const inboxTasks = openTasks.filter((t) => t.status === "INBOX");
  const somedayTasks = openTasks.filter((t) => t.status === "SOMEDAY");

  function fmtTask(
    t: (typeof openTasks)[number] | (typeof recentDoneTasks)[number],
  ) {
    const parts = [
      `id: ${t.id}`,
      `priority: ${t.priority}`,
      `energy: ${t.energy}`,
      t.estimatedMinutes ? `est: ${t.estimatedMinutes}m` : null,
      t.scheduledDate ? `scheduled: ${t.scheduledDate}` : null,
      t.dueDate ? `due: ${t.dueDate}` : null,
    ].filter(Boolean);
    return `  - ${t.title} (${parts.join(", ")})`;
  }

  const tasksBlock = lines(
    "Open tasks scheduled today:",
    todayTasks.length ? todayTasks.map(fmtTask).join("\n") : "  (none)",
    "Open tasks scheduled this week (excluding today):",
    weekTasks.filter((t) => t.scheduledDate !== today).length
      ? weekTasks
          .filter((t) => t.scheduledDate !== today)
          .map(fmtTask)
          .join("\n")
      : "  (none)",
    "Inbox:",
    inboxTasks.length ? inboxTasks.map(fmtTask).join("\n") : "  (none)",
    "Someday:",
    somedayTasks.length ? somedayTasks.map(fmtTask).join("\n") : "  (none)",
    "Recently completed (last 7 days):",
    recentDoneTasks.length
      ? recentDoneTasks.map(fmtTask).join("\n")
      : "  (none)",
  );

  const todayDow = todayPlan ? ISO_WEEKDAY[todayPlan.dayKey] ?? null : null;

  const habitsBlock = lines(
    "Active habits:",
    ...habits.map((h) => {
      const dows = h.scheduleDays
        .map((s) => s.dayOfWeek)
        .sort((a, b) => a - b)
        .join(",");
      const dueToday =
        todayDow != null && h.scheduleDays.some((s) => s.dayOfWeek === todayDow)
          ? " due-today"
          : "";
      return `  - ${h.name} | min: ${h.minimumVersion}${h.idealVersion ? ` | ideal: ${h.idealVersion}` : ""} | days: [${dows}]${dueToday}`;
    }),
    "Habit logs (last 14 days, MIN/IDEAL/SKIPPED only):",
    ...habits.map((h) => {
      const logs = habitLogs
        .filter((l) => l.habitId === h.id && l.status !== "NONE")
        .map((l) => `${l.date}:${l.status}`);
      return `  ${h.name}: ${logs.length ? logs.join(" ") : "(none)"}`;
    }),
  );

  const topTraits = identity.traits
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  const retentionBlock = lines(
    "Retention state:",
    "Top traits:",
    topTraits.length
      ? topTraits
          .map(
            (t) =>
              `  - ${AXIS_LABELS[t.axis] ?? t.axis}: level ${t.level}, 30-day delta ${signed(t.delta30d)}`,
          )
          .join("\n")
      : "  (none)",
    `Active titles: ${
      identity.activeTitles.length
        ? identity.activeTitles.map((t) => t.name).join(", ")
        : "(none)"
    }`,
    `Current season: rank ${season.rank} (${season.tier.name}), day ${season.progress.daysIn}/${season.progress.totalDays}`,
    "Active quests:",
    activeQuests.length
      ? activeQuests
          .map((q) => `  - ${q.name}: ${q.description}`)
          .join("\n")
      : "  (none)",
    "Recently dismissed insights:",
    dismissedInsights.length
      ? dismissedInsights
          .map((i) => `  - ${i.slug}: ${compactJson(i.payload)}`)
          .join("\n")
      : "  (none)",
  );

  return [
    userBlock,
    weekBlock,
    dayPlanBlock,
    tasksBlock,
    habitsBlock,
    retentionBlock,
  ].join("\n\n");
}
