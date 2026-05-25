import { Topbar } from "@/components/layout/Topbar";
import { BigRockCard } from "@/components/week/BigRockCard";
import { DayAccordion } from "@/components/week/DayAccordion";
import { HabitWeekTable } from "@/components/week/HabitWeekTable";
import { StartNewWeekButton } from "@/components/week/StartNewWeekButton";
import { WeeklyReflection } from "@/components/week/WeeklyReflection";
import { WeeklyTargets } from "@/components/week/WeeklyTargets";
import { prisma } from "@/lib/db";
import { addDays, formatDateLabel, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { loadWeekData } from "@/lib/week/queries";
import type { HabitLogStatus, TimeBlockCategory } from "@/lib/validators/week";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);

  if (!user) {
    return (
      <>
        <Topbar title="Week" />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> to create the default user.
        </section>
      </>
    );
  }

  const { week, habits, habitLogs } = await loadWeekData(user.id, today);
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(week.startDate, i),
  );

  return (
    <>
      <Topbar
        title="Week"
        subtitle={`${formatDateLabel(week.startDate)} → ${formatDateLabel(week.endDate)}`}
        actions={
          <StartNewWeekButton userId={user.id} fromStartDate={week.startDate} />
        }
      />
      <section className="px-8 py-8 grid gap-5 max-w-4xl">
        <BigRockCard
          weekId={week.id}
          initialBigRock={week.bigRock ?? ""}
          targetsDone={week.targets.filter((t) => t.status === "DONE").length}
          targetsTotal={week.targets.length}
        />
        <WeeklyTargets
          weekId={week.id}
          targets={week.targets.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
          }))}
        />
        <DayAccordion
          dayPlans={week.dayPlans.map((d) => ({
            id: d.id,
            date: d.date,
            dayKey: d.dayKey,
            label: d.label,
            focus: d.focus,
            timeBlocks: d.timeBlocks.map((b) => ({
              id: b.id,
              title: b.title,
              startTime: b.startTime,
              endTime: b.endTime,
              category: b.category as TimeBlockCategory,
              status: b.status,
            })),
          }))}
          todayDate={today}
        />
        <HabitWeekTable
          habits={habits.map((h) => ({
            id: h.id,
            name: h.name,
            axis: h.axis,
            scheduleDays: h.scheduleDays.map((s) => ({
              dayOfWeek: s.dayOfWeek,
            })),
          }))}
          habitLogs={habitLogs.map((log) => ({
            habitId: log.habitId,
            date: log.date,
            status: log.status as HabitLogStatus,
          }))}
          weekDates={weekDates}
          todayDate={today}
        />
        <WeeklyReflection
          weekId={week.id}
          initialReflection={week.reflection ?? ""}
        />
      </section>
    </>
  );
}
