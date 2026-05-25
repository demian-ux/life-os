"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { useCelebration } from "./RetentionCelebrationProvider";

const MASCOT_SRC: Record<string, string> = {
  default: "/lifeos/mascot-quill.svg",
  cheer:   "/lifeos/mascot-quill-cheer.svg",
  sleep:   "/lifeos/mascot-quill-sleep.svg",
};

/**
 * Floating Quill mascot — fixed bottom-left. Reads mood from the celebration
 * context (e.g., shifts to "cheer" briefly after a large XP award). Hidden via
 * body.reduce-mascots (toggled by AppShell from user preferences).
 */
export function MascotPanel() {
  const { mood, reduceMascots } = useCelebration();

  if (reduceMascots) return null;

  return (
    <div
      className={cn(
        "mascot-panel fixed left-[264px] bottom-[24px] z-40",
        "pointer-events-none",
      )}
    >
      <Image
        src={MASCOT_SRC[mood] ?? MASCOT_SRC.default}
        alt="Quill, your mascot"
        width={88}
        height={88}
        className={cn(
          "w-[88px] h-[88px] pointer-events-auto cursor-pointer",
          "transition-transform duration-[220ms] hover:-translate-y-1 hover:scale-[1.04]",
        )}
        style={{
          animation: "bob 5s ease-in-out infinite",
          transitionTimingFunction: "var(--ease-pop)",
        }}
      />
    </div>
  );
}
