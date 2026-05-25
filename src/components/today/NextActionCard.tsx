import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Card, Pill, SectionHeading } from "@/components/ui";

export function NextActionCard({
  title,
  detail,
  source,
}: {
  title: string;
  detail?: string | null;
  source: "task" | "block" | "habit" | "empty";
}) {
  const tag =
    source === "task"
      ? "Task"
      : source === "block"
        ? "Time block"
        : source === "habit"
          ? "Habit"
          : null;

  return (
    <Card variant="lifted">
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        <Image
          src="/lifeos/mascot-quill.svg"
          alt=""
          width={72}
          height={72}
        />
        <div className="min-w-0">
          <SectionHeading icon={Play}>Next action</SectionHeading>
          <p className="font-[var(--font-display)] font-semibold text-[26px] text-ink-800 leading-tight tracking-[-0.01em] mt-1">
            {title}
          </p>
          <div className="flex flex-wrap gap-2 items-center mt-2">
            {detail ? <Pill tone="coral">{detail}</Pill> : null}
            {tag ? <Pill tone="ghost">from {tag.toLowerCase()}</Pill> : null}
          </div>
        </div>
        {source !== "empty" ? (
          <button
            type="button"
            className="inline-flex items-center gap-[7px] px-[14px] py-[9px] text-[13px] uppercase font-extrabold tracking-[0.06em] rounded-[6px] border-2 border-ink-800 bg-coral-500 text-white [box-shadow:0_3px_0_var(--ink-800)] active:translate-y-[2px] active:[box-shadow:0_0_0_var(--ink-800)] transition-[transform,box-shadow] duration-[120ms]"
          >
            Start <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </Card>
  );
}
