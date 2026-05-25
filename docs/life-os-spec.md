# Life OS - Claude Code Handoff Spec v2

Owner: Demian  
App type: local-first personal planning app  
Main user: one person  
Default timezone: America/Argentina/Buenos_Aires  
Primary input: AI chat  
Primary planning unit: week  
Status: MVP build spec

---

## 0. How to use this file with Claude Code

Put this file in the project as:

```txt
docs/life-os-spec.md
```

Then give Claude Code this first prompt:

```txt
Read docs/life-os-spec.md fully.

Build the app in small phases.

Before coding, create a short implementation plan for Phase 1 and Phase 2 only.
Then implement those phases.

After each phase, run verification commands:
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm exec prisma validate, once Prisma exists

Do not skip verification.
Do not add auth, payments, calendar sync, email, mobile app, or cloud hosting.
Keep the app local-first and single-user for the MVP.
If something is unclear, make a sensible assumption, write it in docs/assumptions.md, and continue.
```

Also create this short `CLAUDE.md` at the project root:

```md
# CLAUDE.md

## Project
Life OS is a local-first personal AI planning app for one user.
It helps plan weeks, run days, track habits, manage tasks, review progress, and approve AI-suggested actions.

## Stack
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Prisma
- SQLite
- @prisma/adapter-better-sqlite3
- Zod
- AI SDK or provider adapter layer for Anthropic and OpenAI

## Rules
- Use TypeScript strictly.
- Use Server Components for data reads when possible.
- Use Server Actions or route handlers for writes.
- Never let AI mutate data directly.
- AI must return proposed actions.
- User must approve actions before database writes.
- Store date-only values as YYYY-MM-DD strings.
- Store time-only values as HH:mm strings.
- Run lint, typecheck, and build after each phase.

## Do not build yet
- Auth
- Payments
- Google Calendar sync
- Email access
- Mobile native app
- Social features
- Public landing page
```

Keep `CLAUDE.md` short. Use this spec for detail.

---

## 1. Product goal

Build a personal app that acts like a daily operating system.

The app helps Demian:

- Plan the week.
- Run the day.
- Track habits.
- Capture unlimited tasks.
- Turn vague goals into next actions.
- Review the week.
- Keep a visible sense of progress.
- Talk to an AI planning coach.

The MVP should be useful without any external tools.

No Google Calendar.
No email.
No auth.
No cloud database.
No mobile app.

The app succeeds if Demian opens it each morning and knows:

1. What matters today.
2. What to do next.
3. What can be ignored.
4. Whether the week is working.

---

## 2. Product sentence

Life OS is a local-first AI planner that turns goals, habits, tasks, and routines into a weekly plan you can follow.

---

## 3. Core idea

The app is not a normal task manager.

It is a personal planning system.

The week is the command center.
The day is the execution view.
The chat is the main input.
The database is the source of truth.
AI suggests changes, but the user approves them.

---

## 4. MVP principles

### 4.1 Week first

Do not start with a giant task list.

Start with:

- Big Rock of the week.
- Weekly targets.
- Weekly habits.
- Daily blocks.
- Weekly review.

### 4.2 Today stays small

The Today view should show only what matters now.

It should not show the whole system.

### 4.3 AI plans, but does not control

The AI can:

- Create a plan.
- Suggest a next action.
- Move tasks.
- Break down a goal.
- Simplify a day.
- Create habits.
- Review the week.

The AI cannot write directly to the database.

It returns proposed actions.
The user approves, rejects, or edits them.

### 4.4 Habits use minimum and ideal versions

Each habit has:

- Minimum version.
- Ideal version.
- Anchor.
- Days of week.
- Difficulty.

Example:

```txt
Habit: Meditation
Minimum: 5 minutes
Ideal: 10 minutes
Anchor: after brushing teeth
Days: Monday to Friday
```

### 4.5 Plans must fit real energy

The app should avoid overload.

Rules:

- Prefer one main task per day.
- Protect fixed commitments.
- Leave buffer time.
- Put deep work in high-energy blocks.
- Put admin in low-energy blocks.
- Reduce habits when the week is heavy.

### 4.6 Gamification supports behavior

Gamification should be calm.

Good:

- XP for keeping promises.
- Streak protection.
- Big Rock as a boss fight.
- Quests for goals.
- Real rewards for milestones.

Avoid:

- Loud effects.
- Too many badges.
- Punishment loops.
- Points for meaningless actions.

---

## 5. MVP scope

Build these sections:

1. Today
2. Week
3. Tasks
4. Habits
5. AI Chat
6. Weekly Review
7. Progress
8. Local Settings

The Goals section can exist as a simple page, but deep goal management can wait until after the MVP.

---

## 6. Build order

Use this exact order.

### Phase 1 - Project setup

Create the app.

Tasks:

- Create Next.js app.
- Use App Router.
- Use TypeScript.
- Use Tailwind.
- Add shadcn/ui.
- Add lucide-react.
- Add Prisma.
- Add SQLite.
- Add @prisma/adapter-better-sqlite3.
- Add Zod.
- Add dotenv.
- Add tsx for seed scripts.
- Add base layout.
- Add sidebar navigation.
- Add empty pages.

Pages:

```txt
/
/today
/week
/tasks
/habits
/ai
/review
/progress
/settings
```

Acceptance:

- App runs locally.
- Sidebar links work.
- All pages render.
- No auth exists.
- No external database exists.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.

### Phase 2 - Database and seed data

Create Prisma schema.

Add seed data for one user.

Seed user:

```txt
Name: Demian
Timezone: America/Argentina/Buenos_Aires
```

Seed habits:

- Meditation
- Reading
- Phone out of bedroom
- Functional training
- Gym
- Stretching
- French
- Illustration
- Networking

Seed week structure:

- Monday: strategy and setup
- Tuesday: sales and outreach
- Wednesday: account and project work
- Thursday: outreach and follow-ups
- Friday: cleanup and reflection

Acceptance:

- Prisma validates.
- Migration runs.
- Seed runs.
- Seeded data appears in the app.
- Data persists after refresh.

### Phase 3 - Week screen

Build the command center.

Show:

- Current week dates.
- Big Rock.
- Weekly targets.
- Days accordion.
- Daily time blocks.
- Weekly habit table.
- Reflection field.

Actions:

- Edit Big Rock.
- Add weekly target.
- Complete weekly target.
- Add time block.
- Edit time block.
- Complete time block.
- Log habit for a day.
- Start new week.

Acceptance:

- User can manage one full week.
- Changes persist.
- Habit logs persist.
- Completed targets persist.
- Completed blocks persist.

### Phase 4 - Today screen

Build the daily execution view.

Show:

- Today date.
- Main focus.
- Today blocks.
- Today tasks.
- Today habits.
- Energy check-in.
- One recommended next action.
- Quick capture input.

Actions:

- Complete task.
- Complete block.
- Log habit.
- Add quick task.
- Snooze task.
- Move task to another date.

Acceptance:

- User can run the day from this page.
- Today does not show too much data.
- Quick capture creates an inbox task.

### Phase 5 - Tasks

Build task capture and sorting.

Views:

- Inbox
- Today
- This week
- Someday
- Done

Each task has:

- Title
- Notes
- Status
- Priority
- Energy level
- Estimated minutes
- Due date
- Scheduled date
- Project
- Tags
- Source

Actions:

- Create task.
- Edit task.
- Complete task.
- Archive task.
- Schedule task.
- Move task to Someday.

Acceptance:

- User can store unlimited tasks.
- Tasks can be scheduled into days.
- Task changes persist.

### Phase 6 - Habits

Build habit management.

Show:

- Habit list.
- Habit details.
- Minimum version.
- Ideal version.
- Anchor.
- Days of week.
- Streaks.
- Weekly log grid.

Actions:

- Create habit.
- Edit habit.
- Deactivate habit.
- Log habit minimum.
- Log habit ideal.
- Mark skipped.

Acceptance:

- User can create and track habits.
- Streaks calculate from logs.
- Weekly habit table matches Week screen.

### Phase 7 - AI chat MVP

Build the AI coach.

The AI reads app context.
The AI returns chat text plus structured proposed actions.
The user approves actions before database writes.

Commands to support:

- Plan my week.
- What should I do today?
- I am overwhelmed. Simplify my day.
- Break this goal into tasks.
- Review my week.
- Move unfinished tasks.
- Create a habit plan.
- What am I avoiding?
- Make tomorrow realistic.

Acceptance:

- User can send a chat message.
- Chat history persists.
- AI receives current app context.
- AI returns structured actions.
- Actions show in preview cards.
- User can approve, reject, or edit actions.
- Approved actions update the database.

### Phase 8 - Weekly review

Build review flow.

Ask:

- What worked?
- What drained me?
- What did I avoid?
- What should I simplify?
- What is next week's minimum viable plan?
- How am I emotionally?

AI output:

- Short summary.
- Patterns noticed.
- Suggested changes.
- Proposed next week.

Acceptance:

- User can complete a weekly review.
- Review is saved to the week.
- AI can suggest next week changes.
- User approves next week plan.

### Phase 9 - Progress and gamification

Build calm progress tracking.

Show:

- XP.
- Level.
- Current streak.
- Best streak.
- Weekly consistency score.
- Big Rock progress.

XP:

- Complete habit minimum: +5 XP
- Complete habit ideal: +10 XP
- Complete task: +5 XP
- Complete deep work block: +15 XP
- Complete Big Rock: +50 XP
- Complete weekly review: +25 XP
- No two missed days in a row: +20 XP

Acceptance:

- XP events are stored.
- XP total is visible.
- Level is visible.
- Gamification does not clutter the app.

---

## 7. Tech stack

Use this stack unless there is a strong reason not to.

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react

### Data

- Prisma
- SQLite
- Local database file

### AI

Use one AI service layer.

Preferred approach:

- AI SDK with provider adapters, or
- A custom provider adapter layer

Support:

- Anthropic Claude
- OpenAI

Create these functions:

```ts
ai.chat(input)
ai.generateWeeklyPlan(input)
ai.reviewWeek(input)
ai.suggestNextAction(input)
ai.breakDownGoal(input)
ai.simplifyDay(input)
```

### Validation

Use Zod for:

- Forms.
- Server Action inputs.
- AI structured outputs.
- AI action payloads.

### State

Use simple state first.

- Server Components for initial reads.
- Server Actions for writes.
- Client state only for forms, filters, and pending UI.
- Avoid Zustand, Redux, or complex state management in the MVP.

---

## 8. Date and time rules

This is important.

Use date-only strings for calendar days.

```ts
type DateKey = string; // YYYY-MM-DD
```

Use time-only strings for time blocks.

```ts
type TimeKey = string; // HH:mm
```

Examples:

```txt
DayPlan.date = "2026-05-06"
Task.scheduledDate = "2026-05-06"
TimeBlock.startTime = "09:30"
TimeBlock.endTime = "11:00"
```

Use real `DateTime` only for timestamps:

```txt
createdAt
updatedAt
approvedAt
```

Reason:

- This avoids timezone bugs.
- The app is a planner, not a global calendar.
- Most dates are local days for Demian.

Create helpers in `src/lib/dates.ts`:

```ts
export function todayKey(timezone: string): string
export function getWeekStart(dateKey: string): string
export function getWeekEnd(dateKey: string): string
export function addDays(dateKey: string, days: number): string
export function formatDateLabel(dateKey: string): string
export function getDayKey(dateKey: string): DayKey
```

---

## 9. App structure

Use this structure.

```txt
src/
  app/
    page.tsx
    today/page.tsx
    week/page.tsx
    tasks/page.tsx
    habits/page.tsx
    ai/page.tsx
    review/page.tsx
    progress/page.tsx
    settings/page.tsx
  components/
    layout/
      AppShell.tsx
      Sidebar.tsx
      Topbar.tsx
    today/
      TodayFocus.tsx
      TodayBlocks.tsx
      TodayTasks.tsx
      TodayHabits.tsx
      EnergyCheckIn.tsx
      QuickCapture.tsx
      NextActionCard.tsx
    week/
      BigRockCard.tsx
      WeeklyTargets.tsx
      DayAccordion.tsx
      TimeBlockCard.tsx
      HabitWeekTable.tsx
      WeeklyReflection.tsx
      StartNewWeekButton.tsx
    tasks/
      TaskInbox.tsx
      TaskList.tsx
      TaskItem.tsx
      TaskEditor.tsx
      TaskFilters.tsx
    habits/
      HabitCard.tsx
      HabitLogGrid.tsx
      HabitEditor.tsx
      HabitStreak.tsx
    ai/
      AiChat.tsx
      AiMessageList.tsx
      AiActionPreview.tsx
      AiActionCard.tsx
    review/
      ReviewForm.tsx
      ReviewSummary.tsx
    progress/
      XpBar.tsx
      LevelBadge.tsx
      StreakCard.tsx
      BigRockBoss.tsx
  lib/
    db.ts
    dates.ts
    scoring.ts
    constants.ts
    validators/
      task.ts
      habit.ts
      week.ts
      ai-actions.ts
    actions/
      task-actions.ts
      habit-actions.ts
      week-actions.ts
      ai-actions.ts
    ai/
      index.ts
      providers.ts
      prompts.ts
      context.ts
      schemas.ts
      apply-actions.ts
  prisma/
    schema.prisma
    seed.ts
```

---

## 10. Data model rules

Use enums for fixed states.

Use relations instead of missing IDs.

Important fixes from the first draft:

- If Task has `projectId`, create a `Project` table.
- TimeBlock should be able to link to a Task.
- AI messages should belong to a conversation.
- AI actions should be validated and auditable.
- Habit days should be easy to query.
- XP should use event rows, not only a total number.

---

## 11. Prisma schema draft

Claude Code should turn this into a valid `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

enum TaskStatus {
  INBOX
  TODO
  SCHEDULED
  DONE
  SOMEDAY
  ARCHIVED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum EnergyLevel {
  LOW
  MEDIUM
  HIGH
}

enum TimeBlockCategory {
  FIXED
  FLEXIBLE
  FREE
  DEEP_WORK
  ADMIN
  RECOVERY
  SOCIAL
  HEALTH
  CREATIVE
}

enum TimeBlockStatus {
  PLANNED
  DONE
  SKIPPED
  MOVED
}

enum HabitLogStatus {
  NONE
  MINIMUM
  IDEAL
  SKIPPED
}

enum GoalType {
  YEAR
  QUARTER
  MONTH
  PROJECT
  QUEST
}

enum GoalStatus {
  ACTIVE
  PAUSED
  DONE
  ARCHIVED
}

enum AiRole {
  USER
  ASSISTANT
  SYSTEM
}

enum AiActionStatus {
  PROPOSED
  APPROVED
  REJECTED
  APPLIED
  FAILED
}

model User {
  id          String   @id @default(cuid())
  name        String
  timezone    String   @default("America/Argentina/Buenos_Aires")
  preferences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  weeks           Week[]
  dayPlans        DayPlan[]
  tasks           Task[]
  projects        Project[]
  habits          Habit[]
  goals           Goal[]
  aiConversations AiConversation[]
  aiActions       AiAction[]
  gameProfile     GameProfile?
  xpEvents        XpEvent[]
}

model Week {
  id         String   @id @default(cuid())
  userId     String
  startDate  String
  endDate    String
  label      String?
  bigRock    String?
  reflection String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  targets        WeeklyTarget[]
  dayPlans       DayPlan[]
  weeklyReviews  WeeklyReview[]

  @@unique([userId, startDate])
  @@index([userId, startDate])
}

model WeeklyTarget {
  id        String   @id @default(cuid())
  weekId    String
  title     String
  status    String   @default("TODO")
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  week Week @relation(fields: [weekId], references: [id], onDelete: Cascade)
}

model DayPlan {
  id        String   @id @default(cuid())
  userId    String
  weekId    String
  date      String
  dayKey    String
  label     String?
  focus     String?
  energy    EnergyLevel?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  week       Week        @relation(fields: [weekId], references: [id], onDelete: Cascade)
  timeBlocks TimeBlock[]

  @@unique([userId, date])
  @@index([weekId])
}

model TimeBlock {
  id          String            @id @default(cuid())
  dayPlanId   String
  taskId      String?
  startTime   String
  endTime     String
  title       String
  category    TimeBlockCategory @default(FLEXIBLE)
  status      TimeBlockStatus   @default(PLANNED)
  order       Int               @default(0)
  notes       String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  dayPlan DayPlan @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)
  task    Task?   @relation(fields: [taskId], references: [id], onDelete: SetNull)
}

model Project {
  id        String   @id @default(cuid())
  userId    String
  title     String
  notes     String?
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks Task[]
  goals Goal[]
}

model Task {
  id               String      @id @default(cuid())
  userId           String
  projectId        String?
  title            String
  notes            String?
  status           TaskStatus  @default(INBOX)
  priority         Priority    @default(MEDIUM)
  energy           EnergyLevel @default(MEDIUM)
  estimatedMinutes Int?
  dueDate          String?
  scheduledDate    String?
  source           String?
  tags             Json?
  completedAt      DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  project    Project?    @relation(fields: [projectId], references: [id], onDelete: SetNull)
  timeBlocks TimeBlock[]
  goalTasks  GoalTask[]
}

model Habit {
  id             String   @id @default(cuid())
  userId         String
  name           String
  category       String?
  minimumVersion String
  idealVersion   String?
  anchor         String?
  active         Boolean  @default(true)
  difficulty     Int      @default(1)
  startDate      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  scheduleDays HabitScheduleDay[]
  logs         HabitLog[]
  goalHabits   GoalHabit[]
}

model HabitScheduleDay {
  id        String @id @default(cuid())
  habitId   String
  dayOfWeek Int

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, dayOfWeek])
}

model HabitLog {
  id        String         @id @default(cuid())
  habitId   String
  date      String
  status    HabitLogStatus @default(NONE)
  value     Int?
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date])
  @@index([date])
}

model Goal {
  id          String     @id @default(cuid())
  userId      String
  projectId   String?
  title       String
  description String?
  type        GoalType
  startDate   String?
  endDate     String?
  reward      String?
  status      GoalStatus @default(ACTIVE)
  progress    Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  project    Project?    @relation(fields: [projectId], references: [id], onDelete: SetNull)
  goalTasks  GoalTask[]
  goalHabits GoalHabit[]
}

model GoalTask {
  id     String @id @default(cuid())
  goalId String
  taskId String

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([goalId, taskId])
}

model GoalHabit {
  id      String @id @default(cuid())
  goalId  String
  habitId String

  goal  Goal  @relation(fields: [goalId], references: [id], onDelete: Cascade)
  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([goalId, habitId])
}

model WeeklyReview {
  id          String   @id @default(cuid())
  weekId      String
  answers     Json
  aiSummary   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  week Week @relation(fields: [weekId], references: [id], onDelete: Cascade)
}

model AiConversation {
  id        String   @id @default(cuid())
  userId    String
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages AiMessage[]
}

model AiMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           AiRole
  content        String
  createdAt      DateTime @default(now())

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model AiAction {
  id             String         @id @default(cuid())
  userId         String
  conversationId String?
  type           String
  payload        Json
  status         AiActionStatus @default(PROPOSED)
  error          String?
  createdAt      DateTime       @default(now())
  approvedAt     DateTime?
  appliedAt      DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
}

model GameProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  xp            Int      @default(0)
  level         Int      @default(1)
  currentStreak Int      @default(0)
  bestStreak    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model XpEvent {
  id        String   @id @default(cuid())
  userId    String
  source    String
  amount    Int
  note      String?
  date      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}
```

---

## 12. Prisma config and data access rules

Use current Prisma config style.

Create `prisma.config.ts` at the project root:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Create `src/lib/db.ts` with a Prisma singleton.

Use the SQLite driver adapter when using current Prisma versions:

```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Do not query Prisma directly inside many UI components.

Use small data functions or Server Actions:

```txt
src/lib/actions/task-actions.ts
src/lib/actions/habit-actions.ts
src/lib/actions/week-actions.ts
src/lib/actions/ai-actions.ts
```

Rules:

- Validate inputs with Zod before writes.
- Revalidate the affected route after writes.
- Return simple success/error objects.
- Keep mutations small.
- Do not hide failed writes.

---

## 13. Screen details

### 13.1 Today screen

Route:

```txt
/today
```

Main purpose:

Help Demian run today.

Layout:

1. Today header
2. Main focus card
3. Next action card
4. Time blocks
5. Today tasks
6. Today habits
7. Quick capture

The page should answer:

- What is my focus?
- What is next?
- What habits are due?
- What can wait?

Do not show:

- Full inbox.
- Full backlog.
- Long analytics.

### 13.2 Week screen

Route:

```txt
/week
```

Main purpose:

Plan and adjust the current week.

Layout:

1. Week header
2. Big Rock card
3. Weekly targets
4. Days accordion
5. Habit week table
6. Reflection

The page should answer:

- What is the Big Rock?
- What are the weekly targets?
- What is planned each day?
- Are habits on track?
- What needs to change?

### 13.3 Tasks screen

Route:

```txt
/tasks
```

Main purpose:

Capture and organize tasks.

Tabs:

- Inbox
- Today
- This week
- Someday
- Done

The Inbox should be quick.
Do not make task creation heavy.

### 13.4 Habits screen

Route:

```txt
/habits
```

Main purpose:

Track routines and adjust habit size.

Each habit card shows:

- Name.
- Minimum version.
- Ideal version.
- Schedule.
- Current streak.
- This week logs.

### 13.5 AI screen

Route:

```txt
/ai
```

Main purpose:

Chat with the planning coach.

Layout:

1. Message list
2. Chat input
3. Suggested command chips
4. Pending action previews

Suggested command chips:

- Plan my week
- Simplify today
- What should I do next?
- Move unfinished tasks
- Review my week
- Create habit plan

### 13.6 Review screen

Route:

```txt
/review
```

Main purpose:

Learn from the week.

Show:

- Review questions.
- Week stats.
- AI summary.
- Proposed next week changes.

### 13.7 Progress screen

Route:

```txt
/progress
```

Main purpose:

Show progress without noise.

Show:

- XP bar.
- Level.
- Streak.
- Big Rock boss fight.
- Weekly consistency.

---

## 14. AI behavior

The AI is Demian's planning coach.

Tone:

- Direct.
- Calm.
- No shame.
- Short sentences.
- Practical.

The AI should help reduce overload.

### AI planning rules

- Do not overload the day.
- Protect fixed commitments.
- Leave buffer time.
- Prefer one main task per day.
- Use energy-aware planning.
- Put deep work in high-energy blocks.
- Put admin in low-energy blocks.
- Keep habits small when the week is heavy.
- Suggest fewer things when the user is tired.

### AI coaching rules

- Focus on the next action.
- Do not lecture.
- Do not shame.
- Do not push perfection.
- Use minimum viable habits.
- Remind Demian that consistency beats intensity.

### AI review rules

During review, look for:

- What worked.
- What drained energy.
- What was avoided.
- What was overloaded.
- What should be simplified.
- What next week's minimum plan should be.

---

## 15. AI context injection

Do not send the whole database to the AI.

Send only useful context.

For normal chat, include:

```txt
- Current date
- Timezone
- Current week
- Big Rock
- Weekly targets
- Today plan
- Today tasks
- Active habits due today
- Habit logs from last 14 days
- Open tasks scheduled this week
- Recent AI messages
```

For weekly planning, include:

```txt
- Current week or next week
- Incomplete tasks from last week
- Active habits
- Active goals or projects
- Known fixed blocks
- Review from previous week, if any
```

For weekly review, include:

```txt
- Completed tasks
- Incomplete tasks
- Completed time blocks
- Habit logs
- Big Rock status
- Review answers
```

Keep context small.
If a task list is long, summarize it before sending.

---

## 16. AI structured output

AI responses should include chat text and proposed actions.

Shape:

```ts
type AiCoachResponse = {
  message: string;
  reasoningSummary?: string;
  actions: AiActionProposal[];
  warnings?: string[];
};
```

Do not show hidden chain of thought.
Use `reasoningSummary` only for short user-facing rationale.

### AI action types

```ts
type AiActionProposal =
  | { type: 'CREATE_TASK'; payload: CreateTaskInput }
  | { type: 'UPDATE_TASK'; payload: UpdateTaskInput }
  | { type: 'SCHEDULE_TASK'; payload: ScheduleTaskInput }
  | { type: 'CREATE_TIME_BLOCK'; payload: CreateTimeBlockInput }
  | { type: 'UPDATE_TIME_BLOCK'; payload: UpdateTimeBlockInput }
  | { type: 'CREATE_HABIT'; payload: CreateHabitInput }
  | { type: 'UPDATE_HABIT'; payload: UpdateHabitInput }
  | { type: 'CREATE_WEEK'; payload: CreateWeekInput }
  | { type: 'UPDATE_WEEK'; payload: UpdateWeekInput }
  | { type: 'CREATE_WEEKLY_TARGET'; payload: CreateWeeklyTargetInput }
  | { type: 'CREATE_WEEKLY_REVIEW'; payload: CreateWeeklyReviewInput }
  | { type: 'ADD_XP_EVENT'; payload: AddXpEventInput };
```

### Action approval flow

1. AI returns actions.
2. Store actions as `PROPOSED`.
3. Show preview cards.
4. User chooses Approve, Reject, or Edit.
5. Validate payload again.
6. Apply database write.
7. Mark action as `APPLIED` or `FAILED`.
8. Show result.

Never skip validation.

---

## 17. Zod schema example for AI actions

Create this in:

```txt
src/lib/validators/ai-actions.ts
```

```ts
import { z } from 'zod';

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeKeySchema = z.string().regex(/^\d{2}:\d{2}$/);

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  energy: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  estimatedMinutes: z.number().int().positive().optional(),
  dueDate: dateKeySchema.optional(),
  scheduledDate: dateKeySchema.optional(),
  projectId: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const scheduleTaskInputSchema = z.object({
  taskId: z.string(),
  scheduledDate: dateKeySchema,
});

export const createTimeBlockInputSchema = z.object({
  date: dateKeySchema,
  startTime: timeKeySchema,
  endTime: timeKeySchema,
  title: z.string().min(1),
  category: z.enum([
    'FIXED',
    'FLEXIBLE',
    'FREE',
    'DEEP_WORK',
    'ADMIN',
    'RECOVERY',
    'SOCIAL',
    'HEALTH',
    'CREATIVE',
  ]).default('FLEXIBLE'),
  taskId: z.string().optional(),
});

export const aiActionProposalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CREATE_TASK'), payload: createTaskInputSchema }),
  z.object({ type: z.literal('SCHEDULE_TASK'), payload: scheduleTaskInputSchema }),
  z.object({ type: z.literal('CREATE_TIME_BLOCK'), payload: createTimeBlockInputSchema }),
]);

export const aiCoachResponseSchema = z.object({
  message: z.string().min(1),
  reasoningSummary: z.string().optional(),
  actions: z.array(aiActionProposalSchema).max(20).default([]),
  warnings: z.array(z.string()).default([]),
});
```

Add more action schemas as each feature is built.

---

## 18. AI system prompt

Use this as the base prompt.

```txt
You are Demian's personal planning coach inside Life OS.

Your job is to help him build a realistic week, protect his energy, and keep promises to himself.

You manage goals, tasks, habits, and schedule blocks.

Tone:
- Be direct.
- Be calm.
- Use short sentences.
- Do not shame him.
- Do not lecture.

Planning rules:
- Never overload the day.
- Prefer one main task per day.
- Protect fixed commitments.
- Leave buffer time.
- Use energy-aware planning.
- Put deep work in high-energy blocks.
- Put admin in lower-energy blocks.
- When the week is heavy, reduce the plan.
- Turn vague goals into small next actions.
- Use minimum viable habits.
- Weekly consistency matters more than perfect days.

App rules:
- You may suggest changes.
- You may not assume changes are final.
- When suggesting changes to app data, return structured actions.
- The user must approve actions before they are applied.
- If context is missing, make a safe minimal suggestion instead of inventing facts.

Output rules:
- Return a short message for the user.
- Return structured actions when useful.
- Do not include hidden chain of thought.
- Use a short reasoning summary only if it helps the user decide.
```

---

## 19. Seed data details

### 19.1 Default habits

Use these defaults.

```txt
Meditation
- Category: health
- Minimum: 5 minutes
- Ideal: 10 minutes
- Anchor: after brushing teeth
- Days: Monday to Friday
- Difficulty: 1

Reading
- Category: learning
- Minimum: 5 pages
- Ideal: 20 pages
- Anchor: before sleep
- Days: Monday to Sunday
- Difficulty: 1

Phone out of bedroom
- Category: sleep
- Minimum: phone charges outside bedroom
- Ideal: no phone 30 minutes before bed
- Anchor: when going to bed
- Days: Monday to Sunday
- Difficulty: 2

Functional training
- Category: health
- Minimum: 20 minutes
- Ideal: full session
- Anchor: scheduled block
- Days: Monday, Wednesday, Friday
- Difficulty: 3

Gym
- Category: health
- Minimum: 30 minutes
- Ideal: full workout
- Anchor: scheduled block
- Days: Tuesday, Thursday, Saturday
- Difficulty: 3

Stretching
- Category: recovery
- Minimum: 5 minutes
- Ideal: 15 minutes
- Anchor: after training or before bed
- Days: Monday to Sunday
- Difficulty: 1

French
- Category: learning
- Minimum: 5 minutes
- Ideal: 20 minutes
- Anchor: after lunch
- Days: Monday to Friday
- Difficulty: 2

Illustration
- Category: creative
- Minimum: 10 minutes
- Ideal: 45 minutes
- Anchor: evening creative block
- Days: Tuesday, Thursday, Saturday
- Difficulty: 2

Networking
- Category: work
- Minimum: send one message
- Ideal: send three good messages
- Anchor: outreach block
- Days: Tuesday, Thursday
- Difficulty: 2
```

### 19.2 Default week template

```txt
Monday
- Theme: strategy and setup
- Suggested blocks:
  - 09:00-10:00 weekly planning
  - 10:30-12:00 deep work
  - 15:00-16:00 admin

Tuesday
- Theme: sales and outreach
- Suggested blocks:
  - 09:30-11:00 outreach
  - 11:30-13:00 follow-ups
  - 15:00-16:00 admin

Wednesday
- Theme: account and project work
- Suggested blocks:
  - 09:30-12:00 deep work
  - 14:30-16:00 project work

Thursday
- Theme: outreach and follow-ups
- Suggested blocks:
  - 09:30-11:00 outreach
  - 11:30-12:30 follow-ups
  - 15:00-16:00 creative or learning

Friday
- Theme: cleanup and reflection
- Suggested blocks:
  - 09:30-11:00 cleanup
  - 11:30-12:30 weekly review
  - 15:00-16:00 plan next week
```

Seed only weekdays at first.
Weekends can stay light.

---

## 20. UX direction

The interface should feel calm.

Use:

- Simple cards.
- Clear spacing.
- Few colors.
- Clear typography.
- Direct labels.
- Empty states that explain what to do.

Avoid:

- Dense tables except habit grid.
- Loud gamification.
- Too many buttons.
- Complex dashboards too early.
- Large modals for simple edits.

Core UI copy examples:

```txt
What matters today?
Next action
Move to tomorrow
Make this smaller
Plan my week
Simplify my day
Start review
Approve changes
```

---

## 21. Acceptance checks by user flow

### Flow A - First run

1. User opens app.
2. Sidebar appears.
3. Seed data exists.
4. Current week exists or can be created.
5. User sees Week page.

Pass if no manual database work is needed after seed.

### Flow B - Plan week

1. User opens Week.
2. User edits Big Rock.
3. User adds targets.
4. User adds blocks.
5. User logs habits.
6. User refreshes.
7. Data is still there.

### Flow C - Run today

1. User opens Today.
2. User sees today's blocks.
3. User sees today's habits.
4. User completes one task.
5. User logs one habit.
6. XP updates after completion.

### Flow D - Capture task

1. User types a task in quick capture.
2. Task appears in Inbox.
3. User schedules it for tomorrow.
4. Task appears on tomorrow's Today page.

### Flow E - AI suggests actions

1. User opens AI Chat.
2. User asks: "Plan my week."
3. AI returns message and action cards.
4. User approves one action.
5. Database updates.
6. User rejects one action.
7. Rejected action does not update database.

### Flow F - Weekly review

1. User opens Review.
2. User answers questions.
3. AI summarizes the week.
4. AI suggests a smaller plan for next week.
5. User approves changes.

---

## 22. Verification commands

Add these scripts to `package.json`.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:validate": "prisma validate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

After each phase, run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

After database work, run:

```bash
pnpm exec prisma validate
pnpm db:migrate
pnpm db:seed
```

Do not mark a phase done if verification fails.

---

## 23. Environment variables

Create `.env.example`.

```txt
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
AI_PROVIDER="anthropic"
AI_MODEL=""
```

Rules:

- Do not commit `.env` or `.env.local`.
- The app should still run without AI keys.
- If no AI key exists, show a clear empty state in AI Chat.

Empty state copy:

```txt
AI is not connected yet.
Add an API key in .env.local to use the coach.
The rest of the app still works.
```

---

## 24. Error handling

Use clear errors.

Examples:

```txt
Task title is required.
Could not save habit log.
AI returned an action this app does not support yet.
This action could not be applied.
```

Rules:

- Do not crash the whole page for one failed card.
- Show failed AI actions as failed.
- Keep user data safe.
- Validate all AI payloads before applying them.

---

## 25. What not to build in MVP

Do not build:

- Native mobile app.
- Google Calendar sync.
- Email access.
- Social features.
- Investor dashboard.
- Subscription system.
- Public landing page.
- Complex notifications.
- Multi-user accounts.
- OAuth login.
- Cloud sync.
- Wearable data.
- Voice capture.

These can come later.

---

## 26. Future ideas

After the MVP works:

- Google Calendar sync.
- Notion import.
- Voice capture.
- Mobile PWA.
- Push reminders.
- Wearable data.
- Energy prediction.
- Calendar auto-replanning.
- AI weekly reports.
- Habit experiments.
- Personal operating system templates.

Do not build these now.

---

## 27. Implementation assumptions

Use these assumptions unless Demian says otherwise.

1. Single user only.
2. No auth.
3. Local SQLite only.
4. Desktop-first web app.
5. Week starts on Monday.
6. Date keys use Buenos Aires local time.
7. AI actions require approval.
8. Goals are light in MVP.
9. Gamification starts simple.
10. The Week screen is built before Today because it proves the core data model.

Write any new assumption to:

```txt
docs/assumptions.md
```

---

## 28. First Claude Code task

Use this task after project setup if Claude needs a smaller first milestone.

```txt
Build Phase 1 and Phase 2 only.

Create the Next.js app, base layout, pages, Prisma schema, SQLite setup, and seed data.

Do not build the AI chat yet.
Do not build gamification yet.
Do not build auth.

When done, run:
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm exec prisma validate

Then summarize:
- Files created
- Commands run
- Any assumptions
- Any failed checks
```

---

## 29. Second Claude Code task

Use this after Phase 1 and Phase 2 pass.

```txt
Build Phase 3: Week screen.

Use the existing Prisma data.
Do not hardcode week data in React state.

The Week page must show:
- Current week dates
- Big Rock
- Weekly targets
- Days accordion
- Time blocks
- Habit week table
- Reflection

Add Server Actions for edits.
Persist all changes.

When done, run:
- pnpm lint
- pnpm typecheck
- pnpm build

Then summarize:
- Files changed
- How to test the flow manually
- Any assumptions
- Any failed checks
```

---

## 30. Third Claude Code task

Use this after the Week screen works.

```txt
Build Phase 4 and Phase 5: Today screen and Tasks.

Today must show only today's focus, blocks, tasks, habits, energy, next action, and quick capture.

Tasks must support Inbox, Today, This week, Someday, and Done.

Use Server Actions for writes.
Persist all changes.

When done, run:
- pnpm lint
- pnpm typecheck
- pnpm build

Then summarize:
- Files changed
- How to test the flow manually
- Any assumptions
- Any failed checks
```

---

## 31. Fourth Claude Code task

Use this after Today, Week, Tasks, and Habits work.

```txt
Build Phase 7: AI Chat MVP.

The AI must read app context and return structured proposed actions.
The AI must not mutate data directly.
The user must approve actions before they are applied.

Implement:
- AI provider layer
- Chat UI
- App context builder
- Zod schemas for AI output
- AiAction preview cards
- Approve, reject, and edit flow

The app must still work if no AI API key exists.

When done, run:
- pnpm lint
- pnpm typecheck
- pnpm build

Then summarize:
- Files changed
- How to test the flow manually
- Any assumptions
- Any failed checks
```

---

## 32. Final MVP definition of done

The MVP is done when Demian can:

1. Open the app in the morning.
2. See today's focus.
3. See today's blocks.
4. See today's tasks.
5. Track today's habits.
6. Capture new tasks fast.
7. Plan the week.
8. Review the week.
9. Ask AI for help.
10. Approve AI-suggested changes.
11. See simple progress.
12. Close the app knowing what to do next.
