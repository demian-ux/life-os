import "server-only";
import { prisma } from "@/lib/db";

export type LimitBreakCriteria = {
  consistencyPctOk: boolean;
  consistencyPct: number;
  consistencyThreshold: number;
  targetsAllDone: boolean;
  targetsDone: number;
  targetsTotal: number;
  reviewSaved: boolean;
};

export type LimitBreakState = {
  ready: boolean;
  criteria: LimitBreakCriteria;
};

const CONSISTENCY_THRESHOLD = 80;

/**
 * Compute whether the user has met every weekly criterion for the Limit Break.
 * - habit consistency ≥ 80%
 * - all weekly targets DONE
 * - weekly review saved this week
 */
export async function getLimitBreakState(
  userId: string,
  consistencyPct: number,
  weekStart: string,
): Promise<LimitBreakState> {
  const week = await prisma.week.findUnique({
    where: { userId_startDate: { userId, startDate: weekStart } },
    include: { targets: true, weeklyReviews: true },
  });

  const targets = week?.targets ?? [];
  const targetsDone = targets.filter((t) => t.status === "DONE").length;
  const targetsTotal = targets.length;
  const targetsAllDone = targetsTotal > 0 && targetsDone === targetsTotal;

  const reviewSaved = (week?.weeklyReviews?.length ?? 0) > 0;
  const consistencyPctOk = consistencyPct >= CONSISTENCY_THRESHOLD;
  const ready = consistencyPctOk && targetsAllDone && reviewSaved;

  return {
    ready,
    criteria: {
      consistencyPctOk,
      consistencyPct,
      consistencyThreshold: CONSISTENCY_THRESHOLD,
      targetsAllDone,
      targetsDone,
      targetsTotal,
      reviewSaved,
    },
  };
}
