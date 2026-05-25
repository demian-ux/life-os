"use client";

import { useTransition } from "react";
import { Lightbulb, X } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { dismissInsight } from "@/lib/actions/insight-actions";

export function InsightCard({
  id,
  message,
}: {
  id: string;
  message: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 px-[14px] py-[10px] bg-sky-100 border border-sky-300 rounded-[12px]">
      <Lightbulb className="h-4 w-4 text-sky-500 shrink-0" strokeWidth={2} />
      <p className="text-[13.5px] text-[#2F5B95] flex-1 min-w-0">{message}</p>
      <Tooltip label="Dismiss">
        <IconButton
          label="Dismiss insight"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await dismissInsight(id);
            })
          }
        >
          <X className="h-3.5 w-3.5" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
