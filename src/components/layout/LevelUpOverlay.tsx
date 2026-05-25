"use client";

import Image from "next/image";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useCelebration } from "./RetentionCelebrationProvider";

/**
 * Modal overlay fired when level-up happens. Pop animation, glow ring, cheer
 * Quill, big "you're now level N" line, Nice button to dismiss.
 */
export function LevelUpOverlay() {
  const { levelUp, closeLevelUp } = useCelebration();

  if (!levelUp.open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level up"
      className={cn(
        "lvup-overlay fixed inset-0 z-[100] flex items-center justify-center p-6",
        "bg-[rgba(43,33,20,0.32)]",
      )}
      style={{ animation: "fade 240ms var(--ease-soft)" }}
      onClick={closeLevelUp}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "lvup relative bg-white border-[3px] border-ink-800 rounded-[14px]",
          "px-9 py-7 max-w-[440px] text-center",
          "flex flex-col items-center gap-[6px]",
          "[background:linear-gradient(180deg,#FFFDF7,#FCEDC9)]",
          "[box-shadow:0_6px_0_var(--ink-800),0_12px_24px_rgba(91,74,51,0.12)]",
          "after:content-[''] after:absolute after:-inset-2 after:rounded-[18px]",
          "after:pointer-events-none",
          "after:[box-shadow:0_0_0_6px_rgba(197,140,217,0.18),0_0_36px_rgba(255,212,107,0.5)]",
        )}
        style={{ animation: "pop 420ms var(--ease-pop)" }}
      >
        <Image
          src="/lifeos/mascot-quill-cheer.svg"
          alt=""
          width={140}
          height={140}
        />
        <div className="font-[var(--font-pixel)] text-[11px] text-[#5C3F73] tracking-[0.08em] mt-1">
          LEVEL UP!
        </div>
        <div className="font-[var(--font-display)] font-semibold text-[24px] text-ink-800">
          You&apos;re now <em className="not-italic text-coral-500">level {levelUp.level}</em>.
        </div>
        <div className="font-[var(--font-body)] text-[14px] text-bark-600 mb-2">
          {levelUp.titleName
            ? `New title: ${levelUp.titleName}.`
            : "Quill brought a charm."}
        </div>
        <Button variant="xp" onClick={closeLevelUp}>
          NICE
        </Button>
      </div>
    </div>
  );
}
