import { cn } from "@/lib/cn";

type XpBarSize = "mini" | "md" | "lg";

type XpBarProps = {
  value: number; // 0..1 fraction into level
  size?: XpBarSize;
  className?: string;
  "aria-label"?: string;
};

const SIZE_CLASS: Record<XpBarSize, string> = {
  mini: "h-[6px] border",
  md:   "h-[10px] border-[1.5px]",
  lg:   "h-[16px] border-2",
};

/**
 * The brand XP bar — pixel-ink-bordered, gold→plum gradient fill.
 * Used in the sidebar hero, identity hero, progress XP rail, etc.
 */
export function XpBar({
  value,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: XpBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        "w-full rounded-full overflow-hidden border-ink-800 bg-cream-200",
        "[box-shadow:inset_0_2px_0_rgba(91,74,51,0.10)]",
        SIZE_CLASS[size],
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? "Experience"}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[420ms]"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(180deg, #FFD46B 0%, #F3B842 40%, #C58CD9 100%)",
          boxShadow:
            "inset 0 -2px 0 rgba(91,74,51,0.18), inset 0 1px 0 rgba(255,255,255,0.4)",
          transitionTimingFunction: "var(--ease-pop)",
        }}
      />
    </div>
  );
}
