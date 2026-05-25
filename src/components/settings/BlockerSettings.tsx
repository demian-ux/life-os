"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  Button,
  IconButton,
  InlineConfirmation,
  Input,
  Label,
  Pill,
  SectionHeading,
  Textarea,
  Tooltip,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  createBlockRule,
  deleteBlockRule,
  reinstallBlocker,
  toggleBlockRule,
  updateBlockRule,
} from "@/lib/actions/blocker-actions";
import { parseDomainsInput } from "@/lib/validators/blocker";

export type HabitOption = { id: string; name: string };

export type BlockRuleView = {
  id: string;
  name: string;
  domains: string[];
  guardType: "HABIT_LOGGED";
  guardParams: { habitId: string };
  active: boolean;
  satisfied: boolean;
  reason: string;
};

type BlockerInstallStatus = {
  supported: boolean;
  registered: boolean;
  message: string;
};

export function BlockerSettings({
  rules,
  habits,
  blockedDomains,
  totalBlockedDomains,
  installStatus,
}: {
  rules: BlockRuleView[];
  habits: HabitOption[];
  blockedDomains: string[];
  totalBlockedDomains: number;
  installStatus: BlockerInstallStatus;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [reinstallPending, startReinstall] = useTransition();
  const [reinstallMessage, setReinstallMessage] = useState<string | null>(null);

  function requestReinstall() {
    setReinstallMessage(null);
    startReinstall(async () => {
      const result = await reinstallBlocker();
      setReinstallMessage(
        result.ok
          ? "Installer launched. Accept the Windows prompt, then refresh this page."
          : result.error,
      );
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading>Site blocking</SectionHeading>
        {totalBlockedDomains > 0 ? (
          <Pill tone="warn">
            Blocking {totalBlockedDomains} domain
            {totalBlockedDomains === 1 ? "" : "s"}
          </Pill>
        ) : (
          <Pill tone="done">All clear</Pill>
        )}
      </div>

      <p className="text-body-sm text-ink-soft">
        Rules add lines to the system hosts file. Each rule has a guard — when
        the guard is met (e.g. you log a habit), the domains are unblocked. On
        days the guard habit isn’t scheduled, the rule auto-unblocks.
      </p>

      {installStatus.supported && !installStatus.registered ? (
        <div className="rounded-input border border-status-warn/40 bg-status-warn/10 px-3 py-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-2 text-body-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warn" />
            <div>
              <p className="font-medium">Blocker not registered</p>
              <p className="text-ink-soft">{installStatus.message}</p>
              {reinstallMessage ? (
                <p className="text-meta text-ink-muted mt-1">{reinstallMessage}</p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={requestReinstall}
            disabled={reinstallPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {reinstallPending ? "Launching..." : "Reinstall"}
          </Button>
        </div>
      ) : null}

      {blockedDomains.length > 0 ? (
        <details className="rounded-input border border-line px-3 py-2">
          <summary className="cursor-pointer text-body-sm font-medium text-ink">
            Currently blocking
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {blockedDomains.map((domain) => (
              <Pill key={domain} tone="warn">
                {domain}
              </Pill>
            ))}
          </div>
        </details>
      ) : null}

      <ul className="grid gap-3">
        {rules.map((rule) => (
          <RuleEditor key={rule.id} rule={rule} habits={habits} />
        ))}
      </ul>

      {addingNew ? (
        <RuleEditor
          rule={null}
          habits={habits}
          onCancel={() => setAddingNew(false)}
          onSaved={() => setAddingNew(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setAddingNew(true)}
          disabled={habits.length === 0}
        >
          <Plus className="h-3.5 w-3.5" />
          Add rule
        </Button>
      )}
    </div>
  );
}

function RuleEditor({
  rule,
  habits,
  onCancel,
  onSaved,
}: {
  rule: BlockRuleView | null;
  habits: HabitOption[];
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [habitId, setHabitId] = useState(
    rule?.guardParams.habitId ?? habits[0]?.id ?? "",
  );
  const [domainsText, setDomainsText] = useState(
    (rule?.domains ?? []).join("\n"),
  );
  const [active, setActive] = useState(rule?.active ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);

  const dirty =
    !rule ||
    name !== rule.name ||
    habitId !== rule.guardParams.habitId ||
    domainsText !== rule.domains.join("\n") ||
    active !== rule.active;

  function save() {
    setError(null);
    const domains = parseDomainsInput(domainsText);
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    if (domains.length === 0) {
      setError("At least one valid domain required");
      return;
    }
    if (!habitId) {
      setError("Pick a habit guard");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        domains,
        guardType: "HABIT_LOGGED" as const,
        guardParams: { habitId },
        active,
      };
      const result = rule
        ? await updateBlockRule({ ruleId: rule.id, ...payload })
        : await createBlockRule(payload);
      if (result.ok) {
        setSavedTick(Date.now());
        onSaved?.();
      } else {
        setError(result.error);
      }
    });
  }

  function remove() {
    if (!rule) {
      onCancel?.();
      return;
    }
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    startTransition(async () => {
      await deleteBlockRule({ ruleId: rule.id });
    });
  }

  function toggleActive(next: boolean) {
    setActive(next);
    if (!rule) return;
    startTransition(async () => {
      await toggleBlockRule({ ruleId: rule.id, active: next });
    });
  }

  return (
    <li className="rounded-card border border-line bg-surface p-4 grid gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rule name"
            className="w-56"
          />
          {rule ? (
            rule.active ? (
              <Pill tone={rule.satisfied ? "done" : "warn"}>
                {rule.satisfied ? "Unblocked" : "Blocking"}
              </Pill>
            ) : (
              <Pill tone="skipped">Disabled</Pill>
            )
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleActive(!active)}
            aria-pressed={active}
            className={cn(
              "px-2.5 py-1 rounded-pill text-meta border transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              active
                ? "bg-accent border-accent text-bg"
                : "border-line text-ink-soft hover:border-ink-soft hover:text-ink",
            )}
          >
            {active ? "Enabled" : "Disabled"}
          </button>
          <Tooltip label="Delete">
            <IconButton label="Delete rule" size="sm" onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {rule && !rule.satisfied && rule.active ? (
        <p className="text-meta text-ink-soft italic">{rule.reason}</p>
      ) : rule && rule.satisfied && rule.active ? (
        <p className="text-meta text-ink-muted italic">{rule.reason}</p>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`rule-${rule?.id ?? "new"}-habit`}>
            Unblock when this habit is logged
          </Label>
          <select
            id={`rule-${rule?.id ?? "new"}-habit`}
            value={habitId}
            onChange={(e) => setHabitId(e.target.value)}
            className="bg-surface border border-line rounded-input px-2 py-1.5 text-body-sm text-ink focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Behavior</Label>
          <p className="text-meta text-ink-muted leading-relaxed">
            Blocks until habit logged today.
            <br />
            Auto-unblocks on days the habit isn’t scheduled.
          </p>
        </div>
      </div>

      <div className="grid gap-1">
        <Label htmlFor={`rule-${rule?.id ?? "new"}-domains`}>
          Domains (one per line)
        </Label>
        <Textarea
          id={`rule-${rule?.id ?? "new"}-domains`}
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
          rows={6}
          className="font-mono text-body-sm"
          placeholder="instagram.com&#10;www.instagram.com&#10;tiktok.com"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending || !dirty}
        >
          {pending ? "Saving..." : rule ? "Save changes" : "Create rule"}
        </Button>
        {!rule ? (
          <Button type="button" size="sm" variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {savedTick !== null ? (
          <InlineConfirmation key={savedTick} message="Saved" />
        ) : null}
        {error ? (
          <span className="text-meta text-status-missed ml-auto">{error}</span>
        ) : null}
      </div>
    </li>
  );
}
