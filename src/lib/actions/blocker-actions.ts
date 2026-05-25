"use server";

import { revalidatePath } from "next/cache";
import { requestBlockerInstall } from "@/lib/blocker-install";
import { prisma } from "@/lib/db";
import {
  blockRuleInputSchema,
  ruleIdSchema,
  updateBlockRuleSchema,
  type BlockRuleInput,
  type UpdateBlockRuleInput,
} from "@/lib/validators/blocker";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

async function getUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

function revalidate() {
  revalidatePath("/settings");
}

export async function createBlockRule(input: BlockRuleInput): Promise<Result> {
  const parsed = blockRuleInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const userId = await getUserId();
  if (!userId) return fail("No user found");
  await prisma.blockRule.create({
    data: {
      userId,
      name: parsed.data.name.trim(),
      domains: parsed.data.domains,
      guardType: parsed.data.guardType,
      guardParams: parsed.data.guardParams,
      active: parsed.data.active,
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateBlockRule(
  input: UpdateBlockRuleInput,
): Promise<Result> {
  const parsed = updateBlockRuleSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await prisma.blockRule.update({
    where: { id: parsed.data.ruleId },
    data: {
      name: parsed.data.name.trim(),
      domains: parsed.data.domains,
      guardType: parsed.data.guardType,
      guardParams: parsed.data.guardParams,
      active: parsed.data.active,
    },
  });
  revalidate();
  return { ok: true };
}

export async function deleteBlockRule(input: {
  ruleId: string;
}): Promise<Result> {
  const parsed = ruleIdSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid rule id");
  await prisma.blockRule.delete({ where: { id: parsed.data.ruleId } });
  revalidate();
  return { ok: true };
}

export async function toggleBlockRule(input: {
  ruleId: string;
  active: boolean;
}): Promise<Result> {
  const parsed = ruleIdSchema.safeParse({ ruleId: input.ruleId });
  if (!parsed.success) return fail("Invalid rule id");
  await prisma.blockRule.update({
    where: { id: parsed.data.ruleId },
    data: { active: input.active },
  });
  revalidate();
  return { ok: true };
}

export async function reinstallBlocker(): Promise<Result> {
  try {
    await requestBlockerInstall();
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Could not start blocker installer",
    );
  }
}
