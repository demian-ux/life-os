"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

type Result = { ok: true } | { ok: false; error: string };

export async function markInsightShown(insightId: string): Promise<Result> {
  if (!insightId) return { ok: false, error: "Invalid id" };
  await prisma.coachInsight.update({
    where: { id: insightId },
    data: { status: "SHOWN", shownAt: new Date() },
  });
  revalidatePath("/today");
  return { ok: true };
}

export async function dismissInsight(insightId: string): Promise<Result> {
  if (!insightId) return { ok: false, error: "Invalid id" };
  await prisma.coachInsight.update({
    where: { id: insightId },
    data: { status: "DISMISSED" },
  });
  revalidatePath("/today");
  return { ok: true };
}
