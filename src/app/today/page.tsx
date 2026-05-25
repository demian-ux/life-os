import { Topbar } from "@/components/layout/Topbar";
import { Card, Pill, SectionHeading } from "@/components/ui";
import { InsightCard } from "@/components/today/InsightCard";
import { ActiveQuestStrip } from "@/components/today/ActiveQuestStrip";
import { StatusEffectsStrip } from "@/components/today/StatusEffectsStrip";
import { detectInsights, nextInsight } from "@/lib/retention/insights";
import { loadIdentity } from "@/lib/retention/queries";
import { loadQuests } from "@/lib/retention/quests";
import { currentStreaksFor } from "@/lib/retention/habit-streaks";
import { getStatusEffects } from "@/lib/retention/status-effects";
import { QuickCaptureBar } from "@/components/tasks/QuickCaptureBar";
import { TaskList } from "@/components/tasks/TaskList";
import type { TaskRowData } from "@/components/tasks/TaskRow";
import { EnergyCheckIn } from "@/components/today/EnergyCheckIn";
import { NextActionCard } from "@/components/today/NextActionCard";
import { TodayBlocks } from "@/components/today/TodayBlocks";
import { TodayFocus } from "@/components/today/TodayFocus";
import { TodayHabits } from "@/components/today/TodayHabits";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDateLabel, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { levelFromXp } from "@/lib/xp";
import { ensureDayPlans, getOrCreateWeek } from "@/lib/week/queries";
import type {
  EnergyLevel,
  Priority,
  TaskStatus,
} from "@/lib/validators/task";
import type { HabitLogStatus } from "@/lib/validators/week";

export const dynamic = "force-dynamic";

const ISO_WEEKDAY: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

const PRIORITY_RANK: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function greetingFor(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Late evening";
}

function pixelDateStr(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

export default async function TodayPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  if (!user) {
    return (
      <>
        <Topbar title="Today" subtitle={formatDateLabel(today)} />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const week = await getOrCreateWeek(user.id, today);
  await ensureDayPlans(user.id, week.id, week.startDate);

  const dayPlan = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    include: { timeBlocks: { orderBy: { startTime: "asc" } } },
  });

  if (!dayPlan) {
    return (
      <>
        <Topbar title="Today" subtitle={formatDateLabel(today)} />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No day plan for today.
        </section>
      </>
    );
  }

  const isoWeekday = ISO_WEEKDAY[dayPlan.dayKey] ?? 1;

  const habitsRaw = await prisma.habit.findMany({
    where: {
      userId: user.id,
      active: true,
      scheduleDays: { some: { dayOfWeek: isoWeekday } },
    },
    orderBy: { name: "asc" },
  });
  const habitLogs = await prisma.habitLog.findMany({
    where: {
      date: today,
      habitId: { in: habitsRaw.map((h) => h.id) },
    },
  });
  const logByHabit = new Map(habitLogs.map((l) => [l.habitId, l.status]));

  const streakByHabit = await currentStreaksFor(
    habitsRaw.map((h) => h.id),
    today,
  );

  const habits = habitsRaw.map((h) => ({
    id: h.id,
    name: h.name,
    axis: h.axis,
    minimumVersion: h.minimumVersion,
    idealVersion: h.idealVersion,
    anchor: h.anchor,
    currentStreak: streakByHabit.get(h.id) ?? 0,
    status: ((logByHabit.get(h.id) as HabitLogStatus | undefined) ?? "NONE") as
      | HabitLogStatus,
  }));

  const todayTasksRaw = await prisma.task.findMany({
    where: {
      userId: user.id,
      scheduledDate: today,
      status: { not: "DONE" },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const completedTodayCount = await prisma.task.count({
    where: {
      userId: user.id,
      scheduledDate: today,
      status: "DONE",
    },
  });

  const todayTasks: TaskRowData[] = todayTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status as TaskStatus,
    priority: t.priority as Priority,
    energy: t.energy as EnergyLevel,
    estimatedMinutes: t.estimatedMinutes,
    dueDate: t.dueDate,
    scheduledDate: t.scheduledDate,
  }));

  const dayEnergy = (dayPlan.energy as EnergyLevel | null) ?? null;

  const nextAction = pickNextAction({
    tasks: todayTasks,
    blocks: dayPlan.timeBlocks.map((b) => ({
      id: b.id,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
    })),
    habits,
    dayEnergy,
  });

  await detectInsights(user.id);
  const [identity, quests, insight, profile, statusEffects] = await Promise.all([
    loadIdentity(user.id),
    loadQuests(user.id),
    nextInsight(user.id),
    prisma.gameProfile.findUnique({ where: { userId: user.id } }),
    getStatusEffects(user.id),
  ]);
  const activeQuest = quests.active[0] ?? null;

  const xp = profile?.xp ?? 0;
  const { level, intoLevel, toNext } = levelFromXp(xp);

  const greetingHour = new Date().getHours();

  return (
    <>
      <Topbar
        dateStr={pixelDateStr(today)}
        title={
          <>
            {greetingFor(greetingHour)},{" "}
            <em className="text-coral-500 not-italic">{user.name}</em>.
          </>
        }
        subtitle={identity.headline ? `${identity.headline.title.name}.` : undefined}
        actions={
          <Pill tone="xp">
            LV {level} · {intoLevel}/{toNext} XP
          </Pill>
        }
      />
      <section className="px-9 grid gap-[14px] max-w-[760px]">
        <StatusEffectsStrip effects={statusEffects} />
        {insight ? (
          <InsightCard id={insight.id} message={insight.message} />
        ) : null}
        <NextActionCard
          title={nextAction.title}
          detail={nextAction.detail}
          source={nextAction.source}
        />
        <TodayFocus
          dayPlanId={dayPlan.id}
          initialFocus={dayPlan.focus ?? ""}
        />
        <EnergyCheckIn dayPlanId={dayPlan.id} energy={dayEnergy} />
        <TodayBlocks
          blocks={dayPlan.timeBlocks.map((b) => ({
            id: b.id,
            title: b.title,
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
          }))}
        />
        <Card>
          <SectionHeading
            icon={ListChecks}
            action={
              <span className="font-[var(--font-mono)] text-[11px] text-bark-500 tabular-nums">
                {todayTasks.length} open · {completedTodayCount} done
              </span>
            }
          >
            Today&apos;s tasks
          </SectionHeading>
          <TaskList
            tasks={todayTasks}
            todayDate={today}
            emptyMessage="No tasks for today. Add one with quick capture below."
          />
        </Card>
        <TodayHabits habits={habits} date={today} />
        {activeQuest ? (
          <ActiveQuestStrip
            quest={{
              id: activeQuest.id,
              name: activeQuest.name,
              description: activeQuest.description,
              // Quest model doesn't track granular progress; use a soft halfway
              // placeholder so the strip still renders a useful visual bar.
              progress: 0.5,
            }}
          />
        ) : null}
        <QuickCaptureBar source="today" placeholder="Quick capture: a task on your mind..." />
      </section>
    </>
  );
}

type Block = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
};

function pickNextAction({
  tasks,
  blocks,
  habits,
  dayEnergy,
}: {
  tasks: TaskRowData[];
  blocks: Block[];
  habits: { name: string; status: HabitLogStatus; minimumVersion: string }[];
  dayEnergy: EnergyLevel | null;
}): {
  title: string;
  detail: string | null;
  source: "task" | "block" | "habit" | "empty";
} {
  const openTasks = tasks.filter((t) => t.status !== "DONE");
  if (openTasks.length > 0) {
    const matchEnergy = dayEnergy
      ? openTasks.find((t) => t.energy === dayEnergy)
      : null;
    const candidates = matchEnergy ? [matchEnergy] : openTasks;
    const top = candidates.reduce((best, t) =>
      PRIORITY_RANK[t.priority] > PRIORITY_RANK[best.priority] ? t : best,
    );
    return {
      title: top.title,
      detail: top.estimatedMinutes ? `~${top.estimatedMinutes} min` : null,
      source: "task",
    };
  }

  const openBlock = blocks.find((b) => b.status !== "DONE");
  if (openBlock) {
    return {
      title: openBlock.title,
      detail: `${openBlock.startTime} - ${openBlock.endTime}`,
      source: "block",
    };
  }

  const undoneHabit = habits.find(
    (h) => h.status === "NONE" || h.status === "MINIMUM",
  );
  if (undoneHabit) {
    return {
      title: undoneHabit.name,
      detail: `Minimum: ${undoneHabit.minimumVersion}`,
      source: "habit",
    };
  }

  return {
    title: "Take a break — today's plan is clear.",
    detail: null,
    source: "empty",
  };
}
