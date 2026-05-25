import Image from "next/image";
import type { TraitAxis } from "@prisma/client";
import { BarChart3, Crown, Layers, User } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { PastSeasons } from "@/components/identity/PastSeasons";
import { QuestList } from "@/components/identity/QuestList";
import { SeasonCard } from "@/components/identity/SeasonCard";
import { TitleHistory } from "@/components/identity/TitleHistory";
import { TraitList } from "@/components/identity/TraitList";
import { TraitRadar } from "@/components/identity/TraitRadar";
import {
  Card,
  EmptyState,
  Pill,
  SectionHeading,
  Sigil,
  XpBar,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { loadIdentity } from "@/lib/retention/queries";
import { loadQuests, evaluateQuests } from "@/lib/retention/quests";
import { currentSeasonView, pastSeasons } from "@/lib/retention/seasons";
import { classFromAxis } from "@/lib/retention/class-axis";
import { levelFromXp } from "@/lib/xp";

export const dynamic = "force-dynamic";

const AXIS_ORDER: TraitAxis[] = [
  "DISCIPLINE",
  "FOCUS",
  "AUDACITY",
  "CRAFT",
  "RECOVERY",
];

export default async function IdentityPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return (
      <>
        <Topbar title="Identity" />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  await evaluateQuests(user.id);

  const [identity, season, past, quests, profile] = await Promise.all([
    loadIdentity(user.id),
    currentSeasonView(user.id),
    pastSeasons(user.id),
    loadQuests(user.id),
    prisma.gameProfile.findUnique({ where: { userId: user.id } }),
  ]);
  const anyTraitNonZero = identity.traits.some((t) => t.value > 0);

  const xp = profile?.xp ?? 0;
  const { level, intoLevel, toNext } = levelFromXp(xp);

  const traitByAxis = new Map(identity.traits.map((t) => [t.axis, t]));
  const classes = AXIS_ORDER.map((axis) => {
    const t = traitByAxis.get(axis);
    return {
      key: classFromAxis(axis),
      axis,
      level: t?.level ?? 0,
      fraction: t && t.toNext > 0 ? t.intoLevel / (t.intoLevel + t.toNext) : 0,
    };
  });

  return (
    <>
      <Topbar
        title="Identity"
        subtitle="Who you&rsquo;re becoming, on five axes."
        actions={
          <>
            <Pill tone="xp">
              LV {level} · {intoLevel}/{toNext} XP
            </Pill>
            <a
              href="/recap"
              className="text-[12px] text-bark-600 hover:text-ink-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded px-1"
            >
              See your year →
            </a>
          </>
        }
      />
      <section className="px-9 grid gap-4 max-w-[920px]">
        {identity.headline ? (
          <div
            className="grid grid-cols-[1fr_auto] gap-4 items-center rounded-md border border-cream-200 border-l-[5px] border-l-coral-500 px-6 py-[22px] bg-coral-100"
          >
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

        <Card>
          <SectionHeading icon={Layers}>Class levels</SectionHeading>
          <div className="grid grid-cols-5 gap-[10px] mt-2">
            {classes.map((c) => (
              <div
                key={c.key}
                className="flex flex-col items-center gap-1 p-[10px_6px] rounded-[10px] bg-cream-50 border border-cream-200"
              >
                <Sigil classKey={c.key} size={40} />
                <div className="font-bold text-[11.5px] text-bark-700 capitalize">
                  {c.key}
                </div>
                <div className="font-[var(--font-pixel)] text-[7px] text-bark-600 tracking-[0.06em]">
                  LV {c.level}
                </div>
                <XpBar value={c.fraction} size="mini" className="w-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading
            icon={BarChart3}
            action={
              <span className="font-[var(--font-pixel)] text-[8px] text-bark-500">
                5 AXES
              </span>
            }
          >
            Trait stats
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

        <Card>
          <SectionHeading icon={Crown}>Title history</SectionHeading>
          <div className="mt-2">
            <TitleHistory titles={identity.earnedHistory} />
          </div>
        </Card>

        {past.length > 0 ? (
          <Card>
            <SectionHeading icon={User}>Past seasons</SectionHeading>
            <div className="mt-2">
              <PastSeasons seasons={past} />
            </div>
          </Card>
        ) : null}
      </section>
    </>
  );
}
