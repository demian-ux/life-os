/**
 * Inbound sync poll scaffold (Phase 1.4).
 *
 * Spec §10: "poll every 5 minutes for changed events. Match by gcalEventId. If
 * GCal's `updated` is older than `lastSyncedAt`, skip — we wrote it." This is
 * the runtime function that will be invoked by a cron / route handler in Phase
 * 1.5 (the 5-min schedule itself is a Phase 1.5 decision per spec §13 open
 * questions).
 *
 * Phase 1.4 ships this as an inert function — it returns 0 if no credentials
 * are configured, and is otherwise a no-op until the AI drawer wires it.
 */

import { prisma } from "@/lib/db";
import { listChangedEvents, type GcalEvent } from "./client";

export type SyncResult = {
  scanned: number;
  updated: number;
  skipped: number;
};

export async function pollInboundChanges(userId: string): Promise<SyncResult> {
  const events = await listChangedEvents(userId);
  if (events.length === 0) {
    return { scanned: 0, updated: 0, skipped: 0 };
  }

  const tasksByEvent = new Map<string, { id: string; lastSyncedAt: Date | null }>();
  const tasks = await prisma.task.findMany({
    where: { userId, gcalEventId: { in: events.map((e) => e.id) } },
    select: { id: true, gcalEventId: true, lastSyncedAt: true },
  });
  for (const t of tasks) {
    if (t.gcalEventId) tasksByEvent.set(t.gcalEventId, { id: t.id, lastSyncedAt: t.lastSyncedAt });
  }

  let updated = 0;
  let skipped = 0;
  for (const event of events) {
    const task = tasksByEvent.get(event.id);
    if (!task) continue;

    const eventUpdated = new Date(event.updated);
    if (task.lastSyncedAt && eventUpdated <= task.lastSyncedAt) {
      skipped++;
      continue;
    }

    await applyEventToTask(task.id, event);
    updated++;
  }
  return { scanned: events.length, updated, skipped };
}

async function applyEventToTask(taskId: string, event: GcalEvent): Promise<void> {
  if (event.status === "cancelled") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "ARCHIVED", lastSyncedAt: new Date() },
    });
    return;
  }
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: event.summary,
      lastSyncedAt: new Date(),
    },
  });
}
