import { Compass } from "lucide-react";
import { Pill, ProgressBar } from "@/components/ui";

type ActiveQuest = {
  id: string;
  name: string;
  description: string;
  progress: number; // 0..1
};

export function ActiveQuestStrip({ quest }: { quest: ActiveQuest }) {
  return (
    <div
      className="flex items-center gap-3 px-[14px] py-[10px] rounded-[12px] border-[1.5px] border-plum-300"
      style={{
        background: "linear-gradient(180deg, #ECE0F2 0%, #F8F1E1 100%)",
      }}
    >
      <Compass className="h-[14px] w-[14px] text-[#5C3F73] shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0 text-[13.5px] text-ink-800">
        <span className="font-bold">{quest.name}</span>
        <span className="text-bark-600"> · {quest.description}</span>
      </div>
      <div className="w-[120px] shrink-0">
        <ProgressBar value={quest.progress} tone="plum" />
      </div>
      <Pill tone="quest">Quest</Pill>
    </div>
  );
}
