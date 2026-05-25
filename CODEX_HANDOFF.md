# Life OS — Codex Handoff

You're picking up a local-first single-user planning app that's already shipped its MVP (spec sections 1-32, all 9 phases). This document briefs you on the state of the world, the conventions the codebase enforces, the gotchas that will bite you, and the next tasks.

You will start cold — read this top to bottom before touching code.

---

## 1. Project location & stack

- **Path:** `C:\Users\demia\life-os` (Windows host, Git Bash works fine)
- **Owner:** single user (Demian), no auth, no multi-tenant, no cloud
- **Stack actually installed (not what the spec asked for — what's on disk):**
  - Next.js 16.2.4 (App Router, Turbopack default, React 19.2.4)
  - TypeScript 5.9.3, Tailwind v4 (CSS-first via `@import "tailwindcss"`)
  - Prisma 7.8.0 with `@prisma/adapter-better-sqlite3` 7.8.0
  - SQLite through `better-sqlite3` 12.9.0
  - Zod 4 for all validation
  - `lucide-react` 1.x for icons
  - Anthropic via raw `fetch` against `/v1/messages` (no SDK installed)
  - pnpm 10.33.3 (installed to `~/.npm-global` because `C:\Program Files\nodejs` isn't user-writable)
- **Stack listed in spec but NOT wired yet:**
  - shadcn/ui — write components in plain Tailwind + lucide-react until you actually need a shadcn primitive, then run `pnpm dlx shadcn@latest init`
  - OpenAI provider — stubbed in `src/lib/ai/providers.ts`, returns `not implemented`

---

## 2. Read these in order before coding

1. `docs/life-os-spec.md` — original product spec, sections 1-32. The source of truth for product intent.
2. `docs/assumptions.md` — every non-obvious decision made during build. **Add to it whenever you make a similar call.**
3. `AGENTS.md` — short reminder that Next 16 has breaking changes vs. older training data. The full Next docs are in `node_modules/next/dist/docs/` if you need them.
4. `CLAUDE.md` — abbreviated project rules.

---

## 3. Environment setup

### Files
- `.env` (committed? No — `.env*` is in `.gitignore`. Contains `DATABASE_URL="file:./prisma/dev.db"`)
- `.env.example` (committed) — keys to copy into `.env.local`
- `.env.local` (gitignored, you must create for AI to work)

### What goes in `.env.local`
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
AI_PROVIDER=anthropic
AI_MODEL=
```

> ⚠️ **Do NOT quote `ANTHROPIC_API_KEY`** in `.env.local`. Next 16's env loader silently drops it when wrapped in `"..."` even though `AI_PROVIDER="anthropic"` from the same file loads fine. This is recorded in `docs/assumptions.md` under "`.env.local` quoting gotcha". Use unquoted values for the API key.

### One-time install
```bash
# from C:\Users\demia\life-os
export PATH="$HOME/.npm-global:$PATH"   # if pnpm isn't on PATH
pnpm install
pnpm db:generate
pnpm db:migrate         # creates prisma/dev.db, applies migrations
pnpm db:seed            # creates user, 9 habits, current week, weekday DayPlans
```

### Run
```bash
pnpm dev          # http://localhost:3000  ('/' redirects to '/today')
```

### Verification — run on every change before reporting done
```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm exec prisma validate    # only after schema changes
```

If any of those fail, the change isn't done.

---

## 4. What's already built (Phases 1-9)

| Phase | Surface | Key files |
|---|---|---|
| 1 | App scaffold, sidebar, all 9 routes | `src/components/layout/{AppShell,Sidebar,Topbar}.tsx`, `src/app/*/page.tsx` |
| 2 | DB schema + seed | `prisma/schema.prisma`, `prisma/seed.ts`, `prisma.config.ts`, `src/lib/db.ts` |
| 3 | Week command center | `src/app/week/page.tsx`, `src/components/week/*`, `src/lib/actions/week-actions.ts`, `src/lib/week/queries.ts` |
| 4 | Today execution view | `src/app/today/page.tsx`, `src/components/today/*`, `src/lib/actions/today-actions.ts` |
| 5 | Tasks: Inbox / Today / Week / Someday / Done | `src/app/tasks/page.tsx`, `src/components/tasks/*`, `src/lib/actions/task-actions.ts` |
| 6 | Habits with streaks | `src/app/habits/page.tsx`, `src/components/habits/*`, `src/lib/habits/streaks.ts`, `src/lib/actions/habit-actions.ts` |
| 7 | AI chat + propose/approve actions | `src/app/ai/page.tsx`, `src/components/ai/*`, `src/lib/ai/*`, `src/lib/actions/ai-coach-actions.ts`, `src/lib/validators/ai-actions.ts` |
| 8 | Weekly review with AI summary | `src/app/review/page.tsx`, `src/components/review/*`, `src/lib/actions/review-actions.ts`, `src/lib/validators/review.ts` |
| 9 | XP / level / streak / consistency / big rock | `src/app/progress/page.tsx`, `src/components/progress/*`, `src/lib/xp.ts`, `src/lib/progress/queries.ts` |

The MVP "definition of done" (spec section 32) is fully checked.

---

## 5. Conventions the codebase enforces

These aren't suggestions. Existing code follows them; your code must too.

1. **Date-only values are `YYYY-MM-DD` strings. Time-only values are `HH:mm` strings.** Helpers live in `src/lib/dates.ts` (`todayKey`, `getWeekStart`, `addDays`, `formatDateLabel`, `getDayKey`). Never store dates as JS `Date` for calendar days — only `createdAt` / `updatedAt` / timestamps use `DateTime`.

2. **Server Components for reads, Server Actions for writes.** All write paths live in `src/lib/actions/*-actions.ts` and start with `"use server"`. Don't put Prisma calls in client components.

3. **Zod validates every write.** Schemas live in `src/lib/validators/*`. The action's first move is `schema.safeParse(input)`. If you add a new field to a Prisma model, add it to the matching validator in the same change.

4. **AI never writes to the DB directly.** The flow is:
   - User sends a chat message → `sendChatMessage`
   - The model returns a JSON block matching `aiCoachResponseSchema`
   - Each `actions[i]` is persisted as an `AiAction` row with `status: "PROPOSED"`
   - User clicks Approve → `approveAiAction` re-validates the payload, calls `applyAiAction`, writes to the DB, sets the row to `APPLIED` (or `FAILED` with `error` text)
   - Reject just flips status to `REJECTED`
   - Edit-before-approve is **not** built — see "deferred" list below

5. **Server Actions call `revalidatePath` on every affected screen.** Any XP-affecting action additionally revalidates `/progress`.

6. **XP is event-sourced.** `awardXp` / `revokeXp` use `source:dedupeKey` so toggling a completion off cleanly revokes the matching event. Recompute `GameProfile` after every change. See `src/lib/xp.ts`.

7. **`export const dynamic = "force-dynamic"` lives on every route that reads user data.** Don't remove it accidentally — Turbopack will silently SSG with stale data.

---

## 6. Gotchas that will bite you

- **`.env.local` quoting** (see §3 above)
- **pnpm 10 is strict about build scripts.** Any new native dep needs to be added to `package.json > pnpm.onlyBuiltDependencies`. Currently approved: `@prisma/client`, `@prisma/engines`, `better-sqlite3`, `esbuild`, `prisma`. After adding, run `pnpm install && pnpm rebuild`.
- **The Prisma client is generated into `node_modules/.pnpm/@prisma+client@7.8.0_*/node_modules/@prisma/client`.** After every `prisma/schema.prisma` change run `pnpm db:generate`. The seed script depends on this.
- **Turbopack caches.** If env or schema changes look ignored in dev, `rm -rf .next` and restart `pnpm dev`.
- **Next 16 made `cookies()`, `headers()`, `params`, `searchParams` async.** `params` and `searchParams` in pages are `Promise<...>`. `await` them. Existing pages already do this.
- **`pnpm lint` runs `eslint` flat config.** No `next lint`. Don't reintroduce it.
- **The Bash tool's working directory does not always persist between calls** (we hit this during build). Use absolute paths or re-`cd` per command if you write tooling that calls bash repeatedly.

---

## 7. Decision log location

Every judgment call is in [`docs/assumptions.md`](docs/assumptions.md). Examples already there:

- Why pnpm lives at `~/.npm-global`
- Why shadcn init is deferred
- Why Tailwind v4 / Next 16 / Prisma 7 (latest at scaffold)
- The `.env.local` quoting gotcha
- AI: JSON-in-fenced-block over tool_use, OpenAI deferred, edit-before-approve deferred, supported action subset
- XP: how Big Rock completion is interpreted, why the consistency bonus isn't auto-granted, level threshold table

**Add to that file whenever you make a non-obvious choice.** Future-you and humans both rely on it.

---

## 8. Suggested next tasks (in rough priority)

### Easy
1. **Settings page** — `src/app/settings/page.tsx` is a placeholder. Edit `User.name`, `User.timezone`, `AI_PROVIDER`, `AI_MODEL`. Persist to `User.preferences` JSON or `.env.local` (preferences if you want hot-reload, env if you're OK with restart).
2. **Empty-state copy** on `/today` and `/week` when a user has zero habits (currently shows "No habits scheduled for today").
3. **Auto-archive completed tasks** older than N days when `startNewWeek` runs.
4. **Goal UI** — schema exists (`Goal`, `GoalTask`, `GoalHabit`) but no page. Spec deliberately leaves it light for MVP. A simple list + "break this goal into tasks" AI command would be a natural fit.

### Medium
5. **Edit-before-approve** for AI actions. Currently only Approve / Reject. Open a form pre-filled with the action's payload (per type — `CREATE_TASK` editor is the most common), save updates `AiAction.payload`, then user can approve. See `docs/assumptions.md` for the original deferral.
6. **Daily consistency bonus.** `XP_RULES.CONSISTENCY_BONUS = 20` is defined but never awarded. Needs a daily server-side hook (cron, or a "first request after midnight" check) that scans yesterday's scheduled habits and awards if no two missed days in a row. Dedupe by date.
7. **Wider AI action set.** Add `CREATE_HABIT`, `UPDATE_HABIT`, `UPDATE_TASK`, `ADD_XP_EVENT` to:
   - `src/lib/validators/ai-actions.ts` (schemas + add to `aiActionProposalSchema` discriminated union)
   - `src/lib/ai/apply-actions.ts` (matching `case` blocks)
   - `src/lib/ai/prompts.ts` (document the new action shapes in the system prompt)
   - `src/components/ai/AiActionCard.tsx` (`formatPayload` switch case for human-readable summary)
8. **Conversation list with archive** on `/ai`. Currently just a chip strip — make it a sidebar with rename / archive.

### Bigger / out of MVP scope (only with user confirmation)
9. **Notion import** — one-time CSV/JSON sync of tasks
10. **Google Calendar two-way** — explicitly deferred in spec section 25/26
11. **PWA + push reminders** — post-MVP per spec section 26
12. **OpenAI provider** — `src/lib/ai/providers.ts` has the stub

---

## 9. Things you must NOT add (per spec section 25)

- Auth
- Payments
- Google Calendar sync
- Email access
- Mobile native app
- Social features
- Public landing page
- Multi-user accounts
- OAuth login
- Cloud sync
- Wearable data integration

If the user asks for any of these, surface that the spec explicitly defers them and ask whether to override.

---

## 10. Smoke-test checklist before reporting any task complete

1. `pnpm lint && pnpm typecheck && pnpm build` — all must pass with zero errors
2. If you touched `prisma/schema.prisma`: `pnpm exec prisma validate && pnpm db:migrate`
3. `pnpm dev`, hit the routes you touched, verify they return HTTP 200 and contain expected content
4. Verify persistence: do the action, refresh, confirm it stuck
5. Update `docs/assumptions.md` if you made a non-obvious choice
6. Kill the dev server (`taskkill //F //IM node.exe //T` on Windows) when done

Read this file once at start, work, then come back to §10 before declaring done.
