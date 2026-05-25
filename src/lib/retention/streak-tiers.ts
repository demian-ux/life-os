// Pure config. No prisma import — safe to use in client components.

export type StreakTierDef = {
  tier: number;
  days: number;
  label: string;
  description: string;
};

export const STREAK_TIERS: StreakTierDef[] = [
  { tier: 1, days: 3, label: "Ember", description: "3-day streak" },
  { tier: 2, days: 7, label: "Spark", description: "7-day streak" },
  { tier: 3, days: 21, label: "Flame", description: "21-day streak" },
  { tier: 4, days: 60, label: "Forge", description: "60-day streak" },
  { tier: 5, days: 100, label: "Veteran", description: "100-day streak" },
];

export function tierFor(streak: number): StreakTierDef | null {
  let best: StreakTierDef | null = null;
  for (const t of STREAK_TIERS) {
    if (streak >= t.days) best = t;
    else break;
  }
  return best;
}

export function nextTierAbove(currentTier: number): StreakTierDef | null {
  return STREAK_TIERS.find((t) => t.tier === currentTier + 1) ?? null;
}
