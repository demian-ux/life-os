"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { aiChat } from "@/lib/ai";
import { buildAppContext } from "@/lib/ai/context";
import { addDays, getWeekStart, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { getEffectiveAiSettings } from "@/lib/user-preferences";
import { awardXp, XP_RULES } from "@/lib/xp";
import {
  requestAiReviewSchema,
  reviewAnswersSchema,
  saveReviewSchema,
  REVIEW_QUESTIONS,
  type ReviewAnswers,
} from "@/lib/validators/review";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail<T = void>(error: string): Result<T> {
  return { ok: false, error };
}

function revalidate() {
  revalidatePath("/review");
  revalidatePath("/ai");
  revalidatePath("/week");
  revalidatePath("/today");
  revalidatePath("/progress");
}

async function getUserForAi() {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, timezone: true, preferences: true },
  });
}

export async function saveReview(input: {
  weekId: string;
  answers: ReviewAnswers;
}): Promise<Result> {
  const parsed = saveReviewSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await getUserForAi();
  if (!user) return fail("No user found");
  const userId = user.id;

  const week = await prisma.week.findUnique({
    where: { id: parsed.data.weekId },
  });
  if (!week || week.userId !== userId) return fail("Week not found");

  const existing = await prisma.weeklyReview.findFirst({
    where: { weekId: week.id },
  });

  if (existing) {
    await prisma.weeklyReview.update({
      where: { id: existing.id },
      data: { answers: parsed.data.answers },
    });
  } else {
    await prisma.weeklyReview.create({
      data: {
        weekId: week.id,
        answers: parsed.data.answers,
      },
    });
    await awardXp({
      userId,
      source: "WEEKLY_REVIEW_DONE",
      amount: XP_RULES.WEEKLY_REVIEW_DONE,
      dedupeKey: week.id,
      date: week.startDate,
      note: `Review for ${week.startDate}`,
    });
  }

  revalidate();
  return { ok: true };
}

function buildReviewPrompt(args: {
  weekStartDate: string;
  weekEndDate: string;
  bigRock: string | null;
  answers: ReviewAnswers;
  taskCounts: { done: number; openScheduled: number; openInbox: number };
  habitSummary: { name: string; min: number; ideal: number; skipped: number; missed: number }[];
  nextWeekStart: string;
}): string {
  const answersBlock = REVIEW_QUESTIONS.map(
    (q) => `- ${q.label}\n  ${args.answers[q.key]?.trim() || "(blank)"}`,
  ).join("\n");

  const habitsBlock = args.habitSummary.length
    ? args.habitSummary
        .map(
          (h) =>
            `  - ${h.name}: minimum=${h.min}, ideal=${h.ideal}, skipped=${h.skipped}, missed=${h.missed}`,
        )
        .join("\n")
    : "  (no habit logs)";

  return [
    `Run a weekly review for the week ${args.weekStartDate} → ${args.weekEndDate}.`,
    "",
    `Big Rock for the week: ${args.bigRock ?? "(none set)"}`,
    "",
    "Stats:",
    `  - Tasks completed this week: ${args.taskCounts.done}`,
    `  - Open tasks scheduled this week: ${args.taskCounts.openScheduled}`,
    `  - Inbox size: ${args.taskCounts.openInbox}`,
    "",
    "Habit logs this week:",
    habitsBlock,
    "",
    "Answers:",
    answersBlock,
    "",
    `Next week starts on ${args.nextWeekStart}.`,
    "",
    "Please provide:",
    "1. A short summary (3-5 sentences) of what happened this week, including patterns you notice.",
    "2. A few clear suggestions for next week (energy-aware, calm, smaller is fine).",
    "3. Concrete proposed actions for next week using these action types only:",
    "   - UPDATE_WEEK to set next week's Big Rock or carry the user's reflection over",
    "   - CREATE_WEEKLY_TARGET for next week",
    "   - CREATE_TIME_BLOCK for the most important blocks",
    "   - SCHEDULE_TASK to move incomplete priority tasks into next week",
    "Keep total proposed actions to <= 8. Use weekStartDate = " +
      args.nextWeekStart +
      " for any week-scoped actions.",
  ].join("\n");
}

export async function requestAiReview(input: {
  weekStartDate: string;
}): Promise<Result<{ conversationId: string }>> {
  const parsed = requestAiReviewSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const user = await getUserForAi();
  if (!user) return fail("No user found");
  const userId = user.id;

  const weekStart = getWeekStart(parsed.data.weekStartDate);
  const weekEnd = addDays(weekStart, 6);

  const week = await prisma.week.findUnique({
    where: { userId_startDate: { userId, startDate: weekStart } },
  });
  if (!week) return fail("No week record for that date");

  const review = await prisma.weeklyReview.findFirst({
    where: { weekId: week.id },
  });
  if (!review) return fail("Save the review first");

  const answersParsed = reviewAnswersSchema.safeParse(review.answers);
  if (!answersParsed.success) return fail("Stored review answers are corrupt");

  const [taskDoneCount, openScheduled, openInbox, habits, weekHabitLogs] =
    await Promise.all([
      prisma.task.count({
        where: {
          userId,
          status: "DONE",
          completedAt: {
            gte: new Date(`${weekStart}T00:00:00.000Z`),
            lt: new Date(`${addDays(weekEnd, 1)}T00:00:00.000Z`),
          },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: { not: "DONE" },
          scheduledDate: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.task.count({
        where: { userId, status: "INBOX" },
      }),
      prisma.habit.findMany({
        where: { userId, active: true },
        select: { id: true, name: true, scheduleDays: true },
      }),
      prisma.habitLog.findMany({
        where: {
          habit: { userId },
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
    ]);

  const habitSummary = habits.map((h) => {
    const logs = weekHabitLogs.filter((l) => l.habitId === h.id);
    const min = logs.filter((l) => l.status === "MINIMUM").length;
    const ideal = logs.filter((l) => l.status === "IDEAL").length;
    const skipped = logs.filter((l) => l.status === "SKIPPED").length;
    const scheduledCount = h.scheduleDays.length;
    const missed = Math.max(0, scheduledCount - min - ideal - skipped);
    return { name: h.name, min, ideal, skipped, missed };
  });

  const today = todayKey(user.timezone || DEFAULT_TIMEZONE);
  const nextWeekStart = addDays(getWeekStart(today), 7);

  const prompt = buildReviewPrompt({
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    bigRock: week.bigRock,
    answers: answersParsed.data,
    taskCounts: {
      done: taskDoneCount,
      openScheduled,
      openInbox,
    },
    habitSummary,
    nextWeekStart,
  });

  const conversation = await prisma.aiConversation.create({
    data: {
      userId,
      title: `Review ${weekStart}`,
    },
  });

  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: prompt,
    },
  });

  const contextBlock = await buildAppContext({ userId, todayDate: today });

  const aiSettings = getEffectiveAiSettings(user.preferences);
  const result = await aiChat({
    contextBlock,
    messages: [{ role: "user", content: prompt }],
    providerName: aiSettings.provider,
    model: aiSettings.model,
  });

  if (!result.ok) {
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "SYSTEM",
        content: result.rawText
          ? `AI error: ${result.error}\n\nRaw response:\n${result.rawText}`
          : `AI error: ${result.error}`,
      },
    });
    revalidate();
    return fail(result.error);
  }

  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: result.response.message,
    },
  });

  await prisma.weeklyReview.update({
    where: { id: review.id },
    data: { aiSummary: result.response.message },
  });

  for (const action of result.response.actions) {
    await prisma.aiAction.create({
      data: {
        userId,
        conversationId: conversation.id,
        type: action.type,
        payload: action.payload as object,
        status: "PROPOSED",
      },
    });
  }

  if (result.response.warnings.length > 0) {
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "SYSTEM",
        content: `Warnings:\n- ${result.response.warnings.join("\n- ")}`,
      },
    });
  }

  revalidate();
  return { ok: true, data: { conversationId: conversation.id } };
}
