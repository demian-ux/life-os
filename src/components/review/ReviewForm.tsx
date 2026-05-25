"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import {
  Button,
  Card,
  InlineConfirmation,
  SaveCrystal,
  Textarea,
  Tooltip,
} from "@/components/ui";
import {
  requestAiReview,
  saveReview,
} from "@/lib/actions/review-actions";
import {
  REVIEW_QUESTIONS,
  type ReviewAnswers,
} from "@/lib/validators/review";

export function ReviewForm({
  weekId,
  weekStartDate,
  initialAnswers,
  aiEnabled,
}: {
  weekId: string;
  weekStartDate: string;
  initialAnswers: ReviewAnswers;
  aiEnabled: boolean;
}) {
  const [answers, setAnswers] = useState<ReviewAnswers>(initialAnswers);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ReviewAnswers>(key: K, value: ReviewAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function persist(then?: () => Promise<unknown> | void) {
    setError(null);
    startTransition(async () => {
      const result = await saveReview({ weekId, answers });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedTick(Date.now());
      setSaved(true);
      if (then) await then();
    });
  }

  function generate() {
    persist(async () => {
      const r = await requestAiReview({ weekStartDate });
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        persist();
      }}
      className="grid gap-[14px]"
    >
      {REVIEW_QUESTIONS.map((q, i) => (
        <Card key={q.key}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-[var(--font-pixel)] text-[10px] text-coral-500">
              {String(i + 1).padStart(2, "0")}
            </span>
            <label
              htmlFor={`review-${q.key}`}
              className="font-[var(--font-display)] font-semibold text-[17px] text-ink-800 leading-tight"
            >
              {q.label}
            </label>
          </div>
          {q.hint ? (
            <p className="text-[12px] text-bark-500 mb-2">{q.hint}</p>
          ) : null}
          <Textarea
            id={`review-${q.key}`}
            value={answers[q.key]}
            onChange={(e) => update(q.key, e.target.value)}
            rows={2}
            className="min-h-0 resize-none font-[var(--font-display)] italic text-[15px] bg-cream-50"
          />
        </Card>
      ))}

      <div className="flex items-center justify-between px-1 py-2">
        <span className="font-[var(--font-display)] italic text-[13px] text-bark-500">
          {saved
            ? "Saved. Quill bookmarked the week."
            : "Save when you're ready — there's no quota."}
        </span>
        <div className="flex items-center gap-2">
          {savedTick !== null ? (
            <InlineConfirmation key={savedTick} message="Saved" />
          ) : null}
          <Tooltip
            label={
              aiEnabled
                ? "Save and ask the coach for a summary + next-week plan"
                : "AI is not connected"
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generate}
              disabled={pending || !aiEnabled}
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate AI summary
            </Button>
          </Tooltip>
          <Button type="submit" variant="save" disabled={pending}>
            <SaveCrystal size={14} />
            {pending ? "Saving..." : "Save review (+50 XP)"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-[12px] text-[color:var(--danger-500)] px-1">{error}</p>
      ) : null}
    </form>
  );
}
