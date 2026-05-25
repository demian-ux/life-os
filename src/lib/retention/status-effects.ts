import "server-only";
import { Focus, Footprints, Inbox, Moon } from "lucide-react";
import { prisma } from "@/lib/db";
import { addDays, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import type { FxEffect } from "@/components/ui/FxChip";

/**
 * Derive 0-4 status effects from real data over the trailing 7 days. The
 * Today + Progress screens render whatever subset has signal; if nothing is
 * notable, returns an empty list.
 */
export async function getStatusEffects(userId: string): Promise<FxEffect[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const weekStart = addDays(today, -6);

  const [bodyLogs, recoveryLogs, deepBlocks, inboxCount] = await Promise.all([
    prisma.habitLog.count({
      where: {
        habit: { userId, axis: "DISCIPLINE" },
        date: { gte: weekStart, lte: today },
        status: { in: ["MINIMUM", "IDEAL"] },
      },
    }),
    prisma.habitLog.count({
      where: {
        habit: { userId, axis: "RECOVERY" },
        date: { gte: weekStart, lte: today },
        status: { in: ["MINIMUM", "IDEAL"] },
      },
    }),
    prisma.timeBlock.findMany({
      where: {
        dayPlan: { userId, date: { gte: weekStart, lte: today } },
        category: "DEEP_WORK",
        status: "DONE",
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.task.count({
      where: {
        userId,
        status: "INBOX",
      },
    }),
  ]);

  const effects: FxEffect[] = [];

  if (bodyLogs >= 3) {
    effects.push({
      id: "walked",
      label: `Walked ${bodyLogs}d`,
      tone: "good",
      icon: Footprints,
      tip: `Body+ after ${bodyLogs} days with a discipline habit this week.`,
    });
  }

  const deepMinutes = deepBlocks.reduce(
    (sum, b) => sum + diffMinutes(b.startTime, b.endTime),
    0,
  );
  const deepHours = Math.floor(deepMinutes / 60);
  if (deepHours >= 2) {
    effects.push({
      id: "deep",
      label: `Deep ${deepHours}h`,
      tone: "mind",
      icon: Focus,
      tip: `${deepHours} hours of deep-work blocks this week.`,
    });
  }

  if (recoveryLogs >= 2) {
    effects.push({
      id: "rested",
      label: "Rested",
      tone: "good",
      icon: Moon,
      tip: `${recoveryLogs} recovery days logged in the last 7.`,
    });
  }

  if (inboxCount >= 4) {
    effects.push({
      id: "inbox",
      label: `Inbox ${inboxCount}`,
      tone: "warn",
      icon: Inbox,
      tip: `${inboxCount} items in inbox — clear on the next break.`,
    });
  }

  return effects;
}

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}
