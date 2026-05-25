"use client";

import { useState, useTransition } from "react";
import { Save, Zap } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Label,
  SectionHeading,
} from "@/components/ui";
import { updateFocusPreferences } from "@/lib/actions/settings-actions";
import type { FocusPreferences } from "@/lib/user-preferences";

type FocusSettingsProps = {
  initial: FocusPreferences;
};

export function FocusSettings({ initial }: FocusSettingsProps) {
  const [beforeCommand, setBeforeCommand] = useState(initial.beforeCommand ?? "");
  const [afterCommand, setAfterCommand] = useState(initial.afterCommand ?? "");
  const [defaultMinutes, setDefaultMinutes] = useState(initial.defaultMinutes);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateFocusPreferences({
        beforeCommand: beforeCommand.trim() || null,
        afterCommand: afterCommand.trim() || null,
        defaultMinutes,
      });
      if (result.ok) {
        setSavedAt(Date.now());
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <SectionHeading icon={Zap}>Focus Mode</SectionHeading>
      <form onSubmit={submit} className="grid gap-3 mt-3">
        <div className="grid gap-1">
          <Label htmlFor="focus-default-min">Default duration (minutes)</Label>
          <Input
            id="focus-default-min"
            type="number"
            min={5}
            max={240}
            value={defaultMinutes}
            onChange={(e) => setDefaultMinutes(Number(e.target.value) || 90)}
            className="max-w-[120px]"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="focus-before-cmd">Before-focus command</Label>
          <Input
            id="focus-before-cmd"
            type="text"
            value={beforeCommand}
            onChange={(e) => setBeforeCommand(e.target.value)}
            placeholder="e.g. shortcuts run 'Deep Work On'"
            maxLength={512}
          />
          <p className="text-[11px] text-bark-500 mt-1">
            Run when focus starts. iOS Shortcut URL scheme, Cold Turkey CLI,
            or anything you wire up. Runs as your user.
          </p>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="focus-after-cmd">After-focus command</Label>
          <Input
            id="focus-after-cmd"
            type="text"
            value={afterCommand}
            onChange={(e) => setAfterCommand(e.target.value)}
            placeholder="e.g. shortcuts run 'Deep Work Off'"
            maxLength={512}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4 mr-1" />
            {pending ? "Saving…" : "Save"}
          </Button>
          {savedAt && !pending ? (
            <span className="text-[12px] text-leaf-600">Saved.</span>
          ) : null}
          {error ? (
            <span className="text-[12px] text-coral-600">{error}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
