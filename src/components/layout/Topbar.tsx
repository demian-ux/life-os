import { Bell, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type TopbarProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small all-caps pixel date line above the title (e.g. "SUNDAY, MAY 24"). */
  dateStr?: string;
  /** Custom node rendered on the right, *before* the default icon cluster. */
  actions?: React.ReactNode;
  /** Defaults to true. Hides the bell + quick-capture icon cluster. */
  showQuickActions?: boolean;
  /** Optional notification dot on the bell. */
  hasNotifications?: boolean;
  className?: string;
};

export function Topbar({
  title,
  subtitle,
  dateStr,
  actions,
  showQuickActions = true,
  hasNotifications,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "flex items-end justify-between gap-4 px-[36px] pt-[24px] mb-[24px]",
        className,
      )}
    >
      <div className="min-w-0">
        {dateStr ? (
          <div className="font-[var(--font-pixel)] text-[8px] text-bark-600 tracking-[0.08em] mb-[6px] uppercase">
            {dateStr}
          </div>
        ) : null}
        <h1
          className={cn(
            "m-0 font-[var(--font-display)] font-semibold text-[32px] text-ink-800",
            "tracking-[-0.01em] leading-[1.1]",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-[6px] font-[var(--font-display)] italic text-[15px] text-bark-600">
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-[10px] shrink-0">
        {actions}
        {showQuickActions ? (
          <>
            <button
              type="button"
              title="Notifications"
              className={cn(
                "relative w-[38px] h-[38px] bg-white border-[1.5px] border-cream-300 rounded-[10px]",
                "flex items-center justify-center text-bark-700 shadow-[var(--shadow-1)]",
                "hover:bg-cream-50 transition-colors duration-[120ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
              )}
            >
              <Bell className="h-4 w-4" strokeWidth={2} />
              {hasNotifications ? (
                <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-coral-500 rounded-full border-[1.5px] border-white" />
              ) : null}
            </button>
            <button
              type="button"
              title="Quick capture"
              className={cn(
                "w-[38px] h-[38px] bg-white border-[1.5px] border-cream-300 rounded-[10px]",
                "flex items-center justify-center text-bark-700 shadow-[var(--shadow-1)]",
                "hover:bg-cream-50 transition-colors duration-[120ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
              )}
            >
              <Zap className="h-4 w-4" strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
