import { Topbar } from "@/components/layout/Topbar";
import { HomeAIDrawerContent } from "./HomeAIDrawerContent";
import { HomeAIDrawerSlot } from "./HomeAIDrawerSlot";
import { prisma } from "@/lib/db";
import { WeekRockCard } from "@/components/rocks/WeekRockCard";
import { DayRockCard } from "@/components/rocks/DayRockCard";
import { GoogleCalendarEmbed } from "@/components/home/GoogleCalendarEmbed";
import { HomeHabitsRow } from "@/components/home/HomeHabitsRow";
import { HomeTasksRow } from "@/components/home/HomeTasksRow";
import { getCurrentWeekRock, getTodayDailyRock } from "@/lib/rocks/queries";
import { getTodayHabits, getTodayTasks } from "@/lib/habits/today-queries";
import { getGcalEmbedUrl } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

/**
 * Home dashboard (spec §5).
 *   - Big Rock card     ✓ Phase 1.2
 *   - Habits + Tasks    ✓ Phase 1.3
 *   - Embedded GCal     → Phase 1.4
 *   - AI drawer         → Phase 1.5 (toggle stub shipped 1.1)
 *   - Focus mode entry  → Phase 1.6
 */
export default async function HomePage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, timezone: true, preferences: true },
  });
  const gcalEmbedUrl = user ? getGcalEmbedUrl(user.preferences) : null;

  const [weekRock, dayRock, habits, tasks] = user
    ? await Promise.all([
        getCurrentWeekRock(user.id, user.timezone),
        getTodayDailyRock(user.id, user.timezone),
        getTodayHabits(user.id, user.timezone),
        getTodayTasks(user.id, user.timezone),
      ])
    : [null, null, [], []];

  return (
    <>
      <Topbar
        title="Home"
        subtitle="Your unified workspace."
        actions={
          <HomeAIDrawerSlot>
            {user ? (
              <HomeAIDrawerContent
                userId={user.id}
                preferences={user.preferences}
              />
            ) : null}
          </HomeAIDrawerSlot>
        }
      />
      <section className="px-9 grid gap-4 max-w-[1200px]">
        {/* Zone 1: Big Rock card (week rock + day rock side-by-side) — Phase 1.2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeekRockCard rock={weekRock} />
          <DayRockCard rock={dayRock} weekRockId={weekRock?.id ?? null} />
        </div>

        {/* Zone 2: Embedded Google Calendar week strip — Phase 1.4 */}
        <GoogleCalendarEmbed embedUrl={gcalEmbedUrl} />

        {/* Zone 3+4: Habits row (left) + Today's tasks (right) — Phase 1.3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HomeHabitsRow habits={habits} />
          <HomeTasksRow tasks={tasks} />
        </div>
      </section>
    </>
  );
}
