"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { HabitForm } from "./HabitForm";

export function NewHabitButton() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <HabitForm
        mode="create"
        onCancel={() => setOpen(false)}
        onSaved={() => setOpen(false)}
      />
    );
  }

  return (
    <Button variant="ghost" className="self-start" onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" />
      New habit
    </Button>
  );
}
