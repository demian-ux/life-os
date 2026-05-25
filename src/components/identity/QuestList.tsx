import { Compass, Eye } from "lucide-react";
import { EmptyState, Pill, SectionHeading } from "@/components/ui";
import type { QuestView } from "@/lib/retention/quests";

type Props = {
  active: QuestView[];
  hidden: QuestView[];
  completed: QuestView[];
};

export function QuestList({ active, hidden, completed }: Props) {
  return (
    <div className="grid gap-3">
      <SectionHeading>Quests</SectionHeading>
      {active.length === 0 && completed.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No active quests yet"
          body="They reveal as your pattern emerges."
        />
      ) : (
        <ul className="grid gap-2">
          {active.map((q) => (
            <li
              key={q.id}
              className="rounded-card border-l-4 border-l-accent border-y border-r border-line bg-accent-soft px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-medium text-ink">{q.name}</span>
                <Pill tone="accent">Active</Pill>
              </div>
              <p className="text-meta text-ink-soft mt-0.5">{q.description}</p>
            </li>
          ))}
          {completed.map((q) => (
            <li
              key={q.id}
              className="rounded-card border border-status-done/40 bg-status-done/10 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-medium text-ink">{q.name}</span>
                <Pill tone="done">Complete</Pill>
              </div>
              <p className="text-meta text-ink-soft mt-0.5">{q.description}</p>
            </li>
          ))}
        </ul>
      )}
      {hidden.length > 0 ? (
        <div className="rounded-card border border-dashed border-line px-3 py-2 flex items-center gap-2 text-meta text-ink-muted">
          <Eye className="h-3.5 w-3.5" />
          {hidden.length} hidden quest{hidden.length === 1 ? "" : "s"} — they
          reveal when conditions align.
        </div>
      ) : null}
    </div>
  );
}
