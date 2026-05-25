import { Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";

type ChapterRibbonProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Ink ribbon used to label a season/chapter ("Season 1 · Day 47").
 */
export function ChapterRibbon({ children, className }: ChapterRibbonProps) {
  return (
    <div className={cn("flex items-center gap-3 my-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 px-[14px] py-[6px] rounded-full relative",
          "bg-ink-800 text-cream-50",
          "font-[var(--font-display)] italic text-[13px]",
        )}
      >
        <Bookmark className="h-3 w-3" strokeWidth={2} />
        {children}
      </span>
    </div>
  );
}
