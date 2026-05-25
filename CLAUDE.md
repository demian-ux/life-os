# CLAUDE.md

@AGENTS.md

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

## Reference
Full spec lives at `docs/life-os-spec.md`. Assumptions tracked in `docs/assumptions.md`.
