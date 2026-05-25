import { Topbar } from "@/components/layout/Topbar";
import { ReviewForm } from "@/components/review/ReviewForm";
import { ReviewSummary } from "@/components/review/ReviewSummary";
import type { AiActionView } from "@/components/ai/AiActionCard";
import { isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { addDays, formatDateLabel, getWeekStart, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import { getEffectiveAiSettings } from "@/lib/user-preferences";
import { reviewAnswersSchema, type ReviewAnswers } from "@/lib/validators/review";

export const dynamic = "force-dynamic";

const EMPTY_ANSWERS: ReviewAnswers = {
  whatWorked: "",
  whatDrained: "",
  whatAvoided: "",
  whatToSimplify: "",
  nextWeekMinimum: "",
  emotionalState: "",
};

export default async function ReviewPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);

  if (!user) {
    return (
      <>
        <Topbar title="Weekly Review" />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const week = await prisma.week.upsert({
    where: { userId_startDate: { userId: user.id, startDate: weekStart } },
    update: {},
    create: { userId: user.id, startDate: weekStart, endDate: weekEnd },
  });

  const review = await prisma.weeklyReview.findFirst({
    where: { weekId: week.id },
  });
  const parsed = review
    ? reviewAnswersSchema.safeParse(review.answers)
    : null;
  const initialAnswers =
    parsed && parsed.success ? parsed.data : EMPTY_ANSWERS;

  const conversation = await prisma.aiConversation.findFirst({
    where: { userId: user.id, title: `Review ${weekStart}` },
    orderBy: { updatedAt: "desc" },
  });

  const messages = conversation
    ? await prisma.aiMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const assistantMessage =
    messages.find((m) => m.role === "ASSISTANT") ?? null;
  const warnings = messages.filter((m) => m.role === "SYSTEM");

  const actions: AiActionView[] = conversation
    ? (
        await prisma.aiAction.findMany({
          where: {
            userId: user.id,
            conversationId: conversation.id,
          },
          orderBy: { createdAt: "asc" },
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
  const aiSettings = getEffectiveAiSettings(user.preferences);

  return (
    <>
      <Topbar
        title="Weekly Review"
        subtitle={`Reviewing ${formatDateLabel(weekStart)} → ${formatDateLabel(weekEnd)}`}
      />
      <section className="px-8 py-6 grid gap-6 max-w-3xl">
        <ReviewForm
          weekId={week.id}
          weekStartDate={weekStart}
          initialAnswers={initialAnswers}
          aiEnabled={isAiConfigured(aiSettings.provider)}
        />
        <ReviewSummary
          assistantMessage={
            assistantMessage
              ? {
                  id: assistantMessage.id,
                  role: "ASSISTANT",
                  content: assistantMessage.content,
                }
              : null
          }
          warnings={warnings.map((w) => ({
            id: w.id,
            role: "SYSTEM",
            content: w.content,
          }))}
          actions={actions}
        />
      </section>
    </>
  );
}
