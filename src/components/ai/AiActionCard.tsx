"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  approveAiAction,
  rejectAiAction,
} from "@/lib/actions/ai-coach-actions";

export type AiActionView = {
  id: string;
  type: string;
  payload: unknown;
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "APPLIED" | "FAILED";
  error: string | null;
  createdAt: Date;
};

const STATUS_TONE: Record<AiActionView["status"], "ghost" | "done" | "coral" | "leaf"> = {
  PROPOSED: "coral",
  APPROVED: "leaf",
  REJECTED: "ghost",
  APPLIED: "done",
  FAILED: "coral",
};

const STATUS_LABEL: Record<AiActionView["status"], string> = {
  PROPOSED: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  APPLIED: "Applied",
  FAILED: "Failed",
};

function formatPayload(action: AiActionView): string {
  const p = action.payload as Record<string, unknown>;
  if (!p || typeof p !== "object") return JSON.stringify(action.payload);
  switch (action.type) {
    case "CREATE_TASK": {
      const sched = p.scheduledDate ? ` for ${p.scheduledDate}` : "";
      const prio = p.priority ? ` · ${p.priority}` : "";
      return `Create task: ${p.title}${sched}${prio}`;
    }
    case "SCHEDULE_TASK":
      return `Schedule task ${p.taskId} for ${p.scheduledDate}`;
    case "CREATE_TIME_BLOCK":
      return `Block ${p.startTime}-${p.endTime} on ${p.date}: ${p.title} (${p.category ?? "FLEXIBLE"})`;
    case "CREATE_WEEKLY_TARGET":
      return `Weekly target (${p.weekStartDate}): ${p.title}`;
    case "UPDATE_WEEK":
      return `Update week ${p.weekStartDate}: ${[
        p.bigRock !== undefined ? `bigRock="${p.bigRock}"` : null,
        p.reflection !== undefined
          ? `reflection (${String(p.reflection).length} chars)`
          : null,
      ]
        .filter(Boolean)
        .join(", ")}`;
    case "LOG_HABIT":
      return `Log habit "${p.habitName}" on ${p.date} as ${p.status}`;
    default:
      return JSON.stringify(p);
  }
}

export function AiActionCard({ action }: { action: AiActionView }) {
  const [pending, startTransition] = useTransition();
  const [showJson, setShowJson] = useState(false);
  const isPending = action.status === "PROPOSED";

  return (
    <li className="border border-cream-200 bg-bg-raised rounded-md px-4 py-[14px] shadow-[var(--shadow-1)]">
      <div className="font-[var(--font-body)] text-[14.5px] text-ink-800 leading-[1.5]">
        {formatPayload(action)}
      </div>
      {action.error ? (
        <p className="mt-1 text-[12px] text-[color:var(--danger-500)]">
          Error: {action.error}
        </p>
      ) : null}
      <div className="flex items-center gap-2 mt-3">
        {isPending ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="success"
              onClick={() =>
                startTransition(async () => {
                  await approveAiAction({ actionId: action.id });
                })
              }
              disabled={pending}
            >
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                startTransition(async () => {
                  await rejectAiAction({ actionId: action.id });
                })
              }
              disabled={pending}
            >
              <X className="h-3 w-3" /> Skip
            </Button>
          </>
        ) : (
          <Pill tone={STATUS_TONE[action.status]}>
            {STATUS_LABEL[action.status]}
          </Pill>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className={cn(
            "text-bark-500 text-[12px] cursor-pointer select-none",
            "hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded px-1",
          )}
        >
          {showJson ? "Hide details" : "Show details"}
        </button>
      </div>
      {showJson ? (
        <pre className="mt-2 px-3 py-[10px] bg-cream-50 border border-dashed border-cream-300 rounded-[8px] font-[var(--font-mono)] text-[11.5px] text-bark-600 whitespace-pre-wrap">
          {JSON.stringify(action.payload, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
