# Life OS — Design Review Handoff for claude.ai

This document tells you (Demian) exactly which files to upload to a fresh **claude.ai** chat, in what order, and what prompt to send the designer Claude. Everything the web-based Claude needs lives in these files — it does not need filesystem access.

---

## How to use this

1. Open a new chat at **claude.ai**.
2. Drag every file in **§1 — Must-have payload** into the message box. claude.ai accepts multi-file uploads (PDFs, images, code, markdown). The order doesn't matter; Claude indexes them all.
3. Paste the **starter prompt** in §3 below into the message field.
4. Send.
5. If the response says it needs more context, drag in the **§2 — Optional deepen** files. Don't pre-load them — they bloat the context window for no gain.

---

## §1 — Must-have payload (drag these into claude.ai)

**The brief itself (1 file)**

```
docs/design-review-brief.md
```

**Product spec & rules (4 files)**

```
docs/life-os-spec.md
docs/assumptions.md
CLAUDE.md
AGENTS.md
```

**Data model (1 file)**

```
prisma/schema.prisma
```

**Current visual tokens (1 file)**

```
src/app/globals.css
```

**Existing UI primitives — extend, don't fork (13 files)**

```
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/EmptyState.tsx
src/components/ui/IconButton.tsx
src/components/ui/InlineConfirmation.tsx
src/components/ui/Input.tsx
src/components/ui/Label.tsx
src/components/ui/Pill.tsx
src/components/ui/ProgressBar.tsx
src/components/ui/SectionHeading.tsx
src/components/ui/Skeleton.tsx
src/components/ui/Tooltip.tsx
src/components/ui/index.ts
```

**Retention engine — mechanics already shipped, do not propose new ones (13 files)**

```
src/lib/retention/award-trait.ts
src/lib/retention/blocker.ts
src/lib/retention/bonuses.ts
src/lib/retention/evaluate-streaks.ts
src/lib/retention/insights.ts
src/lib/retention/notifications.ts
src/lib/retention/queries.ts
src/lib/retention/quests.ts
src/lib/retention/recap.ts
src/lib/retention/seasons.ts
src/lib/retention/streak-tiers.ts
src/lib/retention/titles.ts
src/lib/retention/trait-map.ts
```

**Layout (2 files)**

```
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
```

**Page files — one per route (11 files)**

```
src/app/today/page.tsx
src/app/week/page.tsx
src/app/tasks/page.tsx
src/app/habits/page.tsx
src/app/ai/page.tsx
src/app/review/page.tsx
src/app/progress/page.tsx
src/app/identity/page.tsx
src/app/recap/page.tsx
src/app/settings/page.tsx
src/app/design/page.tsx
```

**Key feature components — the redesign hotspots (6 files)**

```
src/components/today/NextActionCard.tsx
src/components/progress/XpBar.tsx
src/components/ai/AiActionCard.tsx
src/components/habits/HabitCard.tsx
src/components/week/DayAccordion.tsx
src/components/review/ReviewForm.tsx
```

**Total: ~52 files.** claude.ai handles this comfortably. If your account caps upload size, prioritise (in order of importance): the brief → CLAUDE.md → schema.prisma → globals.css → retention/* → ui/* → pages → feature components.

---

## §2 — Optional deepen (only if Claude asks)

**More feature components** — the rest of `src/components/today/`, `src/components/week/`, `src/components/habits/`, `src/components/tasks/`, `src/components/ai/`, `src/components/review/`, `src/components/identity/`, `src/components/recap/`, `src/components/settings/`.

**Server actions** — `src/lib/actions/*.ts`. Only needed if the designer wants to propose copy for transient states (saving, error). Most server actions are write-only and don't surface text.

**Validators** — `src/lib/validators/*.ts`. Only needed if the designer wants to enumerate task priorities, energy levels, habit categories, etc. directly.

**Dates / user utilities** — `src/lib/dates.ts`, `src/lib/user.ts`, `src/lib/user-preferences.ts`. Useful if the designer proposes changes that touch `User.preferences` (e.g. theme toggle, reduce-mascots toggle).

---

## §3 — Starter prompt to paste into claude.ai

```
You are doing a UI/UX redesign pass on Life OS, a local-first personal AI
planning app for one user (me).

I've uploaded the full design review brief plus all the files it references
(UI primitives, retention engine, page files, layout, key feature components,
schema, tokens, rules).

Read `docs/design-review-brief.md` first — it explains the ask, what already
exists, and the expected deliverable. Then walk the uploaded source files.

Produce ONE markdown document called `design-review.md` containing:

1. Inventory audit — what exists today, cited by file.
2. Visual language doc — tokens, type scale, type wiring fix, accent color
   choice, mascot character sheets (inline SVG previews welcome).
3. FF-mapping table — existing retention primitive → FF presentation.
4. Per-page redesign notes — concrete component changes per route.
5. Microcopy pass — current string → proposed string, sourced from real code,
   not invented.
6. Phased implementation plan — six phases, each scoped to <=200 LOC of churn.
7. Open questions back to me.

Do NOT write implementation code. This is a design pass; implementation gets
its own session.

Use the design:design-critique, design:design-system, and design:ux-copy
skills if they are available to you.

Ask me clarifying questions before drafting if anything is unclear.
```

---

## §4 — What to do with the result

The designer Claude will return a markdown blob (probably long). Save it to your machine as **`docs/design-review.md`**. That file then becomes the input for an implementation session — a third Claude session with filesystem access that reads `docs/design-review.md` and produces a `tasks/todo.md` + actual code changes.

Don't combine design and implementation in the same chat. The design pass needs space to think about character, voice, and visual hierarchy without distraction; the implementation pass needs space to think about TypeScript, server actions, and Tailwind tokens. They're different headspaces.

---

## §5 — If claude.ai chokes on file count

claude.ai's Projects feature handles large file sets better than one-shot uploads. If you have Pro/Team:

1. Create a Project called "Life OS Design Review".
2. Add the §1 files to the Project's knowledge base.
3. Set the Project's system instructions to the starter prompt in §3.
4. Start a new chat in the Project. Send a one-liner: *"Run the design review per the project instructions."*

This also lets you iterate — drag in §2 files later if Claude asks, without redoing the whole upload.

---

## §6 — File-collection helper (Windows PowerShell)

If you want to bundle the §1 files into a single folder for easy multi-select drag:

```powershell
$dest = "$env:USERPROFILE\Desktop\life-os-design-payload"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$files = @(
  "docs\design-review-brief.md",
  "docs\life-os-spec.md",
  "docs\assumptions.md",
  "CLAUDE.md",
  "AGENTS.md",
  "prisma\schema.prisma",
  "src\app\globals.css",
  "src\components\ui\Button.tsx",
  "src\components\ui\Card.tsx",
  "src\components\ui\EmptyState.tsx",
  "src\components\ui\IconButton.tsx",
  "src\components\ui\InlineConfirmation.tsx",
  "src\components\ui\Input.tsx",
  "src\components\ui\Label.tsx",
  "src\components\ui\Pill.tsx",
  "src\components\ui\ProgressBar.tsx",
  "src\components\ui\SectionHeading.tsx",
  "src\components\ui\Skeleton.tsx",
  "src\components\ui\Tooltip.tsx",
  "src\components\ui\index.ts",
  "src\lib\retention\award-trait.ts",
  "src\lib\retention\blocker.ts",
  "src\lib\retention\bonuses.ts",
  "src\lib\retention\evaluate-streaks.ts",
  "src\lib\retention\insights.ts",
  "src\lib\retention\notifications.ts",
  "src\lib\retention\queries.ts",
  "src\lib\retention\quests.ts",
  "src\lib\retention\recap.ts",
  "src\lib\retention\seasons.ts",
  "src\lib\retention\streak-tiers.ts",
  "src\lib\retention\titles.ts",
  "src\lib\retention\trait-map.ts",
  "src\components\layout\Sidebar.tsx",
  "src\components\layout\Topbar.tsx",
  "src\app\today\page.tsx",
  "src\app\week\page.tsx",
  "src\app\tasks\page.tsx",
  "src\app\habits\page.tsx",
  "src\app\ai\page.tsx",
  "src\app\review\page.tsx",
  "src\app\progress\page.tsx",
  "src\app\identity\page.tsx",
  "src\app\recap\page.tsx",
  "src\app\settings\page.tsx",
  "src\app\design\page.tsx",
  "src\components\today\NextActionCard.tsx",
  "src\components\progress\XpBar.tsx",
  "src\components\ai\AiActionCard.tsx",
  "src\components\habits\HabitCard.tsx",
  "src\components\week\DayAccordion.tsx",
  "src\components\review\ReviewForm.tsx"
)

foreach ($f in $files) {
  $src = Join-Path "C:\Users\demia\life-os" $f
  if (Test-Path $src) {
    $flatName = ($f -replace '[\\/]', '__')
    Copy-Item $src (Join-Path $dest $flatName)
  } else {
    Write-Warning "Missing: $f"
  }
}

Write-Host "Done. Files staged at $dest"
```

Run this from any PowerShell window. It copies every §1 file to `Desktop\life-os-design-payload\` with flattened names (so they all sit in one folder ready to multi-select and drag into claude.ai). Files that don't exist get a warning but don't break the script.

---

*That's it. The brief is the spec; the file list is the context; the prompt is the kickoff.*
