# Life OS Overhaul — Design Spec

**Date:** 2026-05-24
**Status:** Draft, awaiting user review
**Author:** Demian (with Claude)

---

## 1. Problem

Current Life OS has 10 sidebar tabs, doesn't solve day-to-day scheduling and planning, has journaling features that go unused, and the gamification has opaque mechanics (class levels + trait stats overlap with no in-app explanation). The user wants the app simpler, focus-driven, calendar-integrated, AI-assisted, and capable of blocking distractions during deep work. Gamification stays — but trimmed.

## 2. Vision

A unified-workspace home dashboard where the **Big Rock of the week + day** is the centerpiece, **Google Calendar is embedded as the planning surface**, **AI sits in a side drawer as a context-aware co-pilot**, **morning habits** are friction-free, and **focus mode** orchestrates existing distraction blockers.

## 3. Architecture decision

**"New dashboard, demote old tabs."** Build a fresh `/home` route alongside existing ones. No data-layer rewrite — Prisma schema extends, doesn't replace. Old routes are deleted in the final cleanup phase. Lower-risk than refactor-in-place; cheaper than greenfield.

## 4. Information Architecture

Sidebar: **4 tabs**, down from 10.

- **Home** (the new dashboard)
- **Tasks**
- **Me** (Progress + Identity + Recap merged and slimmed)
- **Settings**

Ambient sidebar elements survive unchanged: hero level/XP bar, silent Quill mascot, season indicator.

| Removed tab | New home |
| --- | --- |
| Today | Absorbed into Home |
| Week | Replaced by embedded GCal on Home |
| Habits | Morning check-in on Home; analytics on Me |
| AI Chat | Right-side drawer on Home |
| Review | Sunday-night flow inside Me |
| Progress | Merged into Me |
| Identity | Merged into Me |
| Recap | Merged into Me (season recap section) |

**Journaling code and schema dropped via migration.**

## 5. Home Dashboard layout (Unified Workspace)

Top-to-bottom:

1. **Topbar** — date, streak chip, quests chip, AI drawer toggle button (top-right).
2. **Big Rock card** — week rock (left) + day rock (right) in one panel. Day-rock side has "Start deep work" and "Done" buttons.
3. **Embedded Google Calendar week strip** — iframe (`calendar.google.com/calendar/embed`); the main working surface for planning.
4. **Habits row** (left) + **Today's tasks row** (right) — 50/50 split below the calendar.

**AI drawer**: slides in from the right. Closed by default; remembers last state per session. When open, the main area narrows.

**Behaviors:**

- Big rock click → modal to edit/swap (weekly) or mark done (daily).
- "Start deep work" → focus mode (§9).
- Calendar slot click → "Schedule task" dialog → creates Life OS task + GCal event.
- Habits tap → toggle done; dot fills, no animation, no toast, no mascot popup.
- Today's tasks → pulled from GCal events linked to Life OS tasks; click to mark done.

## 6. Big Rocks — data + lifecycle

### Schema (new)

```
model WeekRock {
  id          String   @id @default(cuid())
  userId      String
  weekStart   String   // "YYYY-MM-DD" (Monday)
  title       String
  trait       TraitAxis @default(FOCUS)
  status      RockStatus @default(ACTIVE)  // ACTIVE | DONE | MISSED
  xpReward    Int      @default(250)
  createdAt   DateTime @default(now())
  completedAt DateTime?
  dailyRocks  DailyRock[]
}

model DailyRock {
  id          String   @id @default(cuid())
  userId      String
  date        String   // "YYYY-MM-DD"
  title       String
  trait       TraitAxis @default(FOCUS)
  status      RockStatus @default(PENDING)
  xpReward    Int      @default(50)
  weekRockId  String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

enum RockStatus { ACTIVE PENDING DONE MISSED }
```

### Lifecycle

- **Sunday night**: set next week's rock (Sunday review flow on /me prompts).
- **Each morning**: set today's rock (optionally linked to the week's rock).
- **During the day**: "Start deep work" → focus mode → marks done on completion.
- **End of day**: if status is still PENDING at midnight, status → MISSED. No XP, no streak break.
- **AI drawer** prompts "carry to tomorrow?" the morning after a missed rock.

### XP and trait routing

| Event | XP | Trait |
| --- | --- | --- |
| Daily rock done | +50 | rock's `trait` |
| Daily rock missed | 0 | — |
| Week rock done | +250 + bonus | rock's `trait` |
| 5 daily rocks in a row done | +100 bonus | DISCIPLINE |

Default trait on rock creation: `FOCUS`. Selectable in the create-rock modal (dropdown of the 5 axes).

### Edge cases

- **Swap mid-week**: editing week rock title doesn't reset progress.
- **No daily rock set by 10:00**: soft prompt on Home (not modal).
- **Weekend**: daily rock optional; week rock counts through Sunday midnight.
- **Week rock done early**: option to set next week's now or bank.

## 7. Morning Habits

- **3–5 fixed habits** configured in /settings. Each has a default trait axis.
- **Daily check-in**: horizontal row on Home, checkboxes only. No animations, no toasts, no Quill popups.
- **XP**: +10 per habit done, routed to its trait axis.
- **Streak**: counts days where the user completed *all* habits. Tier badges (bronze/silver/gold) from the existing streak-tier system, relocated.

### Schema

Reuse existing `HabitDefinition` / `HabitCheck` tables if present (Phase 1.1 audit). Otherwise create:

```
model HabitDefinition { id, userId, title, trait, order }
model HabitCheck { id, userId, habitId, date /* "YYYY-MM-DD" */, doneAt }
```

## 8. AI Drawer

### UX

- Right-side drawer, slides in. Toggle button in topbar.
- Quick-prompt buttons at top: "What should I focus on?", "Plan my day", "Reschedule [X]", "Summarize the week so far".
- Chat input below.

### Model routing

- `claude-sonnet-4-6` for general chat.
- `claude-opus-4-7` for planning / scheduling-heavy requests (auto-detected from message intent).

### Context

Every request includes a structured system message with: today's date, current week rock, today's rock, habit definitions + today's completion state, today's calendar events, recent tasks.

### Tool use with approval

The AI has tools: `scheduleEvent`, `createTask`, `setDailyRock`, `completeHabit`, etc. **Per project rules, no tool call writes data directly.** Each tool call surfaces as a "proposed action" card with Approve / Edit / Cancel buttons. User approval triggers the actual write.

### Prompt caching

System prompt + user-context block use ephemeral cache breakpoints to keep latency and cost down across multi-turn conversations.

### Privacy

Nothing leaves the machine except the Anthropic API call. No app-level logging beyond Anthropic's standard data retention.

## 9. Focus Mode (Phase 1)

### UX

Full-screen takeover with:

- "FOCUSING ON BIG ROCK · TODAY" label
- Day-rock title (large)
- Countdown timer (default **90 min**; configurable per rock; "+15 min" extend)
- Status line: "iOS Focus enabled · Cold Turkey blocking N sites"
- Buttons: **Done early** / **+15 min** / **End focus**

### Orchestration

On start, Life OS fires hooks in order:

1. Trigger an iOS Shortcut via URL scheme to enable a Focus profile.
2. Call the desktop blocker CLI (e.g., Cold Turkey / Freedom) via a local helper command configured in /settings.
3. Optional system tray notification: "Focus started: [rock title]".

On end, reverse the above. Prompt: "Did you complete the rock?" → mark done (XP) or extend / carry.

### What Phase 1 ships

UI + timer + a single configurable "before-focus" and "after-focus" command string in /settings. User wires up the iOS Shortcut and the desktop CLI once.

### Schema (new)

```
model FocusSession {
  id              String @id @default(cuid())
  userId          String
  dailyRockId     String?
  startedAt       DateTime
  endedAt         DateTime?
  plannedMinutes  Int
  outcome         FocusOutcome?
}

enum FocusOutcome { COMPLETED CARRIED ABANDONED }
```

### Out of scope (Phase 2)

Native iOS / Android Screen Time companion app. Hosts-file / proxy-based desktop blocker built into Life OS. These would be months of native work; deferred until Phase 1 proves insufficient.

## 10. Google Calendar Integration

Two layers, same underlying data:

### Visual layer (read)

Embedded iframe of `calendar.google.com/calendar/embed` on Home. Read-only; what Google renders is what shows. Fast, free.

### Sync layer (read + write)

Google Calendar API via OAuth.

- **OAuth in /settings**: one-time sign-in. Pick which calendar to use (default = primary). Pick a color for Life OS events.
- **Outbound**: schedule a task in Life OS → create a GCal event → store `gcalEventId` on the task.
- **Inbound**: poll every 5 minutes for changed events. Match by `gcalEventId`. If a Life OS task's event was edited in GCal, update the task. If event deleted, mark task abandoned.
- **Loop guard**: track `lastSyncedAt` per task. If GCal's `updated` is older than `lastSyncedAt`, skip — we wrote it.
- **Conflict rule**: most-recent-write wins. No prompts.

### Schema deltas

```
Task {
  ...existing fields,
  gcalEventId   String?  // event id in GCal
  gcalCalendarId String? // calendar id (default = primary)
  lastSyncedAt  DateTime?
}

model IntegrationCredential {
  id           String @id @default(cuid())
  userId       String
  provider     String  // "google_calendar" | "anthropic"
  accessToken  String  // encrypted at rest
  refreshToken String? // encrypted at rest
  expiresAt    DateTime?
  meta         Json?
}
```

## 11. Consolidated /me tab

Single scroll with these sections:

1. **Hero header**: title, level, XP bar, season day.
2. **Trait radar (5 axes)** + horizontal level list. No class names.
3. **This week** summary: daily rocks done, habits completed, streak, XP this week.
4. **This season**: chapter ribbon (weeks 1..12), active quests.
5. **Past seasons** (collapsed `<details>`): name, end date, XP earned, link to recap.
6. **Sunday review entry**: button to run the weekly review flow.

### What got cut

- HP / MP visualization (RPG metaphor without payoff)
- Status effects strip
- Limit Break banner
- XP event feed (collapsed to weekly stat)
- Title history (only current title shown; past titles live in season recaps)
- Class names (Disciplinarian, etc) — replaced by trait names
- Detailed bonus event list

### What stayed

- Current title + level/XP
- Trait radar (5 axes)
- Weekly summary
- Season chapter ribbon + active quests
- Past season recaps (collapsed)
- Sunday weekly review entry point

## 12. Phasing & ship order

| Phase | What ships | Depends on | Risk |
| --- | --- | --- | --- |
| **1.1 Skeleton** | New `/home` route shell. Sidebar trim to 4 tabs. Delete journaling code + migration. Consolidated `/me` tab built (merged content, no new mechanics yet). | — | Low |
| **1.2 Big Rocks** | `WeekRock` + `DailyRock` models + migrations. Big Rock card on Home. Set/edit/complete flows. XP + trait routing. | 1.1 | Low |
| **1.3 Habits + Tasks zones** | Habits row on Home (audit existing schema first). Today's tasks zone (from existing `Task`). Settings: habit config. | 1.1 | Low |
| **1.4 GCal** | OAuth in Settings. Iframe embed on Home. API client. Outbound writes. 5-min polling for inbound. `Task.gcalEventId` + `IntegrationCredential` schema. | 1.3 | Med |
| **1.5 AI drawer** | Drawer UI + state. Anthropic API client. Structured context. Tool definitions + approval-card pattern. | 1.4 | Med |
| **1.6 Focus mode** | Full-screen UI + timer. Before/after command hooks. `FocusSession` model. Wires to today's rock. | 1.2 | Med |
| **1.7 Cleanup** | Delete old tabs. Purge HP/MP, status effects, Limit Break, XP event feed, class names. E2E pass on Home. | All | Low |

### Phase 2 (out of scope for this overhaul)

- Native iOS Screen Time companion (Family Controls API, App Store).
- Built-in desktop blocker (hosts-file or proxy-based).
- Push notifications.
- Optional Outlook / Apple Calendar adapters reusing GCal integration pattern.

## 13. Open questions / risks

- **Phase 1.1 schema audit**: confirm what's reusable from current schema (HabitDefinition, HabitCheck, GameProfile, Task fields). The spec assumes reuse; audit may surface gaps.
- **Anthropic API key storage**: env var vs encrypted user setting. Spec leans toward `IntegrationCredential` for user setting but env var is simpler for single-user.
- **Cron strategy for the 5-min GCal poll**: Next.js route handler + scheduler, or local `node-cron` in dev? Decide in Phase 1.4.
- **Tasks tab content**: spec treats Tasks as a top-level tab but doesn't specify what view (backlog list, all tasks, etc.). Resolve before Phase 1.3.
- **Title mechanic**: titles currently auto-generated from quests; new mechanic may be needed if quests are simplified. Defer to Phase 1.5/1.6 when quest behavior stabilizes.
- **Existing data migration**: ensuring journaling deletion migration is reversible (DB backup) and doesn't touch user XP/season history.

## 14. Non-goals

- Auth (single-user local app).
- Payments.
- Public landing page.
- Mobile native app.
- Social / sharing features.
- Email integration.
