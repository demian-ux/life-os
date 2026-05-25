"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Save } from "lucide-react";
import { Button, Card, Input, Label, SectionHeading } from "@/components/ui";
import { updateGcalEmbedUrl } from "@/lib/actions/settings-actions";

type GcalSettingsProps = {
  initialEmbedUrl: string | null;
};

export function GcalSettings({ initialEmbedUrl }: GcalSettingsProps) {
  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl ?? "");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateGcalEmbedUrl({
        embedUrl: embedUrl.trim() || null,
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
      <SectionHeading icon={CalendarDays}>Google Calendar</SectionHeading>
      <form onSubmit={submit} className="grid gap-3 mt-3">
        <div className="grid gap-1">
          <Label htmlFor="gcal-embed-url">Embed URL</Label>
          <Input
            id="gcal-embed-url"
            type="url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            maxLength={2048}
          />
          <p className="text-[11px] text-bark-500 mt-1">
            Go to Google Calendar → settings → your calendar → Integrate calendar →
            copy the embed URL. Paste it here to display the week strip on /home.
          </p>
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
        <details className="text-[12px] text-bark-500 mt-2">
          <summary className="cursor-pointer text-bark-600">
            OAuth sync (two-way) — not configured
          </summary>
          <p className="mt-2">
            Phase 1.4 ships the read-only iframe embed only. Two-way sync (creating
            GCal events from tasks, polling for changes) requires Google OAuth
            credentials set in env vars (<code>GOOGLE_CLIENT_ID</code>,{" "}
            <code>GOOGLE_CLIENT_SECRET</code>) and the user to complete a one-time
            authorization flow. See <code>docs/gcal-setup.md</code> for setup steps.
          </p>
        </details>
      </form>
    </Card>
  );
}
