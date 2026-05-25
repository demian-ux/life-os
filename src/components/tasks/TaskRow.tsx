"use client";

import { useState, useTransition } from "react";
import {
  Archive,
  CalendarClock,
  Check,
  Inbox,
  MoonStar,
  Pencil,
  X,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Label,
  Textarea,
  Tooltip,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  archiveTask,
  moveToInbox,
  moveToSomeday,
  scheduleTask,
  toggleTaskComplete,
  updateTask,
} from "@/lib/actions/task-actions";
import type {
  EnergyLevel,
  Priority,
  TaskStatus,
} from "@/lib/validators/task";

export type TaskRowData = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  energy: EnergyLevel;
  estimatedMinutes: number | null;
  dueDate: string | null;
  scheduledDate: string | null;
};

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const ENERGIES: EnergyLevel[] = ["LOW", "MEDIUM", "HIGH"];

const PRIORITY_DOT: Record<Priority, string> = {
  LOW: "bg-ink-muted",
  MEDIUM: "bg-accent",
  HIGH: "bg-status-warn",
  URGENT: "bg-status-missed",
};

export function TaskRow({
  task,
  showDate = false,
  todayDate,
}: {
  task: TaskRowData;
  showDate?: boolean;
  todayDate: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(fn: () => Promise<{ ok: boolean; error?: string } & T>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Failed");
    });
  }

  if (editing) {
    return (
      <li>
        <TaskEditor
          initial={task}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
        {error ? (
          <p className="text-meta text-status-missed mt-1 ml-7">{error}</p>
        ) : null}
      </li>
    );
  }

  const done = task.status === "DONE";
  const inboxOrSomeday =
    task.status === "INBOX" || task.status === "SOMEDAY";

  return (
    <li className="group rounded-input px-2 py-1.5 hover:bg-line-soft transition-colors duration-150">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => run(async () => toggleTaskComplete({ taskId: task.id }))}
          disabled={pending}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={cn(
            "h-5 w-5 mt-0.5 rounded-pill border flex items-center justify-center shrink-0 transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
            done
              ? "bg-accent border-accent text-bg"
              : "border-line hover:border-ink-soft",
          )}
        >
          {done ? <Check className="h-3 w-3" /> : null}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip label={`Priority: ${task.priority}`}>
              <span
                aria-label={`Priority ${task.priority}`}
                className={cn("h-1.5 w-1.5 rounded-pill", PRIORITY_DOT[task.priority])}
              />
            </Tooltip>
            <span
              className={cn(
                "text-body",
                done ? "line-through text-ink-muted" : "text-ink",
              )}
            >
              {task.title}
            </span>
            {showDate && task.scheduledDate ? (
              <span className="text-meta text-ink-muted tabular-nums">
                {task.scheduledDate}
              </span>
            ) : null}
            {task.estimatedMinutes ? (
              <span className="text-meta text-ink-muted">
                {task.estimatedMinutes}m
              </span>
            ) : null}
            <span className="text-micro uppercase text-ink-muted">
              {task.energy}
            </span>
          </div>
          {task.notes ? (
            <p className="text-meta text-ink-soft mt-0.5 whitespace-pre-wrap">
              {task.notes}
            </p>
          ) : null}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <Tooltip label="Edit">
            <IconButton label="Edit task" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip label="Schedule for today">
            <IconButton
              label="Schedule for today"
              size="sm"
              onClick={() =>
                run(async () => scheduleTask({ taskId: task.id, scheduledDate: todayDate }))
              }
            >
              <CalendarClock className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
          {!inboxOrSomeday ? (
            <Tooltip label="Move to inbox">
              <IconButton
                label="Move to inbox"
                size="sm"
                onClick={() => run(async () => moveToInbox({ taskId: task.id }))}
              >
                <Inbox className="h-3.5 w-3.5" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip label="Move to someday">
            <IconButton
              label="Move to someday"
              size="sm"
              onClick={() => run(async () => moveToSomeday({ taskId: task.id }))}
            >
              <MoonStar className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip label="Archive">
            <IconButton
              label="Archive task"
              size="sm"
              onClick={() => run(async () => archiveTask({ taskId: task.id }))}
              className="hover:text-status-missed"
            >
              <Archive className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      {error ? (
        <p className="text-meta text-status-missed mt-1 ml-7">{error}</p>
      ) : null}
    </li>
  );
}

function TaskEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TaskRowData;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [energy, setEnergy] = useState<EnergyLevel>(initial.energy);
  const [minutes, setMinutes] = useState(
    initial.estimatedMinutes ? String(initial.estimatedMinutes) : "",
  );
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [scheduledDate, setScheduledDate] = useState(initial.scheduledDate ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const minutesNum = minutes ? Number(minutes) : undefined;
    startTransition(async () => {
      const result = await updateTask({
        taskId: initial.id,
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        energy,
        estimatedMinutes: Number.isFinite(minutesNum)
          ? (minutesNum as number)
          : undefined,
        dueDate: dueDate || undefined,
        scheduledDate: scheduledDate || undefined,
      });
      if (result.ok) {
        onSaved();
      } else {
        setError(result.error);
      }
    });
  }

  const selectClass =
    "bg-surface border border-line rounded-input px-2 py-1.5 text-body-sm text-ink " +
    "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-card border border-line p-3 bg-line-soft"
    >
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="min-h-0 resize-none"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="te-priority">Priority</Label>
          <select
            id="te-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={selectClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="te-energy">Energy</Label>
          <select
            id="te-energy"
            value={energy}
            onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
            className={selectClass}
          >
            {ENERGIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="te-min">Estimate (min)</Label>
          <Input
            id="te-min"
            type="number"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="te-due">Due</Label>
          <Input
            id="te-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="te-sched">Scheduled</Label>
          <Input
            id="te-sched"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={pending || !title.trim()}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" size="sm" variant="subtle" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        {error ? (
          <span className="text-meta text-status-missed ml-auto">{error}</span>
        ) : null}
      </div>
    </form>
  );
}
