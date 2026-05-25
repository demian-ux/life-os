"use client";

import { useTransition } from "react";
import { BatteryFull, BatteryLow, BatteryMedium, Zap } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { setDayEnergy } from "@/lib/actions/today-actions";

type Energy = "LOW" | "MEDIUM" | "HIGH";

const OPTIONS = [
  { value: "LOW" as Energy,    label: "Low",  icon: BatteryLow,    color: "var(--sky-500)" },
  { value: "MEDIUM" as Energy, label: "Mid",  icon: BatteryMedium, color: "var(--gold-500)" },
  { value: "HIGH" as Energy,   label: "High", icon: BatteryFull,   color: "var(--coral-500)" },
];

export function EnergyCheckIn({
  dayPlanId,
  energy,
}: {
  dayPlanId: string;
  energy: Energy | null;
}) {
  const [pending, startTransition] = useTransition();

  function setValue(next: Energy | null) {
    startTransition(async () => {
      await setDayEnergy({ dayPlanId, energy: next });
    });
  }

  return (
    <Card>
      <SectionHeading icon={Zap}>Energy</SectionHeading>
      <p className="text-[13px] text-bark-500 mb-3">
        How&apos;s the party&apos;s HP today?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = energy === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue(active ? null : opt.value)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "px-2 py-3 rounded-[6px] border-2 border-ink-800 text-white",
                "flex flex-col items-center justify-center gap-[6px] leading-none",
                "font-[var(--font-body)] font-extrabold text-[12px] uppercase tracking-[0.06em]",
                "[box-shadow:0_3px_0_var(--ink-800)] transition-[transform,box-shadow] duration-[120ms]",
                "active:translate-y-[2px] active:[box-shadow:0_0_0_var(--ink-800)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !active && "bg-cream-100 text-bark-700",
              )}
              style={active ? { background: opt.color } : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{opt.label.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
