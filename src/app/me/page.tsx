import Image from "next/image";
import Link from "next/link";
import type { TraitAxis } from "@prisma/client";
import { BarChart3, CalendarCheck, Layers, User } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { PastSeasons } from "@/components/identity/PastSeasons";
import { QuestList } from "@/components/identity/QuestList";
import { SeasonCard } from "@/components/identity/SeasonCard";
import { TraitList } from "@/components/identity/TraitList";
import { TraitRadar } from "@/components/identity/TraitRadar";
import {
  Card,
  EmptyState,
  Pill,
  SectionHeading,
  XpBar,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { loadIdentity } from "@/lib/retention/queries";
import { loadProgress } from "@/lib/progress/queries";
import { loadQuests, evaluateQuests } from "@/lib/retention/quests";
import { getWeekDailyRockStats } from "@/lib/rocks/queries";
import { currentSeasonView, pastSeasons } from "@/lib/retention/seasons";
import { levelFromXp } from "@/lib/xp";

export const dynamic = "force-dynamic";

/**
 * Consolidated /me tab (spec §11). Replaces /progress + /identity + /recap as
 * sidebar entries. Each old route stays reachable as a deep link until Phase 1.7.
 *
 * Sections:
 *   1. Hero header (title + level + XP bar + season day)
 *   2. Trait radar (5 axes) + horizontal level list — no class names
 *   3. This week summary — uses placeholders for WeekRock/DailyRock stats (Phase 1.2)
 *   4. This season — chapter ribbon + active quests
 *   5. Past seasons (collapsed)
 *   6. Sunday review entry
 *
 * Cut per spec: HP/MP rails, status effects, Limit Break banner, XP event feed,
 * title history, class names (Disciplinarian etc.), bonus event lists.
 */
const AXIS_ORDER: TraitAxis[] = [
  "DISCIPLINE",
  "FOCUS",
  "AUDACITY",
  "CRAFT",
  "RECOVERY",
];

export default async function MePage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return (
      <>
        <Topbar title="Me" />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  await evaluateQuests(user.id);

  const [identity, progress, season, past, quests, profile, rockStats] = await Promise.all([
    loadIdentity(user.id),
    loadProgress(user.id, user.timezone),
    currentSeasonView(user.id),
    pastSeasons(user.id),
    loadQuests(user.id),
    prisma.gameProfile.findUnique({ where: { userId: user.id } }),
    getWeekDailyRockStats(user.id, user.timezone),
  ]);

  // weeklyXp is not in loadProgress's return shape — compute inline (Phase 1.2 will
  // expose this via WeekRock/DailyRock stats; for now we aggregate xpEvents directly).
  const weeklyXpEvents = await prisma.xpEvent.findMany({
    where: {
      userId: user.id,
      date: { gte: progress.weekStart, lte: progress.weekEnd },
    },
    select: { amount: true },
  });
  const weeklyXp = weeklyXpEvents.reduce((sum, e) => sum + e.amount, 0);

  const anyTraitNonZero = identity.traits.some((t) => t.value > 0);
  const xp = profile?.xp ?? 0;
  const { level, intoLevel, toNext } = levelFromXp(xp);
  const traitByAxis = new Map(identity.traits.map((t) => [t.axis, t]));

  return (
    <>
      <Topbar
        title="Me"
        subtitle="Who you&rsquo;re becoming."
        actions={
          <Pill tone="xp">
            LV {level} · {intoLevel}/{toNext} XP
          </Pill>
        }
      />
      <section className="px-9 grid gap-4 max-w-[920px]">

        {/* Section 1: Hero header */}
        {identity.headline ? (
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center rounded-md border border-cream-200 border-l-[5px] border-l-coral-500 px-6 py-[22px] bg-coral-100">
            <div>
              <div className="font-[var(--font-pixel)] text-[8px] text-[#A8412B] tracking-[0.08em]">
                ★ CURRENT TITLE
              </div>
              <h2 className="font-[var(--font-display)] font-semibold text-[36px] text-ink-800 mt-2 tracking-[-0.01em] leading-tight">
                {identity.headline.title.name}
              </h2>
              <p className="font-[var(--font-display)] italic text-[16px] text-bark-600 mt-2 max-w-[540px]">
                {identity.headline.tagline}
              </p>
              <div className="mt-3">
                <XpBar value={toNext > 0 ? intoLevel / toNext : 0} size="lg" />
                <div className="flex justify-between items-center mt-1 text-[11px] text-bark-500">
                  <span>LV {level}</span>
                  <span className="font-[var(--font-mono)] tabular-nums">
                    {intoLevel} / {toNext}
                  </span>
                  <span>LV {level + 1}</span>
                </div>
              </div>
              <div className="mt-2 text-[12px] text-bark-500">
                Season day {season.progress.daysIn}
              </div>
            </div>
            <Image
              src="/lifeos/mascot-quill.svg"
              alt=""
              width={120}
              height={120}
            />
          </div>
        ) : (
          <Card>
            <EmptyState
              mascot="default"
              title="No title yet"
              body="Titles emerge from your pattern. Log habits, hit ideals, complete reviews — the first title will land soon."
            />
          </Card>
        )}

        {/* Section 2: Trait radar + horizontal level list (no class names) */}
        <Card>
          <SectionHeading
            icon={BarChart3}
            action={
              <span className="font-[var(--font-pixel)] text-[8px] text-bark-500">
                5 AXES
              </span>
            }
          >
            Traits
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6 items-center mt-2">
            <div className="flex justify-center">
              {anyTraitNonZero ? (
                <TraitRadar traits={identity.traits} />
              ) : (
                <div className="aspect-square w-full max-w-[240px] flex items-center justify-center text-bark-500 text-[14px] text-center px-4">
                  Trait radar fills as you log activity.
                </div>
              )}
            </div>
            <TraitList traits={identity.traits} />
          </div>
        </Card>

        {/* Section 2b: Horizontal trait level list (trait names, no class names) */}
        <Card>
          <SectionHeading icon={Layers}>Trait levels</SectionHeading>
          <div className="grid grid-cols-5 gap-[10px] mt-2">
            {AXIS_ORDER.map((axis) => {
              const t = traitByAxis.get(axis);
              const fraction =
                t && t.toNext > 0 ? t.intoLevel / (t.intoLevel + t.toNext) : 0;
              return (
                <div
                  key={axis}
                  className="flex flex-col items-center gap-1 p-[10px_6px] rounded-[10px] bg-cream-50 border border-cream-200"
                >
                  <div className="font-bold text-[11.5px] text-bark-700 capitalize">
                    {axis.toLowerCase()}
                  </div>
                  <div className="font-[var(--font-pixel)] text-[7px] text-bark-600 tracking-[0.06em]">
                    LV {t?.level ?? 0}
                  </div>
                  <XpBar value={fraction} size="mini" className="w-full" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Section 3: This week summary — WeekRock/DailyRock stats are placeholders (Phase 1.2) */}
        <Card>
          <SectionHeading icon={CalendarCheck}>This week</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <SummaryStat label="Daily rocks done" value={`${rockStats.done}/${rockStats.total}`} />
            <SummaryStat
              label="Habits completed"
              value={`${progress.consistencyDone}/${progress.consistencyTotal}`}
            />
            <SummaryStat label="Current streak" value={`${progress.currentStreak}d`} />
            <SummaryStat label="XP this week" value={weeklyXp.toLocaleString()} />
          </div>
        </Card>

        {/* Section 4: This season — chapter ribbon + active quests */}
        <SeasonCard
          season={season.season}
          rank={season.rank}
          tier={season.tier}
          nextTier={season.nextTier}
          rankIntoTier={season.rankIntoTier}
          rankToNextTier={season.rankToNextTier}
          progress={season.progress}
          highestRankEver={season.highestRankEver}
        />

        <Card>
          <QuestList
            active={quests.active}
            hidden={quests.hidden}
            completed={quests.completed}
          />
        </Card>

        {/* Section 5: Past seasons (collapsed) */}
        {past.length > 0 ? (
          <Card>
            <details>
              <summary className="cursor-pointer font-[var(--font-display)] font-semibold text-[18px] text-ink-800 select-none">
                Past seasons
              </summary>
              <div className="mt-3">
                <PastSeasons seasons={past} />
              </div>
            </details>
          </Card>
        ) : null}

        {/* Section 6: Sunday review entry */}
        <Card>
          <SectionHeading icon={User}>Sunday review</SectionHeading>
          <p className="text-[13.5px] text-bark-600 mt-2">
            Set next week&rsquo;s Big Rock, reflect on the week, log the weekly review.
          </p>
          <Link
            href="/review"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md bg-coral-500 text-white font-semibold text-[13px] hover:bg-coral-600 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40"
          >
            Start review
          </Link>
        </Card>
      </section>
    </>
  );
}

function SummaryStat({
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
      <span className="font-[var(--font-display)] font-semibold text-[24px] text-ink-800 tabular-nums leading-none">
        {value}
      </span>
      {hint ? (
        <span className="text-[11px] text-bark-500 italic">{hint}</span>
      ) : null}
    </div>
  );
}
