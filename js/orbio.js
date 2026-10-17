// Everything that talks to Orbio lives here: Sign in with Orbio (OAuth 2.1 + PKCE,
// public browser app), the chat gateway and the read tools. When nobody is signed in,
// the scouts run in "pretend" mode with made-up coins so the game is still playable.

// Register a *public* app at https://www.orbio.so/developers, add this page's exact URL
// as a redirect URI, and paste the client ID here.
export const ORBIO_CLIENT_ID = "";

const SITE = "https://www.orbio.so";
const API = "https://api.orbio.so/api/v1";
const SCOPES = "openid profile balance inference tools";
// A cheap, quick model is plenty for summarising a handful of posts.
export const SCOUT_MODEL = "google/gemini-3.8-flash";

// Tokens stay in memory, as Orbio's docs recommend for browser apps. Only the PKCE
// verifier and state survive the redirect, in sessionStorage.
let session = null; // { access, refresh, expiresAt, name }
const listeners = new Set();

const redirectUri = () => location.origin + location.pathname;
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};

export const isConfigured = () => !!ORBIO_CLIENT_ID;
export const isSignedIn = () => !!session;
export const playerName = () => session?.name || null;
export const onAuthChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(isSignedIn()));

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomString = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

export async function signIn() {
  if (!isConfigured()) throw new Error("not-configured");
  const verifier = randomString();
  const state = randomString();
  store.set("orbio_verifier", verifier);
  store.set("orbio_state", state);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({
    response_type: "code",
    client_id: ORBIO_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  location.assign(`${SITE}/oauth/authorize?${q}`);
}

export function signOut() {
  const rt = session?.refresh;
  session = null;
  emit();
  if (rt) {
    fetch(`${SITE}/api/oauth/revoke`, {
      method: "POST",
      body: new URLSearchParams({ token: rt, client_id: ORBIO_CLIENT_ID }),
    }).catch(() => {});
  }
}

async function tokenRequest(params) {
  const res = await fetch(`${SITE}/api/oauth/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: ORBIO_CLIENT_ID, ...params }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const t = await res.json();
  session = {
    access: t.access_token,
    refresh: t.refresh_token,
    expiresAt: Date.now() + (t.expires_in - 60) * 1000,
    name: session?.name || null,
  };
}

// Call once on page load: finishes a sign-in if we just came back from Orbio.
export async function handleRedirect() {
  const q = new URLSearchParams(location.search);
  if (!q.has("code") && !q.has("error")) return null;
  history.replaceState(null, "", location.pathname);
  if (q.get("error")) return q.get("error") === "access_denied" ? "cancelled" : "error";

  const verifier = store.get("orbio_verifier");
  const okState = q.get("state") && q.get("state") === store.get("orbio_state");
  store.del("orbio_verifier");
  store.del("orbio_state");
  if (!verifier || !okState) return "error";

  try {
    await tokenRequest({
      grant_type: "authorization_code",
      code: q.get("code"),
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    });
    try {
      const me = await authed(`${SITE}/api/oauth/userinfo`);
      session.name = me.preferred_username || me.name || null;
    } catch {}
    emit();
    return "signed-in";
  } catch {
    return "error";
  }
}

let refreshing = null;
async function accessToken() {
  if (!session) throw new Error("signed-out");
  if (Date.now() < session.expiresAt) return session.access;
  // Refresh tokens are single use, so never refresh twice at once.
  refreshing ||= tokenRequest({ grant_type: "refresh_token", refresh_token: session.refresh })
    .catch((e) => { session = null; emit(); throw e; })
    .finally(() => { refreshing = null; });
  await refreshing;
  return session.access;
}

async function authed(url, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { session = null; emit(); throw new Error("signed-out"); }
  if (res.status === 402) throw new Error("no-balance");
  if (!res.ok) throw new Error(`orbio ${res.status}`);
  return res.json();
}

export async function balance() {
  const r = await authed(`${API}/key`);
  const d = r.data || r;
  const n = d.balance ?? d.limit_remaining ?? d.available ?? null;
  return n == null ? null : +n;
}

async function tool(name, args) {
  const r = await authed(`${API}/tools/${name}`, args);
  return { result: r.result, cost: +(r.cost?.credit || 0) };
}

async function chatJSON(system, user) {
  const r = await authed(`${API}/chat/completions`, {
    model: SCOUT_MODEL,
    max_tokens: 500,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const text = r.choices?.[0]?.message?.content || "";
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("bad-json");
  return { data: JSON.parse(json[0]), cost: +(r.usage?.cost || 0) };
}

// ---------- shared helpers ----------

export const clean = (t) => String(t).replace(/^\$/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();

// The scout robots (js/agents.js) drive these directly.
export { tool };
export async function chat(body) {
  return authed(`${API}/chat/completions`, { model: SCOUT_MODEL, ...body });
}

// Fishing: which meme coins are people buzzing about right now? Returns a pond's worth.
export async function scoutPond() {
  if (!isSignedIn()) return { fish: pretendPond(), cost: 0, real: false };
  const x = await tool("social.x.posts", { query: `(memecoin OR "meme coin") min_faves:100 -filter:replies`, sort: "Top", limit: 40, max_cost: "0.012" });
  const posts = (x.result?.tweets || []).map((t) => `${t.favorite_count} likes: ${t.full_text}`.slice(0, 240));
  const ai = await chatJSON(
    `You read X posts about meme coins and list the coins being talked about. Observe only, no advice. Reply with JSON only:
{"fish":[{"ticker":"ABC","hype":0-100,"blurb":"one short playful sentence about the buzz"}]} — at most 8 coins, real tickers that appear in the posts.`,
    posts.join("\n") || "(no posts)");
  const fish = (ai.data.fish || []).filter((f) => f.ticker).map((f) => ({ ...f, ticker: clean(f.ticker), real: true }));
  return { fish, cost: x.cost + ai.cost, real: true };
}

// ---------- pretend mode ----------

const PRETEND = [
  ["SNAIL", "Slow, steady, and somehow up 400% this week."], ["TURNIP", "Farmers keep posting turnip memes at 3am."],
  ["MOOCOW", "A cow account with suspiciously many new followers."], ["BLOOP", "Everyone's quoting the same fish gif."],
  ["HONK", "A goose took over three group chats."], ["PEBBL", "Small, round, and very much a rock."],
  ["GLOWWORM", "Only trends after midnight."], ["CORNDOG", "Food coin season returns."],
  ["MUSHI", "Cozy mushroom art, cozy vibes, cozy anonymous dev."], ["RUGRAT", "The name is a hint."],
];
export const seeded = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function pretendPond() {
  return PRETEND.map(([ticker, blurb]) => ({ ticker, blurb, hype: seeded(ticker) % 101, real: false }))
    .sort(() => Math.random() - 0.5).slice(0, 6);
}
