"use server";

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { awardXp } from "@/lib/xp";
import { completeDailyRock } from "./rock-actions";
import { getFocusPreferences } from "@/lib/user-preferences";

const execAsync = promisify(exec);

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

async function getUser(): Promise<{
  id: string;
  preferences: unknown;
} | null> {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  });
}

/**
 * Runs the configured before- or after-focus shell command. Best-effort: errors
 * are caught and logged; they do NOT block focus session start/end. Single-user
 * local app context — no sandboxing needed.
 */
async function runHook(command: string | null, label: string): Promise<void> {
  if (!command) return;
  try {
    await execAsync(command, { timeout: 10_000 });
  } catch (e) {
    console.error(`[focus] ${label} command failed:`, e);
  }
}

const startFocusSchema = z.object({
  dailyRockId: z.string().nullable().optional(),
  minutes: z.number().int().min(5).max(240).optional(),
});

export async function startFocusSession(
  input: unknown,
): Promise<Result<{ id: string; plannedMinutes: number }>> {
  const parsed = startFocusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");
  const user = await getUser();
  if (!user) return fail("No user");

  const prefs = getFocusPreferences(user.preferences);
  const plannedMinutes = parsed.data.minutes ?? prefs.defaultMinutes;

  await runHook(prefs.beforeCommand, "before-focus");

  const session = await prisma.focusSession.create({
    data: {
      userId: user.id,
      dailyRockId: parsed.data.dailyRockId ?? null,
      plannedMinutes,
    },
  });

  revalidatePath("/home");
  return { ok: true, data: { id: session.id, plannedMinutes } };
}

const endFocusSchema = z.object({
  id: z.string().min(1),
  outcome: z.enum(["COMPLETED", "CARRIED", "ABANDONED"]),
});

export async function endFocusSession(
  input: unknown,
): Promise<Result<void>> {
  const parsed = endFocusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");
  const user = await getUser();
  if (!user) return fail("No user");

  const session = await prisma.focusSession.findUnique({
    where: { id: parsed.data.id },
  });
  if (!session || session.userId !== user.id) return fail("Not found");
  if (session.endedAt) return fail("Already ended");

  const prefs = getFocusPreferences(user.preferences);
  await runHook(prefs.afterCommand, "after-focus");

  await prisma.focusSession.update({
    where: { id: session.id },
    data: { endedAt: new Date(), outcome: parsed.data.outcome },
  });

  // Award a small XP for completing deep work even when no daily rock is linked.
  if (parsed.data.outcome === "COMPLETED") {
    await awardXp({
      userId: user.id,
      source: "DEEP_WORK_BLOCK_DONE",
      amount: 15,
      note: `Focus block (${session.plannedMinutes}m)`,
      dedupeKey: `focus:${session.id}`,
    });

    // If the focus was on a daily rock and it's still PENDING, mark it done.
    if (session.dailyRockId) {
      const rock = await prisma.dailyRock.findUnique({
        where: { id: session.dailyRockId },
        select: { id: true, status: true },
      });
      if (rock && rock.status === "PENDING") {
        await completeDailyRock({ id: rock.id });
      }
    }
  }

  revalidatePath("/home");
  return { ok: true, data: undefined };
}

const extendFocusSchema = z.object({
  id: z.string().min(1),
  addMinutes: z.number().int().min(1).max(120),
});

export async function extendFocusSession(
  input: unknown,
): Promise<Result<void>> {
  const parsed = extendFocusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");
  const user = await getUser();
  if (!user) return fail("No user");
  const session = await prisma.focusSession.findUnique({
    where: { id: parsed.data.id },
  });
  if (!session || session.userId !== user.id) return fail("Not found");
  if (session.endedAt) return fail("Already ended");
  await prisma.focusSession.update({
    where: { id: session.id },
    data: { plannedMinutes: session.plannedMinutes + parsed.data.addMinutes },
  });
  revalidatePath("/home");
  return { ok: true, data: undefined };
}

export async function getActiveFocusSession(userId: string) {
  return prisma.focusSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}
