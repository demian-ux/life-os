import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: LucideIcon;
  mascot?: "default" | "cheer" | "sleep";
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
};

const MASCOT_SRC: Record<NonNullable<EmptyStateProps["mascot"]>, string> = {
  default: "/lifeos/mascot-quill.svg",
  cheer: "/lifeos/mascot-quill-cheer.svg",
  sleep: "/lifeos/mascot-quill-sleep.svg",
};

export function EmptyState({
  icon: Icon,
  mascot,
  title,
  body,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-[10px] py-5 px-3",
        className,
      )}
    >
      {mascot ? (
        <Image
          src={MASCOT_SRC[mascot]}
          alt=""
          width={84}
          height={84}
          className="mb-1"
        />
      ) : Icon ? (
        <Icon className="h-7 w-7 text-bark-500" />
      ) : null}
      <p className="font-[var(--font-display)] font-semibold text-[17px] text-ink-800">
        {title}
      </p>
      {body ? (
        <p className="text-[13px] text-bark-500 max-w-[380px]">{body}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
