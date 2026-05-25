# Life OS — UI/UX Redesign Brief

**For:** another Claude session — ideally one carrying `design:design-critique`, `design:design-system`, `design:ux-copy`, `design:accessibility-review`, or `ecc:make-interfaces-feel-better`.
**From:** Demian
**Date:** 2026-05-24
**Repo:** `C:\Users\demia\life-os`
**Companion docs:**
- `docs/life-os-spec.md` — original product spec
- `docs/assumptions.md` — tracked deviations and judgment calls
- `docs/AUDIT.md` — separate bug-fix track (the live 500-error handoff). **This brief is NOT that track.**

---

## 1. TL;DR — the ask

Life OS works. The mechanics are unusually rich for a one-person tool — it already has identity titles, streak tiers, quests, seasons, traits, a year recap, an XP system, an AI coach with action approval, and an Electron wrapper. What it does **not** have yet is *personality*.

Three pivots, all additive — nothing in the data model or server actions should change:

1. **Friendlier.** Today the app reads like a well-designed CRM. I want it to read like a friend who's rooting for me.
2. **Funnier.** Microcopy with personality. Dry, warm, never patronising. Treat the user like an adult who appreciates a small joke, not a child who needs cheerleading.
3. **Two aesthetic anchors layered on the existing minimal grid:**
   - **Nintendo-style mascots** — a small recurring cast (think Tatl from *Majora's Mask*, Animal Crossing villagers, Pikmin) that lives in corners of the app and reacts to milestones.
   - **Final Fantasy-style status presentation** for the systems that are already there. The retention engine already has Titles, Streak Tiers, Seasons, Quests, Traits, and a Recap. The *mechanics are done*. The *presentation* should feel like opening the Status menu in FFVI / FFIX — readable at a glance, layered with character, occasionally dramatic.

The redesign is **additive on top of the existing minimal shell**, not a teardown. Calm bones, playful skin.

---

## 2. Crucial context: what already exists

Read these before proposing anything. The single biggest failure mode for this brief is *re-proposing systems that already ship*.

### 2.1 Design system primitives — already in place

`src/components/ui/`:

```
Button.tsx          Card.tsx           EmptyState.tsx
IconButton.tsx      InlineConfirmation.tsx
Input.tsx           Label.tsx          Pill.tsx
ProgressBar.tsx     SectionHeading.tsx Skeleton.tsx
Tooltip.tsx         index.ts
```

There is also a **`/design` route** (`src/app/design/page.tsx`) — presumably the design-system showcase / kitchen sink. **Inventory this first.** Whatever is there is the existing visual baseline. Your redesign should reuse and extend these primitives, not introduce parallel components.

### 2.2 Retention engine — already in place

`src/lib/retention/`:

```
award-trait.ts        blocker.ts          bonuses.ts
evaluate-streaks.ts   insights.ts         notifications.ts
queries.ts            quests.ts           recap.ts
seasons.ts            streak-tiers.ts     titles.ts
trait-map.ts
```

Key concepts you need to know about before drafting:

**Titles** (`titles.ts`) — six identity titles derived from behavior over time. Excerpt:

```ts
"consistent-builder": {
  name: "The Consistent Builder",
  tagline: "You log the minimum even on bad days. That's what makes the rest possible.",
},
"recovery-champion": { name: "The Recovery Champion", tagline: "Rest is part of the work. ..." },
"strategic-thinker": { name: "The Strategic Thinker", tagline: "You look back before you push forward. ..." },
"deep-worker":       { name: "The Deep Worker",       tagline: "Focus is your edge. The hours add up." },
"polymath":          { name: "The Polymath",          tagline: "Every axis is moving. ..." },
"quiet-builder":     { name: "The Quiet Builder",     tagline: "..." },
```

These are **the FF "job class" equivalent**, already shipped. Tone is already warm and earned. Don't replace them — *visualise* them.

**Streak Tiers** (`streak-tiers.ts`):

```ts
{ tier: 1, days: 3,   label: "Ember",   description: "3-day streak"   },
{ tier: 2, days: 7,   label: "Spark",   description: "7-day streak"   },
{ tier: 3, days: 21,  label: "Flame",   description: "21-day streak"  },
{ tier: 4, days: 60,  label: "Forge",   description: "60-day streak"  },
{ tier: 5, days: 100, label: "Veteran", description: "100-day streak" },
```

These are **the FF "level" equivalent for habits**. The vocabulary is already in place. Don't rename them. Make them *feel* like tiers.

**Other primitives that already exist** — `traits` (with `TraitAxis` enum), `seasons` (chapters of the year), `quests` (named goals with completion criteria), `bonuses` (modifier system on XP), `insights` (computed observations about behavior), `recap` (the Year Recap surface at `/recap`), `notifications` (in-app), `blocker` (probably the website/app blocker referenced in `AUDIT.md`).

### 2.3 Routes that already exist

Sidebar order (from `src/app/`):

- `/today`, `/week`, `/tasks`, `/habits`, `/ai`, `/review`, `/progress`, `/identity`, `/recap`, `/settings`
- Plus: `/design` (the kitchen sink), `/api` (route handlers)

**`/identity` is the surface that already shows titles/traits.** This is the page where the "FF Status Screen" energy probably wants to land — but inventory the current state first.

**`/recap` is the Year Recap surface** — high-drama moment by definition. Mascots and FF flourishes belong here too.

### 2.4 The hard architectural rules (from `CLAUDE.md`)

These do not move:

- Server Components for reads. Server Actions (`"use server"`) for writes.
- AI never writes directly. It proposes `AiAction` rows; user clicks Approve; action runs through a Zod-validated handler.
- Dates `YYYY-MM-DD`, times `HH:mm`. Never JS `Date` for calendar days.
- Strict TypeScript.
- No auth, no payments, no calendar sync, no email, no mobile, no social features, no public landing page.

### 2.5 The active bug track (do not enter)

`docs/AUDIT.md` (2026-05-20) describes a current 500 error blocking every route in the installed Electron build. **That is a separate handoff for whoever picks up the bug-fix track.** This design brief assumes the app is running cleanly in `pnpm dev` (browser). If the dev server is broken, kick the issue back to the bug-fix track — do not absorb it into this redesign.

---

## 3. Honest read of the current visual state

(Designer: confirm or correct after running `pnpm dev` and walking the app.)

- **Type system:** Geist is loaded but `body { font-family: Arial, Helvetica, sans-serif }` is still set in `globals.css`. The font work was probably half-wired — verify.
- **Color tokens:** Two CSS vars (`--background`, `--foreground`) declared in `globals.css`. Everything else has historically been `black/X` and `white/X` opacity ramps. The new `ui/` primitives may have introduced tokens — inventory.
- **Dark mode:** `prefers-color-scheme`. No in-app toggle.
- **Spacing & rhythm:** consistent and readable. Keep the rhythm even when you skin over it. This is the strongest part of the visual baseline.
- **Empty states:** an `EmptyState.tsx` primitive exists now. Inventory the current text and illustrations.
- **Loading:** `Skeleton.tsx` primitive exists. Confirm where it's actually used.
- **Success acknowledgement:** historically silent (XP awards happened in the background with no UI). The notifications system may have changed this — verify.
- **AI action approval:** the AiActionCard previously showed raw JSON payloads. If still true, that's the single highest-leverage copy/UX fix in the whole app.
- **Tone:** the title taglines are warm. Most surface copy is still neutral / system-like. Mismatch.

---

## 4. Creative Direction

### 4.1 Mascots (Nintendo-style)

**Vibe references — do not copy:**

- Tatl / Navi — small companion sprite in a corner.
- Animal Crossing villagers — friendly, slightly weird, distinct silhouettes, big heads.
- Pikmin — multiple specialised helpers, each tied to a domain.
- Stardew Valley junimos — wordless, expressive through posture and color.

**What I want:**

A small cast (3–5 named characters), each tied to a domain. They appear as **inline SVG illustrations** in empty states, milestone moments, and a couple of permanent quiet corners. They are **not** floating assistants in every corner — that gets annoying within a day.

**Suggested cast (placeholders — rename freely):**

| Name | Domain | When they appear | Voice |
|---|---|---|---|
| **Rocky** | Week / Big Rock / Quests | Week page hero; quest-related moments | Stoic, dry, very into mountains |
| **Beep** | Today / Next Action | Today page hero; Next Action card when clear | Tiny, eager, runs everywhere |
| **Embé** | Habits / Streak Tiers | Habit cards; streak tier promotions; streak-saved moments | Warm, non-judgmental, holds a small candle |
| **Mox** | Tasks / Inbox | Tasks empty inbox; inbox-zero moments | Cat-librarian. Quietly smug |
| **Augur** | AI Chat / Review / Insights | AI empty state; weekly review summary; insights cards | Small owl-thing. Speaks in fortune-cookie sentences |

Per-mascot deliverable: **one canonical pose** (inline SVG, ~64–128px, 2 colors max) + 1–2 alt poses for state. CSS or Framer Motion for gentle motion. No Lottie, no raster, no external image hosts.

**Mascots are illustrations with a personality, not characters with screens.** They do not narrate, they do not interrupt, they do not have dialog trees.

**Accessibility:** Settings should expose a "Reduce mascots" toggle (store in `User.preferences` JSON — no schema change). When on, the mascot SVG slot collapses to a small icon from lucide-react. Copy stays the same. All retention mechanics keep working.

---

### 4.2 Final Fantasy presentation, mapped onto existing systems

Critical: **do not propose new mechanics**. The mechanics are done. This section is about *how they look* and *how they feel when they fire*.

| FF concept | Existing primitive | What I want visually |
|---|---|---|
| **Job class** | Title (`titles.ts`) | Big wordmark on `/identity`, small badge in the Topbar, persistent. The tagline reads like a job-class description. |
| **Character level** | XP total + `GameProfile.level` | Status-screen treatment: large tabular-nums level, segmented or smooth XP bar (designer's call), "next level at N XP" line. |
| **Habit level / weapon tier** | Streak Tier (Ember → Veteran) | Tier badge on each Habit card; visible promotion animation when crossed (Embé relighting / upgrading). |
| **Trait stats** | TraitAxis values | A short FF-style stat strip on `/identity` — 4–6 axes, low-saturation bars, no min-maxing pressure. |
| **Quest** | `quests.ts` | Quest log surface (probably already exists somewhere — inventory). Quest completion = a moment, not silent. |
| **Chapter / Disc** | Season (`seasons.ts`) | Chapter marker on `/identity` and `/recap`. "Season 1, Day 47." |
| **Status effects** | Derived from recent activity (energy, missed days, deep-work hours) | Tiny icons strip on `/today` and `/progress`. Hover for tooltip explanation (we already have `Tooltip.tsx`). |
| **Limit Break** | A composite achievement: all weekly targets DONE + review saved + ≥80% habit consistency | One-time non-blocking banner on `/progress` and `/today` when the criteria flip true. Cosmetic gating on existing data — no new field. |
| **Save point** | The "Save review" button | Save-crystal motif. Tiny visual joke, zero behavior change. |
| **Year Recap** | `/recap` route + `recap.ts` | This already exists. Designer: walk it, then dial it up. This is the app's most dramatic moment by design. |

**Anti-goals — please do not propose:**

- New mechanics. (See above. The engine is rich. Don't add to it; surface it.)
- Microtransactions, even fake.
- Punitive XP loss messaging.
- Leaderboards (single user, by design).
- Sound effects. Desktop browser + Electron = a sudden level-up jingle is hostile.
- Daily login streaks with shame mechanics. `streak-tiers.ts` already does the kind one.

---

### 4.3 Microcopy direction

Tone reference: the title taglines in `titles.ts`. That's the bar. Warm, observed, never glib.

**Do:**

- Time-of-day greeting on `/today`, derived from `user.timezone` (which `src/lib/user.ts` already exports).
- Use the user's name when it adds warmth. Never on error messages.
- Empty states say what's true *and* what to do next. "Inbox zero. Mox approves." beats "No tasks."
- Confirmations are human. "Saved." > "Update successful." > "✓".
- Mascots can speak — rarely, in their voice. Embé does not crack jokes. Mox does not give pep talks.
- AiActionCard previews must be **plain English first, JSON behind a "show details" disclosure.** "Schedule 'Write spec' for Tuesday at 9:00am" not `{"type":"SCHEDULE_TASK", ...}`.

**Don't:**

- No exclamation points except in the Limit Break banner and Year Recap moments.
- No "Great job!" / "You're crushing it!" — patronising.
- No "Oops!" on errors. State the problem and the next step.
- No motivational quotes. The Recap is dramatic enough.
- No "Welcome back!" on every load. Greet once per day max.

**Copy-pass output expected:** a table of *current string → proposed string*, scoped to strings that actually exist in the codebase. Grep before guessing.

---

## 5. Page-by-Page Redesign Notes

For each route: *what's there, what to keep, what to change*. Designer disagrees freely — these are starting points.

### 5.1 `/today` — `src/app/today/page.tsx`

- **Keep:** section order (Next Action → Focus → Energy → Blocks → Tasks → Habits → Quick Capture). It's tuned.
- **Change:** Next Action becomes the hero. Beep cameo. Larger type. Clear "Start" affordance.
- **Change:** Energy check-in reframed as picking your party's HP for the day. Three icons (LOW/MED/HIGH), active in accent.
- **Add:** one-line greeting above Next Action. Time-of-day aware.
- **Add:** inline `+XP` flash on task complete / block complete / habit log. Auto-dismiss ~1.5s.
- **Add:** status-effect strip at the top (derived state, no new schema).

### 5.2 `/week` — `src/app/week/page.tsx`

- **Keep:** day accordion structure.
- **Change:** Big Rock card → "This Week's Quest." Rocky lives here. Asleep when unset, standing when set, on a peak when all weekly targets DONE.
- **Change:** weekly targets list → quest checklist styling (subtle, not loud).
- **Change:** habit week grid cells styled as FF status icons. Keep the 7-col layout.

### 5.3 `/tasks` — `src/app/tasks/page.tsx`

- **Keep:** URL-driven tabs (`?view=inbox|today|scheduled|someday|archived`).
- **Change:** tab pills feel like an RPG menu row. (We have `Pill.tsx` already — extend it, don't fork.)
- **Change:** inbox-zero state → Mox cameo. Other empty states use `EmptyState.tsx` with mascot-aware copy.
- **Verify:** is there a task-source badge yet (quick-capture / AI / scheduled-from-review)? If not, add one — it's a small but real legibility win.

### 5.4 `/habits` — `src/app/habits/page.tsx`

- **Keep:** card layout, 7-day grid, streak counter.
- **Change:** each habit card reads like an equipment slot. The streak's tier (from `streak-tiers.ts`) is rendered as a tier badge in the corner. Promotion to a new tier triggers an Embé moment.
- **Change:** streak flame → Embé's candle. Lit when streak > 0. Relit (alt pose) on the day after a break when a new MINIMUM logs.
- **Add:** a "Today's loadout" strip at the top — only the habits scheduled today, very compact, tap-to-log without scrolling.

### 5.5 `/ai` — `src/app/ai/page.tsx`

- **Keep:** conversation switcher, command chips, message list, action approval cards.
- **Change (highest priority):** AiActionCard shows a **plain-English preview first**. Raw JSON collapsed behind a disclosure. This is the single biggest UX wound in the app.
- **Change:** Augur cameo in the empty conversation state. One line in Augur's voice.
- **Change:** AI provider errors framed as "Augur was confused" with the actual error text wrapped (not replaced) underneath.

### 5.6 `/review` — `src/app/review/page.tsx`

- **Keep:** six-question form, Save button, Generate AI summary flow.
- **Change:** Save button → save-crystal motif. Behavior unchanged.
- **Change:** "Generate AI summary" → Augur framing ("Ask Augur to read the week").
- **Change:** the AI summary block gets a small Augur portrait next to it.

### 5.7 `/progress` — `src/app/progress/page.tsx`

The biggest single redesign target.

- **Replace:** flat XpBar with a **Status Screen**. Two columns (single on narrow):
  - **Left:** silhouette/avatar (placeholder OK), Title wordmark (from `titles.ts`), level, segmented XP bar, HP/MP mapping (HP = consistency %, MP = habit-day count — or designer's call).
  - **Right:** status effects strip, last 10 `XpEvent` rows (source + amount + relative time), next-level threshold, "XP by source" 14-day mini-chart.
- **Add:** Limit Break banner when criteria met.
- **Add:** Chapter/Season marker.

### 5.8 `/identity` — `src/app/identity/page.tsx`

- **Inventory first.** This page already exists and probably already does some of what §5.7 proposes.
- **Decision needed:** what lives on `/progress` vs `/identity`? Strawman: `/progress` is *numbers* (XP, level, consistency %), `/identity` is *who you are* (Title, Traits, Chapter, Recap link). Designer reconciles after walking both.

### 5.9 `/recap` — `src/app/recap/page.tsx`

- **Inventory first.** This is the Year Recap — likely the most dramatic surface by intent.
- **Change:** lean into it. This is where the FF aesthetic can be loudest. End-of-year ceremony, mascot cameos, Augur reading the year. The rest of the app can stay quieter because this one carries the drama.

### 5.10 `/settings` — `src/app/settings/page.tsx`

- **Keep:** name, timezone, AI provider/model, API key status read-only.
- **Add:** "Appearance" section with:
  - Theme toggle (dark / light / system) — persisted in `User.preferences` JSON, no schema change.
  - "Reduce mascots" toggle — same storage.
  - Optional: "Limit Break notifications on" toggle.

### 5.11 `/design` — `src/app/design/page.tsx`

- **Inventory first.** This is the kitchen-sink page.
- **Extend:** add a mascot gallery section. Each character's canonical pose + alt poses + voice sample line. Treat it as the visual style guide.
- **Extend:** show tokens, type scale, button variants, the new Status Screen primitives.

---

## 6. Component-Level Transforms

### Buttons (`ui/Button.tsx`)

Add an `epic` variant for hero actions (Save review, Start new week, Approve AI plan). Subtle accent glow on hover. Keep the existing variants.

### Inline feedback / toasts

Today: inline form errors only. Add: a tiny non-blocking toast region (top-right) for XP awards and tier promotions. Auto-dismiss. Stackable, capped at 3 visible. Reuse `notifications.ts` plumbing if it already exists in the retention engine.

### Empty states (`ui/EmptyState.tsx`)

Extend the existing primitive to accept a `mascot` slot and a `voice` prop. Default mascot = none (backward compatible).

### Loading (`ui/Skeleton.tsx`)

Already exists. Audit: which pages actually use it? Add on Today and Week for first paint.

### Cards / surfaces (`ui/Card.tsx`)

Add a `lifted` variant — soft inner shadow — for hero surfaces (Next Action, Quest card, Status Screen). Default stays flat-bordered.

### Pills, tooltips, progress bars

Inventory and extend. Don't fork.

### Typography

Step 1 (do this first): actually wire Geist through `body`. It's declared in `globals.css` but `body { font-family: Arial ... }` still wins. Fix it before drawing anything new.

Step 2: pick a display weight for hero numbers (level, XP, streak days). Use `tabular-nums` for any cell that ticks.

### Color

Introduce exactly two accent tokens: `--accent` (hero CTAs, XP bar fill, Title wordmark glow) and `--accent-soft` (hover halos, Limit Break banner). Pick a hue that survives both modes at low saturation. Don't introduce a third.

Per-mascot colors live in each mascot's SVG. They are not global tokens.

---

## 7. What to keep (hard non-negotiables)

- Every server action and validator in `src/lib/actions/*` and `src/lib/validators/*`. No contract changes.
- The Prisma schema. No new tables, no new columns. (Soft preferences like theme/mascot toggle live in `User.preferences` JSON.)
- The AI approval flow. AI proposes; user approves; action runs.
- Date/time string conventions.
- The retention engine. Don't replace titles, tiers, traits, seasons, quests, recap with FF-named parallels. Use the existing names internally; map them to FF presentation only at the view layer.
- Sidebar order.
- `dynamic = "force-dynamic"` on data-reading pages.

---

## 8. Technical constraints

- **Tailwind v4 only.** `@import "tailwindcss"` + `@theme`. Add tokens via `@theme`. No CSS-in-JS.
- **lucide-react** for icons. **Custom inline SVG** for mascots.
- **Framer Motion** acceptable for level-up flourishes and gentle mascot motion if needed. Prefer CSS where possible.
- **shadcn/ui** allowed but not required. The local `ui/` primitives may already cover everything. Inventory first.
- **Next 16 App Router.** `params` and `searchParams` are `Promise<…>`. See `AGENTS.md`.
- **Electron wrapper** is in play (`AUDIT.md`). The redesign runs in `pnpm dev` (plain browser) — don't propose anything that requires Electron APIs.
- **No new runtime deps** without a written justification. If Framer Motion or a tiny toast library is genuinely needed, name it and explain why.
- **No raster art, no external image hosts.** All mascot art ships as SVG in the repo.

---

## 9. Expected deliverable

A single markdown file at **`docs/design-review.md`** that contains:

1. **Inventory audit.** Walk `src/components/ui/*`, `src/app/design/page.tsx`, `src/lib/retention/*`, `/identity`, `/recap`. Confirm what exists. Cite files.
2. **Visual language doc.** Tokens (existing + proposed accent), type scale, type wiring fix, mascot character sheets (inline SVG previews acceptable), Status Screen spec.
3. **FF-mapping table.** Existing primitive → FF presentation. Be explicit so an implementer can't accidentally rebuild the engine.
4. **Per-page redesign notes.** Short paragraph + concrete component changes for each of `/today`, `/week`, `/tasks`, `/habits`, `/ai`, `/review`, `/progress`, `/identity`, `/recap`, `/settings`, `/design`.
5. **Microcopy pass.** Table of current string → proposed string, sourced from real grep results, not invention.
6. **Implementation plan.** Phased, smallest-first:
   - Phase 1 — Geist wiring, accent token, two extended primitives (`Button.epic`, `Card.lifted`).
   - Phase 2 — Status Screen on `/progress` and reconciliation with `/identity`.
   - Phase 3 — Mascots in empty states + the AiActionCard plain-English preview.
   - Phase 4 — Level-up moment, Limit Break banner, streak-tier promotion moment.
   - Phase 5 — Microcopy pass.
   - Phase 6 — Recap polish.
   Each phase scoped under ~200 LOC of expected churn.
7. **Open questions back to me.** Anything that needs my input before implementation.

**Do not write the implementation.** This is a design pass. Implementation gets its own session with a separate `tasks/todo.md`.

---

## 10. Open questions the designer should answer

1. **Avatar.** Status Screen wants a character. Pick from a small silhouette set? Derive from Title? Skip the avatar and lean on Title wordmark?
2. **Mascot density.** Empty states only? Empty states + milestone moments? Empty states + milestones + one quiet permanent corner on `/today`?
3. **`/identity` vs `/progress` split.** Where does the Status Screen actually live? Both? Strawman in §5.8 — reconcile after walking.
4. **Light mode.** Real target or fallback? Affects how hard we tune both.
5. **Limit Break criteria.** Proposed: all weekly targets DONE + review saved + ≥80% habit consistency. Too strict? Too lax?
6. **Notification surface.** The retention engine has `notifications.ts`. Does it already cover XP awards / tier promotions, or is that what we're adding? Inventory before duplicating.
7. **Naming.** Rocky / Beep / Embé / Mox / Augur are placeholders. Replace freely.

---

## 11. Out of scope (do not propose)

- Auth, sync, multi-user, mobile, public landing page.
- Push/email/SMS notifications outside the app.
- A character creator / customization screen.
- In-app purchases (real or simulated).
- Sound effects.
- New schema migrations beyond `User.preferences` JSON additions.
- Re-doing the retention engine. Surface it. Don't rebuild it.
- The `/api` route handlers and Electron main process. Out of scope for design.

---

## 12. Suggested first 30 minutes

1. `pnpm dev`, walk every route, note where coldness shows up.
2. Open `src/app/design/page.tsx` — see what the design system already looks like.
3. Open `src/lib/retention/titles.ts` and `src/lib/retention/streak-tiers.ts` — calibrate to the existing tone.
4. Open `/identity` and `/recap` in the running app — these are the surfaces most likely to absorb the FF treatment.
5. Pick the accent color. One decision unblocks ten.
6. Sketch Rocky. He's the easiest mascot to picture and he carries the Week page on his own.

---

*End of brief. Drop open questions back to me before writing `docs/design-review.md`.*
