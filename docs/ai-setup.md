# AI Drawer Setup

Phase 1.5 ships the AI co-pilot drawer on `/home`. It reuses the same chat infrastructure as the standalone `/ai` route — same Server Actions, same conversation/message tables, same proposed-action approval pattern.

## What works out of the box

Once you set the API key (below), the drawer:
- Loads your most recent conversation
- Shows quick-prompt chips ("What should I focus on?", "Plan my day", etc.)
- Lets you send messages
- Surfaces any proposed actions the AI generated, with Approve/Edit/Cancel

Per project rule: **the AI never mutates data directly.** Every tool call lands as a "proposed action" card; user approval triggers the actual write.

## Setup

### Anthropic (default)

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/).
2. Create or edit `.env.local` at the project root:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   AI_PROVIDER=anthropic
   AI_MODEL=claude-sonnet-4-6
   ```
3. Restart the dev server.
4. Visit `/home`, click the topbar AI icon. The drawer slides in with chat ready.

### Model routing

Spec §8 calls for `claude-sonnet-4-6` for general chat and `claude-opus-4-7` for planning-heavy requests (auto-detected from message intent). Phase 1.5 uses whatever model is set in `AI_MODEL` for all turns. The intent-based routing is a follow-up — `src/lib/ai/providers.ts` is the place to add it.

### OpenAI

The provider switcher in `/settings` shows OpenAI as an option, but the implementation is not shipped (`getProviderName` returns it; `isAiConfigured` blocks it). Keep using Anthropic for now.

### Tool calls + Google Calendar

If you want the AI's `scheduleEvent` tool to actually write to your calendar, complete the OAuth setup in [gcal-setup.md](gcal-setup.md). Without OAuth, the AI can still **propose** a `scheduleEvent` action, but applying it will fail with "Google Calendar not connected" until tokens exist.

## Privacy

Per spec §8: nothing leaves the machine except the Anthropic API call. No app-level logging beyond Anthropic's standard data retention.

## Drawer state

The drawer remembers open/closed within the browser session via `sessionStorage`. Closing the tab resets it. This matches spec §8 "remembers last state per session."
