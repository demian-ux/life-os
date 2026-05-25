"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, Palette, Save, User } from "lucide-react";
import {
  Button,
  Card,
  InlineConfirmation,
  Input,
  Label,
  Pill,
  SectionHeading,
  Toggle,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { updateSettings } from "@/lib/actions/settings-actions";
import type { MascotMood } from "@/lib/user-preferences";

type AiProvider = "anthropic" | "openai";

type SettingsFormProps = {
  initial: {
    name: string;
    timezone: string;
    aiProvider: AiProvider;
    aiModel: string;
    reduceMascots: boolean;
    limitBreakBannerEnabled: boolean;
    mascotMood: MascotMood;
  };
  status: {
    anthropicConfigured: boolean;
    openAiConfigured: boolean;
    openAiImplemented: boolean;
  };
};

export function SettingsForm({ initial, status }: SettingsFormProps) {
  const [name, setName] = useState(initial.name);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [aiProvider, setAiProvider] = useState<AiProvider>(initial.aiProvider);
  const [aiModel, setAiModel] = useState(initial.aiModel);
  const [reduceMascots, setReduceMascots] = useState(initial.reduceMascots);
  const [limitBreakBannerEnabled, setLimitBreakBannerEnabled] = useState(
    initial.limitBreakBannerEnabled,
  );
  const [mascotMood, setMascotMood] = useState<MascotMood>(initial.mascotMood);
  const [pending, startTransition] = useTransition();
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateSettings({
        name,
        timezone,
        aiProvider,
        aiModel,
        reduceMascots,
        limitBreakBannerEnabled,
        mascotMood,
      });
      if (result.ok) {
        setSavedTick(Date.now());
      } else {
        setError(result.error);
      }
    });
  }

  const providerConfigured =
    aiProvider === "anthropic"
      ? status.anthropicConfigured
      : status.openAiConfigured && status.openAiImplemented;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Card>
        <SectionHeading icon={User}>Profile</SectionHeading>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div className="grid gap-1">
            <Label htmlFor="settings-name">Name</Label>
            <Input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="settings-timezone">Timezone</Label>
            <Input
              id="settings-timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              maxLength={120}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-2">
          <SectionHeading icon={MessageCircle}>AI provider</SectionHeading>
          <Pill tone={providerConfigured ? "leaf" : "gold"}>
            {providerConfigured ? <CheckCircle2 className="h-3 w-3" /> : null}
            {providerConfigured ? "Connected" : "Not configured"}
          </Pill>
        </div>
        <div className="grid gap-3">
          <fieldset className="grid gap-1">
            <legend className="font-[var(--font-body)] font-bold text-[12px] text-bark-700 tracking-[0.02em]">
              Provider
            </legend>
            <div className="inline-flex gap-1 p-1 bg-cream-100 border border-cream-200 rounded-[10px] w-fit mt-1">
              {(["anthropic", "openai"] as const).map((provider) => {
                const active = aiProvider === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setAiProvider(provider)}
                    className={cn(
                      "px-3 py-[6px] rounded-[6px]",
                      "font-[var(--font-body)] font-bold text-[12px] uppercase tracking-[0.04em]",
                      "transition-colors duration-[120ms] capitalize",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
                      active
                        ? "bg-bg-raised text-ink-800 border border-cream-200 shadow-[var(--shadow-1)]"
                        : "text-bark-600 hover:text-ink-800",
                    )}
                  >
                    {provider}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-1">
            <Label htmlFor="settings-model">Model</Label>
            <Input
              id="settings-model"
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              maxLength={120}
              placeholder="claude-sonnet-4-6"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-[10px] border border-cream-200 px-3 py-2 flex items-center justify-between gap-2 text-[14px]">
              <span className="text-bark-600">Anthropic key</span>
              <span className="font-medium text-ink-800">
                {status.anthropicConfigured ? "Detected" : "Missing"}
              </span>
            </div>
            <div className="rounded-[10px] border border-cream-200 px-3 py-2 flex items-center justify-between gap-2 text-[14px]">
              <span className="text-bark-600">OpenAI provider</span>
              <span className="font-medium text-ink-800">
                {status.openAiImplemented ? "Ready" : "Deferred"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={Palette}>Appearance</SectionHeading>
        <div className="grid gap-3 mt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] text-ink-800 font-semibold">
                Reduce mascots
              </div>
              <div className="text-[12px] text-bark-500">
                Hide Quill on the dashboard. The mechanics still run.
              </div>
            </div>
            <Toggle
              checked={reduceMascots}
              onChange={setReduceMascots}
              aria-label="Reduce mascots"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] text-ink-800 font-semibold">
                Limit Break banner
              </div>
              <div className="text-[12px] text-bark-500">
                Show the banner on Progress when criteria flip true.
              </div>
            </div>
            <Toggle
              checked={limitBreakBannerEnabled}
              onChange={setLimitBreakBannerEnabled}
              aria-label="Limit Break banner"
            />
          </div>
          <fieldset className="grid gap-1">
            <legend className="font-[var(--font-body)] font-bold text-[12px] text-bark-700 tracking-[0.02em]">
              Quill default mood
            </legend>
            <div className="inline-flex gap-1 p-1 bg-cream-100 border border-cream-200 rounded-[10px] w-fit mt-1">
              {(["default", "cheer", "sleep"] as const).map((mood) => {
                const active = mascotMood === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setMascotMood(mood)}
                    className={cn(
                      "px-3 py-[6px] rounded-[6px]",
                      "font-[var(--font-body)] font-bold text-[12px] uppercase tracking-[0.04em]",
                      "transition-colors duration-[120ms] capitalize",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
                      active
                        ? "bg-bg-raised text-ink-800 border border-cream-200 shadow-[var(--shadow-1)]"
                        : "text-bark-600 hover:text-ink-800",
                    )}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={pending || !name.trim() || !timezone.trim()}
        >
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : "Save"}
        </Button>
        {savedTick !== null ? (
          <InlineConfirmation key={savedTick} message="Saved" />
        ) : null}
        {error ? (
          <span className="text-[13px] text-[color:var(--danger-500)]">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
