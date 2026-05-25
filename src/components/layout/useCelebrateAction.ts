"use client";

import { useCallback } from "react";
import { useOptionalCelebration } from "./RetentionCelebrationProvider";

/**
 * Standard shape Server Actions can return to opt into celebrations.
 * All fields are optional — actions that don't award XP can ignore this.
 */
export type CelebrationResult<T = unknown> = T & {
  celebrate?: {
    xpAwarded?: number;
    source?: string;
    levelUp?: { level: number; titleName?: string | null };
  };
};

/**
 * Wrap a Server Action so its result also fires UI celebrations (XP toast +
 * optional level-up overlay). Drop-in replacement for the action itself.
 *
 * Usage in a client component:
 *   const submit = useCelebrateAction(myServerAction);
 *   const result = await submit(formData);
 *
 * Falls back to a passthrough if no <RetentionCelebrationProvider> is mounted.
 */
export function useCelebrateAction<
  Args extends unknown[],
  R extends CelebrationResult,
>(action: (...args: Args) => Promise<R>): (...args: Args) => Promise<R> {
  const celebration = useOptionalCelebration();
  return useCallback(
    async (...args: Args) => {
      const result = await action(...args);
      if (!celebration || !result?.celebrate) return result;
      const { xpAwarded, source, levelUp } = result.celebrate;
      if (xpAwarded && xpAwarded > 0) {
        celebration.celebrate({
          source: source ?? "earned",
          amount: xpAwarded,
        });
      }
      if (levelUp) {
        celebration.triggerLevelUp(levelUp.level, levelUp.titleName);
      }
      return result;
    },
    [action, celebration],
  );
}
