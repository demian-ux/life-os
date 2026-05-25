import { Topbar } from "@/components/layout/Topbar";
import { BlockerSettings } from "@/components/settings/BlockerSettings";
import { GcalSettings } from "@/components/settings/GcalSettings";
import { HabitsSettings } from "@/components/settings/HabitsSettings";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Card } from "@/components/ui";
import { getBlockerInstallStatus } from "@/lib/blocker-install";
import { prisma } from "@/lib/db";
import { getBlockerState } from "@/lib/retention/blocker";
import {
  getEffectiveAiSettings,
  getEffectiveUiPreferences,
  getGcalEmbedUrl,
  normalizeAiProvider,
} from "@/lib/user-preferences";
import { DEFAULT_TIMEZONE } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    return (
      <>
        <Topbar title="Settings" subtitle="Local preferences for one user." />
        <section className="px-8 py-8 text-body-sm text-ink-soft">
          No user found. Run <code className="font-mono">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  const aiSettings = getEffectiveAiSettings(user.preferences);
  const uiPrefs = getEffectiveUiPreferences(user.preferences);

  const [blockerState, blockerInstallStatus, rules, habits] = await Promise.all([
    getBlockerState(user.id),
    getBlockerInstallStatus(),
    prisma.blockRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.habit.findMany({
      where: { userId: user.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const ruleViews = rules.map((r) => {
    const evaluation = blockerState.rules.find((e) => e.ruleId === r.id);
    return {
      id: r.id,
      name: r.name,
      domains: (r.domains as string[]) ?? [],
      guardType: r.guardType as "HABIT_LOGGED",
      guardParams: (r.guardParams as { habitId: string }) ?? { habitId: "" },
      active: r.active,
      satisfied: evaluation?.satisfied ?? true,
      reason: evaluation?.reason ?? "",
    };
  });

  return (
    <>
      <Topbar title="Settings" subtitle="Local preferences for one user." />
      <section className="px-8 py-6 max-w-3xl grid gap-4">
        <SettingsForm
          initial={{
            name: user.name,
            timezone: user.timezone || DEFAULT_TIMEZONE,
            aiProvider: aiSettings.provider,
            aiModel: aiSettings.model,
            reduceMascots: uiPrefs.reduceMascots,
            limitBreakBannerEnabled: uiPrefs.limitBreakBannerEnabled,
            mascotMood: uiPrefs.mascotMood,
          }}
          status={{
            anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
            openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
            openAiImplemented: false,
          }}
        />

        <HabitsSettings habits={habits} />

        <GcalSettings initialEmbedUrl={getGcalEmbedUrl(user.preferences)} />

        <Card>
          <BlockerSettings
            rules={ruleViews}
            habits={habits}
            blockedDomains={blockerState.blockedDomains}
            totalBlockedDomains={blockerState.blockedDomains.length}
            installStatus={blockerInstallStatus}
          />
        </Card>

        <div className="rounded-input border border-line px-3 py-2 text-meta text-ink-muted">
          Runtime default: {normalizeAiProvider(process.env.AI_PROVIDER)}
          {process.env.AI_MODEL ? ` / ${process.env.AI_MODEL}` : ""}
        </div>
      </section>
    </>
  );
}
