import Image from "next/image";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, ChapterRibbon } from "@/components/ui";
import { RecapPrintButton } from "@/components/recap/RecapPrintButton";
import { prisma } from "@/lib/db";
import { listRecapYears, loadRecap } from "@/lib/retention/recap";

export const dynamic = "force-dynamic";

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const params = await searchParams;
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return (
      <>
        <Topbar title="The year so far" />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const years = await listRecapYears(user.id);
  const requested = params.y ? Number(params.y) : years[0];
  const year = years.includes(requested) ? requested : years[0];
  const { stats, headline, narrative } = await loadRecap(user.id, year);

  return (
    <>
      <Topbar
        title="The year so far"
        subtitle={
          stats.inProgress ? `${year} — in progress` : `${year} — complete`
        }
        actions={<RecapPrintButton />}
        showQuickActions={false}
      />
      <section className="recap-section px-9 grid gap-[18px] max-w-[920px]">
        {years.length > 1 ? (
          <nav className="flex flex-wrap gap-1 recap-hide-print">
            {years.map((y) => {
              const active = y === year;
              return (
                <Link
                  key={y}
                  href={`/recap?y=${y}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    "px-3 py-[6px] rounded-full font-[var(--font-pixel)] text-[9px] tracking-[0.06em] border transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 " +
                    (active
                      ? "bg-ink-800 text-gold-500 border-ink-800"
                      : "border-cream-300 text-bark-600 hover:bg-cream-100 hover:text-ink-800")
                  }
                >
                  {y}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* Dramatic chapter card */}
        <Card
          variant="lifted"
          style={{
            padding: "28px 32px",
            background:
              "linear-gradient(135deg, #FFF4DC 0%, #FCEDC9 50%, #ECE0F2 100%)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="min-w-0">
              <ChapterRibbon>
                {headline.label}
                {stats.inProgress ? " · so far" : ""}
              </ChapterRibbon>
              <h2 className="font-[var(--font-display)] font-semibold text-[44px] text-ink-800 leading-[1.05] tracking-[-0.015em] my-3">
                {headline.value}
              </h2>
              <p className="font-[var(--font-display)] italic text-[16px] text-bark-600 max-w-[520px]">
                {narrative}
              </p>
            </div>
            <Image
              src="/lifeos/mascot-quill-cheer.svg"
              alt=""
              width={160}
              height={160}
            />
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BigNum value={stats.totalXp.toLocaleString()} label="Total XP" />
          <BigNum value={stats.activeDays.toLocaleString()} label="Active days" />
          <BigNum value={stats.habitLogs.toLocaleString()} label="Habit-days" />
          <BigNum value={String(stats.reviews)} label="Weekly reviews" />
        </div>

        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatBlock label="Big Rocks" value={String(stats.bigRocks)} />
            <StatBlock
              label="Surprise drops"
              value={`${stats.surpriseDrops} · +${stats.surpriseXp} XP`}
            />
            <StatBlock label="Titles earned" value={String(stats.titlesEarned)} />
            <StatBlock label="Quests completed" value={String(stats.questsCompleted)} />
            <StatBlock label="Peak season rank" value={String(stats.highestSeasonRank)} />
            {stats.longestStreakHabit ? (
              <StatBlock
                label="Longest streak"
                value={`${stats.longestStreakHabit.days}d`}
                hint={stats.longestStreakHabit.name}
              />
            ) : null}
            {stats.topWeekday ? (
              <StatBlock label="Strongest day" value={stats.topWeekday.label} />
            ) : null}
            {stats.topTrait ? (
              <StatBlock label="Top trait" value={stats.topTrait.label} />
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-[18px] items-center">
            <Image
              src="/lifeos/mascot-quill.svg"
              alt=""
              width={120}
              height={120}
            />
            <div>
              <div className="font-[var(--font-body)] font-bold text-[11.5px] uppercase tracking-[0.06em] text-bark-600 mb-2">
                Quill reads the year
              </div>
              <p className="font-[var(--font-display)] italic text-[17px] text-bark-700 leading-[1.55]">
                {narrative}
              </p>
            </div>
          </div>
        </Card>

        <p className="recap-hide-print text-[12px] italic text-bark-500 text-center">
          <Printer className="inline h-3 w-3 mr-1" />
          Use the print button above to save a clean PDF — designed to be
          screenshot-worthy.
        </p>
      </section>
    </>
  );
}

function BigNum({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ textAlign: "center" }}>
      <div className="font-[var(--font-display)] font-semibold text-[64px] text-ink-800 leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      <div className="font-[var(--font-body)] font-semibold text-[13px] text-bark-500 uppercase tracking-[0.04em] mt-2">
        {label}
      </div>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="font-[var(--font-pixel)] text-[8px] uppercase tracking-[0.06em] text-bark-500">
        {label}
      </span>
      <span className="font-[var(--font-display)] font-semibold text-[20px] text-ink-800 tabular-nums leading-none">
        {value}
      </span>
      {hint ? (
        <span className="text-[12px] text-bark-500 italic font-[var(--font-display)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
