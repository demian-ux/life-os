import { Card, ProgressBar, SectionHeading } from "@/components/ui";

export function XpBar({
  xp,
  level,
  intoLevel,
  toNext,
  nextLevelAt,
}: {
  xp: number;
  level: number;
  intoLevel: number;
  toNext: number;
  nextLevelAt: number;
}) {
  const segmentSize = nextLevelAt - (xp - intoLevel);
  const fraction =
    segmentSize > 0 ? Math.min(1, intoLevel / segmentSize) : 1;

  return (
    <Card>
      <div className="flex items-end justify-between mb-3">
        <div>
          <SectionHeading>Level</SectionHeading>
          <div className="font-serif text-display text-ink tabular-nums leading-none mt-1">
            {level}
          </div>
        </div>
        <div className="text-right">
          <SectionHeading>XP</SectionHeading>
          <div className="text-title font-medium tabular-nums leading-none mt-1">
            {xp}
          </div>
        </div>
      </div>
      <ProgressBar value={fraction} aria-label={`Level ${level} progress`} />
      <p className="text-meta text-ink-muted mt-2 tabular-nums">
        {toNext} XP to level {level + 1}
      </p>
    </Card>
  );
}
