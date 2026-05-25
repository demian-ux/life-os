export type AiMessage = { role: "user" | "assistant"; content: string };

export type AiCallInput = {
  system: string;
  contextBlock: string;
  messages: AiMessage[];
  model?: string | null;
};

export type AiCallResult =
  | { ok: true; rawText: string; provider: string; model: string }
  | { ok: false; error: string };

export type AiProvider = {
  name: string;
  isConfigured(): boolean;
  call(input: AiCallInput): Promise<AiCallResult>;
};

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export const anthropicProvider: AiProvider = {
  name: "anthropic",
  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  async call({ system, contextBlock, messages, model: modelOverride }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, error: "Anthropic API key missing" };
    const model =
      modelOverride?.trim() || process.env.AI_MODEL || DEFAULT_ANTHROPIC_MODEL;

    const userMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    if (
      userMessages.length === 0 ||
      userMessages[0].role !== "user"
    ) {
      return {
        ok: false,
        error: "First message must be from the user",
      };
    }

    const firstUserIdx = userMessages.findIndex((m) => m.role === "user");
    if (firstUserIdx >= 0) {
      userMessages[firstUserIdx] = {
        role: "user",
        content: `<app_context>\n${contextBlock}\n</app_context>\n\n${userMessages[firstUserIdx].content}`,
      };
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system,
          messages: userMessages,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          error: `Anthropic ${res.status}: ${text.slice(0, 400)}`,
        };
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const text =
        data.content
          ?.filter((c) => c.type === "text" && typeof c.text === "string")
          .map((c) => c.text as string)
          .join("\n") ?? "";
      if (!text) {
        return { ok: false, error: "Empty response from Anthropic" };
      }
      return { ok: true, rawText: text, provider: "anthropic", model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Anthropic call failed: ${msg}` };
    }
  },
};

export const openaiStubProvider: AiProvider = {
  name: "openai",
  isConfigured() {
    return false;
  },
  async call() {
    return {
      ok: false,
      error: "OpenAI provider is not implemented yet. Use AI_PROVIDER=anthropic.",
    };
  },
};

export function getProvider(providerName?: string | null): AiProvider {
  const name = (
    providerName ??
    process.env.AI_PROVIDER ??
    "anthropic"
  ).toLowerCase();
  if (name === "openai") return openaiStubProvider;
  return anthropicProvider;
}
