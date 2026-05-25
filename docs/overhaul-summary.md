# Life OS Overhaul — Phases 1.1–1.7 Summary

**Date:** 2026-05-25
**Spec:** [docs/superpowers/specs/2026-05-24-life-os-overhaul-design.md](superpowers/specs/2026-05-24-life-os-overhaul-design.md)

## What shipped

| Phase | Status | Notes |
| --- | --- | --- |
| 1.1 Skeleton | ✅ | `/home` shell, 4-tab sidebar (Home/Tasks/Me/Settings), `/me` consolidated, journaling no-op verified |
| 1.2 Big Rocks | ✅ | `WeekRock`/`DailyRock` schema, set/edit/complete flows, XP routing via `awardXp("BIG_ROCK_DONE")` |
| 1.3 Habits + Tasks | ✅ | `HomeHabitsRow` (status cycle), `HomeTasksRow` (today's scheduled), Settings habit section |
| 1.4 GCal | ✅ | iframe embed on `/home`, scaffolded OAuth + sync (inert without creds), `docs/gcal-setup.md` |
| 1.5 AI drawer | ✅ | Real chat drawer on `/home` reusing existing Anthropic infra, sessionStorage persistence, `docs/ai-setup.md` |
| 1.6 Focus mode | ✅ | `FocusSession` schema, full-screen UI with 90-min timer + extend/done/abandon, before/after hook commands, "Start deep work" on Day Rock |
| 1.7 Cleanup | ⚠️ partial | Old route deletion skipped per user choice — routes remain deep-linkable. Sidebar trim (1.1) already hides them. /me cut features were never ported. |

## /home layout (spec §5)

All five zones live:
- **Topbar** → AI drawer toggle (right)
- **Zone 1: Big Rock** → `WeekRockCard` + `DayRockCard` (with Start deep work)
- **Zone 2: GCal** → `GoogleCalendarEmbed` (iframe; configure URL in /settings)
- **Zone 3+4: Habits + Tasks** → `HomeHabitsRow` + `HomeTasksRow`
- **AI drawer** → `HomeAIDrawerSlot` → `HomeAIDrawerContent` (reuses `/ai` building blocks)
- **Focus overlay** → `FocusMode` renders full-screen when an active `FocusSession` exists

## What's deferred (documented, not blockers)

- **GCal OAuth callback route handler** — Phase 1.5/1.6 follow-up. Helpers exist in `src/lib/gcal/oauth.ts`.
- **GCal poll cron schedule** — `pollInboundChanges` runs on demand; no 5-min scheduler wired (spec §13 open question).
- **Habits CRUD in /settings** — currently `HabitsSettings` links to `/habits` (kept alive). Inline CRUD = follow-up.
- **Sunday review embedded in /me** — currently `/me` deep-links to `/review` (kept alive).
- **AI intent routing for sonnet-4-6 vs opus-4-7** — uses `AI_MODEL` env for all turns. Wire intent detection in `src/lib/ai/providers.ts`.
- **5-in-a-row +100 DISCIPLINE combo bonus** for daily rocks — noted in `completeDailyRock` comment.
- **Encryption-at-rest for `IntegrationCredential.accessToken`** — plaintext in dev.
- **Native iOS Focus / desktop blocker integration** — focus mode shell commands trigger user's own scripts; Phase 2.

## What was cut from /me (spec §11)

These never landed in the new `/me` page (built fresh in 1.1):
- HP / MP rails
- Status effects strip
- Limit Break banner
- XP event feed
- Title history
- Class names (Disciplinarian etc.) — trait names only
- Bonus event list

## Schema changes (4 new migrations)

1. `add_rocks` — `WeekRock`, `DailyRock`, `RockStatus`
2. `add_gcal_sync` — `Task.gcalEventId/gcalCalendarId/lastSyncedAt`, `IntegrationCredential`
3. `add_focus_sessions` — `FocusSession`, `FocusOutcome`

## Verification

- `pnpm lint` → 0 errors, 0 warnings
- `pnpm typecheck` → 0 errors
- `pnpm build` → succeeds, all new routes (`/home`, `/me`, `/settings`, `/tasks`) plus legacy routes compile
- `/home`, `/tasks`, `/me`, `/settings` → 200 in dev
