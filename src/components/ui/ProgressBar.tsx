import { cn } from "@/lib/cn";

type ProgressTone =
  | "accent"
  | "leaf"
  | "sky"
  | "gold"
  | "plum"
  | "coral"
  // Legacy
  | "done";

type ProgressBarProps = {
  value: number; // 0..1
  tone?: ProgressTone;
  className?: string;
  "aria-label"?: string;
};

const FILL_COLOR: Record<ProgressTone, string> = {
  accent: "var(--coral-500)",
  coral: "var(--coral-500)",
  leaf: "var(--leaf-500)",
  sky: "var(--sky-500)",
  gold: "var(--gold-500)",
  plum: "var(--plum-500)",
  done: "var(--leaf-500)",
};

export function ProgressBar({
  value,
  tone = "accent",
  className,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        "h-[7px] w-full rounded-full overflow-hidden bg-cream-200 border border-cream-300",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full transition-[width] duration-[420ms]"
        style={{
          width: `${pct}%`,
          background: FILL_COLOR[tone],
          transitionTimingFunction: "var(--ease-pop)",
        }}
      />
    </div>
  );
}
