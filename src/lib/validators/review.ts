import { z } from "zod";
import { dateKeySchema, idSchema } from "./week";

export const reviewAnswersSchema = z.object({
  whatWorked: z.string().max(4000).default(""),
  whatDrained: z.string().max(4000).default(""),
  whatAvoided: z.string().max(4000).default(""),
  whatToSimplify: z.string().max(4000).default(""),
  nextWeekMinimum: z.string().max(4000).default(""),
  emotionalState: z.string().max(4000).default(""),
});

export const saveReviewSchema = z.object({
  weekId: idSchema,
  answers: reviewAnswersSchema,
});

export const requestAiReviewSchema = z.object({
  weekStartDate: dateKeySchema,
});

export type ReviewAnswers = z.infer<typeof reviewAnswersSchema>;
export type SaveReviewInput = z.infer<typeof saveReviewSchema>;
export type RequestAiReviewInput = z.infer<typeof requestAiReviewSchema>;

export const REVIEW_QUESTIONS: {
  key: keyof ReviewAnswers;
  label: string;
  hint: string;
}[] = [
  {
    key: "whatWorked",
    label: "What worked?",
    hint: "Wins, energy, momentum.",
  },
  {
    key: "whatDrained",
    label: "What drained you?",
    hint: "Where did energy leak out?",
  },
  {
    key: "whatAvoided",
    label: "What did you avoid?",
    hint: "Be honest — naming it makes it smaller.",
  },
  {
    key: "whatToSimplify",
    label: "What should you simplify?",
    hint: "What can be smaller, fewer, or skipped?",
  },
  {
    key: "nextWeekMinimum",
    label: "What is next week's minimum viable plan?",
    hint: "If everything goes wrong, what still has to happen?",
  },
  {
    key: "emotionalState",
    label: "How are you emotionally?",
    hint: "One or two sentences. No judgement.",
  },
];
