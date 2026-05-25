import type { TraitAxis } from "@prisma/client";
import type { XpSource } from "@/lib/xp";

/**
 * Base trait deltas per source. Each award gets ±20% jitter applied at runtime
 * (Craving Machine principle: predictable enough to learn, unpredictable enough
 * to keep checking).
 *
 * For HABIT_MINIMUM and HABIT_IDEAL the axis is determined by the habit row;
 * the base value here is multiplied by the per-axis modifier in HABIT_BY_AXIS.
 */
export const HABIT_BY_AXIS: Record<TraitAxis, { minimum: number; ideal: number }> = {
  DISCIPLINE: { minimum: 1.0, ideal: 2.5 },
  AUDACITY: { minimum: 1.0, ideal: 2.0 },
  RECOVERY: { minimum: 0.8, ideal: 1.5 },
  FOCUS: { minimum: 1.0, ideal: 2.5 },
  CRAFT: { minimum: 1.0, ideal: 2.0 },
};

export const FIXED_SOURCE_DELTAS: Partial<
  Record<XpSource, { axis: TraitAxis; base: number }>
> = {
  TASK_DONE: { axis: "DISCIPLINE", base: 0.8 },
  DEEP_WORK_BLOCK_DONE: { axis: "FOCUS", base: 3.0 },
  BIG_ROCK_DONE: { axis: "AUDACITY", base: 12 },
  WEEKLY_REVIEW_DONE: { axis: "DISCIPLINE", base: 2.0 },
  CONSISTENCY_BONUS: { axis: "DISCIPLINE", base: 1.0 },
};

/**
 * Rolls a jitter multiplier in [1 - amount, 1 + amount].
 * Stored on TraitEvent.jitter for audit and so revokes are exact.
 */
export function rollJitter(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

export const DEFAULT_JITTER = 0.2;

/**
 * Display level is a log-compressed view of raw trait value. The bare value
 * grows linearly but display growth slows — meaningful forever without
 * needing a magic level cap.
 */
export function traitDisplayLevel(value: number): number {
  if (value <= 0) return 0;
  return Math.floor(Math.log2(1 + value / 10));
}

export function traitValueForLevel(level: number): number {
  return (Math.pow(2, level) - 1) * 10;
}

export function traitLevelProgress(value: number): {
  level: number;
  intoLevel: number;
  toNext: number;
} {
  const level = traitDisplayLevel(value);
  const floor = traitValueForLevel(level);
  const next = traitValueForLevel(level + 1);
  return {
    level,
    intoLevel: value - floor,
    toNext: next - value,
  };
}
