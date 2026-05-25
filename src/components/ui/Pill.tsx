import { cn } from "@/lib/cn";

type PillTone =
  | "default"
  | "coral"
  | "sky"
  | "gold"
  | "leaf"
  | "plum"
  | "xp"
  | "quest"
  | "done"
  | "ghost"
  // Legacy aliases — map to closest new tone
  | "neutral"
  | "accent"
  | "skipped"
  | "missed"
  | "warn";

const TONES: Record<PillTone, string> = {
  default:
    "bg-cream-200 text-bark-700 border border-cream-300",
  coral:
    "bg-coral-100 text-[#A8412B] border border-coral-300",
  sky:
    "bg-sky-100 text-[#2F5B95] border border-sky-300",
  gold:
    "bg-gold-100 text-[#8A5E1A] border border-gold-300",
  leaf:
    "bg-leaf-100 text-[#3F7752] border border-leaf-300",
  plum:
    "bg-plum-100 text-[#5C3F73] border border-plum-300",
  xp:
    "bg-ink-800 text-gold-500 border-2 border-ink-800 font-[var(--font-pixel)] text-[9px] " +
    "px-[7px] py-[4px] rounded-[4px] tracking-[0.04em] [box-shadow:0_2px_0_var(--ink-800)]",
  quest:
    "text-white border border-[#7A529A] [background:linear-gradient(180deg,#C58CD9,#9B6FB6)]",
  done:
    "bg-leaf-500 text-white border border-[#3F7752]",
  ghost:
    "bg-transparent border-[1.5px] border-dashed border-cream-300 text-bark-500",
  // Legacy
  neutral:
    "bg-cream-200 text-bark-700 border border-cream-300",
  accent:
    "bg-coral-100 text-[#A8412B] border border-coral-300",
  skipped:
    "bg-cream-200 text-bark-500 border border-cream-300",
  missed:
    "bg-coral-100 text-[#A8412B] border border-coral-300",
  warn:
    "bg-gold-100 text-[#8A5E1A] border border-gold-300",
};

type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: PillTone;
};

export function Pill({ className, tone = "default", ...rest }: PillProps) {
  const isXp = tone === "xp";
  return (
    <span
      className={cn(
        !isXp &&
          "inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full " +
            "font-[var(--font-body)] font-semibold text-[11.5px] whitespace-nowrap",
        isXp && "inline-flex items-center gap-[5px] whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
