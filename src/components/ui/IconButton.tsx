import { cn } from "@/lib/cn";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md";
  label: string; // aria-label, required — no silent icon-only buttons
};

const SIZES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
} as const;

export function IconButton({
  className,
  size = "md",
  label,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-input text-ink-soft",
        "hover:bg-line-soft hover:text-ink transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
