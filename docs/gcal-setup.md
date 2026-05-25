# Google Calendar Setup

Phase 1.4 ships two layers:

1. **Read-only iframe embed** on `/home` (works without OAuth — just paste an embed URL).
2. **Two-way sync scaffold** under `src/lib/gcal/` (inert until you provide OAuth credentials).

## Layer 1 — iframe embed (no setup beyond a URL)

1. Open [Google Calendar](https://calendar.google.com/).
2. Settings → your calendar → **Integrate calendar**.
3. Copy the **Embed code** URL (looks like `https://calendar.google.com/calendar/embed?src=...`).
4. In Life OS, go to `/settings` → **Google Calendar** section → paste the URL → Save.

The week strip will appear on `/home`. This is read-only — to schedule events from the AI drawer (Phase 1.5) you need Layer 2.

## Layer 2 — two-way OAuth sync (optional)

This requires a Google Cloud project. You only need to do this once.

### Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. APIs & Services → **OAuth consent screen**: choose **External**, fill basic app info, add your email as a test user.
4. APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**.
5. Authorized redirect URIs: add `http://localhost:3000/api/v1/gcal/callback` (and your production URL if relevant).
6. Save the **Client ID** and **Client secret**.
7. APIs & Services → **Library** → enable **Google Calendar API**.

### Add env vars

Create or edit `.env.local` at the project root:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
# optional override (defaults to http://localhost:3000/api/v1/gcal/callback)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/gcal/callback
```

Restart the dev server.

### Authorize once

The `/api/v1/gcal/callback` route handler that exchanges the OAuth code for tokens is **shipped in Phase 1.5** alongside the AI drawer's `scheduleEvent` tool. Phase 1.4 has the helpers (`buildAuthorizationUrl`, `exchangeCodeForTokens` in `src/lib/gcal/oauth.ts`) but not the route handler itself.

When Phase 1.5 lands, the flow will be:
1. `/settings` → **Google Calendar** → click **Connect** → opens consent screen
2. Approve → redirected back, tokens stored in `IntegrationCredential` (provider="google_calendar")
3. AI drawer's `scheduleEvent` tool now works

## What runs without credentials

- The iframe embed (Layer 1)
- `checkGcalConnection(userId)` returns `{ connected: false, reason: "no_env" | "no_credential" }` — safe to call
- `createGcalEvent` throws a clear error if not connected — wrap it in the AI's tool with an approval card that catches the error

## What's deferred to Phase 2

- Polling cron strategy (see `src/lib/gcal/sync.ts` `pollInboundChanges` — function exists, no scheduler yet)
- Token refresh (when `expiresAt` passes, currently returns `connected: false, reason: "expired"`)
- Encryption-at-rest for `IntegrationCredential.accessToken` (plaintext in dev; encrypt before production)
- Outlook / Apple Calendar adapters
