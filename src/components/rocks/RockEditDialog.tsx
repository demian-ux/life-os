"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { TraitAxis } from "@prisma/client";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const TRAIT_OPTIONS: { value: TraitAxis; label: string }[] = [
  { value: "DISCIPLINE", label: "Discipline" },
  { value: "FOCUS", label: "Focus" },
  { value: "AUDACITY", label: "Audacity" },
  { value: "CRAFT", label: "Craft" },
  { value: "RECOVERY", label: "Recovery" },
];

export interface RockEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { title: string; trait: TraitAxis }) => void | Promise<void>;
  heading: string;
  initialTitle?: string;
  initialTrait?: TraitAxis;
  submitLabel?: string;
}

export function RockEditDialog({
  open,
  onClose,
  onSubmit,
  heading,
  initialTitle = "",
  initialTrait = "FOCUS",
  submitLabel = "Save",
}: RockEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [trait, setTrait] = useState<TraitAxis>(initialTrait);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Sync open state with dialog element
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Reset form state when open or initial values change
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setTrait(initialTrait);
      setError(null);
    }
  }, [open, initialTitle, initialTrait]);

  // Handle native dialog cancel (Escape key)
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ title: trimmed, trait });
        dialogRef.current?.close();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleCancel() {
    dialogRef.current?.close();
    onClose();
  }

  const canSubmit = title.trim().length > 0 && !pending;

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "m-auto w-full max-w-md rounded-lg border border-cream-200 bg-cream-50 p-6 shadow-xl",
        "backdrop:bg-ink-800/40 backdrop:backdrop-blur-[2px]",
        "open:flex open:flex-col open:gap-4",
      )}
    >
      <h2 className="font-[var(--font-display)] text-[18px] font-bold text-ink-800">
        {heading}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rock-title"
            className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-bark-600"
          >
            Title
          </label>
          <input
            id="rock-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="What&rsquo;s the one thing?"
            autoFocus
            className={cn(
              "w-full rounded-[6px] border border-cream-300 bg-white px-3 py-2",
              "font-[var(--font-body)] text-[14px] text-ink-800 placeholder:text-bark-400",
              "focus:outline-none focus:ring-2 focus:ring-coral-500/40 focus:border-coral-500/60",
            )}
          />
          <span className="text-right text-[11px] text-bark-400 tabular-nums">
            {title.length}/140
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rock-trait"
            className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-bark-600"
          >
            Trait axis
          </label>
          <select
            id="rock-trait"
            value={trait}
            onChange={(e) => setTrait(e.target.value as TraitAxis)}
            className={cn(
              "w-full rounded-[6px] border border-cream-300 bg-white px-3 py-2",
              "font-[var(--font-body)] text-[14px] text-ink-800",
              "focus:outline-none focus:ring-2 focus:ring-coral-500/40 focus:border-coral-500/60",
            )}
          >
            {TRAIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-[12px] text-[color:var(--danger-500)]">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canSubmit}
          >
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
