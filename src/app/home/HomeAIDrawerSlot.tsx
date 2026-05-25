"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Phase 1.1 placeholder for the AI drawer (spec §8).
 * Renders a topbar toggle and a labeled stub panel. Real chat ships in Phase 1.5.
 */
export function HomeAIDrawerSlot() {
  const [open, setOpen] = useState(false);

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
        title="Toggle AI drawer (placeholder)"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
      </button>
      <aside
        id="home-ai-drawer"
        hidden={!open}
        aria-label="AI drawer (placeholder)"
        className={cn(
          "fixed right-0 top-0 bottom-0 w-[360px] bg-white border-l border-cream-200",
          "shadow-[var(--shadow-1)] p-6 z-40",
        )}
      >
        <div className="font-[var(--font-pixel)] text-[8px] text-bark-600 tracking-[0.08em] mb-3 uppercase">
          AI Drawer (Phase 1.5)
        </div>
        <p className="text-[13px] text-bark-600">
          Placeholder. The real AI co-pilot ships in Phase 1.5.
        </p>
      </aside>
    </>
  );
}
