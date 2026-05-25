import { Pill, SectionHeading } from "@/components/ui";
import type { RankTier } from "@/lib/retention/seasons";
import type { Season } from "@prisma/client";

type Entry = Season & { tier: RankTier };

function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y % 100}`;
}

export function PastSeasons({ seasons }: { seasons: Entry[] }) {
  if (seasons.length === 0) return null;
  return (
    <div className="grid gap-2">
      <SectionHeading>Past seasons</SectionHeading>
      <ul className="grid gap-1">
        {seasons.map((s) => (
          <li
            key={s.id}
            className="rounded-input border border-line-soft px-3 py-2 flex items-center justify-between gap-3"
          >
            <span className="text-body-sm text-ink tabular-nums">
              {shortDate(s.startDate)} → {shortDate(s.endDate)}
            </span>
            <div className="flex items-center gap-2">
              <Pill>{s.tier.name}</Pill>
              <span className="text-meta text-ink-muted tabular-nums">
                rank {s.finalRank ?? 0}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
