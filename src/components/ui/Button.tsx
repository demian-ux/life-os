import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "inverse"
  | "xp"
  | "save"
  | "ghost"
  // Legacy aliases
  | "subtle"
  | "danger";

type ButtonSize = "sm" | "md" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const BASE =
  "inline-flex items-center justify-center gap-[7px] " +
  "font-[var(--font-body)] font-extrabold uppercase tracking-[0.06em] " +
  "rounded-[6px] border-2 border-ink-800 " +
  "leading-none whitespace-nowrap " +
  "transition-[transform,box-shadow,filter] duration-[120ms] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:[box-shadow:0_3px_0_var(--ink-800)] " +
  "hover:[filter:brightness(0.96)] " +
  "active:translate-y-[2px] active:[box-shadow:0_0_0_var(--ink-800)]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-coral-500 text-white [box-shadow:0_3px_0_var(--ink-800)]",
  secondary:
    "bg-cream-100 text-ink-800 [box-shadow:0_3px_0_var(--ink-800)]",
  success:
    "bg-leaf-500 text-white [box-shadow:0_3px_0_var(--ink-800)]",
  inverse:
    "bg-ink-800 text-cream-50 [box-shadow:0_3px_0_var(--ink-800)]",
  xp:
    "text-white [background:linear-gradient(180deg,#C58CD9,#9B6FB6)] [box-shadow:0_3px_0_var(--ink-800)]",
  save:
    "text-white border-[color:#2F5B95] [background:linear-gradient(180deg,#B0C9EB_0%,#5B91D4_100%)] [box-shadow:0_3px_0_#2F5B95] active:[box-shadow:0_0_0_#2F5B95]",
  ghost:
    "bg-transparent border-[1.5px] border-cream-300 text-bark-600 [box-shadow:none] " +
    "hover:bg-cream-100 hover:text-ink-800 active:translate-y-0",
  // Legacy aliases
  subtle:
    "bg-transparent border-[1.5px] border-cream-300 text-bark-600 [box-shadow:none] " +
    "hover:bg-cream-100 hover:text-ink-800 active:translate-y-0",
  danger:
    "bg-[color:var(--danger-500)] text-white [box-shadow:0_3px_0_var(--ink-800)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm:
    "px-[10px] py-[6px] text-[11px] rounded-[5px] [box-shadow:0_2px_0_var(--ink-800)] active:[box-shadow:0_0_0_var(--ink-800)]",
  md:
    "px-[14px] py-[9px] text-[13px]",
  icon:
    "w-9 h-9 p-0 text-[13px]",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    />
  );
}
