import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui";

type GoogleCalendarEmbedProps = {
  embedUrl: string | null;
};

/**
 * Phase 1.4 visual layer (spec §10): renders Google Calendar embed iframe on /home.
 * If no embed URL is configured in user preferences, shows an empty-state pointing
 * to /settings. Sync layer (OAuth + API client) is scaffolded separately in
 * `src/lib/gcal/`.
 */
export function GoogleCalendarEmbed({ embedUrl }: GoogleCalendarEmbedProps) {
  if (!embedUrl) {
    return (
      <Card>
        <SectionHeading icon={CalendarDays}>This Week</SectionHeading>
        <div className="min-h-[200px] flex items-center justify-center text-center px-4 text-bark-500 text-[13px]">
          <div>
            <p className="mb-2">No calendar connected.</p>
            <Link
              href="/settings"
              className="text-coral-500 hover:underline"
            >
              Connect Google Calendar in Settings →
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeading icon={CalendarDays}>This Week</SectionHeading>
      <div className="mt-3 rounded-md overflow-hidden border border-cream-200">
        <iframe
          src={embedUrl}
          title="Google Calendar"
          className="w-full h-[420px] block bg-white"
          referrerPolicy="no-referrer"
        />
      </div>
    </Card>
  );
}
