"use client";

import { useState, useTransition } from "react";
import { Crown, EyeOff, Eye, Flame, Pencil } from "lucide-react";
import {
  Card,
  Hcell,
  IconButton,
  Pill,
  SectionHeading,
  Sigil,
  TierBadge,
  Tooltip,
} from "@/components/ui";
import type { HcellState } from "@/components/ui/Hcell";
import { cn } from "@/lib/cn";
import { classFromAxis } from "@/lib/retention/class-axis";
import { setHabitActive } from "@/lib/actions/habit-actions";
import { logHabit } from "@/lib/actions/week-actions";
import { STREAK_TIERS } from "@/lib/retention/streak-tiers";
import type { HabitLogStatus } from "@/lib/validators/week";
import { HabitForm, type HabitFormInitial } from "./HabitForm";

const NEXT_STATUS: Record<HabitLogStatus, HabitLogStatus> = {
  NONE: "MINIMUM",
  MINIMUM: "IDEAL",
  IDEAL: "SKIPPED",
  SKIPPED: "NONE",
};

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

function cellState(status: HabitLogStatus, scheduled: boolean): HcellState {
  if (!scheduled && status === "NONE") return "off";
  if (status === "IDEAL") return "ideal";
  if (status === "MINIMUM") return "min";
  if (status === "SKIPPED") return "skip";
  return "miss";
}

export type HabitCardData = HabitFormInitial & {
  habitId: string;
  name: string;
  active: boolean;
  scheduleDays: number[];
  current: number;
  best: number;
  peakTier: number;
  weekDates: string[];
  weekLogs: { date: string; status: HabitLogStatus }[];
};

export function HabitCard({ habit }: { habit: HabitCardData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const scheduled = new Set(habit.scheduleDays);
  const peakTier = STREAK_TIERS.find((t) => t.tier === habit.peakTier);
  const hasLostPeakTier = Boolean(peakTier && habit.current < peakTier.days);
  const classKey = classFromAxis(habit.axis ?? "CRAFT");

  const logsByDate = new Map<string, HabitLogStatus>();
  for (const log of habit.weekLogs) logsByDate.set(log.date, log.status);

  function cycle(date: string) {
    const current = logsByDate.get(date) ?? "NONE";
    const next = NEXT_STATUS[current];
    startTransition(async () => {
      await logHabit({ habitId: habit.habitId, date, status: next });
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await setHabitActive({ habitId: habit.habitId, active: !habit.active });
    });
  }

  if (editing) {
    return (
      <HabitForm
        mode="edit"
        initial={{
          habitId: habit.habitId,
          name: habit.name,
          category: habit.category,
          minimumVersion: habit.minimumVersion,
          idealVersion: habit.idealVersion,
          anchor: habit.anchor,
          difficulty: habit.difficulty,
          days: habit.scheduleDays,
          axis: habit.axis,
        }}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className={cn(!habit.active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Sigil classKey={classKey} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {habit.peakTier >= 5 ? (
              <Tooltip label="Veteran — 100+ day streak earned">
                <Crown className="h-4 w-4 text-[color:var(--xp-500)]" />
              </Tooltip>
            ) : null}
            <h3 className="text-[16px] font-bold text-ink-800">{habit.name}</h3>
            {habit.current > 0 ? (
              <TierBadge streak={habit.current} mini />
            ) : null}
            {hasLostPeakTier && peakTier ? (
              <Pill tone="ghost">{peakTier.label} (lost)</Pill>
            ) : null}
            {habit.category ? <Pill>{habit.category}</Pill> : null}
            {!habit.active ? <Pill tone="ghost">inactive</Pill> : null}
          </div>
          <p className="text-[12.5px] text-bark-500 mt-1">
            Min: {habit.minimumVersion}
            {habit.idealVersion ? <> · Ideal: {habit.idealVersion}</> : null}
            {habit.anchor ? <> · after {habit.anchor}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip label={`Current ${habit.current} · best ${habit.best}`}>
            <span className="inline-flex items-center gap-1 text-[14px] tabular-nums text-ink-800 px-2">
              <Flame className="h-4 w-4 text-coral-500" />
              {habit.current}
            </span>
          </Tooltip>
          <Tooltip label="Edit">
            <IconButton label="Edit habit" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip label={habit.active ? "Deactivate" : "Activate"}>
            <IconButton
              label={habit.active ? "Deactivate" : "Activate"}
              size="sm"
              onClick={toggleActive}
              disabled={pending}
            >
              {habit.active ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <SectionHeading>This week</SectionHeading>
          <span className="font-[var(--font-pixel)] text-[8px] text-bark-500 tracking-[0.06em]">
            BEST {habit.best}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {habit.weekDates.map((date, idx) => {
            const dayOfWeek = idx + 1;
            const status = logsByDate.get(date) ?? "NONE";
            const isScheduled = scheduled.has(dayOfWeek);
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className="font-[var(--font-pixel)] text-[8px] text-bark-500 tracking-[0.06em]">
                  {DAY_HEADERS[idx]}
                </span>
                <button
                  type="button"
                  onClick={() => cycle(date)}
                  disabled={pending}
                  aria-label={`${date} ${status}`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded-[6px]"
                >
                  <Hcell state={cellState(status, isScheduled)} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
