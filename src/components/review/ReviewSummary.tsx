import { AiActionCard, type AiActionView } from "@/components/ai/AiActionCard";
import { SectionHeading } from "@/components/ui";

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
};

export function ReviewSummary({
  assistantMessage,
  warnings,
  actions,
}: {
  assistantMessage: Message | null;
  warnings: Message[];
  actions: AiActionView[];
}) {
  if (!assistantMessage && warnings.length === 0 && actions.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <SectionHeading>Coach summary</SectionHeading>
      {assistantMessage ? (
        <div className="rounded-card border border-accent/30 bg-accent-soft px-3 py-2">
          <p className="text-body text-ink whitespace-pre-wrap">
            {assistantMessage.content}
          </p>
        </div>
      ) : null}
      {warnings.map((w) => (
        <div
          key={w.id}
          className="rounded-card border border-status-warn/40 bg-status-warn/10 px-3 py-2 text-meta text-ink whitespace-pre-wrap"
        >
          {w.content}
        </div>
      ))}
      {actions.length > 0 ? (
        <div>
          <SectionHeading className="mb-1">Proposed for next week</SectionHeading>
          <ul className="grid gap-2">
            {actions.map((a) => (
              <AiActionCard key={a.id} action={a} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
