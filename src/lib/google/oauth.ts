// =============================================================================
// Google OAuth for the Business Profile API. Server-only.
//
// Standard authorization-code flow with offline access (so we get a refresh
// token). Requires the "Business Profile" scope and the Business Profile APIs
// enabled in the Google Cloud project.
// =============================================================================

export const GOOGLE_OAUTH = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userinfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  scope: "https://www.googleapis.com/auth/business.manage",
} as const;

export interface GoogleOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export function googleOAuthConfig(): GoogleOAuthConfig {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
}

export function googleOAuthConfigured(): boolean {
  const c = googleOAuthConfig();
  return Boolean(c.clientId && c.clientSecret && c.redirectUri);
}

/** Build the consent-screen URL. */
export function googleAuthUrl(state: string): string {
  const c = googleOAuthConfig();
  const params = new URLSearchParams({
    client_id: c.clientId ?? "",
    redirect_uri: c.redirectUri ?? "",
    response_type: "code",
    scope: GOOGLE_OAUTH.scope,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_OAUTH.authUrl}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_OAUTH.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `Google token request failed (${res.status})`);
  }
  return json;
}

/** Exchange an authorization code for tokens. */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const c = googleOAuthConfig();
  return tokenRequest({
    code,
    client_id: c.clientId ?? "",
    client_secret: c.clientSecret ?? "",
    redirect_uri: c.redirectUri ?? "",
    grant_type: "authorization_code",
  });
}

/** Get a fresh access token from a refresh token. */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const c = googleOAuthConfig();
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: c.clientId ?? "",
    client_secret: c.clientSecret ?? "",
    grant_type: "refresh_token",
  });
}

/** Look up the connected Google account's email (for display). */
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_OAUTH.userinfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}
