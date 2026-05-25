import { cn } from "@/lib/cn";

export type HcellState = "ideal" | "min" | "miss" | "skip" | "off";

type HcellProps = {
  state: HcellState;
  isToday?: boolean;
  className?: string;
};

const STATE_CLASS: Record<HcellState, string> = {
  ideal: "bg-leaf-500 text-white border-[color:#3F7752]",
  min:   "bg-leaf-300 text-[#3F7752] border-leaf-500",
  miss:  "bg-coral-100 text-[#A8412B] border-coral-300",
  skip:  "bg-cream-200 text-bark-500 border-cream-300",
  off:   "bg-transparent text-cream-400 border-dashed border-cream-300",
};

const STATE_GLYPH: Record<HcellState, string> = {
  ideal: "✦",
  min:   "✓",
  miss:  "•",
  skip:  "—",
  off:   "",
};

/**
 * Single cell in the weekly habit grid. 5 states; today gets an outline ring.
 */
export function Hcell({ state, isToday, className }: HcellProps) {
  return (
    <span
      className={cn(
        "w-[22px] h-[22px] rounded-[6px] inline-flex items-center justify-center",
        "font-[var(--font-pixel)] text-[8px] border-[1.5px]",
        STATE_CLASS[state],
        isToday && "outline outline-2 outline-coral-500 outline-offset-[1px]",
        className,
      )}
      aria-label={state}
    >
      {STATE_GLYPH[state]}
    </span>
  );
}
