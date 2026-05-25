/**
 * Google Calendar API client scaffold (Phase 1.4).
 *
 * Two-way sync requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars plus
 * a per-user OAuth token stored in IntegrationCredential (provider="google_calendar").
 *
 * Phase 1.4 ships the iframe embed (read-only). The functions in this file are
 * intentionally inert until credentials exist. See docs/gcal-setup.md.
 */

import { prisma } from "@/lib/db";
import type { IntegrationCredential } from "@prisma/client";

const GCAL_API_BASE = "https://www.googleapis.com/calendar/v3";

export type GcalEventInput = {
  summary: string;
  description?: string;
  start: string; // RFC3339, e.g. "2026-05-25T09:00:00-03:00"
  end: string;
  calendarId?: string;
};

export type GcalEvent = {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  updated: string;
  status: string;
};

export type GcalConnectionStatus =
  | { connected: false; reason: "no_env" | "no_credential" | "expired" }
  | { connected: true; userId: string };

export async function getGcalCredential(
  userId: string,
): Promise<IntegrationCredential | null> {
  return prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId, provider: "google_calendar" } },
  });
}

export async function checkGcalConnection(
  userId: string,
): Promise<GcalConnectionStatus> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return { connected: false, reason: "no_env" };
  }
  const credential = await getGcalCredential(userId);
  if (!credential) return { connected: false, reason: "no_credential" };
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    // Token refresh path lives in refresh.ts (Phase 1.5+)
    return { connected: false, reason: "expired" };
  }
  return { connected: true, userId };
}

/**
 * Stub. Phase 1.4 does not write to GCal. When Phase 1.5 wires the AI's
 * scheduleEvent tool, it should call this function via a Server Action that
 * shows the user an approval card first (per project rule: AI never mutates
 * directly).
 */
export async function createGcalEvent(
  userId: string,
  input: GcalEventInput,
): Promise<GcalEvent> {
  const status = await checkGcalConnection(userId);
  if (!status.connected) {
    throw new Error(`Google Calendar not connected (${status.reason})`);
  }
  const credential = await getGcalCredential(userId);
  if (!credential) throw new Error("Credential lookup race");

  const calendarId = input.calendarId ?? "primary";
  const res = await fetch(
    `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GCal API error: ${res.status} ${text}`);
  }
  return (await res.json()) as GcalEvent;
}

/**
 * Stub. Phase 1.4 does not poll. When Phase 1.5 wires inbound sync, it should
 * compare `event.updated` against `Task.lastSyncedAt` to skip loops (per spec
 * §10 loop guard).
 */
export async function listChangedEvents(
  userId: string,
  options: { calendarId?: string; updatedMin?: string } = {},
): Promise<GcalEvent[]> {
  const status = await checkGcalConnection(userId);
  if (!status.connected) return [];
  const credential = await getGcalCredential(userId);
  if (!credential) return [];

  const calendarId = options.calendarId ?? "primary";
  const params = new URLSearchParams({ singleEvents: "true" });
  if (options.updatedMin) params.set("updatedMin", options.updatedMin);

  const res = await fetch(
    `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${credential.accessToken}` },
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: GcalEvent[] };
  return data.items ?? [];
}
