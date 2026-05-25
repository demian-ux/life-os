import { FxChip } from "@/components/ui";
import type { FxEffect } from "@/components/ui/FxChip";

export function StatusEffectsStrip({ effects }: { effects: FxEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {effects.map((e) => (
        <FxChip key={e.id} effect={e} />
      ))}
    </div>
  );
}
