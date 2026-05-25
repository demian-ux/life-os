# Assumptions

Tracked deviations and judgment calls. Update as new ones come up.

## Settings page
- Settings writes `User.name`, `User.timezone`, and AI provider/model preferences to SQLite (`User.preferences`) instead of editing `.env.local`. This keeps preferences hot-reloadable and avoids writing secrets from the app UI.
- API keys still come from `.env.local`; the Settings page only reports whether a key is present. OpenAI remains marked as deferred until `src/lib/ai/providers.ts` gets a real OpenAI adapter.
- User timezone now drives current-day calculations for the main app surfaces and AI context. XP helpers still accept explicit date keys from callers, but when they need "today" they derive it from the user's saved timezone.

## Project location
- Project lives at `C:\Users\demia\life-os` since the spec did not specify a path.

## Dependency / tooling versions
- Next.js 16.2.4 was installed (latest at scaffold time, 2026-05). Spec just says "Next.js App Router".
- Tailwind v4 is the scaffolded version. The spec mentions Tailwind without pinning a major; v4 is the current default from `create-next-app`.
- React 19 is the scaffolded version (paired with Next 16).
- Prisma 7 with the new driver-adapter pattern is used (matches the spec's `@prisma/adapter-better-sqlite3` requirement).
- pnpm 10.33 was installed via `npm install -g` to a user-local prefix (`~/.npm-global`) because Node lives in `Program Files` and the global install location is not user-writable. PATH is exported per shell.
- pnpm 10 requires explicit approval for build scripts; `package.json` has `pnpm.onlyBuiltDependencies` allowing prisma engines, better-sqlite3, esbuild, and @prisma/client to run install/postinstall.

## Turbopack
- Next 16 uses Turbopack by default for `next dev` and `next build`. Kept default — no special config.

## shadcn/ui
- Deferred running `shadcn@latest init` until the first component actually needs it. The spec lists shadcn/ui in the stack, but adding empty config is unnecessary while pages have no UI primitives. AppShell + Sidebar are written with plain Tailwind + lucide-react for now.

## Sidebar in MVP
- A `/` (home) route exists per spec; it redirects to `/today` so the app opens on the daily view.

## .env.local quoting gotcha (Next 16 + Turbopack)
- Putting the Anthropic key in quotes (`ANTHROPIC_API_KEY="sk-ant-..."`) silently failed to load — `process.env.ANTHROPIC_API_KEY` came back empty even though `AI_PROVIDER` from the same file loaded fine. Removing the quotes fixes it. Use unquoted values in `.env.local` for keys that contain dashes / mixed-case base64-ish patterns. The `.env.example` should follow the same convention.

## Phase 9 — Progress & gamification
- XP is event-sourced (`XpEvent`) and `GameProfile` is recomputed on every award/revoke. Total = SUM(amount), level = `levelFromXp(total)`. Toggling a completion off correctly revokes the matching event so XP can't get out of sync with state.
- "Complete Big Rock: +50 XP" is interpreted as "all weekly targets DONE" since the schema has no explicit Big Rock done flag. Awarded once per week with `dedupeKey = weekId`; flips off when any target leaves DONE.
- "Complete deep work block: +15 XP" only fires for blocks where `category === "DEEP_WORK"`.
- "Weekly review: +25 XP" awarded on first save of a `WeeklyReview` for that week (no double-XP on edit).
- "No two missed days in a row: +20 XP" (the consistency bonus) is **not** auto-granted as an XP event. It would need a daily cron / login hook, which isn't part of MVP. Instead the page shows a live consistency % and habit-day count — calmer signal, no surprise XP. Listed in `XP_RULES` so it's easy to wire later.
- Levels use a hand-tuned threshold table in `xp.ts` (50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550). Tunable later.

## Phase 7 — AI Chat MVP
- Provider abstraction lives in `src/lib/ai/providers.ts`. Anthropic is implemented via `fetch` against `/v1/messages` (no SDK). OpenAI is a stub that always reports "not configured" — the spec required supporting both, but real OpenAI wiring is deferred until a need exists.
- Default model is `claude-sonnet-4-6` (overridable via `AI_MODEL` env). Provider selected via `AI_PROVIDER` env (default `anthropic`).
- Output format is JSON inside a fenced code block. We extract → `JSON.parse` → Zod-validate (`aiCoachResponseSchema`). Tool-use was considered but skipped to keep the provider layer minimal; if Claude breaks the format, the error path stores the raw response as a SYSTEM message so the user can see what went wrong.
- AI **never** writes directly. All proposed changes land as `AiAction` rows with status `PROPOSED` and require an explicit Approve click before any DB write happens. On approve, payload is re-validated, applied, and the row's status becomes `APPLIED` or `FAILED` (with `error` set).
- "Edit action before approve" was deferred from the MVP — only Approve / Reject are exposed. If the user wants tweaks, they can reject and re-prompt, or edit the resulting record in the relevant screen after Approve.
- Supported AI action types in MVP: `CREATE_TASK`, `SCHEDULE_TASK`, `CREATE_TIME_BLOCK`, `CREATE_WEEKLY_TARGET`, `UPDATE_WEEK`, `LOG_HABIT`. The wider schema in spec section 16 (CREATE_HABIT, UPDATE_TASK, etc.) can be added incrementally.
- `LOG_HABIT` references habits by name (not id) so the model can act from context naturally; `SCHEDULE_TASK` and `CREATE_TIME_BLOCK` reference tasks by id since ids appear in the context block.

## Phase 2 default seed
- Seeded only weekday DayPlans (Mon-Fri) per spec section 19.1. Weekends remain empty.
- Seeded the current week (calculated at seed time, Mon-start) plus a "Default Big Rock" placeholder.
- Habit `dayOfWeek` uses ISO weekdays: 1 = Monday … 7 = Sunday.
- A `GameProfile` row is seeded with zero XP/level 1 so progress queries always have a row.
