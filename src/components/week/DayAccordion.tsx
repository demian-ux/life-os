"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Pill,
  Tooltip,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addTimeBlock,
  deleteTimeBlock,
  toggleTimeBlockDone,
  updateTimeBlock,
} from "@/lib/actions/week-actions";
import type { TimeBlockCategory } from "@/lib/validators/week";

type TimeBlock = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: TimeBlockCategory;
  status: string;
};

type DayPlan = {
  id: string;
  date: string;
  dayKey: string;
  label: string | null;
  focus: string | null;
  timeBlocks: TimeBlock[];
};

const CATEGORIES: TimeBlockCategory[] = [
  "FIXED",
  "FLEXIBLE",
  "FREE",
  "DEEP_WORK",
  "ADMIN",
  "RECOVERY",
  "SOCIAL",
  "HEALTH",
  "CREATIVE",
];

const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function DayAccordion({
  dayPlans,
  todayDate,
}: {
  dayPlans: DayPlan[];
  todayDate: string;
}) {
  const initialOpen =
    dayPlans.find((d) => d.date === todayDate)?.id ?? dayPlans[0]?.id;
  const [openId, setOpenId] = useState<string | null>(initialOpen ?? null);

  return (
    <div className="rounded-card border border-line bg-surface divide-y divide-line-soft">
      {dayPlans.map((day) => {
        const open = openId === day.id;
        const isToday = day.date === todayDate;
        const completed = day.timeBlocks.filter((b) => b.status === "DONE").length;
        return (
          <div key={day.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : day.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-line-soft transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg rounded-input"
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200",
                  open && "rotate-90",
                )}
              />
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="font-medium text-ink w-24 shrink-0">
                  {DAY_LABELS[day.dayKey] ?? day.dayKey}
                </span>
                <span className="text-meta text-ink-muted tabular-nums shrink-0">
                  {shortDate(day.date)}
                </span>
                {day.label ? (
                  <span className="text-body-sm text-ink-soft truncate">
                    {day.label}
                  </span>
                ) : null}
                {isToday ? <Pill tone="accent" className="ml-auto shrink-0">Today</Pill> : null}
              </div>
              <span className="text-meta text-ink-muted tabular-nums shrink-0">
                {completed}/{day.timeBlocks.length}
              </span>
            </button>
            {open ? (
              <div className="px-4 pb-4 pt-1 grid gap-2">
                {day.focus ? (
                  <p className="text-body-sm text-ink-soft">
                    Focus: {day.focus}
                  </p>
                ) : null}
                {day.timeBlocks.length === 0 ? (
                  <p className="text-body-sm text-ink-muted">
                    No blocks scheduled.
                  </p>
                ) : (
                  <ul className="grid gap-1.5">
                    {day.timeBlocks.map((block) => (
                      <TimeBlockRow key={block.id} block={block} />
                    ))}
                  </ul>
                )}
                <NewBlockForm dayPlanId={day.id} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TimeBlockRow({ block }: { block: TimeBlock }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li>
        <BlockForm
          mode="edit"
          initial={block}
          onSubmit={(values) => {
            setError(null);
            startTransition(async () => {
              const result = await updateTimeBlock({
                timeBlockId: block.id,
                ...values,
              });
              if (result.ok) {
                setEditing(false);
              } else {
                setError(result.error);
              }
            });
          }}
          onCancel={() => setEditing(false)}
          pending={pending}
          error={error}
        />
      </li>
    );
  }

  const done = block.status === "DONE";

  return (
    <li className="flex items-center gap-2 group rounded-input px-2 py-1.5 hover:bg-line-soft transition-colors duration-150">
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleTimeBlockDone({ timeBlockId: block.id });
            if (!result.ok) setError(result.error);
          });
        }}
        disabled={pending}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
          done
            ? "bg-accent border-accent text-bg"
            : "border-line hover:border-ink-soft",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </button>
      <span className="text-meta text-ink-muted tabular-nums w-24 shrink-0">
        {block.startTime}-{block.endTime}
      </span>
      <span
        className={cn(
          "flex-1 text-body",
          done ? "line-through text-ink-muted" : "text-ink",
        )}
      >
        {block.title}
      </span>
      <span className="text-micro uppercase text-ink-muted">
        {block.category.replace("_", " ")}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Tooltip label="Edit">
          <IconButton label="Edit block" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
        <Tooltip label="Delete">
          <IconButton
            label="Delete block"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await deleteTimeBlock({ timeBlockId: block.id });
                if (!result.ok) setError(result.error);
              });
            }}
            className="hover:text-status-missed"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
      </div>
      {error ? (
        <span className="text-meta text-status-missed ml-2">{error}</span>
      ) : null}
    </li>
  );
}

function NewBlockForm({ dayPlanId }: { dayPlanId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="subtle"
        className="self-start mt-1"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add block
      </Button>
    );
  }

  return (
    <BlockForm
      mode="create"
      onSubmit={(values) => {
        setError(null);
        startTransition(async () => {
          const result = await addTimeBlock({ dayPlanId, ...values });
          if (result.ok) {
            setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
      onCancel={() => setOpen(false)}
      pending={pending}
      error={error}
    />
  );
}

function BlockForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  mode: "create" | "edit";
  initial?: Pick<TimeBlock, "title" | "startTime" | "endTime" | "category">;
  onSubmit: (values: {
    title: string;
    startTime: string;
    endTime: string;
    category: TimeBlockCategory;
  }) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [category, setCategory] = useState<TimeBlockCategory>(
    initial?.category ?? "FLEXIBLE",
  );

  const selectClass =
    "bg-surface border border-line rounded-input px-2 py-1 text-body-sm text-ink " +
    "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title: title.trim(), startTime, endTime, category });
      }}
      className="grid gap-2 rounded-input border border-line p-2 bg-line-soft"
    >
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Block title"
        required
      />
      <div className="flex gap-2 flex-wrap items-center">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="w-auto tabular-nums"
        />
        <span className="text-ink-muted text-body-sm">to</span>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
          className="w-auto tabular-nums"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TimeBlockCategory)}
          className={selectClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !title.trim()}
          className="ml-auto"
        >
          {pending ? "Saving..." : mode === "create" ? "Add" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="subtle" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <p className="text-meta text-status-missed">{error}</p>
      ) : null}
    </form>
  );
}
