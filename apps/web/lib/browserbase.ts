// thin REST wrapper over Browserbase (session lifecycle only; navigation + key
// dispatch are over CDP). server-only — never expose the api key or connectUrl.

const API = "https://api.browserbase.com/v1";

const apiKey = () => {
  const k = process.env.BROWSERBASE_API_KEY;
  if (!k) throw new Error("BROWSERBASE_API_KEY is not set");
  return k;
};

const projectId = () => {
  const p = process.env.BROWSERBASE_PROJECT_ID;
  if (!p) throw new Error("BROWSERBASE_PROJECT_ID is not set");
  return p;
};

const headers = () => ({
  "X-BB-API-Key": apiKey(),
  "Content-Type": "application/json",
});

export type Session = { id: string };

// reconstructable CDP endpoint for a session (apiKey + sessionId), so routes that
// only hold the sessionId can reconnect after a cold start.
export const connectUrlFor = (sessionId: string) =>
  `wss://connect.browserbase.com?apiKey=${apiKey()}&sessionId=${sessionId}`;

// create a keepAlive session (survives our CDP disconnect after navigation) with
// a hard timeout backstop so a closed tab can't leak a paid browser.
export async function createSession(timeoutSeconds = 600): Promise<Session> {
  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      projectId: projectId(),
      keepAlive: true,
      timeout: timeoutSeconds,
      browserSettings: { viewport: { width: 600, height: 600 } },
    }),
  });
  if (!res.ok) throw new Error(`createSession ${res.status}: ${await res.text()}`);
  const s = await res.json();
  return { id: s.id };
}

// fullscreen live-view url for the active tab; read/write, embeddable cross-origin.
// navbar=false drops Browserbase's top nav bar — our glasses chrome is the context.
export async function liveViewUrl(sessionId: string): Promise<string> {
  const res = await fetch(`${API}/sessions/${sessionId}/debug`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`liveView ${res.status}: ${await res.text()}`);
  const d = await res.json();
  const raw = d.pages?.[0]?.debuggerFullscreenUrl ?? d.debuggerFullscreenUrl;
  if (!raw) throw new Error("no live view url");
  const u = new URL(raw);
  u.searchParams.set("navbar", "false");
  return u.toString();
}

export async function releaseSession(sessionId: string): Promise<void> {
  await fetch(`${API}/sessions/${sessionId}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ projectId: projectId(), status: "REQUEST_RELEASE" }),
  });
}
