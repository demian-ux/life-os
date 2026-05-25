import type { TraitAxis, Title } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { TITLES, type TitleSlug } from "./titles";
import { traitLevelProgress } from "./trait-map";

const AXES: TraitAxis[] = [
  "DISCIPLINE",
  "AUDACITY",
  "RECOVERY",
  "FOCUS",
  "CRAFT",
];

// Rarest first — headline title is whichever is rarest among the active set.
const TITLE_PRIORITY: TitleSlug[] = [
  "polymath",
  "recovery-champion",
  "deep-worker",
  "consistent-builder",
  "strategic-thinker",
  "quiet-builder",
];

export type TraitView = {
  axis: TraitAxis;
  value: number;
  level: number;
  intoLevel: number;
  toNext: number;
  delta30d: number;
  pctChange30d: number | null;
};

export type IdentityView = {
  traits: TraitView[];
  topAxis: TraitAxis | null;
  activeTitles: Array<Title & { tagline: string }>;
  headline: { title: Title; tagline: string } | null;
  earnedHistory: Array<Title & { tagline: string }>;
};

export async function loadIdentity(userId: string): Promise<IdentityView> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const thirtyDaysAgo = addDays(today, -29);

  const [traitRows, recentEvents, titles] = await Promise.all([
    prisma.trait.findMany({ where: { userId } }),
    prisma.traitEvent.findMany({
      where: { userId, date: { gte: thirtyDaysAgo, lte: today } },
      select: { axis: true, delta: true },
    }),
    prisma.title.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const valueByAxis = new Map<TraitAxis, number>(AXES.map((a) => [a, 0]));
  for (const row of traitRows) valueByAxis.set(row.axis, row.value);

  const delta30By = new Map<TraitAxis, number>(AXES.map((a) => [a, 0]));
  for (const e of recentEvents) {
    delta30By.set(e.axis, (delta30By.get(e.axis) ?? 0) + e.delta);
  }

  const traits: TraitView[] = AXES.map((axis) => {
    const value = valueByAxis.get(axis) ?? 0;
    const delta30d = delta30By.get(axis) ?? 0;
    const valuePrior = value - delta30d;
    const pctChange30d = valuePrior > 0 ? delta30d / valuePrior : null;
    const { level, intoLevel, toNext } = traitLevelProgress(value);
    return { axis, value, level, intoLevel, toNext, delta30d, pctChange30d };
  });

  let topAxis: TraitAxis | null = null;
  let topValue = 0;
  for (const t of traits) {
    if (t.value > topValue) {
      topValue = t.value;
      topAxis = t.axis;
    }
  }

  const activeTitles = titles
    .filter((t) => t.active)
    .map((t) => ({ ...t, tagline: TITLES[t.slug as TitleSlug]?.tagline ?? "" }));

  const earnedHistory = titles.map((t) => ({
    ...t,
    tagline: TITLES[t.slug as TitleSlug]?.tagline ?? "",
  }));

  let headline: { title: Title; tagline: string } | null = null;
  for (const slug of TITLE_PRIORITY) {
    const found = activeTitles.find((t) => t.slug === slug);
    if (found) {
      headline = { title: found, tagline: found.tagline };
      break;
    }
  }

  return { traits, topAxis, activeTitles, headline, earnedHistory };
}

/**
 * For "current streak — your best 3-week stretch yet" type framing.
 * Returns a short comparator string, or null if there isn't enough history.
 */
export function describeStreakContext(
  current: number,
  best: number,
): string | null {
  if (current === 0) return null;
  if (current === best && current >= 3) return "your longest stretch yet";
  if (best > 0 && current >= best * 0.7) return `${best - current} from your best`;
  return null;
}

/**
 * Returns this week's consistency % alongside a comparison string against
 * the trailing 4 completed weeks.
 */
export async function weekConsistencyVsTrailing(
  userId: string,
  currentWeekStart: string,
  currentPct: number,
): Promise<{ trailingAvg: number | null; comparison: string | null }> {
  const lookbackStart = addDays(currentWeekStart, -28);
  const lookbackEnd = addDays(currentWeekStart, -1);

  const [scheduleDays, logs] = await Promise.all([
    prisma.habitScheduleDay.findMany({
      where: { habit: { userId, active: true } },
      select: { habitId: true, dayOfWeek: true },
    }),
    prisma.habitLog.findMany({
      where: {
        habit: { userId, active: true },
        date: { gte: lookbackStart, lte: lookbackEnd },
        status: { in: ["MINIMUM", "IDEAL"] },
      },
    }),
  ]);

  const scheduleByHabit = new Map<string, Set<number>>();
  for (const s of scheduleDays) {
    const set = scheduleByHabit.get(s.habitId) ?? new Set<number>();
    set.add(s.dayOfWeek);
    scheduleByHabit.set(s.habitId, set);
  }

  const logSet = new Set(logs.map((l) => `${l.habitId}|${l.date}`));

  let scheduled = 0;
  let done = 0;
  for (let offset = 0; offset < 28; offset += 1) {
    const date = addDays(lookbackStart, offset);
    const dow = isoWeekday(date);
    for (const [habitId, days] of scheduleByHabit) {
      if (!days.has(dow)) continue;
      scheduled += 1;
      if (logSet.has(`${habitId}|${date}`)) done += 1;
    }
  }

  if (scheduled === 0) return { trailingAvg: null, comparison: null };
  const trailingAvg = Math.round((done / scheduled) * 100);

  let comparison: string | null = null;
  const diff = currentPct - trailingAvg;
  if (Math.abs(diff) >= 5) {
    comparison =
      diff > 0
        ? `${diff} points above your 4-week average`
        : `${Math.abs(diff)} points below your 4-week average`;
  } else if (trailingAvg > 0) {
    comparison = `in line with your 4-week average`;
  }

  return { trailingAvg, comparison };
}

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}
