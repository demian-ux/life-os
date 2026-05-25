import { Mountain } from "lucide-react";
import { ProgressBar, SectionHeading } from "@/components/ui";
import type { RankTier, SeasonProgress } from "@/lib/retention/seasons";
import type { Season } from "@prisma/client";

type Props = {
  season: Season;
  rank: number;
  tier: RankTier;
  nextTier: RankTier | null;
  rankIntoTier: number;
  rankToNextTier: number | null;
  progress: SeasonProgress;
  highestRankEver: number;
};

export function SeasonCard(props: Props) {
  const tierFraction = props.nextTier
    ? props.rankIntoTier / (props.nextTier.min - props.tier.min)
    : 1;

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionHeading className="flex items-center gap-1.5">
            <Mountain className="h-3.5 w-3.5" />
            Season
          </SectionHeading>
          <p className="font-serif text-title text-ink mt-1">
            {props.tier.name}
          </p>
          <p className="text-meta text-ink-muted tabular-nums">
            Rank {props.rank}
            {props.nextTier
              ? ` · ${props.rankToNextTier} to ${props.nextTier.name}`
              : " · top tier reached"}
          </p>
        </div>
        <div className="text-right">
          <SectionHeading>Time</SectionHeading>
          <p className="text-body font-medium text-ink tabular-nums mt-1">
            day {props.progress.daysIn}/{props.progress.totalDays}
          </p>
          <p className="text-meta text-ink-muted">
            {props.progress.daysRemaining} left
          </p>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar
          value={Math.min(1, tierFraction)}
          aria-label="Season tier progress"
        />
      </div>
      {props.highestRankEver > 0 ? (
        <p className="text-meta text-ink-muted mt-3 italic">
          All-time peak: rank {props.highestRankEver}
        </p>
      ) : null}
    </div>
  );
}
