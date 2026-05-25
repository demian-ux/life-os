"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { idSchema } from "@/lib/validators/week";

const energySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const setFocusSchema = z.object({
  dayPlanId: idSchema,
  focus: z.string().max(280),
});

const setEnergySchema = z.object({
  dayPlanId: idSchema,
  energy: energySchema.nullable(),
});

type Result =
  | { ok: true }
  | { ok: false; error: string };

function fail(error: string): Result {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/today");
  revalidatePath("/week");
}

export async function setDayFocus(input: {
  dayPlanId: string;
  focus: string;
}): Promise<Result> {
  const parsed = setFocusSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await prisma.dayPlan.update({
    where: { id: parsed.data.dayPlanId },
    data: { focus: parsed.data.focus.trim() || null },
  });
  revalidate();
  return { ok: true };
}

export async function setDayEnergy(input: {
  dayPlanId: string;
  energy: "LOW" | "MEDIUM" | "HIGH" | null;
}): Promise<Result> {
  const parsed = setEnergySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  await prisma.dayPlan.update({
    where: { id: parsed.data.dayPlanId },
    data: { energy: parsed.data.energy },
  });
  revalidate();
  return { ok: true };
}
