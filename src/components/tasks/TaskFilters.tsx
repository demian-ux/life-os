import Link from "next/link";
import {
  Archive,
  Calendar,
  CalendarDays,
  Inbox,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type TaskView = "inbox" | "today" | "week" | "someday" | "done";

const TABS: { key: TaskView; label: string; icon: typeof Inbox }[] = [
  { key: "inbox",   label: "Inbox",     icon: Inbox },
  { key: "today",   label: "Today",     icon: Calendar },
  { key: "week",    label: "This week", icon: CalendarDays },
  { key: "someday", label: "Someday",   icon: Moon },
  { key: "done",    label: "Done",      icon: Archive },
];

export function TaskFilters({
  active,
  counts,
}: {
  active: TaskView;
  counts: Record<TaskView, number>;
}) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 p-1 bg-cream-100 border border-cream-200 rounded-[10px]",
        "w-fit max-w-full overflow-x-auto",
      )}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={`/tasks?view=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[6px]",
              "font-[var(--font-body)] font-bold text-[12px] uppercase tracking-[0.04em]",
              "border border-transparent transition-colors duration-[120ms]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
              isActive
                ? "bg-bg-raised text-ink-800 border-cream-200 shadow-[var(--shadow-1)]"
                : "text-bark-600 hover:text-ink-800",
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {tab.label}
            <span
              className={cn(
                "font-[var(--font-pixel)] text-[8px] px-[4px] py-[2px] rounded-[3px]",
                isActive
                  ? "bg-coral-100 text-[#A8412B]"
                  : "bg-cream-200 text-bark-700",
              )}
            >
              {counts[tab.key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
