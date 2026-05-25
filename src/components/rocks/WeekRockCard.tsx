"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { setWeekRock, completeWeekRock } from "@/lib/actions/rock-actions";
import { RockEditDialog } from "./RockEditDialog";
import type { TraitAxis } from "@prisma/client";

type WeekRock = {
  id: string;
  title: string;
  trait: TraitAxis;
  status: string;
  xpReward: number;
};

export function WeekRockCard({ rock }: { rock: WeekRock | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSetRock(values: { title: string; trait: TraitAxis }) {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await setWeekRock(values);
        if (result.ok) {
          setDialogOpen(false);
          resolve();
        } else {
          reject(new Error(result.error));
        }
      });
    });
  }

  function handleComplete() {
    if (!rock) return;
    startTransition(async () => {
      await completeWeekRock({ id: rock.id });
    });
  }

  return (
    <>
      <Card variant="lifted">
        {rock === null ? (
          <div className="flex flex-col gap-3">
            <p className="font-[var(--font-display)] text-[15px] italic text-bark-600">
              What&rsquo;s the one thing that would make this week great?
            </p>
            <div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Set week rock
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-[var(--font-display)] text-[20px] font-semibold leading-tight text-ink-800">
                  {rock.title}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cream-300 bg-cream-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-bark-600">
                    {rock.trait}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--xp-500)]/30 bg-[color:var(--xp-500)]/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[color:var(--xp-500)]">
                    <Sparkles className="h-3 w-3" />
                    +{rock.xpReward} XP
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="success"
                size="sm"
                disabled={rock.status === "DONE" || pending}
                onClick={handleComplete}
              >
                <Check className="h-3.5 w-3.5" />
                {rock.status === "DONE" ? "Done" : "Mark done"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                disabled={pending}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </Card>

      <RockEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSetRock}
        heading={rock === null ? "Set your week rock" : "Edit week rock"}
        initialTitle={rock?.title}
        initialTrait={rock?.trait}
        submitLabel={rock === null ? "Set rock" : "Save changes"}
      />
    </>
  );
}
