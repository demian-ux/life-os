import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { HomeAIDrawerSlot } from "./HomeAIDrawerSlot";
import { prisma } from "@/lib/db";
import { WeekRockCard } from "@/components/rocks/WeekRockCard";
import { DayRockCard } from "@/components/rocks/DayRockCard";
import { getCurrentWeekRock, getTodayDailyRock } from "@/lib/rocks/queries";

export const dynamic = "force-dynamic";

/**
 * Phase 1.1 skeleton of the Home dashboard (spec §5).
 * All five zones are labeled placeholder stubs. Real mechanics:
 *   - Big Rock card     → Phase 1.2
 *   - Habits + Tasks    → Phase 1.3
 *   - Embedded GCal     → Phase 1.4
 *   - AI drawer         → Phase 1.5
 *   - Focus mode entry  → Phase 1.6
 */
export default async function HomePage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, timezone: true },
  });

  const [weekRock, dayRock] = user
    ? await Promise.all([
        getCurrentWeekRock(user.id, user.timezone),
        getTodayDailyRock(user.id, user.timezone),
      ])
    : [null, null];

  return (
    <>
      <Topbar
        title="Home"
        subtitle="Your unified workspace."
        actions={<HomeAIDrawerSlot />}
      />
      <section className="px-9 grid gap-4 max-w-[1200px]">
        {/* Zone 1: Big Rock card (week rock + day rock side-by-side) — Phase 1.2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeekRockCard rock={weekRock} />
          <DayRockCard rock={dayRock} weekRockId={weekRock?.id ?? null} />
        </div>

        {/* Zone 2: Embedded Google Calendar week strip — Phase 1.4 */}
        <Card>
          <div
            data-zone="gcal-embed"
            aria-label="Google Calendar embed placeholder"
            className="min-h-[320px] rounded-md border border-dashed border-cream-300 flex items-center justify-center text-bark-500 text-[13px]"
          >
            <div className="text-center">
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Google Calendar — Phase 1.4
              </div>
              Iframe embed lands here.
            </div>
          </div>
        </Card>

        {/* Zone 3+4: Habits row (left) + Today's tasks (right) — Phase 1.3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div
              data-zone="habits-row"
              aria-label="Morning habits row placeholder"
              className="min-h-[120px] rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]"
            >
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Morning Habits — Phase 1.3
              </div>
              Placeholder.
            </div>
          </Card>
          <Card>
            <div
              data-zone="today-tasks"
              aria-label="Today's tasks placeholder"
              className="min-h-[120px] rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]"
            >
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Today&rsquo;s Tasks — Phase 1.3
              </div>
              Placeholder.
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
