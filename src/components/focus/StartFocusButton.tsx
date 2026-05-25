"use client";

import { useTransition } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui";
import { startFocusSession } from "@/lib/actions/focus-actions";

type StartFocusButtonProps = {
  dailyRockId: string;
};

export function StartFocusButton({ dailyRockId }: StartFocusButtonProps) {
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      await startFocusSession({ dailyRockId });
    });
  }

  return (
    <Button onClick={start} disabled={pending} variant="primary">
      <Zap className="h-4 w-4 mr-1" />
      {pending ? "Starting…" : "Start deep work"}
    </Button>
  );
}
