"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui";

export function ToggleDemo() {
  const [reduceMascots, setReduceMascots] = useState(false);
  const [limitBreak, setLimitBreak] = useState(true);
  return (
    <div className="flex flex-col gap-3 max-w-md">
      <Row label="Reduce mascots">
        <Toggle
          checked={reduceMascots}
          onChange={setReduceMascots}
          aria-label="Reduce mascots"
        />
      </Row>
      <Row label="Limit Break notifications">
        <Toggle
          checked={limitBreak}
          onChange={setLimitBreak}
          aria-label="Limit Break notifications"
        />
      </Row>
      <Row label="Disabled (off)">
        <Toggle checked={false} onChange={() => {}} disabled aria-label="Disabled off" />
      </Row>
      <Row label="Disabled (on)">
        <Toggle checked={true} onChange={() => {}} disabled aria-label="Disabled on" />
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] bg-cream-50 border border-cream-200">
      <span className="text-[14px] font-semibold text-ink-800">{label}</span>
      {children}
    </div>
  );
}
