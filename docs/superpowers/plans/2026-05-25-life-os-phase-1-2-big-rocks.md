# Life OS Phase 1.2 (Big Rocks) Implementation Plan

**Goal:** Ship the Big Rocks system per spec §6: new `WeekRock`/`DailyRock` Prisma models, set/edit/complete flows on `/home`, XP + trait routing via the existing `awardXp` pipeline, and wire the `/me` "Daily rocks done" stat to real data.

**Architecture:** Two new Prisma models (`WeekRock`, `DailyRock`) keyed by `userId` + `weekStart`/`date` ("YYYY-MM-DD"). Server Actions for write paths (mirror `src/lib/actions/task-actions.ts` pattern). Read paths in `src/lib/rocks/queries.ts`. UI: `WeekRockCard` and `DayRockCard` components dropped into `/home` Zone 1 (replaces Phase 1.1 placeholders). Edit modal uses native `<dialog>` element (no shadcn Dialog primitive in repo yet) — title + trait dropdown. XP routing reuses `awardXp({ source: "BIG_ROCK_DONE" })` which already exists in `XP_RULES`. Trait updates happen automatically via the existing `awardTrait` pipeline.

**Out of scope (deferred):**
- "Start deep work" button (Phase 1.6 Focus Mode)
- Carry-to-tomorrow flow (Phase 1.5 AI drawer surfaces it)
- 5-in-a-row +100 DISCIPLINE combo bonus (noted in code comment; wire later)

---

## File Structure

**Create:**
- `prisma/schema.prisma` — add `WeekRock`, `DailyRock`, `RockStatus` (modify existing)
- `src/lib/rocks/queries.ts` — read paths
- `src/lib/actions/rock-actions.ts` — Server Actions
- `src/components/rocks/WeekRockCard.tsx`
- `src/components/rocks/DayRockCard.tsx`
- `src/components/rocks/RockEditDialog.tsx`

**Modify:**
- `src/app/home/page.tsx` — replace Zone 1 placeholders with real cards
- `src/app/me/page.tsx` — wire `Daily rocks done` stat

---

### Task 1: Schema + migration

Add to `prisma/schema.prisma`:

```prisma
enum RockStatus { ACTIVE PENDING DONE MISSED }

model WeekRock {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekStart   String      // "YYYY-MM-DD" Monday
  title       String
  trait       TraitAxis   @default(FOCUS)
  status      RockStatus  @default(ACTIVE)
  xpReward    Int         @default(250)
  createdAt   DateTime    @default(now())
  completedAt DateTime?
  dailyRocks  DailyRock[]
  @@unique([userId, weekStart])
  @@index([userId, status])
}

model DailyRock {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        String     // "YYYY-MM-DD"
  title       String
  trait       TraitAxis  @default(FOCUS)
  status      RockStatus @default(PENDING)
  xpReward    Int        @default(50)
  weekRockId  String?
  weekRock    WeekRock?  @relation(fields: [weekRockId], references: [id], onDelete: SetNull)
  createdAt   DateTime   @default(now())
  completedAt DateTime?
  @@unique([userId, date])
  @@index([userId, status])
  @@index([weekRockId])
}
```

Add back-relations to `User`:
```prisma
weekRocks   WeekRock[]
dailyRocks  DailyRock[]
```

Run `pnpm db:migrate` (or whichever migrate script `package.json` exposes — check first; common is `prisma migrate dev --name add_rocks`). Then `pnpm prisma generate` to refresh client types. Then `pnpm typecheck`.

Commit: `git add prisma/schema.prisma prisma/migrations && git commit -m "feat(schema): add WeekRock, DailyRock, RockStatus for Phase 1.2"`

---

### Task 2: Read paths — `src/lib/rocks/queries.ts`

```ts
import { prisma } from "@/lib/db";
import { getWeekStart, todayKey } from "@/lib/dates";
import type { WeekRock, DailyRock } from "@prisma/client";

export async function getCurrentWeekRock(userId: string, timezone: string): Promise<WeekRock | null> {
  const today = todayKey(timezone);
  const weekStart = getWeekStart(today);
  return prisma.weekRock.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
}

export async function getTodayDailyRock(userId: string, timezone: string): Promise<DailyRock | null> {
  const date = todayKey(timezone);
  return prisma.dailyRock.findUnique({ where: { userId_date: { userId, date } } });
}

export type WeekDailyRockStats = { done: number; total: number };

export async function getWeekDailyRockStats(userId: string, timezone: string): Promise<WeekDailyRockStats> {
  const today = todayKey(timezone);
  const weekStart = getWeekStart(today);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);
  const rocks = await prisma.dailyRock.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
    select: { status: true },
  });
  return { done: rocks.filter((r) => r.status === "DONE").length, total: rocks.length };
}
```

Typecheck. Commit: `feat(rocks): add read paths for week + daily rocks`

---

### Task 3: Write paths — `src/lib/actions/rock-actions.ts`

Mirror the structure of `src/lib/actions/task-actions.ts`. Required functions:
- `setWeekRock({ title, trait })` — upsert by `(userId, weekStart=getWeekStart(todayKey))`
- `completeWeekRock({ id })` — guard ownership, set status=DONE + completedAt=now, call `awardXp({ source: "BIG_ROCK_DONE", amount: rock.xpReward, date: rock.weekStart, dedupeKey: "week-rock:<id>" })`
- `setDailyRock({ title, trait, weekRockId? })` — upsert by `(userId, date=todayKey)`
- `completeDailyRock({ id })` — same pattern with `dedupeKey: "daily-rock:<id>"`, `date: rock.date`

Zod validate; on success `revalidatePath("/home"); revalidatePath("/me")`. Return `{ ok: true, data? } | { ok: false, error }` consistent with other actions in the repo.

**Before writing:** read `src/lib/xp.ts` `awardXp` signature exactly — adjust calls if fields differ. The Phase 1.2 scoping report said the signature is `awardXp({ userId, source, amount, note, date, dedupeKey })`. Verify.

Add inline comment in `completeDailyRock`: `// 5-in-a-row +100 DISCIPLINE combo bonus deferred to Phase 1.5`.

Typecheck. Commit: `feat(rocks): add server actions for set/complete week + daily rocks`

---

### Task 4: UI components

Create three files under `src/components/rocks/`:

**`RockEditDialog.tsx`** — Client Component using native `<dialog>` with `ref.showModal()`/`close()`. Form: title `<input>` + trait `<select>` of the 5 axes. Props: `{ open, onClose, onSubmit, heading, initialTitle?, initialTrait?, submitLabel? }`. Reuse `Button` from `@/components/ui`. If the `Button` API lacks a `ghost`/`secondary` variant, use whatever Cancel-style variant is already in the codebase (check existing call sites).

**`WeekRockCard.tsx`** — Client Component. Props: `{ rock: WeekRock | null }`. If `rock` is null → empty-state prompt "What's the one thing that would make this week great?" + "Set week rock" button → opens dialog → calls `setWeekRock`. If `rock` exists → title + trait + xpReward chip + "Mark done" button (`completeWeekRock`) + "Edit" button (reopens dialog). Use `useTransition` for the complete action.

**`DayRockCard.tsx`** — Same shape. Props: `{ rock: DailyRock | null, weekRockId: string | null }`. Empty state: "One thing today." Include a small italic note: "Start deep work lands in Phase 1.6." When setting a day rock, pass `weekRockId` through to `setDailyRock` so the FK gets set.

Both card files import `Card`, `Button` from `@/components/ui`, lucide icons (`Check`, `Pencil`, `Target`/`Sparkles`), the actions from `@/lib/actions/rock-actions`, the dialog from `./RockEditDialog`.

Typecheck. Commit: `feat(rocks): add WeekRockCard, DayRockCard, RockEditDialog components`

---

### Task 5: Wire `/home` Zone 1 + `/me` Daily rocks stat

**`src/app/home/page.tsx`** — fetch user, then `Promise.all` `getCurrentWeekRock` + `getTodayDailyRock`. Replace the existing Zone 1 `<Card>` block (the one with `data-zone="big-rock"` and two dashed placeholders) with:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <WeekRockCard rock={weekRock} />
  <DayRockCard rock={dayRock} weekRockId={weekRock?.id ?? null} />
</div>
```

Keep GCal placeholder (Zone 2) and Habits/Tasks placeholders (Zones 3+4) untouched — those ship in Phases 1.4 and 1.3.

**`src/app/me/page.tsx`** — add `getWeekDailyRockStats` to the existing `Promise.all` (7th loader). Replace `<SummaryStat label="Daily rocks done" value="—" hint="Phase 1.2" />` with `<SummaryStat label="Daily rocks done" value={`${rockStats.done}/${rockStats.total}`} />`. Drop the `hint`.

Typecheck + smoke (`pnpm dev`, curl `/home` and `/me` → 200). Commit: `feat(home,me): wire Big Rock cards on /home and Daily rocks stat on /me`

---

### Task 6: Closing checks

`pnpm lint`, `pnpm typecheck`, `pnpm build` — all zero errors. Smoke `/home`, `/tasks`, `/me`, `/settings` → 200. Commit `chore(phase-1.2): pass closing checks` ONLY if fixes were needed.

---

## Self-Review

- Spec §6 coverage: schema (T1), set/edit/complete (T3, T4), XP+trait routing (T3 via `awardXp("BIG_ROCK_DONE")`), `/me` stat (T5). ✓
- Deferrals: Start deep work → Phase 1.6 (noted in UI). Combo bonus → Phase 1.5 (noted in action comment). Carry → Phase 1.5 (not surfaced yet).
- No `any`, no unchecked assertions. Server Actions return discriminated unions.
- Migration safety: new tables only, no FK to mutable data outside `User`. Reversible.
- Test runner still absent — manual smoke + curl as in Phase 1.1.
