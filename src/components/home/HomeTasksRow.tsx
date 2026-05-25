"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, ListChecks, Square } from "lucide-react";
import type { Task } from "@prisma/client";
import { Card, SectionHeading } from "@/components/ui";
import { toggleTaskComplete } from "@/lib/actions/task-actions";
import { cn } from "@/lib/cn";

type HomeTasksRowProps = {
  tasks: Task[];
};

export function HomeTasksRow({ tasks }: HomeTasksRowProps) {
  const [pending, startTransition] = useTransition();

  if (tasks.length === 0) {
    return (
      <Card>
        <SectionHeading icon={ListChecks}>Today&rsquo;s Tasks</SectionHeading>
        <p className="text-[13px] text-bark-500 mt-2">
          Nothing scheduled for today.{" "}
          <Link href="/tasks" className="text-coral-500 hover:underline">
            Plan some tasks →
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeading
        icon={ListChecks}
        action={
          <Link
            href="/tasks"
            className="text-[12px] text-coral-500 hover:underline flex items-center gap-1"
          >
            All <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        Today&rsquo;s Tasks
      </SectionHeading>
      <ul className="grid gap-1 mt-2">
        {tasks.map((task) => {
          const done = task.status === "DONE";
          return (
            <li key={task.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleTaskComplete({ taskId: task.id });
                  })
                }
                className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
                  done
                    ? "bg-coral-500 border-coral-500 text-white"
                    : "bg-white border-cream-300 hover:bg-cream-50",
                )}
                aria-label={done ? `Uncomplete ${task.title}` : `Complete ${task.title}`}
              >
                {done ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <Square className="h-3 w-3 opacity-0" />
                )}
              </button>
              <span
                className={cn(
                  "text-[13px]",
                  done ? "text-bark-500 line-through" : "text-bark-700",
                )}
              >
                {task.title}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
