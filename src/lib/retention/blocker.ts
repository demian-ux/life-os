import "server-only";
import type { BlockRule } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";

export type GuardEvaluation = {
  ruleId: string;
  name: string;
  active: boolean;
  satisfied: boolean;
  reason: string;
  blockedDomains: string[];
};

export type BlockerState = {
  blockedDomains: string[];
  rules: GuardEvaluation[];
  checkedAt: string;
};

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}

async function evaluateHabitLoggedGuard(
  rule: BlockRule,
  today: string,
): Promise<{ satisfied: boolean; reason: string }> {
  const params = (rule.guardParams ?? {}) as { habitId?: string };
  const habitId = params.habitId;
  if (!habitId) {
    return { satisfied: true, reason: "Guard misconfigured: no habit selected" };
  }
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: {
      name: true,
      active: true,
      scheduleDays: { select: { dayOfWeek: true } },
    },
  });
  if (!habit) {
    return { satisfied: true, reason: "Guard habit no longer exists" };
  }
  if (!habit.active) {
    return { satisfied: true, reason: `${habit.name} is inactive` };
  }
  const scheduled = new Set(habit.scheduleDays.map((s) => s.dayOfWeek));
  const dow = isoWeekday(today);
  if (!scheduled.has(dow)) {
    return {
      satisfied: true,
      reason: `${habit.name} is not scheduled today`,
    };
  }
  const log = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
    select: { status: true },
  });
  if (log && (log.status === "MINIMUM" || log.status === "IDEAL")) {
    return {
      satisfied: true,
      reason: `${habit.name} logged today`,
    };
  }
  return {
    satisfied: false,
    reason: `${habit.name} not logged yet today`,
  };
}

async function evaluateRule(
  rule: BlockRule,
  today: string,
): Promise<GuardEvaluation> {
  const domains = ((rule.domains as unknown) ?? []) as string[];
  if (!rule.active) {
    return {
      ruleId: rule.id,
      name: rule.name,
      active: false,
      satisfied: true,
      reason: "Rule is disabled",
      blockedDomains: [],
    };
  }
  let evalResult: { satisfied: boolean; reason: string };
  switch (rule.guardType) {
    case "HABIT_LOGGED":
      evalResult = await evaluateHabitLoggedGuard(rule, today);
      break;
    default:
      evalResult = {
        satisfied: true,
        reason: `Unknown guard "${rule.guardType}"`,
      };
  }
  return {
    ruleId: rule.id,
    name: rule.name,
    active: true,
    satisfied: evalResult.satisfied,
    reason: evalResult.reason,
    blockedDomains: evalResult.satisfied ? [] : domains,
  };
}

export async function getBlockerState(userId: string): Promise<BlockerState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const rules = await prisma.blockRule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const evaluated = await Promise.all(rules.map((r) => evaluateRule(r, today)));
  const allBlocked = new Set<string>();
  for (const e of evaluated) {
    for (const d of e.blockedDomains) allBlocked.add(d.trim().toLowerCase());
  }
  return {
    blockedDomains: Array.from(allBlocked).sort(),
    rules: evaluated,
    checkedAt: new Date().toISOString(),
  };
}

export const DEFAULT_SOCIAL_DOMAINS = [
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "threads.net",
  "www.threads.net",
  "snapchat.com",
  "www.snapchat.com",
];
