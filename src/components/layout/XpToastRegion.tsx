"use client";

import { cn } from "@/lib/cn";
import { useCelebration } from "./RetentionCelebrationProvider";

/**
 * Top-right XP toast region. Each toast slides in with xp-in keyframe and is
 * removed by the provider after ~1.8s.
 */
export function XpToastRegion() {
  const { toasts } = useCelebration();

  return (
    <div
      className={cn(
        "xp-toast-region fixed top-[18px] right-[18px] z-[50]",
        "flex flex-col gap-2 pointer-events-none",
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "bg-ink-800 text-gold-500 font-[var(--font-pixel)] text-[10px]",
            "px-3 py-2 rounded-[6px] border-2 border-ink-800 tracking-[0.06em]",
            "[box-shadow:0_3px_0_#000,0_0_24px_rgba(255,212,107,0.35)]",
          )}
          style={{ animation: "xp-in 420ms var(--ease-pop)" }}
        >
          +{t.amount} XP · {t.source}
        </div>
      ))}
    </div>
  );
}
