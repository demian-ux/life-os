import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { AiActionCard, type AiActionView } from "@/components/ai/AiActionCard";
import { AiMessageList } from "@/components/ai/AiMessageList";
import { ChatInput } from "@/components/ai/ChatInput";
import { CommandChips } from "@/components/ai/CommandChips";
import { SectionHeading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isAiConfigured, getProviderName } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { getEffectiveAiSettings } from "@/lib/user-preferences";

export const dynamic = "force-dynamic";

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const params = await searchParams;
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    return (
      <>
        <Topbar title="AI Chat" />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const aiSettings = getEffectiveAiSettings(user.preferences);
  const configured = isAiConfigured(aiSettings.provider);
  const providerName = getProviderName(aiSettings.provider);

  let conversation = params.c
    ? await prisma.aiConversation.findUnique({ where: { id: params.c } })
    : null;

  if (!conversation || conversation.userId !== user.id) {
    conversation = await prisma.aiConversation.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
  }

  const messages = conversation
    ? await prisma.aiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const pendingActions: AiActionView[] = conversation
    ? (
        await prisma.aiAction.findMany({
          where: {
            userId: user.id,
            conversationId: conversation.id,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      ).map((a) => ({
        id: a.id,
        type: a.type,
        payload: a.payload,
        status: a.status as AiActionView["status"],
        error: a.error,
        createdAt: a.createdAt,
      }))
    : [];

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const subtitle = configured
    ? `Provider: ${providerName}${aiSettings.model ? ` / ${aiSettings.model}` : ""}`
    : aiSettings.provider === "openai"
      ? "OpenAI provider is deferred. Switch to Anthropic in Settings."
      : "AI is not connected. Add an API key in .env.local to enable the coach.";
  const disabledReason =
    aiSettings.provider === "openai"
      ? "OpenAI provider is not implemented yet."
      : "Add an API key to .env.local to enable chat.";

  return (
    <>
      <Topbar title="AI Chat" subtitle={subtitle} />
      <section className="px-8 py-6 grid gap-5 max-w-3xl">
        {!configured ? (
          <div className="rounded-card border border-status-warn/40 bg-status-warn/10 px-3 py-2 text-body-sm text-ink">
            {aiSettings.provider === "openai" ? (
              <>OpenAI provider is deferred. Switch to Anthropic in Settings.</>
            ) : (
              <>
                AI is not connected yet. Add{" "}
                <code className="font-mono">ANTHROPIC_API_KEY</code> to your{" "}
                <code className="font-mono">.env.local</code> to use the coach.
                The rest of the app still works.
              </>
            )}
          </div>
        ) : null}

        {conversations.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {conversations.map((c) => {
              const active = c.id === conversation?.id;
              return (
                <Link
                  key={c.id}
                  href={`/ai?c=${c.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-2 py-1 rounded-pill text-meta border max-w-[16rem] truncate transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
                    active
                      ? "bg-accent border-accent text-bg"
                      : "border-line text-ink-soft hover:bg-line-soft hover:text-ink",
                  )}
                >
                  {c.title || "New conversation"}
                </Link>
              );
            })}
            <Link
              href="/ai?c=new"
              className="px-2 py-1 rounded-pill text-meta border border-dashed border-line text-ink-soft hover:bg-line-soft hover:text-ink transition-colors duration-150"
            >
              + New
            </Link>
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
      </section>
    </>
  );
}
