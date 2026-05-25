"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { aiChat } from "@/lib/ai";
import { applyAiAction } from "@/lib/ai/apply-actions";
import { buildAppContext } from "@/lib/ai/context";
import { getEffectiveAiSettings } from "@/lib/user-preferences";
import {
  aiActionProposalSchema,
  type AiActionProposal,
} from "@/lib/validators/ai-actions";
import { idSchema } from "@/lib/validators/week";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

function revalidateAll() {
  revalidatePath("/ai");
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/tasks");
  revalidatePath("/habits");
}

const sendMessageSchema = z.object({
  conversationId: idSchema.optional(),
  message: z.string().min(1).max(4000),
});

const approveActionSchema = z.object({ actionId: idSchema });
const rejectActionSchema = z.object({ actionId: idSchema });

async function getUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function getUserForAi() {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  });
}

export async function sendChatMessage(input: {
  conversationId?: string;
  message: string;
}): Promise<Result<{ conversationId: string }>> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await getUserForAi();
  if (!user) return fail("No user found");
  const userId = user.id;

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const existing = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing || existing.userId !== userId) {
      conversationId = undefined;
    }
  }
  if (!conversationId) {
    const created = await prisma.aiConversation.create({
      data: {
        userId,
        title: parsed.data.message.slice(0, 60),
      },
    });
    conversationId = created.id;
  }

  await prisma.aiMessage.create({
    data: {
      conversationId,
      role: "USER",
      content: parsed.data.message,
    },
  });

  const priorMessages = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const contextBlock = await buildAppContext({ userId });

  const aiSettings = getEffectiveAiSettings(user.preferences);
  const result = await aiChat({
    contextBlock,
    messages: priorMessages
      .filter((m) => m.role !== "SYSTEM")
      .map((m) => ({
        role: m.role === "ASSISTANT" ? "assistant" : "user",
        content: m.content,
      })),
    providerName: aiSettings.provider,
    model: aiSettings.model,
  });

  if (!result.ok) {
    const errorContent = result.rawText
      ? `AI error: ${result.error}\n\nRaw response:\n${result.rawText}`
      : `AI error: ${result.error}`;
    await prisma.aiMessage.create({
      data: {
        conversationId,
        role: "SYSTEM",
        content: errorContent,
      },
    });
    revalidateAll();
    return fail(result.error);
  }

  await prisma.aiMessage.create({
    data: {
      conversationId,
      role: "ASSISTANT",
      content: result.response.message,
    },
  });

  for (const action of result.response.actions) {
    await prisma.aiAction.create({
      data: {
        userId,
        conversationId,
        type: action.type,
        payload: action.payload as object,
        status: "PROPOSED",
      },
    });
  }

  if (result.response.warnings.length > 0) {
    await prisma.aiMessage.create({
      data: {
        conversationId,
        role: "SYSTEM",
        content: `Warnings:\n- ${result.response.warnings.join("\n- ")}`,
      },
    });
  }

  revalidateAll();
  return { ok: true, data: { conversationId } };
}

export async function approveAiAction(input: {
  actionId: string;
}): Promise<Result> {
  const parsed = approveActionSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid action id");

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const action = await prisma.aiAction.findUnique({
    where: { id: parsed.data.actionId },
  });
  if (!action || action.userId !== userId) return fail("Action not found");
  if (action.status !== "PROPOSED") {
    return fail(`Action already ${action.status.toLowerCase()}`);
  }

  const proposal = {
    type: action.type,
    payload: action.payload,
  } as AiActionProposal;

  const validated = aiActionProposalSchema.safeParse(proposal);
  if (!validated.success) {
    await prisma.aiAction.update({
      where: { id: action.id },
      data: {
        status: "FAILED",
        error:
          validated.error.issues[0]?.message ?? "Invalid action payload",
      },
    });
    revalidateAll();
    return fail("Invalid action payload");
  }

  await prisma.aiAction.update({
    where: { id: action.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  const result = await applyAiAction(userId, validated.data);

  await prisma.aiAction.update({
    where: { id: action.id },
    data: {
      status: result.ok ? "APPLIED" : "FAILED",
      appliedAt: result.ok ? new Date() : null,
      error: result.ok ? null : result.error,
    },
  });

  revalidateAll();
  return result.ok ? { ok: true } : fail(result.error);
}

export async function rejectAiAction(input: {
  actionId: string;
}): Promise<Result> {
  const parsed = rejectActionSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid action id");

  const userId = await getUserId();
  if (!userId) return fail("No user found");

  const action = await prisma.aiAction.findUnique({
    where: { id: parsed.data.actionId },
  });
  if (!action || action.userId !== userId) return fail("Action not found");
  if (action.status !== "PROPOSED") {
    return fail(`Action already ${action.status.toLowerCase()}`);
  }

  await prisma.aiAction.update({
    where: { id: action.id },
    data: { status: "REJECTED" },
  });

  revalidateAll();
  return { ok: true };
}

export async function startNewConversation(): Promise<Result<{ conversationId: string }>> {
  const userId = await getUserId();
  if (!userId) return fail("No user found");
  const conv = await prisma.aiConversation.create({
    data: { userId },
  });
  revalidateAll();
  return { ok: true, data: { conversationId: conv.id } };
}
