import { Topbar } from "@/components/layout/Topbar";
import { QuickCaptureBar } from "@/components/tasks/QuickCaptureBar";
import { TaskFilters, type TaskView } from "@/components/tasks/TaskFilters";
import { TaskList } from "@/components/tasks/TaskList";
import type { TaskRowData } from "@/components/tasks/TaskRow";
import { prisma } from "@/lib/db";
import { addDays, getWeekStart, todayKey } from "@/lib/dates";
import { DEFAULT_TIMEZONE } from "@/lib/user";
import type {
  EnergyLevel,
  Priority,
  TaskStatus,
} from "@/lib/validators/task";

export const dynamic = "force-dynamic";

const VALID_VIEWS: TaskView[] = ["inbox", "today", "week", "someday", "done"];

function isValidView(v: string | undefined): v is TaskView {
  return !!v && (VALID_VIEWS as string[]).includes(v);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view: TaskView = isValidView(params.view) ? params.view : "inbox";

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const today = todayKey(user?.timezone || DEFAULT_TIMEZONE);
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);

  if (!user) {
    return (
      <>
        <Topbar title="Tasks" />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const allTasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const counts: Record<TaskView, number> = {
    inbox: 0,
    today: 0,
    week: 0,
    someday: 0,
    done: 0,
  };
  for (const t of allTasks) {
    if (t.status === "INBOX") counts.inbox += 1;
    if (t.status === "SOMEDAY") counts.someday += 1;
    if (t.status === "DONE") counts.done += 1;
    if (t.scheduledDate === today && t.status !== "DONE") counts.today += 1;
    if (
      t.scheduledDate &&
      t.scheduledDate >= weekStart &&
      t.scheduledDate <= weekEnd &&
      t.status !== "DONE"
    ) {
      counts.week += 1;
    }
  }

  const filtered: TaskRowData[] = allTasks
    .filter((t) => {
      if (view === "inbox") return t.status === "INBOX";
      if (view === "someday") return t.status === "SOMEDAY";
      if (view === "done") return t.status === "DONE";
      if (view === "today")
        return t.scheduledDate === today && t.status !== "DONE";
      if (view === "week")
        return (
          t.scheduledDate !== null &&
          t.scheduledDate >= weekStart &&
          t.scheduledDate <= weekEnd &&
          t.status !== "DONE"
        );
      return false;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      status: t.status as TaskStatus,
      priority: t.priority as Priority,
      energy: t.energy as EnergyLevel,
      estimatedMinutes: t.estimatedMinutes,
      dueDate: t.dueDate,
      scheduledDate: t.scheduledDate,
    }));

  const emptyMessages: Record<TaskView, string> = {
    inbox: "Inbox is clear. That’s fine.",
    today: "Nothing scheduled for today.",
    week: "Nothing on the week yet.",
    someday: "No someday tasks.",
    done: "Nothing completed yet — start small.",
  };

  return (
    <>
      <Topbar title="Tasks" subtitle="Capture and organize." />
      <section className="px-8 py-6 grid gap-4 max-w-3xl">
        <QuickCaptureBar source="tasks" />
        <TaskFilters active={view} counts={counts} />
        <TaskList
          tasks={filtered}
          todayDate={today}
          showDate={view === "week" || view === "done"}
          emptyMessage={emptyMessages[view]}
        />
      </section>
    </>
  );
}
