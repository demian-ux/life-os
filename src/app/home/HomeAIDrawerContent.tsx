import { AiActionCard, type AiActionView } from "@/components/ai/AiActionCard";
import { AiMessageList } from "@/components/ai/AiMessageList";
import { ChatInput } from "@/components/ai/ChatInput";
import { CommandChips } from "@/components/ai/CommandChips";
import { SectionHeading } from "@/components/ui";
import { isAiConfigured, getProviderName } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { getEffectiveAiSettings } from "@/lib/user-preferences";

type HomeAIDrawerContentProps = {
  userId: string;
  preferences: unknown;
};

/**
 * Phase 1.5 AI drawer body. Server-rendered; nested inside the Phase 1.1
 * HomeAIDrawerSlot client wrapper (which toggles visibility).
 *
 * Reuses the same building blocks as /ai: CommandChips, AiMessageList,
 * ChatInput, AiActionCard. The drawer always opens to the user's most recent
 * conversation. Switching conversations and starting a new one live on /ai
 * for now — wire them into the drawer in a follow-up if needed.
 */
export async function HomeAIDrawerContent({
  userId,
  preferences,
}: HomeAIDrawerContentProps) {
  const aiSettings = getEffectiveAiSettings(preferences);
  const configured = isAiConfigured(aiSettings.provider);
  const providerName = getProviderName(aiSettings.provider);

  const conversation = await prisma.aiConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const [messages, pendingActionsRaw] = await Promise.all([
    conversation
      ? prisma.aiMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    conversation
      ? prisma.aiAction.findMany({
          where: { userId, conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const pendingActions: AiActionView[] = pendingActionsRaw.map((a) => ({
    id: a.id,
    type: a.type,
    payload: a.payload,
    status: a.status as AiActionView["status"],
    error: a.error,
    createdAt: a.createdAt,
  }));

  const disabledReason =
    aiSettings.provider === "openai"
      ? "OpenAI provider is not implemented yet."
      : "Add ANTHROPIC_API_KEY to .env.local to enable chat.";

  return (
    <div className="grid gap-3 max-h-[calc(100vh-32px)] overflow-y-auto pr-1">
      <div>
        <div className="font-[var(--font-pixel)] text-[8px] text-bark-600 tracking-[0.08em] uppercase">
          AI Co-pilot
        </div>
        <div className="text-[12px] text-bark-500 mt-1">
          {configured
            ? `${providerName}${aiSettings.model ? ` / ${aiSettings.model}` : ""}`
            : disabledReason}
        </div>
      </div>

      {!configured ? (
        <div className="rounded-md border border-coral-300 bg-coral-50 px-3 py-2 text-[12px] text-bark-700">
          AI is not connected. Open Settings to configure your provider.
        </div>
      ) : null}

      <CommandChips conversationId={conversation?.id} disabled={!configured} />

      <AiMessageList
        messages={messages.map((m) => ({
          id: m.id,
          role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
          content: m.content,
          createdAt: m.createdAt,
        }))}
      />

      <ChatInput
        conversationId={conversation?.id}
        disabled={!configured}
        disabledReason={configured ? null : disabledReason}
      />

      {pendingActions.length > 0 ? (
        <div className="grid gap-2">
          <SectionHeading>Proposed actions</SectionHeading>
          <ul className="grid gap-2">
            {pendingActions.map((a) => (
              <AiActionCard key={a.id} action={a} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
