import Image from "next/image";
import {
  BarChart3,
  CalendarCheck,
  Flame,
  Gift,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Card,
  ChapterRibbon,
  EmptyState,
  Pill,
  ProgressBar,
  SectionHeading,
  StatRail,
  TierBadge,
  XpBar,
} from "@/components/ui";
import { StatusEffectsStrip } from "@/components/today/StatusEffectsStrip";
import { prisma } from "@/lib/db";
import { loadProgress } from "@/lib/progress/queries";
import {
  describeStreakContext,
  weekConsistencyVsTrailing,
} from "@/lib/retention/queries";
import { getLimitBreakState } from "@/lib/retention/limit-break";
import { getStatusEffects } from "@/lib/retention/status-effects";
import { tierFor } from "@/lib/retention/streak-tiers";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  HABIT_MINIMUM: "Habit · minimum",
  HABIT_IDEAL: "Habit · ideal",
  TASK_DONE: "Task complete",
  DEEP_WORK_BLOCK_DONE: "Deep-work block",
  BIG_ROCK_DONE: "Big Rock target",
  WEEKLY_REVIEW_DONE: "Weekly review",
  CONSISTENCY_BONUS: "Consistency",
};

function labelForSource(source: string): string {
  const base = source.split(":")[0];
  return SOURCE_LABEL[base] ?? base;
}

export default async function ProgressPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return (
      <>
        <Topbar title="Progress" />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const data = await loadProgress(user.id, user.timezone);
  const [streakContext, consistencyContext, bonusEvents, statusEffects, limitBreak] =
    await Promise.all([
      Promise.resolve(describeStreakContext(data.currentStreak, data.bestStreak)),
      weekConsistencyVsTrailing(user.id, data.weekStart, data.consistencyPct),
      prisma.xpEvent.findMany({
        where: {
          userId: user.id,
          bonus: true,
          date: { gte: data.weekStart, lte: data.weekEnd },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, amount: true, note: true, source: true },
      }),
      getStatusEffects(user.id),
      getLimitBreakState(user.id, data.consistencyPct, data.weekStart),
    ]);
  const bonusTotal = bonusEvents.reduce((sum, e) => sum + e.amount, 0);

  const hp = data.consistencyPct;
  const hpMax = 100;
  const mp = data.consistencyDone;
  const mpMax = Math.max(data.consistencyTotal, 1);

  return (
    <>
      <Topbar
        title="Progress"
        subtitle="Calm, visible progress."
        actions={
          <Pill tone="xp">
            LV {data.level} · {data.intoLevel}/{data.toNext} XP
          </Pill>
        }
      />
      <section className="px-9 grid gap-4 max-w-[920px]">
        {/* Limit Break banner */}
        {limitBreak.ready ? (
          <div className="limit-break relative px-[18px] py-[16px] rounded-md border-[3px] border-ink-800 flex items-center gap-[14px] [background:linear-gradient(135deg,#FFF4DC_0%,#FCEDC9_40%,#ECE0F2_100%)] [box-shadow:0_4px_0_var(--ink-800),0_0_0_6px_rgba(197,140,217,0.18),0_0_32px_rgba(255,212,107,0.5)]">
            <span
              className="w-[44px] h-[44px] bg-ink-800 rounded-full flex items-center justify-center text-gold-500 shrink-0"
              style={{ animation: "bolt-pulse 1.4s ease-in-out infinite" }}
            >
              <Zap className="h-[22px] w-[22px]" />
            </span>
            <div className="flex-1">
              <div className="font-[var(--font-pixel)] text-[9px] text-[#5C3F73] tracking-[0.08em] mb-[4px]">
                LIMIT BREAK READY
              </div>
              <div className="font-[var(--font-display)] font-semibold text-[22px] text-ink-800 leading-tight">
                Every target met. The week kept its promise.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-[14px] py-[10px] bg-cream-100 border-[1.5px] border-dashed border-cream-300 rounded-[12px]">
            <Zap className="h-[14px] w-[14px] text-bark-500 shrink-0" />
            <span className="text-[13px] text-bark-600">
              <b>Limit Break</b> charges when all weekly targets are <b>DONE</b>,
              the review is saved, and habit consistency hits{" "}
              <b>{limitBreak.criteria.consistencyThreshold}%</b>. You&apos;re at{" "}
              {limitBreak.criteria.consistencyPct}% ·{" "}
              {limitBreak.criteria.targetsDone}/{limitBreak.criteria.targetsTotal} targets ·{" "}
              review {limitBreak.criteria.reviewSaved ? "saved" : "pending"}.
            </span>
          </div>
        )}

        {/* Status screen — avatar + rails */}
        <Card>
          <div className="grid grid-cols-[240px_1fr] gap-6 items-start">
            <div className="flex flex-col gap-[10px]">
              <div className="silhouette w-full aspect-square rounded-lg border-[1.5px] border-cream-300 flex items-center justify-center relative overflow-hidden [background:linear-gradient(180deg,var(--cream-100),var(--cream-200))]">
                <Image
                  src="/lifeos/mascot-quill.svg"
                  alt=""
                  width={180}
                  height={180}
                  className="w-[80%] h-[80%]"
                />
                <span className="absolute right-[10px] bottom-[10px] font-[var(--font-pixel)] text-[10px] bg-ink-800 text-gold-500 px-[9px] py-[6px] rounded-[6px] border-2 border-ink-800 [box-shadow:0_2px_0_var(--ink-800)]">
                  LV {data.level}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <ChapterRibbon>{`${data.weekStart} → ${data.weekEnd}`}</ChapterRibbon>

              <div>
                <div className="flex items-baseline justify-between mb-[6px]">
                  <SectionHeading>Experience</SectionHeading>
                  <span className="font-[var(--font-mono)] text-[13px] text-bark-700 font-semibold tabular-nums">
                    {data.xp.toLocaleString()} XP{" "}
                    <span className="text-bark-500">
                      · next at {data.nextLevelAt.toLocaleString()}
                    </span>
                  </span>
                </div>
                <XpBar value={data.toNext > 0 ? data.intoLevel / data.toNext : 0} size="lg" />
                <div className="flex justify-between items-center mt-1 text-[11px] text-bark-500">
                  <span>LV {data.level}</span>
                  <span className="font-[var(--font-mono)] tabular-nums">
                    {data.intoLevel} / {data.toNext}
                  </span>
                  <span>LV {data.level + 1}</span>
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <StatRail kind="hp" value={hp} max={hpMax} />
                <StatRail kind="mp" value={mp} max={mpMax} />
                <div className="text-[11.5px] text-bark-500 pl-[42px]">
                  HP = week consistency · MP = habit-days completed
                </div>
              </div>

              {statusEffects.length > 0 ? (
                <div>
                  <SectionHeading>Status effects</SectionHeading>
                  <div className="mt-2">
                    <StatusEffectsStrip effects={statusEffects} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <SectionHeading icon={Flame}>Habit streak</SectionHeading>
            <div className="grid grid-cols-2 gap-3 items-center mt-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <Flame className="h-[22px] w-[22px] text-coral-500 self-center" />
                  <span className="font-[var(--font-display)] font-semibold text-[38px] text-ink-800 tabular-nums leading-none">
                    {data.currentStreak}
                  </span>
                  <span className="text-[13px] text-bark-500">
                    best {data.bestStreak}
                  </span>
                </div>
                {streakContext ? (
                  <p className="font-[var(--font-display)] italic text-[13px] text-bark-600 mt-[6px]">
                    {streakContext}.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-center gap-[6px]">
                {tierFor(data.currentStreak) ? (
                  <TierBadge streak={data.currentStreak} />
                ) : null}
                <Image
                  src="/lifeos/mascot-quill-cheer.svg"
                  alt=""
                  width={84}
                  height={84}
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeading icon={CalendarCheck}>Week consistency</SectionHeading>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-[var(--font-display)] font-semibold text-[38px] text-ink-800 tabular-nums leading-none">
                {data.consistencyPct}%
              </span>
              <span className="font-[var(--font-mono)] text-[13px] text-bark-500 tabular-nums">
                {data.consistencyDone}/{data.consistencyTotal} habit-days
              </span>
            </div>
            {consistencyContext.comparison ? (
              <p className="font-[var(--font-display)] italic text-[13px] text-bark-600 mt-[6px]">
                {consistencyContext.comparison}.
              </p>
            ) : null}
          </Card>
        </div>

        <Card>
          <SectionHeading
            icon={Target}
            action={
              <span className="font-[var(--font-mono)] text-[11px] text-bark-500 tabular-nums">
                {data.bigRockDone}/{data.bigRockTotal} targets
              </span>
            }
          >
            Big Rock — week of {data.weekStart}
          </SectionHeading>
          <p className="font-semibold text-[15px] text-ink-800 mt-1">
            {data.bigRockTitle ?? (
              <span className="text-bark-500 font-normal italic">
                No Big Rock set this week.
              </span>
            )}
          </p>
          <ProgressBar
            value={data.bigRockPct / 100}
            tone="leaf"
            className="mt-3"
            aria-label="Big Rock progress"
          />
        </Card>

        {bonusEvents.length > 0 ? (
          <Card>
            <SectionHeading
              icon={Gift}
              action={
                <span className="font-[var(--font-pixel)] text-[9px] text-[color:var(--xp-500)] font-bold">
                  +{bonusTotal} XP
                </span>
              }
            >
              Surprise drops this week
            </SectionHeading>
            <ul className="flex flex-col gap-[10px] m-0 p-0 list-none text-[13.5px]">
              {bonusEvents.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-bark-600">{e.note ?? e.source}</span>
                  <span className="font-[var(--font-pixel)] text-[9px] text-[color:var(--xp-500)] font-bold tabular-nums shrink-0">
                    +{e.amount}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <SectionHeading icon={Sparkles}>Recent XP events</SectionHeading>
          {data.recentEvents.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No XP events yet"
              body="Complete a task, log a habit, or finish a deep-work block."
            />
          ) : (
            <ul className="flex flex-col gap-[10px] m-0 p-0 list-none mt-2">
              {data.recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-[10px] items-center text-[13.5px]"
                >
                  <span className="font-[var(--font-pixel)] text-[8px] text-bark-500 bg-cream-100 px-[6px] py-[3px] rounded-[4px] tracking-[0.04em] whitespace-nowrap">
                    {labelForSource(e.source)}
                  </span>
                  <span className="text-bark-700 truncate">
                    {e.note ?? <span className="text-bark-500">—</span>}
                  </span>
                  <span className="font-[var(--font-pixel)] text-[9px] text-[color:var(--xp-500)] font-bold tabular-nums shrink-0">
                    +{e.amount} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.streakRows.length > 0 ? (
          <Card>
            <SectionHeading icon={Flame}>Streaks per habit</SectionHeading>
            <ul className="flex flex-col gap-1 mt-2 m-0 p-0 list-none">
              {data.streakRows.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between text-[13.5px]"
                >
                  <span className="text-ink-800">{h.name}</span>
                  <span className="tabular-nums">
                    <span className="text-coral-500 mr-2">{h.current}</span>
                    <span className="text-bark-500">best {h.best}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </>
  );
}
