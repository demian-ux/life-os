import { z } from "zod";

export const aiProviderSchema = z.enum(["anthropic", "openai"]);

export const mascotMoodSchema = z.enum(["default", "cheer", "sleep"]);

export const userPreferencesSchema = z
  .object({
    aiProvider: aiProviderSchema.optional(),
    aiModel: z.string().max(120).nullable().optional(),
    // Phase 1 UI preferences
    reduceMascots: z.boolean().optional(),
    limitBreakBannerEnabled: z.boolean().optional(),
    mascotMood: mascotMoodSchema.optional(),
    // Phase 1.4 — Google Calendar
    gcalEmbedUrl: z.string().url().max(2048).nullable().optional(),
    // Phase 1.6 — Focus mode orchestration
    focusBeforeCommand: z.string().max(512).nullable().optional(),
    focusAfterCommand: z.string().max(512).nullable().optional(),
    focusDefaultMinutes: z.number().int().min(5).max(240).optional(),
  })
  .passthrough();

export type AiProviderName = z.infer<typeof aiProviderSchema>;
export type MascotMood = z.infer<typeof mascotMoodSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export function normalizeAiProvider(
  value: string | null | undefined,
): AiProviderName {
  return value?.toLowerCase() === "openai" ? "openai" : "anthropic";
}

export function parseUserPreferences(raw: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function getEffectiveAiSettings(rawPreferences: unknown): {
  provider: AiProviderName;
  model: string;
} {
  const preferences = parseUserPreferences(rawPreferences);
  return {
    provider:
      preferences.aiProvider ?? normalizeAiProvider(process.env.AI_PROVIDER),
    model: preferences.aiModel?.trim() || process.env.AI_MODEL?.trim() || "",
  };
}

export type EffectiveUiPreferences = {
  reduceMascots: boolean;
  limitBreakBannerEnabled: boolean;
  mascotMood: MascotMood;
};

/**
 * Resolve UI preferences with safe defaults for un-set fields.
 * Used by AppShell / MascotPanel / LimitBreakBanner.
 */
export function getEffectiveUiPreferences(
  rawPreferences: unknown,
): EffectiveUiPreferences {
  const preferences = parseUserPreferences(rawPreferences);
  return {
    reduceMascots: preferences.reduceMascots ?? false,
    limitBreakBannerEnabled: preferences.limitBreakBannerEnabled ?? true,
    mascotMood: preferences.mascotMood ?? "default",
  };
}

/**
 * Google Calendar embed URL (Phase 1.4). Returns null if not configured.
 */
export function getGcalEmbedUrl(rawPreferences: unknown): string | null {
  const preferences = parseUserPreferences(rawPreferences);
  const url = preferences.gcalEmbedUrl?.trim();
  return url && url.length > 0 ? url : null;
}

/**
 * Focus mode settings (Phase 1.6). Default duration is 90 minutes per spec §9.
 */
export type FocusPreferences = {
  beforeCommand: string | null;
  afterCommand: string | null;
  defaultMinutes: number;
};

export function getFocusPreferences(
  rawPreferences: unknown,
): FocusPreferences {
  const preferences = parseUserPreferences(rawPreferences);
  return {
    beforeCommand: preferences.focusBeforeCommand?.trim() || null,
    afterCommand: preferences.focusAfterCommand?.trim() || null,
    defaultMinutes: preferences.focusDefaultMinutes ?? 90,
  };
}
