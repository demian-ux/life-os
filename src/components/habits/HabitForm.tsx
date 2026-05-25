"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createHabit, updateHabit } from "@/lib/actions/habit-actions";

const DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 7, label: "S" },
] as const;

type AxisOption = "DISCIPLINE" | "AUDACITY" | "RECOVERY" | "FOCUS" | "CRAFT";

const AXIS_OPTIONS: { value: AxisOption; label: string; hint: string }[] = [
  { value: "DISCIPLINE", label: "Discipline", hint: "Show up. Follow through." },
  { value: "AUDACITY", label: "Audacity", hint: "Reach out. Aim higher." },
  { value: "RECOVERY", label: "Recovery", hint: "Rest, sleep, restraint." },
  { value: "FOCUS", label: "Focus", hint: "Deep work, single-tasking." },
  { value: "CRAFT", label: "Craft", hint: "Learn, make, practice." },
];

export type HabitFormInitial = {
  habitId?: string;
  name?: string;
  category?: string | null;
  minimumVersion?: string;
  idealVersion?: string | null;
  anchor?: string | null;
  difficulty?: number;
  days?: number[];
  axis?: AxisOption;
};

export function HabitForm({
  mode,
  initial,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: HabitFormInitial;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [minimumVersion, setMinimumVersion] = useState(
    initial?.minimumVersion ?? "",
  );
  const [idealVersion, setIdealVersion] = useState(initial?.idealVersion ?? "");
  const [anchor, setAnchor] = useState(initial?.anchor ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [days, setDays] = useState<number[]>(initial?.days ?? [1, 2, 3, 4, 5]);
  const [axis, setAxis] = useState<AxisOption>(initial?.axis ?? "CRAFT");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !minimumVersion.trim() || days.length === 0) return;
    setError(null);
    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      minimumVersion: minimumVersion.trim(),
      idealVersion: idealVersion.trim() || undefined,
      anchor: anchor.trim() || undefined,
      difficulty,
      days,
      axis,
    };
    startTransition(async () => {
      const result =
        mode === "edit" && initial?.habitId
          ? await updateHabit({ habitId: initial.habitId, ...payload })
          : await createHabit(payload);
      if (result.ok) {
        if (mode === "create") {
          setName("");
          setCategory("");
          setMinimumVersion("");
          setIdealVersion("");
          setAnchor("");
          setDifficulty(1);
          setDays([1, 2, 3, 4, 5]);
          setAxis("CRAFT");
        }
        onSaved?.();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-card border border-line p-4 bg-line-soft"
    >
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meditation"
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="habit-category">Category</Label>
            <Input
              id="habit-category"
              type="text"
              value={category ?? ""}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="health, learning, work..."
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="habit-min">Minimum version</Label>
          <Input
            id="habit-min"
            type="text"
            value={minimumVersion}
            onChange={(e) => setMinimumVersion(e.target.value)}
            placeholder="e.g. 5 minutes"
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="habit-ideal">Ideal version</Label>
          <Input
            id="habit-ideal"
            type="text"
            value={idealVersion ?? ""}
            onChange={(e) => setIdealVersion(e.target.value)}
            placeholder="e.g. 20 minutes"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="habit-anchor">Anchor</Label>
          <Input
            id="habit-anchor"
            type="text"
            value={anchor ?? ""}
            onChange={(e) => setAnchor(e.target.value)}
            placeholder="When/where does this habit happen?"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <div className="grid gap-1">
            <Label>Days</Label>
            <div className="flex gap-1">
              {DAYS.map((d, idx) => {
                const active = days.includes(d.value);
                return (
                  <button
                    key={`${d.value}-${idx}`}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={active}
                    aria-label={`Toggle day ${d.value}`}
                    className={cn(
                      "h-8 w-8 rounded-pill border text-meta font-medium transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
                      active
                        ? "bg-accent border-accent text-bg"
                        : "border-line text-ink-soft hover:border-ink-soft hover:text-ink",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="habit-difficulty">Difficulty (1-5)</Label>
            <Input
              id="habit-difficulty"
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="habit-axis">Trait axis</Label>
          <select
            id="habit-axis"
            value={axis}
            onChange={(e) => setAxis(e.target.value as AxisOption)}
            className="bg-surface border border-line rounded-input px-2 py-1.5 text-body-sm text-ink focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            {AXIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            disabled={
              pending ||
              !name.trim() ||
              !minimumVersion.trim() ||
              days.length === 0
            }
          >
            {pending
              ? "Saving..."
              : mode === "edit"
                ? "Save changes"
                : "Create habit"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="subtle" onClick={onCancel}>
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : null}
          {error ? (
            <span className="text-meta text-status-missed ml-auto">{error}</span>
          ) : null}
        </div>
    </form>
  );
}
