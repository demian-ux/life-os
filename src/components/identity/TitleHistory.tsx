import type { Title } from "@prisma/client";
import { EmptyState, Pill, SectionHeading } from "@/components/ui";
import { Award } from "lucide-react";

type TitleEntry = Title & { tagline: string };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function TitleHistory({ titles }: { titles: TitleEntry[] }) {
  return (
    <div className="grid gap-3">
      <SectionHeading>Title history</SectionHeading>
      {titles.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No titles earned yet"
          body="Keep going. The first title emerges from your pattern."
        />
      ) : (
        <ul className="grid gap-2">
          {titles.map((t) => (
            <li
              key={t.id}
              className="rounded-card border border-line bg-surface px-3 py-2 flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-ink">
                    {t.name}
                  </span>
                  {t.active ? null : <Pill tone="skipped">past</Pill>}
                </div>
                <p className="text-meta text-ink-muted mt-0.5">{t.tagline}</p>
              </div>
              <span className="text-meta text-ink-muted tabular-nums shrink-0 mt-1">
                {formatDate(t.earnedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
