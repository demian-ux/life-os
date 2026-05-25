import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type FxTone = "good" | "warn" | "mind" | "xp" | "body";

export type FxEffect = {
  id: string;
  label: string;
  tone: FxTone;
  icon: LucideIcon;
  tip?: string;
};

type FxChipProps = {
  effect: FxEffect;
  className?: string;
};

const TONE_BG: Record<FxTone, string> = {
  good: "bg-leaf-500",
  warn: "bg-[color:var(--warn-500)]",
  mind: "bg-sky-500",
  xp:   "bg-[color:var(--xp-500)]",
  body: "bg-coral-500",
};

/**
 * Status-effect chip — a small "FX" pill with a tinted glyph icon and label.
 * Used in the Status Effects strip on Today and Progress.
 */
export function FxChip({ effect, className }: FxChipProps) {
  const Icon = effect.icon;
  return (
    <span
      title={effect.tip}
      className={cn(
        "inline-flex items-center gap-[6px] py-[4px] pr-[10px] pl-[6px] " +
          "border-[1.5px] border-cream-300 bg-white rounded-full",
        className,
      )}
    >
      <span
        className={cn(
          "w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0",
          TONE_BG[effect.tone],
        )}
      >
        <Icon className="h-3 w-3 text-white" strokeWidth={2.25} />
      </span>
      <span className="font-[var(--font-body)] font-bold text-[11px] text-bark-700 tracking-[0.02em]">
        {effect.label}
      </span>
    </span>
  );
}
