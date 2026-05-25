"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type HomeAIDrawerSlotProps = {
  children?: ReactNode;
};

/**
 * Phase 1.5 AI drawer wrapper.
 *
 * Phase 1.1 shipped a placeholder stub here. Phase 1.5 keeps the same slot
 * (topbar toggle + slide-in panel) but renders real chat content as children.
 *
 * State persistence: remembers open/closed within the session via sessionStorage
 * (spec §8 "remembers last state per session"). Default closed on first load.
 */
const STORAGE_KEY = "home-ai-drawer-open";

export function HomeAIDrawerSlot({ children }: HomeAIDrawerSlotProps) {
  const [open, setOpen] = useState(false);

  // One-time hydration of session-persisted open state. This runs once on
  // mount (empty dep array) and reads from sessionStorage — a browser-only
  // API — so we can't compute it during SSR or as the useState initializer.
  // Setting state in an effect is the intentional synchronisation point here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setOpen(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="home-ai-drawer"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-[38px] h-[38px] bg-white border-[1.5px] border-cream-300 rounded-[10px]",
          "flex items-center justify-center text-bark-700 shadow-[var(--shadow-1)]",
          "hover:bg-cream-50 transition-colors duration-[120ms]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
        )}
        title="Toggle AI drawer"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
      </button>
      <aside
        id="home-ai-drawer"
        aria-label="AI co-pilot drawer"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 bottom-0 w-[400px] max-w-[100vw] bg-white",
          "border-l border-cream-200 shadow-[var(--shadow-1)] p-4 z-40",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close AI drawer"
          className={cn(
            "absolute top-3 right-3 w-7 h-7 flex items-center justify-center",
            "rounded-md text-bark-600 hover:bg-cream-100 transition-colors duration-[120ms]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
          )}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pt-8">{children}</div>
      </aside>
    </>
  );
}
