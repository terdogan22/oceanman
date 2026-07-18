import { createSign } from "node:crypto";

const calendarScope = "https://www.googleapis.com/auth/calendar";
let tokenCache: { value: string; expiresAt: number } | null = null;

export class GoogleCalendarError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

type EventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

function credentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  return { email, privateKey: rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n") };
}

export function googleCalendarConfigured() {
  return Boolean(credentials());
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const account = credentials();
  if (!account) throw new Error("Google hizmet hesabı yapılandırılmadı.");

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.email,
    scope: calendarScope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.privateKey).toString("base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new GoogleCalendarError(data.error_description || "Google erişim anahtarı alınamadı.", response.status);
  }

  tokenCache = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

async function googleRequest<T>(url: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new GoogleCalendarError(message || "Google Calendar isteği başarısız.", response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createGoogleEvent(calendarId: string, event: object) {
  return googleRequest<GoogleCalendarEvent>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(event) },
  );
}

export async function deleteGoogleEvent(calendarId: string, eventId: string) {
  await googleRequest<void>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

export async function listGoogleEvents(calendarId: string, syncToken?: string | null) {
  const items: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "2500" });
    if (syncToken) params.set("syncToken", syncToken);
    else params.set("timeMin", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (pageToken) params.set("pageToken", pageToken);

    const page = await googleRequest<EventsResponse>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    );
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { items, nextSyncToken };
}

export async function watchGoogleCalendar(calendarId: string, address: string, channelToken: string) {
  const channelId = crypto.randomUUID();
  const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000;
  return googleRequest<{ id: string; resourceId: string; expiration?: string }>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      body: JSON.stringify({ id: channelId, type: "web_hook", address, token: channelToken, expiration }),
    },
  );
}
