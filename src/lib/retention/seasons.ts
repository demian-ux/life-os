import type { Season } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, getWeekStart, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";

export const SEASON_LENGTH_DAYS = 28;
export const XP_PER_RANK = 100;

export type RankTier = {
  slug: "pebble" | "stone" | "boulder" | "mountain" | "peak";
  name: string;
  min: number;
  max: number | null; // null = open-ended
};

export const RANK_TIERS: RankTier[] = [
  { slug: "pebble", name: "Pebble", min: 0, max: 9 },
  { slug: "stone", name: "Stone", min: 10, max: 24 },
  { slug: "boulder", name: "Boulder", min: 25, max: 49 },
  { slug: "mountain", name: "Mountain", min: 50, max: 99 },
  { slug: "peak", name: "Peak", min: 100, max: null },
];

export function rankTierFor(rank: number): RankTier {
  const safe = Math.max(0, rank);
  let last = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (safe >= t.min) last = t;
    else break;
  }
  return last;
}

export function nextRankTier(tier: RankTier): RankTier | null {
  const idx = RANK_TIERS.findIndex((t) => t.slug === tier.slug);
  if (idx < 0 || idx === RANK_TIERS.length - 1) return null;
  return RANK_TIERS[idx + 1];
}

async function rankFor(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const result = await prisma.xpEvent.aggregate({
    where: { userId, date: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });
  const xp = result._sum.amount ?? 0;
  return Math.floor(xp / XP_PER_RANK);
}

/**
 * Idempotent. Ensures the user's current season exists and is rolled over if
 * the previous one ended. Snapshots finalRank on the old season.
 *
 * Call this on any read of season data — pages, queries, action sites — so the
 * rollover happens lazily without needing a cron.
 */
export async function ensureCurrentSeason(userId: string): Promise<Season> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);

  const latest = await prisma.season.findFirst({
    where: { userId },
    orderBy: { startDate: "desc" },
  });

  // First time: create the season starting on the current week's Monday.
  if (!latest) {
    const startDate = getWeekStart(today);
    return prisma.season.create({
      data: {
        userId,
        startDate,
        endDate: addDays(startDate, SEASON_LENGTH_DAYS - 1),
      },
    });
  }

  // If today is past the season's end, snapshot final rank and roll over.
  if (today > latest.endDate) {
    const finalRank = await rankFor(userId, latest.startDate, latest.endDate);
    const newHighest = Math.max(latest.highestRank, finalRank);

    await prisma.season.update({
      where: { id: latest.id },
      data: { finalRank, highestRank: newHighest },
    });

    // Next season starts the day after, snapped to a Monday for cleanliness.
    let nextStart = addDays(latest.endDate, 1);
    nextStart = getWeekStart(nextStart);
    return prisma.season.create({
      data: {
        userId,
        startDate: nextStart,
        endDate: addDays(nextStart, SEASON_LENGTH_DAYS - 1),
      },
    });
  }

  // Mid-season: update highestRank if current is higher.
  const currentRank = await rankFor(userId, latest.startDate, latest.endDate);
  if (currentRank > latest.highestRank) {
    return prisma.season.update({
      where: { id: latest.id },
      data: { highestRank: currentRank },
    });
  }

  return latest;
}

export type SeasonProgress = {
  daysIn: number;
  daysRemaining: number;
  totalDays: number;
  pct: number;
};

export function seasonProgress(season: Season, today: string): SeasonProgress {
  const start = dateDiffDays(season.startDate, today);
  const daysIn = Math.max(0, Math.min(SEASON_LENGTH_DAYS, start + 1));
  return {
    daysIn,
    daysRemaining: SEASON_LENGTH_DAYS - daysIn,
    totalDays: SEASON_LENGTH_DAYS,
    pct: daysIn / SEASON_LENGTH_DAYS,
  };
}

function dateDiffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const f = Date.UTC(fy, fm - 1, fd);
  const t = Date.UTC(ty, tm - 1, td);
  return Math.round((t - f) / (1000 * 60 * 60 * 24));
}

export async function currentSeasonView(userId: string): Promise<{
  season: Season;
  rank: number;
  tier: RankTier;
  nextTier: RankTier | null;
  rankIntoTier: number;
  rankToNextTier: number | null;
  progress: SeasonProgress;
  highestRankEver: number;
}> {
  const season = await ensureCurrentSeason(userId);
  const rank = await rankFor(userId, season.startDate, season.endDate);
  const tier = rankTierFor(rank);
  const next = nextRankTier(tier);
  const rankIntoTier = rank - tier.min;
  const rankToNextTier = next ? next.min - rank : null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const progress = seasonProgress(season, today);

  const highestRowAll = await prisma.season.findFirst({
    where: { userId },
    orderBy: { highestRank: "desc" },
    select: { highestRank: true },
  });
  const highestRankEver = Math.max(
    rank,
    highestRowAll?.highestRank ?? 0,
  );

  return {
    season,
    rank,
    tier,
    nextTier: next,
    rankIntoTier,
    rankToNextTier,
    progress,
    highestRankEver,
  };
}

export async function pastSeasons(userId: string): Promise<
  Array<Season & { tier: RankTier }>
> {
  const seasons = await prisma.season.findMany({
    where: { userId, finalRank: { not: null } },
    orderBy: { startDate: "desc" },
    take: 12,
  });
  return seasons.map((s) => ({
    ...s,
    tier: rankTierFor(s.finalRank ?? 0),
  }));
}
