import type { TraitAxis } from "@prisma/client";
import { ProgressBar, SectionHeading } from "@/components/ui";
import type { TraitView } from "@/lib/retention/queries";

const AXIS_LABEL: Record<TraitAxis, string> = {
  DISCIPLINE: "Discipline",
  AUDACITY: "Audacity",
  RECOVERY: "Recovery",
  FOCUS: "Focus",
  CRAFT: "Craft",
};

const AXIS_BLURB: Record<TraitAxis, string> = {
  DISCIPLINE: "Showing up. Following through.",
  AUDACITY: "Reaching out. Setting big rocks.",
  RECOVERY: "Rest, sleep, stretching, restraint.",
  FOCUS: "Deep-work hours, single-tasking.",
  CRAFT: "Learning, making, practicing.",
};

function formatPct(p: number | null): string | null {
  if (p === null) return null;
  const sign = p >= 0 ? "+" : "";
  return `${sign}${Math.round(p * 100)}% vs 30 days ago`;
}

export function TraitList({ traits }: { traits: TraitView[] }) {
  return (
    <div className="grid gap-3">
      <SectionHeading>Traits</SectionHeading>
      <ul className="grid gap-3">
        {traits.map((t) => {
          const pct = formatPct(t.pctChange30d);
          const fraction =
            t.toNext > 0 ? t.intoLevel / (t.intoLevel + t.toNext) : 1;
          return (
            <li key={t.axis} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-body font-medium text-ink">
                    {AXIS_LABEL[t.axis]}
                  </span>
                  <span className="text-meta text-ink-muted ml-2">
                    {AXIS_BLURB[t.axis]}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-body font-medium text-ink tabular-nums">
                    lvl {t.level}
                  </span>
                  {pct ? (
                    <span className="text-meta text-ink-muted tabular-nums">
                      {pct}
                    </span>
                  ) : null}
                </div>
              </div>
              <ProgressBar
                value={fraction}
                aria-label={`${AXIS_LABEL[t.axis]} level ${t.level} progress`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
