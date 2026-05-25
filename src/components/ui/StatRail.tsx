import { cn } from "@/lib/cn";

type StatRailKind = "hp" | "mp";

type StatRailProps = {
  kind: StatRailKind;
  value: number;
  max: number;
  label?: string;
  className?: string;
};

/**
 * HP/MP rail used on the Progress / Status screen.
 *  - HP (coral) = consistency %
 *  - MP (sky) = habit-day count this week
 */
export function StatRail({
  kind,
  value,
  max,
  label,
  className,
}: StatRailProps) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const isHp = kind === "hp";
  const labelText = label ?? (isHp ? "HP" : "MP");
  return (
    <div
      className={cn(
        "grid grid-cols-[32px_1fr_64px] gap-[10px] items-center",
        className,
      )}
    >
      <span
        className={cn(
          "font-[var(--font-pixel)] text-[9px]",
          isHp ? "text-coral-500" : "text-sky-500",
        )}
      >
        {labelText}
      </span>
      <div
        className="h-[12px] rounded-full overflow-hidden border-[1.5px] border-ink-800 bg-cream-200 [box-shadow:inset_0_2px_0_rgba(91,74,51,0.10)]"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={labelText}
      >
        <div
          className="h-full rounded-full transition-[width] duration-[420ms]"
          style={{
            width: `${pct * 100}%`,
            background: isHp
              ? "linear-gradient(180deg, #F7B5A6, #EE6A4D)"
              : "linear-gradient(180deg, #B0C9EB, #5B91D4)",
            boxShadow:
              "inset 0 -2px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)",
            transitionTimingFunction: "var(--ease-pop)",
          }}
        />
      </div>
      <span className="font-[var(--font-mono)] text-[13px] text-ink-800 text-right tabular-nums">
        {value}
        <span className="text-bark-500">/{max}</span>
      </span>
    </div>
  );
}
