"use client";

import { useTransition } from "react";
import { CalendarClock, CalendarOff, Check, Play } from "lucide-react";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toggleTimeBlockDone } from "@/lib/actions/week-actions";

type Block = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
};

export function TodayBlocks({ blocks }: { blocks: Block[] }) {
  const [pending, startTransition] = useTransition();
  const doneCount = blocks.filter((b) => b.status === "DONE").length;

  return (
    <Card>
      <SectionHeading
        icon={CalendarClock}
        action={
          <span className="font-[var(--font-mono)] text-[11px] text-bark-500 tabular-nums">
            {doneCount}/{blocks.length} done
          </span>
        }
      >
        Today&apos;s blocks
      </SectionHeading>
      {blocks.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="Open day"
          body="No blocks scheduled. Add one on the Week page if you want structure."
        />
      ) : (
        <ul className="flex flex-col gap-[10px] m-0 p-0 list-none">
          {blocks.map((block) => {
            const done = block.status === "DONE";
            const active = block.status === "ACTIVE";
            return (
              <li
                key={block.id}
                className={cn(
                  "grid grid-cols-[94px_1fr_auto] gap-3 items-center px-3 py-[10px] rounded-[10px] border border-cream-200",
                  active && "bg-coral-100",
                  done && "bg-cream-50",
                  !done && !active && "bg-bg-raised",
                )}
              >
                <span
                  className={cn(
                    "font-[var(--font-mono)] text-[13px] font-semibold tabular-nums",
                    active ? "text-[#A8412B]" : "text-bark-600",
                  )}
                >
                  {block.startTime}–{block.endTime}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      await toggleTimeBlockDone({ timeBlockId: block.id });
                    })
                  }
                  disabled={pending}
                  className={cn(
                    "text-left text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded",
                    done
                      ? "line-through text-bark-500"
                      : active
                        ? "font-bold text-ink-800"
                        : "font-medium text-ink-800",
                  )}
                  aria-label={done ? "Mark not done" : "Mark done"}
                >
                  {block.title}
                </button>
                {done ? (
                  <Pill tone="leaf">
                    <Check className="h-3 w-3" /> +15 XP
                  </Pill>
                ) : active ? (
                  <Pill tone="coral">
                    <Play className="h-3 w-3" /> now
                  </Pill>
                ) : (
                  <Pill tone="ghost">planned</Pill>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
