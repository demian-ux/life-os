"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseUserPreferences } from "@/lib/user-preferences";
import {
  updateSettingsSchema,
  type UpdateSettingsInput,
} from "@/lib/validators/settings";

type Result =
  | { ok: true }
  | { ok: false; error: string };

function fail(error: string): Result {
  return { ok: false, error };
}

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/tasks");
  revalidatePath("/habits");
  revalidatePath("/review");
  revalidatePath("/progress");
  revalidatePath("/ai");
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<Result> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  });
  if (!user) return fail("No user found");

  const existingPreferences = parseUserPreferences(user.preferences);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      preferences: {
        ...existingPreferences,
        aiProvider: parsed.data.aiProvider,
        aiModel: parsed.data.aiModel || null,
        ...(parsed.data.reduceMascots !== undefined
          ? { reduceMascots: parsed.data.reduceMascots }
          : {}),
        ...(parsed.data.limitBreakBannerEnabled !== undefined
          ? { limitBreakBannerEnabled: parsed.data.limitBreakBannerEnabled }
          : {}),
        ...(parsed.data.mascotMood !== undefined
          ? { mascotMood: parsed.data.mascotMood }
          : {}),
      },
    },
  });

  revalidateSettingsSurfaces();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Phase 1.4 — Google Calendar settings
// ---------------------------------------------------------------------------

const gcalEmbedSchema = z.object({
  embedUrl: z.string().trim().max(2048).nullable(),
});

export async function updateGcalEmbedUrl(input: unknown): Promise<Result> {
  const parsed = gcalEmbedSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid embed URL");
  }
  const value = parsed.data.embedUrl;
  if (value && !/^https?:\/\//i.test(value)) {
    return fail("Embed URL must start with http(s)://");
  }

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  });
  if (!user) return fail("No user found");

  const existing = parseUserPreferences(user.preferences);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      preferences: {
        ...existing,
        gcalEmbedUrl: value && value.length > 0 ? value : null,
      },
    },
  });

  revalidatePath("/settings");
  revalidatePath("/home");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Phase 1.6 — Focus mode preferences
// ---------------------------------------------------------------------------

const focusPrefsSchema = z.object({
  beforeCommand: z.string().max(512).nullable(),
  afterCommand: z.string().max(512).nullable(),
  defaultMinutes: z.number().int().min(5).max(240),
});

export async function updateFocusPreferences(input: unknown): Promise<Result> {
  const parsed = focusPrefsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid focus settings");
  }
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  });
  if (!user) return fail("No user found");

  const existing = parseUserPreferences(user.preferences);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      preferences: {
        ...existing,
        focusBeforeCommand: parsed.data.beforeCommand?.trim() || null,
        focusAfterCommand: parsed.data.afterCommand?.trim() || null,
        focusDefaultMinutes: parsed.data.defaultMinutes,
      },
    },
  });

  revalidatePath("/settings");
  revalidatePath("/home");
  return { ok: true };
}
