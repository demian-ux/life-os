"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type TooltipProps = {
  label: string;
  children: React.ReactElement;
  side?: "top" | "bottom";
  className?: string;
};

// Minimal, no-deps tooltip. Triggers on hover and keyboard focus.
// For complex positioning needs (viewport-aware, collisions), reach
// for Radix — but for icon buttons and pills, this is enough.
export function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 z-50",
          "whitespace-nowrap rounded-input bg-ink text-bg text-meta px-2 py-1",
          "transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
