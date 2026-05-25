import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { TaskRow, type TaskRowData } from "./TaskRow";

export function TaskList({
  tasks,
  todayDate,
  showDate = false,
  emptyMessage,
}: {
  tasks: TaskRowData[];
  todayDate: string;
  showDate?: boolean;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState icon={Inbox} title={emptyMessage ?? "Nothing here yet."} />;
  }
  return (
    <ul className="grid gap-0.5">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          todayDate={todayDate}
          showDate={showDate}
        />
      ))}
    </ul>
  );
}
