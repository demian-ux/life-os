import { cn } from "@/lib/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Retro game-style toggle. Ink-bordered track, leaf-green "on", coral thumb
 * shadow. Used in Settings.
 */
export function Toggle({
  checked,
  onChange,
  id,
  className,
  disabled,
  "aria-label": ariaLabel,
}: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative w-[42px] h-[24px] rounded-full border-2 border-ink-800 shrink-0",
        "[box-shadow:inset_0_2px_0_rgba(91,74,51,0.10)]",
        "transition-colors duration-[180ms]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-leaf-500" : "bg-cream-300",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-[1px] w-[16px] h-[16px] rounded-full",
          "border-[1.5px] border-ink-800 bg-white",
          "[box-shadow:0_1px_0_var(--ink-800)]",
          "transition-[left] duration-[180ms]",
          checked ? "left-[21px]" : "left-[1px]",
        )}
        style={{ transitionTimingFunction: "var(--ease-pop)" }}
      />
    </button>
  );
}
