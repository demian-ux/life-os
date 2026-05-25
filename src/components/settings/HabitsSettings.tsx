"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui";

type HabitsSettingsProps = {
  habits: { id: string; name: string }[];
};

export function HabitsSettings({ habits }: HabitsSettingsProps) {
  return (
    <Card>
      <SectionHeading
        icon={Flame}
        action={
          <Link
            href="/habits"
            className="text-[12px] text-coral-500 hover:underline flex items-center gap-1"
          >
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        Morning Habits
      </SectionHeading>
      {habits.length === 0 ? (
        <p className="text-[13px] text-bark-500 mt-2">
          No active habits.{" "}
          <Link href="/habits" className="text-coral-500 hover:underline">
            Add your first one →
          </Link>
        </p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {habits.map((h) => (
            <li
              key={h.id}
              className="text-[13.5px] text-bark-700 flex items-center gap-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
              {h.name}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-bark-500 mt-3">
        Habits appear on /home as the morning check-in row. 3–5 fixed habits recommended.
      </p>
    </Card>
  );
}
