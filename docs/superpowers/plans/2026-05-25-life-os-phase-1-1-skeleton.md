# Life OS Phase 1.1 (Skeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the structural skeleton of the Life OS overhaul: new `/home` route shell, trimmed 4-tab sidebar (Home/Tasks/Me/Settings), consolidated `/me` tab that ports content from `/progress`, `/identity`, `/recap`, and a verified no-op for journaling deletion.

**Architecture:** Add new `/home` and `/me` routes alongside existing ones without deleting old routes (Phase 1.7 deletes them). The `/home` shell uses labeled `<div>` stub placeholders for the five layout zones (topbar slot, big rock, GCal, habits+tasks, AI drawer) — real mechanics ship in Phases 1.2–1.6. The `/me` page is a server component that re-uses existing Identity/Progress/Recap data loaders and components, with section 3 ("This week") showing `—`/`0` placeholders for WeekRock/DailyRock stats since those models arrive in Phase 1.2. Sidebar `NAV` array shrinks from 10 to 4 entries. Old routes (`/today`, `/week`, `/habits`, `/ai`, `/review`, `/progress`, `/identity`, `/recap`) remain reachable as deep links. Journaling deletion is verified-empty: a grep over `src/` and `prisma/` confirms no journal-specific code or schema exists, and reflection-shaped fields on `Week`/`WeeklyReview`/`DayPlan` are out of scope and remain untouched.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before writing route code — APIs have breaking changes vs older docs), React 19, TypeScript strict, Tailwind v4, shadcn/lucide-react, Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3`.

**Important reminder for the executing engineer:** Per `AGENTS.md`, "This is NOT the Next.js you know." Async `searchParams`/`params`, Server Component patterns, and route handler signatures may differ from training data. **Before writing any new route file, read the relevant page in `node_modules/next/dist/docs/`** — especially for `app/` route conventions and Server Component data fetching.

**Project rules enforced throughout:**
- TypeScript strict — no `any`, no unchecked assertions
- Server Components for reads when possible (this whole plan does reads; no writes ship in Phase 1.1)
- Date-only values as `"YYYY-MM-DD"`, time-only as `"HH:mm"` (no Date objects passed across the wire)
- Each phase ends with `pnpm lint && pnpm typecheck && pnpm build`

**Test infrastructure note:** This repo currently has **no** test runner configured (no `vitest.config.*`, no `jest.config.*`, no `playwright.config.*` at the project root). This plan does **not** fabricate test infrastructure. Instead, each route task includes a manual smoke check against `pnpm dev` (HTTP 200 + visual sanity) as the verify step. Real automated tests should be added in a later phase that introduces a test runner — flagged in the self-review.

---

## File Structure

**Files to create:**
- `src/app/home/page.tsx` — Server Component, renders the Home shell with five labeled placeholder zones.
- `src/app/home/HomeAIDrawerSlot.tsx` — Client Component, a `<div>` placeholder labeled "AI drawer" and a topbar toggle stub. Lives in the home folder because it's exclusively used by `/home`.
- `src/app/me/page.tsx` — Server Component, consolidates content from `/progress`, `/identity`, `/recap` into one scrollable page with six sections per spec section 11.

**Files to modify:**
- `src/components/layout/Sidebar.tsx` — trim `NAV` from 10 entries to 4 (Home, Tasks, Me, Settings); change logo link target from `/today` to `/home`; remove now-unused `lucide-react` icon imports.

**Files to leave alone (intentional no-ops):**
- `prisma/schema.prisma` — no journaling models exist; reflection-shaped fields (`Week.reflection`, `WeeklyReview.answers`, `DayPlan.notes`) are out of scope.
- `src/app/today/page.tsx`, `src/app/week/page.tsx`, `src/app/habits/page.tsx`, `src/app/ai/page.tsx`, `src/app/review/page.tsx`, `src/app/progress/page.tsx`, `src/app/identity/page.tsx`, `src/app/recap/page.tsx` — remain reachable as deep links until Phase 1.7.

---

## Task Order Rationale

Order is safety-first: new additive routes ship first (`/home`, `/me`) so the app keeps booting at every step. The sidebar trim — which hides old tabs — only happens after the new tabs exist and respond 200. The journaling no-op verification is a documented audit, not a code change. Final lint/typecheck/build closes the phase.

---

### Task 1: Read Next.js docs for the route conventions used in this plan

**Files:**
- Read only: `node_modules/next/dist/docs/01-app/01-getting-started/03-project-structure.mdx` (or whatever filename ships in 16.2.4 for project structure)
- Read only: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.mdx` (Server Component patterns)
- Read only: anything under `node_modules/next/dist/docs/` covering `page.tsx`, async params/searchParams, and `force-dynamic`

- [ ] **Step 1: List the docs directory**

Run: `dir node_modules\next\dist\docs /B /S | findstr /I "page server-component" | head -40`
(On PowerShell: `Get-ChildItem node_modules\next\dist\docs -Recurse -File | Where-Object { $_.Name -match 'page|server|component' } | Select-Object -First 40 FullName`)
Expected: list of `.mdx` doc files. Read whichever one covers (a) `app/<route>/page.tsx` conventions, (b) Server Components and data fetching, (c) `searchParams` typing.

- [ ] **Step 2: Read the project-structure and server-component docs**

Use the Read tool on the relevant `.mdx` files found in Step 1.
Expected: confirm signature of an async page (does `page.tsx` receive `params` / `searchParams` as Promise? — existing pages in this repo like `src/app/recap/page.tsx` use `searchParams: Promise<{ y?: string }>` and `await params`, so this should match).

- [ ] **Step 3: No commit (research only)**

This task produces no code. Note any deviations from your training data in a scratch buffer.

---

### Task 2: Add `/home` route shell with five labeled placeholder zones

**Files:**
- Create: `src/app/home/page.tsx`
- Create: `src/app/home/HomeAIDrawerSlot.tsx`

- [ ] **Step 1: Write `src/app/home/HomeAIDrawerSlot.tsx`**

This is a Client Component because the toggle button needs `useState` for the open/closed drawer state. In Phase 1.1 it only renders a labeled placeholder — no real AI logic.

```tsx
"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Phase 1.1 placeholder for the AI drawer (spec §8).
 * Renders a topbar toggle and a labeled stub panel. Real chat ships in Phase 1.5.
 */
export function HomeAIDrawerSlot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="home-ai-drawer"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-[38px] h-[38px] bg-white border-[1.5px] border-cream-300 rounded-[10px]",
          "flex items-center justify-center text-bark-700 shadow-[var(--shadow-1)]",
          "hover:bg-cream-50 transition-colors duration-[120ms]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40",
        )}
        title="Toggle AI drawer (placeholder)"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
      </button>
      <aside
        id="home-ai-drawer"
        hidden={!open}
        aria-label="AI drawer (placeholder)"
        className={cn(
          "fixed right-0 top-0 bottom-0 w-[360px] bg-white border-l border-cream-200",
          "shadow-[var(--shadow-1)] p-6 z-40",
        )}
      >
        <div className="font-[var(--font-pixel)] text-[8px] text-bark-600 tracking-[0.08em] mb-3 uppercase">
          AI Drawer (Phase 1.5)
        </div>
        <p className="text-[13px] text-bark-600">
          Placeholder. The real AI co-pilot ships in Phase 1.5.
        </p>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Write `src/app/home/page.tsx`**

Server Component. No data fetching yet — five labeled stub zones matching spec section 5 layout.

```tsx
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui";
import { HomeAIDrawerSlot } from "./HomeAIDrawerSlot";

export const dynamic = "force-dynamic";

/**
 * Phase 1.1 skeleton of the Home dashboard (spec §5).
 * All five zones are labeled placeholder stubs. Real mechanics:
 *   - Big Rock card     → Phase 1.2
 *   - Habits + Tasks    → Phase 1.3
 *   - Embedded GCal     → Phase 1.4
 *   - AI drawer         → Phase 1.5
 *   - Focus mode entry  → Phase 1.6
 */
export default async function HomePage() {
  return (
    <>
      <Topbar
        title="Home"
        subtitle="Your unified workspace."
        actions={<HomeAIDrawerSlot />}
      />
      <section className="px-9 grid gap-4 max-w-[1200px]">
        {/* Zone 1: Big Rock card (week rock + day rock side-by-side) — Phase 1.2 */}
        <Card>
          <div
            data-zone="big-rock"
            aria-label="Big Rock card placeholder"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[140px]"
          >
            <div className="rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]">
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Week Rock — Phase 1.2
              </div>
              Placeholder.
            </div>
            <div className="rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]">
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Day Rock — Phase 1.2
              </div>
              Placeholder. &ldquo;Start deep work&rdquo; ships in Phase 1.6.
            </div>
          </div>
        </Card>

        {/* Zone 2: Embedded Google Calendar week strip — Phase 1.4 */}
        <Card>
          <div
            data-zone="gcal-embed"
            aria-label="Google Calendar embed placeholder"
            className="min-h-[320px] rounded-md border border-dashed border-cream-300 flex items-center justify-center text-bark-500 text-[13px]"
          >
            <div className="text-center">
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Google Calendar — Phase 1.4
              </div>
              Iframe embed lands here.
            </div>
          </div>
        </Card>

        {/* Zone 3+4: Habits row (left) + Today's tasks (right) — Phase 1.3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div
              data-zone="habits-row"
              aria-label="Morning habits row placeholder"
              className="min-h-[120px] rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]"
            >
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Morning Habits — Phase 1.3
              </div>
              Placeholder.
            </div>
          </Card>
          <Card>
            <div
              data-zone="today-tasks"
              aria-label="Today's tasks placeholder"
              className="min-h-[120px] rounded-md border border-dashed border-cream-300 p-4 text-bark-500 text-[13px]"
            >
              <div className="font-[var(--font-pixel)] text-[8px] tracking-[0.08em] uppercase mb-2">
                Today&rsquo;s Tasks — Phase 1.3
              </div>
              Placeholder.
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Smoke-check `/home` against the running dev server**

Open a second shell. In the project root:
```powershell
pnpm dev
```
Wait for "Ready" line. Then in a third shell:
```powershell
curl.exe -s -o NUL -w "%{http_code}\n" http://localhost:3000/home
```
Expected: `200`

Also load `http://localhost:3000/home` in a browser and confirm: Topbar shows "Home", five labeled placeholder zones are visible (Big Rock split into two halves, GCal block, Habits + Today split). Clicking the AI drawer toggle slides the placeholder panel in/out.

Stop the dev server (Ctrl+C) before committing.

- [ ] **Step 4: Commit**

```powershell
git add src/app/home/page.tsx src/app/home/HomeAIDrawerSlot.tsx
git commit -m "feat(home): add Phase 1.1 dashboard skeleton with placeholder zones"
```

---

### Task 3: Add consolidated `/me` route (sections 1, 2, 4, 5, 6 — port existing components)

**Files:**
- Create: `src/app/me/page.tsx`

This task ports the **port-able** sections (1: Hero, 2: Trait radar + level list, 4: Season + quests, 5: Past seasons collapsed, 6: Sunday review entry). Section 3 ("This week" summary) gets its own task because it needs the `—` / `0` placeholders for WeekRock/DailyRock-derived stats.

The existing `/identity` page (`src/app/identity/page.tsx`) already uses `loadIdentity`, `currentSeasonView`, `pastSeasons`, `loadQuests`, and `prisma.gameProfile`. The existing `/progress` page (`src/app/progress/page.tsx`) uses `loadProgress`. We re-use those exact loaders here.

Per spec section 11, the new `/me` cuts: HP/MP rails, status effects strip, Limit Break banner, XP event feed, title history, class names (Disciplinarian etc.), bonus event list. Keep only: current title + level/XP, trait radar (5 axes) + horizontal level list with **trait names** (not class names), weekly summary, season chapter ribbon + active quests, past season recaps (collapsed `<details>`), Sunday review entry.

- [ ] **Step 1: Write `src/app/me/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import type { TraitAxis } from "@prisma/client";
import { BarChart3, CalendarCheck, Layers, User } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { PastSeasons } from "@/components/identity/PastSeasons";
import { QuestList } from "@/components/identity/QuestList";
import { SeasonCard } from "@/components/identity/SeasonCard";
import { TraitList } from "@/components/identity/TraitList";
import { TraitRadar } from "@/components/identity/TraitRadar";
import {
  Card,
  EmptyState,
  Pill,
  SectionHeading,
  XpBar,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import { loadIdentity } from "@/lib/retention/queries";
import { loadProgress } from "@/lib/progress/queries";
import { loadQuests, evaluateQuests } from "@/lib/retention/quests";
import { currentSeasonView, pastSeasons } from "@/lib/retention/seasons";
import { levelFromXp } from "@/lib/xp";

export const dynamic = "force-dynamic";

/**
 * Consolidated /me tab (spec §11). Replaces /progress + /identity + /recap as
 * sidebar entries. Each old route stays reachable as a deep link until Phase 1.7.
 *
 * Sections:
 *   1. Hero header (title + level + XP bar + season day)
 *   2. Trait radar (5 axes) + horizontal level list — no class names
 *   3. This week summary — uses placeholders for WeekRock/DailyRock stats (Phase 1.2)
 *   4. This season — chapter ribbon + active quests
 *   5. Past seasons (collapsed)
 *   6. Sunday review entry
 *
 * Cut per spec: HP/MP rails, status effects, Limit Break banner, XP event feed,
 * title history, class names (Disciplinarian etc.), bonus event lists.
 */
const AXIS_ORDER: TraitAxis[] = [
  "DISCIPLINE",
  "FOCUS",
  "AUDACITY",
  "CRAFT",
  "RECOVERY",
];

export default async function MePage() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return (
      <>
        <Topbar title="Me" />
        <section className="px-9 py-8 text-[14px] text-bark-500">
          No user found. Run <code className="font-[var(--font-mono)]">pnpm db:seed</code> first.
        </section>
      </>
    );
  }

  await evaluateQuests(user.id);

  const [identity, progress, season, past, quests, profile] = await Promise.all([
    loadIdentity(user.id),
    loadProgress(user.id, user.timezone),
    currentSeasonView(user.id),
    pastSeasons(user.id),
    loadQuests(user.id),
    prisma.gameProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const anyTraitNonZero = identity.traits.some((t) => t.value > 0);
  const xp = profile?.xp ?? 0;
  const { level, intoLevel, toNext } = levelFromXp(xp);
  const traitByAxis = new Map(identity.traits.map((t) => [t.axis, t]));

  return (
    <>
      <Topbar
        title="Me"
        subtitle="Who you&rsquo;re becoming."
        actions={
          <Pill tone="xp">
            LV {level} · {intoLevel}/{toNext} XP
          </Pill>
        }
      />
      <section className="px-9 grid gap-4 max-w-[920px]">

        {/* Section 1: Hero header */}
        {identity.headline ? (
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center rounded-md border border-cream-200 border-l-[5px] border-l-coral-500 px-6 py-[22px] bg-coral-100">
            <div>
              <div className="font-[var(--font-pixel)] text-[8px] text-[#A8412B] tracking-[0.08em]">
                ★ CURRENT TITLE
              </div>
              <h2 className="font-[var(--font-display)] font-semibold text-[36px] text-ink-800 mt-2 tracking-[-0.01em] leading-tight">
                {identity.headline.title.name}
              </h2>
              <p className="font-[var(--font-display)] italic text-[16px] text-bark-600 mt-2 max-w-[540px]">
                {identity.headline.tagline}
              </p>
              <div className="mt-3">
                <XpBar value={toNext > 0 ? intoLevel / toNext : 0} size="lg" />
                <div className="flex justify-between items-center mt-1 text-[11px] text-bark-500">
                  <span>LV {level}</span>
                  <span className="font-[var(--font-mono)] tabular-nums">
                    {intoLevel} / {toNext}
                  </span>
                  <span>LV {level + 1}</span>
                </div>
              </div>
              <div className="mt-2 text-[12px] text-bark-500">
                Season day {season.progress.daysIn}
              </div>
            </div>
            <Image
              src="/lifeos/mascot-quill.svg"
              alt=""
              width={120}
              height={120}
            />
          </div>
        ) : (
          <Card>
            <EmptyState
              mascot="default"
              title="No title yet"
              body="Titles emerge from your pattern. Log habits, hit ideals, complete reviews — the first title will land soon."
            />
          </Card>
        )}

        {/* Section 2: Trait radar + horizontal level list (no class names) */}
        <Card>
          <SectionHeading
            icon={BarChart3}
            action={
              <span className="font-[var(--font-pixel)] text-[8px] text-bark-500">
                5 AXES
              </span>
            }
          >
            Traits
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6 items-center mt-2">
            <div className="flex justify-center">
              {anyTraitNonZero ? (
                <TraitRadar traits={identity.traits} />
              ) : (
                <div className="aspect-square w-full max-w-[240px] flex items-center justify-center text-bark-500 text-[14px] text-center px-4">
                  Trait radar fills as you log activity.
                </div>
              )}
            </div>
            <TraitList traits={identity.traits} />
          </div>
        </Card>

        {/* Section 2b: Horizontal trait level list (trait names, no class names) */}
        <Card>
          <SectionHeading icon={Layers}>Trait levels</SectionHeading>
          <div className="grid grid-cols-5 gap-[10px] mt-2">
            {AXIS_ORDER.map((axis) => {
              const t = traitByAxis.get(axis);
              const fraction =
                t && t.toNext > 0 ? t.intoLevel / (t.intoLevel + t.toNext) : 0;
              return (
                <div
                  key={axis}
                  className="flex flex-col items-center gap-1 p-[10px_6px] rounded-[10px] bg-cream-50 border border-cream-200"
                >
                  <div className="font-bold text-[11.5px] text-bark-700 capitalize">
                    {axis.toLowerCase()}
                  </div>
                  <div className="font-[var(--font-pixel)] text-[7px] text-bark-600 tracking-[0.06em]">
                    LV {t?.level ?? 0}
                  </div>
                  <XpBar value={fraction} size="mini" className="w-full" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Section 3: This week summary — WeekRock/DailyRock stats are placeholders (Phase 1.2) */}
        <Card>
          <SectionHeading icon={CalendarCheck}>This week</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <SummaryStat label="Daily rocks done" value="—" hint="Phase 1.2" />
            <SummaryStat
              label="Habits completed"
              value={`${progress.consistencyDone}/${progress.consistencyTotal}`}
            />
            <SummaryStat label="Current streak" value={`${progress.currentStreak}d`} />
            <SummaryStat label="XP this week" value={progress.weeklyXp.toLocaleString()} />
          </div>
        </Card>

        {/* Section 4: This season — chapter ribbon + active quests */}
        <SeasonCard
          season={season.season}
          rank={season.rank}
          tier={season.tier}
          nextTier={season.nextTier}
          rankIntoTier={season.rankIntoTier}
          rankToNextTier={season.rankToNextTier}
          progress={season.progress}
          highestRankEver={season.highestRankEver}
        />

        <Card>
          <QuestList
            active={quests.active}
            hidden={quests.hidden}
            completed={quests.completed}
          />
        </Card>

        {/* Section 5: Past seasons (collapsed) */}
        {past.length > 0 ? (
          <Card>
            <details>
              <summary className="cursor-pointer font-[var(--font-display)] font-semibold text-[18px] text-ink-800 select-none">
                Past seasons
              </summary>
              <div className="mt-3">
                <PastSeasons seasons={past} />
              </div>
            </details>
          </Card>
        ) : null}

        {/* Section 6: Sunday review entry */}
        <Card>
          <SectionHeading icon={User}>Sunday review</SectionHeading>
          <p className="text-[13.5px] text-bark-600 mt-2">
            Set next week&rsquo;s Big Rock, reflect on the week, log the weekly review.
          </p>
          <Link
            href="/review"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-md bg-coral-500 text-white font-semibold text-[13px] hover:bg-coral-600 transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40"
          >
            Start review
          </Link>
        </Card>
      </section>
    </>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="font-[var(--font-pixel)] text-[8px] uppercase tracking-[0.06em] text-bark-500">
        {label}
      </span>
      <span className="font-[var(--font-display)] font-semibold text-[24px] text-ink-800 tabular-nums leading-none">
        {value}
      </span>
      {hint ? (
        <span className="text-[11px] text-bark-500 italic">{hint}</span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Resolve `progress.weeklyXp` if `loadProgress` doesn't expose it**

The existing `/progress` page uses `data.xp` but does not directly surface a "XP this week" field — it queries `bonusEvents` and `recentEvents`. Open `src/lib/progress/queries.ts` and check the return type of `loadProgress`.

```powershell
# read the file
```
(Use the Read tool on `C:\Users\demia\life-os\src\lib\progress\queries.ts`.)

**If `weeklyXp` exists in the returned shape:** use it as written above.

**If it does not exist:** replace the line
```tsx
<SummaryStat label="XP this week" value={progress.weeklyXp.toLocaleString()} />
```
with an inline computation. Add this above the JSX `return`:
```tsx
const weeklyXpEvents = await prisma.xpEvent.findMany({
  where: {
    userId: user.id,
    date: { gte: progress.weekStart, lte: progress.weekEnd },
  },
  select: { amount: true },
});
const weeklyXp = weeklyXpEvents.reduce((sum, e) => sum + e.amount, 0);
```
And update the JSX to:
```tsx
<SummaryStat label="XP this week" value={weeklyXp.toLocaleString()} />
```

This keeps the page fully typed and avoids a runtime `undefined.toLocaleString()`.

- [ ] **Step 3: Smoke-check `/me` against the running dev server**

```powershell
pnpm dev
```
Wait for "Ready". In another shell:
```powershell
curl.exe -s -o NUL -w "%{http_code}\n" http://localhost:3000/me
```
Expected: `200`.

Load `http://localhost:3000/me` in a browser. Confirm:
- Hero header with current title + level + XP bar + season day appears (or the empty-state card if no title yet)
- Trait radar + 5-axis trait list with trait names (no "Disciplinarian" etc.)
- "This week" card with 4 stats — first one shows `—` and hint "Phase 1.2"
- Season chapter ribbon + quests
- Past seasons collapsed inside `<details>`
- "Sunday review" card with a button linking to `/review`

Stop the dev server.

- [ ] **Step 4: Commit**

```powershell
git add src/app/me/page.tsx
git commit -m "feat(me): add consolidated /me tab merging Progress + Identity + Recap content"
```

---

### Task 4: Trim sidebar `NAV` from 10 entries to 4 (Home, Tasks, Me, Settings)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

Replace the 10-entry `NAV` array with the 4-entry version, change the logo link from `/today` to `/home`, and drop unused icon imports. Old routes remain at their URLs.

- [ ] **Step 1: Modify the `NAV` constant**

Open `src/components/layout/Sidebar.tsx`. Replace lines 22–33:

**Before:**
```tsx
const NAV = [
  { href: "/today",    label: "Today",    icon: Compass },
  { href: "/week",     label: "Week",     icon: CalendarDays },
  { href: "/tasks",    label: "Tasks",    icon: ListChecks },
  { href: "/habits",   label: "Habits",   icon: Flame },
  { href: "/ai",       label: "AI Chat",  icon: MessageCircle },
  { href: "/review",   label: "Review",   icon: CheckCircle2 },
  { href: "/progress", label: "Progress", icon: Gauge },
  { href: "/identity", label: "Identity", icon: User },
  { href: "/recap",    label: "Recap",    icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
```

**After:**
```tsx
const NAV = [
  { href: "/home",     label: "Home",     icon: Home },
  { href: "/tasks",    label: "Tasks",    icon: ListChecks },
  { href: "/me",       label: "Me",       icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
```

- [ ] **Step 2: Update the icon imports at the top of the file**

Replace the lucide-react import block (lines 6–18):

**Before:**
```tsx
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Flame,
  Gauge,
  ListChecks,
  MessageCircle,
  Settings,
  Sparkles,
  Sprout,
  User,
} from "lucide-react";
```

**After:**
```tsx
import {
  Home,
  ListChecks,
  Settings,
  Sprout,
  User,
} from "lucide-react";
```

(`Sprout` stays because it's used in the season chip at the bottom of the sidebar — line 146.)

- [ ] **Step 3: Change the logo link target from `/today` to `/home`**

Find the `<Link href="/today"` near line 66. Change to:
```tsx
<Link
  href="/home"
  className="px-[6px] pt-[2px] pb-[4px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/40 rounded"
>
```

- [ ] **Step 4: Typecheck and smoke-check**

```powershell
pnpm typecheck
```
Expected: zero errors. If you see `'X' is declared but never read`, you have a leftover unused import — delete it.

```powershell
pnpm dev
```
Load `http://localhost:3000/home` — the sidebar should now show exactly **4** nav items: Home, Tasks, Me, Settings. Click each — Home goes to `/home`, Tasks to `/tasks` (existing route), Me to `/me`, Settings to `/settings`.

Also manually visit the now-hidden old routes to confirm they're still reachable:
```powershell
curl.exe -s -o NUL -w "/today=%{http_code}\n" http://localhost:3000/today
curl.exe -s -o NUL -w "/week=%{http_code}\n"  http://localhost:3000/week
curl.exe -s -o NUL -w "/habits=%{http_code}\n" http://localhost:3000/habits
curl.exe -s -o NUL -w "/ai=%{http_code}\n"    http://localhost:3000/ai
curl.exe -s -o NUL -w "/review=%{http_code}\n" http://localhost:3000/review
curl.exe -s -o NUL -w "/progress=%{http_code}\n" http://localhost:3000/progress
curl.exe -s -o NUL -w "/identity=%{http_code}\n" http://localhost:3000/identity
curl.exe -s -o NUL -w "/recap=%{http_code}\n" http://localhost:3000/recap
```
Expected: **all 8 return `200`**. Old routes are demoted, not deleted (Phase 1.7 deletes them).

Stop the dev server.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/Sidebar.tsx
git commit -m "feat(nav): trim sidebar from 10 to 4 tabs (Home/Tasks/Me/Settings)"
```

---

### Task 5: Verify journaling deletion is a documented no-op

**Files:**
- Read only: `src/`, `prisma/schema.prisma`
- No file changes

The spec calls for "Delete journaling code + migration." Prior exploration showed there is no journaling code or schema in this repo. This task **records** that finding as a verified audit before the phase closes.

- [ ] **Step 1: Confirm no journaling code in `src/`**

Use the Grep tool (the project's preferred tool over raw `grep`/`rg`):
- Pattern: `journal`
- Path: `C:\Users\demia\life-os\src`
- `-i`: true
- `output_mode`: `files_with_matches`

Expected: zero files matched.

- [ ] **Step 2: Confirm no journal models in `prisma/schema.prisma`**

Use Grep again:
- Pattern: `journal`
- Path: `C:\Users\demia\life-os\prisma`
- `-i`: true
- `output_mode`: `content`
- `-n`: true

Expected: zero matches.

- [ ] **Step 3: Confirm reflection-shaped fields exist but are out of scope**

Use Grep:
- Pattern: `reflection|notes`
- Path: `C:\Users\demia\life-os\prisma\schema.prisma`
- `output_mode`: `content`
- `-n`: true

Expected: matches on `Week.reflection`, `DayPlan.notes`. These are NOT to be touched — they're reflection-like fields, not journal models. `WeeklyReview.answers` is also intentionally preserved (it backs the Sunday review entry on `/me`).

- [ ] **Step 4: No commit (audit-only task)**

Note in the PR description / commit message of the *next* task that this no-op was verified. No code change here.

---

### Task 6: Closing checks — lint, typecheck, build

**Files:**
- No code changes; this task runs the project rules from `CLAUDE.md`: "Run lint, typecheck, and build after each phase."

- [ ] **Step 1: Lint**

```powershell
pnpm lint
```
Expected: zero errors. If `pnpm lint` complains about unused imports, return to Task 4 Step 2 and remove them; commit the fix separately.

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```
Expected: zero errors. Common failures:
- `progress.weeklyXp` may not exist on the `loadProgress` return type — handled by Task 3 Step 2 fallback.
- A stray icon import in `Sidebar.tsx` triggers `TS6133`. Fix and re-run.

- [ ] **Step 3: Build**

```powershell
pnpm build
```
Expected: build completes with **no errors**. New routes `/home` and `/me` appear in the Next.js route summary.

- [ ] **Step 4: Final smoke check**

```powershell
pnpm dev
```
Manually click through: `/home` → `/tasks` → `/me` → `/settings`. Confirm:
- 4 sidebar tabs only
- Each new route renders without console errors
- Old deep links still work

Stop the dev server.

- [ ] **Step 5: Commit phase-close marker**

If no fixes were needed in steps 1–3, skip this step. If fixes were needed:
```powershell
git add -A
git commit -m "chore(phase-1.1): pass lint/typecheck/build closing checks"
```

---

## Self-Review

I ran this checklist against the spec section 12 ("Phase 1.1 Skeleton") row and the user's exploration notes.

**1. Spec coverage:**

| Spec requirement | Task |
| --- | --- |
| New `/home` route shell with 5 layout zones | Task 2 |
| AI drawer placeholder on Home | Task 2 (`HomeAIDrawerSlot.tsx`) |
| Sidebar trim from 10 to 4 tabs | Task 4 |
| Old routes remain reachable as deep links | Task 4 Step 4 (verifies 200s) |
| Consolidated `/me` tab (6 sections per spec §11) | Task 3 |
| `/me` section 1: Hero header | Task 3 Step 1 |
| `/me` section 2: Trait radar + horizontal level list (no class names) | Task 3 Step 1 |
| `/me` section 3: This week summary with `—`/`0` placeholders for Phase 1.2 stats | Task 3 Step 1 (`SummaryStat label="Daily rocks done" value="—"`) |
| `/me` section 4: Season chapter ribbon + active quests | Task 3 Step 1 |
| `/me` section 5: Past seasons collapsed in `<details>` | Task 3 Step 1 |
| `/me` section 6: Sunday review entry button | Task 3 Step 1 |
| Cut HP/MP, status effects, Limit Break, XP feed, title history, class names, bonus events | Task 3 — these are omitted from the new file (not ported) |
| Delete journaling code + migration (no-op confirmed) | Task 5 |
| Read Next.js docs first (AGENTS.md rule) | Task 1 |
| Run lint, typecheck, build after the phase (CLAUDE.md rule) | Task 6 |

No gaps.

**2. Placeholder scan:**

I searched the plan for: "TBD", "TODO", "implement later", "fill in details", "add appropriate", "handle edge cases", "Similar to Task N". Zero matches. Every step shows the actual code or the actual command.

The only `—` strings in the plan are the **deliberate `—` placeholders inside the `/me` "This week" summary**, which are required by the spec ("show `—` or `0` placeholders since those models arrive in Phase 1.2"). Those are content, not plan placeholders.

**3. Type consistency:**

- `loadIdentity`, `loadProgress`, `currentSeasonView`, `pastSeasons`, `loadQuests`, `evaluateQuests` — all exist in the existing identity/progress pages and are re-used by `/me` with identical signatures.
- `TraitAxis` is imported from `@prisma/client` (matches the existing `/identity/page.tsx`).
- `levelFromXp` returns `{ level, intoLevel, toNext }` (matches existing usage).
- `XpBar`, `Card`, `Pill`, `SectionHeading`, `EmptyState` — all exist in `@/components/ui` (used by existing pages).
- `SeasonCard`, `QuestList`, `PastSeasons`, `TraitRadar`, `TraitList` — all exist in `src/components/identity/` (confirmed via Glob).
- `Topbar` from `@/components/layout/Topbar` — matches existing import paths.
- The `progress.weeklyXp` field is **conditionally handled in Task 3 Step 2** — if it doesn't exist on `loadProgress`'s return shape, an inline `prisma.xpEvent` aggregate replaces it. This avoids a type error.

**4. Known limitations to flag for the executing engineer:**

- **No automated tests added.** The repo has no test runner. Each shell task verifies by HTTP 200 + visual sanity in a browser. Real tests (Playwright route smoke + Vitest unit) should be added in a future phase that sets up a runner.
- **`pnpm` is implied** by `package.json`'s `corepack pnpm` invocations. If the engineer's shell defaults to `npm`, use `corepack pnpm ...` everywhere, or set up pnpm: `corepack enable && corepack prepare pnpm@latest --activate`.
- **Windows shell quoting:** all `curl.exe` calls use `%{http_code}` (cmd-style). In PowerShell-only contexts, swap to `Invoke-WebRequest -UseBasicParsing http://localhost:3000/home | Select-Object -Expand StatusCode`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-life-os-phase-1-1-skeleton.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
