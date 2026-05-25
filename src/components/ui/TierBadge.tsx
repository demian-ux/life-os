import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { tierFor } from "@/lib/retention/streak-tiers";

type TierBadgeProps = {
  streak: number;
  mini?: boolean;
  className?: string;
};

const TIER_STYLE: Record<string, string> = {
  Ember:
    "bg-[#FCE4DD] text-[#A8412B] border-ink-800 [box-shadow:0_2px_0_var(--ink-800)]",
  Spark:
    "bg-gold-100 text-[#8A5E1A] border-ink-800 [box-shadow:0_2px_0_var(--ink-800)]",
  Flame:
    "bg-coral-500 text-white border-[color:#A8412B] [box-shadow:0_2px_0_#A8412B]",
  Forge:
    "bg-plum-300 text-white border-[color:#5C3F73] [box-shadow:0_2px_0_#5C3F73]",
  Veteran:
    "text-ink-900 border-ink-800 [box-shadow:0_2px_0_var(--ink-800)] [background:linear-gradient(180deg,#FFD46B,#C58CD9)]",
};

const BASE_BADGE =
  "inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[4px] " +
  "font-[var(--font-pixel)] text-[8px] tracking-[0.06em] whitespace-nowrap border-2";

/**
 * Streak tier badge — chooses the highest tier the streak qualifies for via
 * `tierFor()`. Falls back to a plain "— Nd" chip when streak is below tier 1.
 */
export function TierBadge({ streak, mini = false, className }: TierBadgeProps) {
  const tier = tierFor(streak);
  if (!tier) {
    return (
      <span
        className={cn(
          BASE_BADGE,
          "bg-cream-200 text-bark-500 border-cream-300 [box-shadow:none]",
          mini && "text-[7px] px-[6px] py-[2px]",
          className,
        )}
      >
        — {streak}d
      </span>
    );
  }
  return (
    <span
      className={cn(
        BASE_BADGE,
        TIER_STYLE[tier.label] ?? "",
        mini && "text-[7px] px-[6px] py-[2px]",
        className,
      )}
    >
      <Star className="h-[8px] w-[8px]" strokeWidth={2.5} />
      {tier.label.toUpperCase()} · {streak}d
    </span>
  );
}
