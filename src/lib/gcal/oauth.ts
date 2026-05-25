/**
 * Google OAuth helper scaffold (Phase 1.4 — inert until credentials wired).
 *
 * The full OAuth flow needs:
 * - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars
 * - A redirect URI registered in Google Cloud Console (e.g. http://localhost:3000/api/v1/gcal/callback)
 * - A Next.js route handler that exchanges the code for tokens and stores them in IntegrationCredential
 *
 * Phase 1.4 ships only the URL builder + a token-exchange utility. The route
 * handler itself lands in Phase 1.5 alongside the AI drawer's scheduleEvent tool.
 */

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
};

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export function getOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/v1/gcal/callback";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizationUrl(state?: string): string | null {
  const config = getOAuthConfig();
  if (!config) return null;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<GoogleTokenResponse> {
  const config = getOAuthConfig();
  if (!config) throw new Error("Google OAuth not configured");
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}
