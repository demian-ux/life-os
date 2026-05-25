import {
  aiCoachResponseSchema,
  type AiCoachResponse,
} from "@/lib/validators/ai-actions";
import { SYSTEM_PROMPT } from "./prompts";
import { getProvider, type AiMessage } from "./providers";

export type AiChatResult =
  | {
      ok: true;
      response: AiCoachResponse;
      rawText: string;
      provider: string;
      model: string;
    }
  | {
      ok: false;
      error: string;
      rawText?: string;
    };

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

export async function aiChat({
  contextBlock,
  messages,
  providerName,
  model,
}: {
  contextBlock: string;
  messages: AiMessage[];
  providerName?: string | null;
  model?: string | null;
}): Promise<AiChatResult> {
  const provider = getProvider(providerName);
  if (!provider.isConfigured()) {
    return { ok: false, error: "AI provider is not configured" };
  }

  const result = await provider.call({
    system: SYSTEM_PROMPT,
    contextBlock,
    messages,
    model,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const json = extractJson(result.rawText);
  if (!json) {
    return {
      ok: false,
      error: "Could not find JSON in model response",
      rawText: result.rawText,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `JSON parse failed: ${msg}`,
      rawText: result.rawText,
    };
  }

  const validated = aiCoachResponseSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `Schema validation failed: ${validated.error.issues[0]?.message ?? "invalid"}`,
      rawText: result.rawText,
    };
  }

  return {
    ok: true,
    response: validated.data,
    rawText: result.rawText,
    provider: result.provider,
    model: result.model,
  };
}

export function isAiConfigured(providerName?: string | null): boolean {
  return getProvider(providerName).isConfigured();
}

export function getProviderName(providerName?: string | null): string {
  return getProvider(providerName).name;
}
