import type { TraitAxis } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { XpSource } from "@/lib/xp";
import {
  DEFAULT_JITTER,
  FIXED_SOURCE_DELTAS,
  HABIT_BY_AXIS,
  rollJitter,
} from "./trait-map";

type TraitResolution = {
  axis: TraitAxis;
  base: number;
};

async function resolveTrait(
  source: XpSource,
  dedupeKey: string | undefined,
): Promise<TraitResolution | null> {
  if (source === "HABIT_MINIMUM" || source === "HABIT_IDEAL") {
    if (!dedupeKey) return null;
    // Habit XP dedupeKey is "habitId:date" — extract the habitId.
    const habitId = dedupeKey.split(":")[0];
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      select: { axis: true },
    });
    if (!habit) return null;
    const tier = source === "HABIT_IDEAL" ? "ideal" : "minimum";
    return { axis: habit.axis, base: HABIT_BY_AXIS[habit.axis][tier] };
  }
  const fixed = FIXED_SOURCE_DELTAS[source];
  return fixed ?? null;
}

function sourceKey(source: XpSource, dedupeKey?: string): string {
  return dedupeKey ? `${source}:${dedupeKey}` : source;
}

export async function awardTrait({
  userId,
  source,
  dedupeKey,
  dateKey,
}: {
  userId: string;
  source: XpSource;
  dedupeKey?: string;
  dateKey: string;
}): Promise<{ awarded: boolean; axis?: TraitAxis; delta?: number }> {
  const resolved = await resolveTrait(source, dedupeKey);
  if (!resolved) return { awarded: false };

  const key = sourceKey(source, dedupeKey);

  // Idempotent per (source, date) — matches XP dedupe semantics.
  if (dedupeKey) {
    const existing = await prisma.traitEvent.findFirst({
      where: { userId, source: key, date: dateKey },
    });
    if (existing) return { awarded: false };
  }

  const jitter = rollJitter(DEFAULT_JITTER);
  const delta = resolved.base * jitter;

  await prisma.traitEvent.create({
    data: {
      userId,
      axis: resolved.axis,
      delta,
      jitter,
      source: key,
      date: dateKey,
    },
  });

  await prisma.trait.upsert({
    where: { userId_axis: { userId, axis: resolved.axis } },
    update: { value: { increment: delta } },
    create: { userId, axis: resolved.axis, value: delta },
  });

  return { awarded: true, axis: resolved.axis, delta };
}

export async function revokeTrait({
  userId,
  source,
  dedupeKey,
  dateKey,
}: {
  userId: string;
  source: XpSource;
  dedupeKey: string;
  dateKey: string;
}): Promise<{ revoked: boolean }> {
  const key = sourceKey(source, dedupeKey);
  const events = await prisma.traitEvent.findMany({
    where: { userId, source: key, date: dateKey },
  });
  if (events.length === 0) return { revoked: false };

  for (const event of events) {
    await prisma.trait.update({
      where: { userId_axis: { userId, axis: event.axis } },
      data: { value: { decrement: event.delta } },
    });
    await prisma.traitEvent.delete({ where: { id: event.id } });
  }
  return { revoked: true };
}
