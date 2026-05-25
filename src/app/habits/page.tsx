import { Flame } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { HabitCard, type HabitCardData } from "@/components/habits/HabitCard";
import { peakTierFor } from "@/lib/retention/evaluate-streaks";
import { NewHabitButton } from "@/components/habits/NewHabitButton";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";
import { addDays, getWeekStart, todayKey } from "@/lib/dates";
import { computeStreaks } from "@/lib/habits/streaks";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import type { HabitLogStatus } from "@/lib/validators/week";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const weekStart = getWeekStart(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (!user) {
    return (
      <>
        <Topbar title="Habits" />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      scheduleDays: true,
      logs: {
        where: {
          date: {
            gte: addDays(today, -365),
            lte: today,
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  const cards: HabitCardData[] = await Promise.all(
    habits.map(async (h) => {
      const scheduledDays = h.scheduleDays
        .map((s) => s.dayOfWeek)
        .sort((a, b) => a - b);
      const allLogs = h.logs.map((l) => ({
        date: l.date,
        status: l.status as HabitLogStatus,
      }));
      const { current, best } = computeStreaks({
        scheduledDays,
        logs: allLogs,
        todayDate: today,
      });
      const weekLogs = allLogs.filter(
        (l) => l.date >= weekStart && l.date <= weekDates[6],
      );
      const peakTier = await peakTierFor(user.id, h.id);
      return {
        habitId: h.id,
        name: h.name,
        category: h.category,
        minimumVersion: h.minimumVersion,
        idealVersion: h.idealVersion,
        anchor: h.anchor,
        difficulty: h.difficulty,
        axis: h.axis,
        active: h.active,
        scheduleDays: scheduledDays,
        current,
        best,
        peakTier,
        weekDates,
        weekLogs,
      };
    }),
  );

  const activeCount = cards.filter((c) => c.active).length;

  return (
    <>
      <Topbar
        title="Habits"
        subtitle={`${activeCount} active habit${activeCount === 1 ? "" : "s"}`}
      />
      <section className="px-8 py-6 grid gap-4 max-w-3xl">
        <NewHabitButton />
        {cards.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="No habits yet"
            body="Habits keep the week steady. Start with one."
          />
        ) : (
          <div className="grid gap-3">
            {cards.map((card) => (
              <HabitCard key={card.habitId} habit={card} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
