"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import {
  endFocusSession,
  extendFocusSession,
} from "@/lib/actions/focus-actions";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

type FocusModeProps = {
  session: {
    id: string;
    startedAt: Date;
    plannedMinutes: number;
    dailyRockTitle: string | null;
  };
  blockerStatus?: string;
};

function formatRemaining(seconds: number): string {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusMode({ session, blockerStatus }: FocusModeProps) {
  // Initial computed end-time held in a ref for mutation when the user extends.
  // We deliberately initialise to 0 and set the real value in an effect to keep
  // render pure (no Date.now()/ref reads during render — react-hooks/purity).
  const endsAtRef = useRef(0);
  const [remaining, setRemaining] = useState(session.plannedMinutes * 60);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    endsAtRef.current =
      session.startedAt.getTime() + session.plannedMinutes * 60_000;
    setRemaining(Math.floor((endsAtRef.current - Date.now()) / 1000));
    const id = setInterval(() => {
      setRemaining(Math.floor((endsAtRef.current - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [session.startedAt, session.plannedMinutes]);

  function complete() {
    startTransition(async () => {
      await endFocusSession({ id: session.id, outcome: "COMPLETED" });
    });
  }
  function abandon() {
    startTransition(async () => {
      await endFocusSession({ id: session.id, outcome: "ABANDONED" });
    });
  }
  function extend() {
    startTransition(async () => {
      const result = await extendFocusSession({ id: session.id, addMinutes: 15 });
      if (result.ok) {
        endsAtRef.current += 15 * 60_000;
        setRemaining(Math.floor((endsAtRef.current - Date.now()) / 1000));
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      className={cn(
        "fixed inset-0 z-50 bg-ink-800 text-white flex flex-col items-center justify-center px-6",
      )}
    >
      <div className="font-[var(--font-pixel)] text-[10px] tracking-[0.16em] text-coral-300 uppercase mb-6">
        Focusing on big rock · today
      </div>
      <h1 className="font-[var(--font-display)] font-semibold text-[42px] text-center max-w-[640px] leading-tight">
        {session.dailyRockTitle ?? "Deep work"}
      </h1>
      <div className="font-[var(--font-mono)] text-[96px] tabular-nums tracking-tight mt-8 leading-none">
        {formatRemaining(remaining)}
      </div>
      <div className="text-[13px] text-cream-200 mt-4 text-center max-w-[520px]">
        {blockerStatus ?? "iOS Focus / desktop blocker hooks run via configured commands."}
      </div>
      <div className="flex gap-3 mt-10 flex-wrap justify-center">
        <Button onClick={complete} disabled={pending}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Done early
        </Button>
        <Button onClick={extend} disabled={pending} variant="ghost">
          <Plus className="h-4 w-4 mr-1" /> +15 min
        </Button>
        <Button onClick={abandon} disabled={pending} variant="ghost">
          <X className="h-4 w-4 mr-1" /> End focus
        </Button>
      </div>
    </div>
  );
}
