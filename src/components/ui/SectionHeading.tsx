import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type SectionHeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4";
  icon?: LucideIcon;
  action?: React.ReactNode;
};

/**
 * Uppercase "h-rule" heading. Renders inside a spread row when `action` is
 * provided so screens can put a counter or button on the right.
 */
export function SectionHeading({
  className,
  as: As = "h3",
  icon: Icon,
  action,
  children,
  ...rest
}: SectionHeadingProps) {
  const heading = (
    <As
      className={cn(
        "flex items-center gap-2 m-0 " +
          "font-[var(--font-body)] font-bold text-[11.5px] uppercase tracking-[0.06em] text-bark-600",
        !action && className,
      )}
      {...(!action ? rest : {})}
    >
      {Icon ? <Icon className="h-[14px] w-[14px]" strokeWidth={2} /> : null}
      {children}
    </As>
  );

  if (action) {
    return (
      <div
        className={cn(
          "flex items-baseline justify-between gap-2 mb-[10px]",
          className,
        )}
        {...rest}
      >
        {heading}
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  return heading;
}
