// Orbio's agent launchpad (live on Robinhood Chain): the directory of launched agents,
// formatting for their numbers, and the "graduate a robot" launch kit.
//
// Orbio Valley only reads public data and links out. Launching an agent is done on
// orbio.so with the player's own wallet; nothing here signs, buys or sells anything.

import * as Agents from "./agents.js";
import { SCOUT_MODEL } from "./orbio.js";

const LIVE = "https://www.orbio.so/api/protocol/agents";
const SNAPSHOT = "assets/launchpad.json";
export const LAUNCH_URL = "https://www.orbio.so/launchpad/launch";
export const LAUNCHPAD_URL = "https://www.orbio.so/launchpad";
export const DEVELOPER_URL = "https://www.orbio.so/launchpad/developer";

let dir = null; // { agents, source: "live" | "snapshot", fetchedAt, terms, totals, orbioMicroUsd }

// The snapshot (saved by tools/fetch-launchpad.mjs) loads first so the game never waits.
// The live API doesn't allow cross-site browser reads today; tryLive() checks anyway, in
// the background, and returns fresher data if that ever changes.
export async function loadDirectory() {
  if (dir) return dir;
  try {
    const res = await fetch(SNAPSHOT, { cache: "no-cache" });
    const d = await res.json();
    dir = { source: "snapshot", ...d, agents: d.agents.map((a) => ({ ...a, logo: a.logo?.startsWith("~") ? d.logoPrefix + a.logo.slice(1) : a.logo })) };
  } catch {
    dir = { source: "none", agents: [], totals: {}, terms: {} };
  }
  return dir;
}

export async function tryLive(timeoutMs = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${LIVE}?limit=200&sort=cap`, { cache: "no-cache", signal: ctrl.signal });
    if (!res.ok) return null;
    const d = await res.json();
    dir = { ...(dir || {}), source: "live", fetchedAt: new Date().toISOString(), orbioMicroUsd: d.orbioMicroUsd, totals: { agents: d.page?.total, marketCapMicroUsd: d.totals?.marketCapMicroUsd }, agents: d.data.map(fromLive) };
    return dir;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const fromLive = (a) => ({
  id: a.agentId, token: a.token, name: a.name, symbol: a.symbol, logo: a.logo, launchedAt: +a.launchedAt || null,
  priceMicroUsd: a.price?.priceMicroUsd ?? null, marketCapMicroUsd: a.price?.marketCapMicroUsd ?? null,
  graduated: !!a.price?.graduated, progressBps: a.curve?.progressBps ?? null,
  stakedWei: a.stake?.stakedWei ?? null, feesWei: a.stake?.claimedFeesWei ?? null, usdgAtoms: a.converted?.usdgAtoms ?? null,
  creditClaimedAtoms: a.credit?.claimedAtoms ?? null, description: String(a.description || "").replace(/\s+/g, " ").trim().slice(0, 180),
  website: a.socials?.website || null, twitter: a.socials?.twitter || null, explorer: a.links?.token || null,
});

// Look an agent up by its ID ("106") or token address.
export function find(d, key) {
  const k = String(key || "").trim().toLowerCase().replace(/^#/, "");
  if (!k) return null;
  return d.agents.find((a) => String(a.id) === k || a.token?.toLowerCase() === k) || null;
}

export function list(d, { sort = "cap", q = "", limit = 30 } = {}) {
  const query = q.trim().toLowerCase().replace(/^\$/, "");
  let rows = d.agents.filter((a) => !query || `${a.name} ${a.symbol} ${a.token}`.toLowerCase().includes(query));
  rows = sort === "newest" ? [...rows].sort((a, b) => (b.launchedAt || 0) - (a.launchedAt || 0)) : [...rows].sort((a, b) => num(b.marketCapMicroUsd) - num(a.marketCapMicroUsd));
  return rows.slice(0, limit);
}

// ---------------------------------------------------------------- formatting
// The API uses null for "unavailable"; show a dash, never zero.

const num = (v) => (v == null ? -1 : Number(v));
export function usd(microUsd) {
  if (microUsd == null) return "–";
  const v = Number(microUsd) / 1e6;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toPrecision(2)}`;
}
// ORBIO amounts (18 decimals) in dollars, at the snapshot's ORBIO price.
export function orbioUsd(wei, orbioMicroUsd) {
  if (wei == null || orbioMicroUsd == null) return "–";
  return usd((Number(BigInt(wei) / 10n ** 12n) / 1e6) * Number(orbioMicroUsd));
}
export const eth = (wei) => (wei == null ? "–" : `${Number(BigInt(wei)) / 1e18} ETH`);
export function age(launchedAt) {
  if (!launchedAt) return "–";
  const days = Math.floor((Date.now() / 1000 - launchedAt) / 86400);
  return days < 1 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

// ---------------------------------------------------------------- the launch kit

// Everything a player needs to turn one of their scout robots into a launchpad agent:
// the token details for Orbio's launch form, and the robot's job (instructions, tools,
// limits) to run with the agent's own gateway key.
export function launchKit({ name, symbol, seedKind, farmName }) {
  const seed = Agents.SEEDS[seedKind];
  const TOOL_IDS = { x_search: "social.x.posts", web_search: "web.search", read_page: "web.scrape", chain_lookup: "chain.read" };
  return {
    token: {
      name, symbol,
      description: `A ${seed.name} scout robot from ${farmName || "Orbio Valley"}. It reads ${seed.tools.map((t) => ({ x_search: "X", web_search: "the web", read_page: "web pages", chain_lookup: "on-chain data" }[t])).join(", ")} about meme coins and writes cautious, observe-only reports. Built on @orbiodotso.`,
    },
    agent: {
      kind: seed.name,
      model: SCOUT_MODEL,
      orbioTools: seed.tools.map((t) => TOOL_IDS[t]),
      maxSteps: seed.maxSteps,
      budgetCreditPerReport: seed.budget,
      instructions: `You are a scout robot investigating meme coins. You are cautious and you only observe: never tell anyone to buy, sell or hold. Use your tools to read what people and the web say, follow up on important leads (contract addresses, big accounts pushing a coin, rug or scam claims), notice red flags, then write a short report with a vibe (hot/warm/meh/sus), a hype score 0-100, a summary, red flags and sources.`,
    },
    howTo: [
      `Open ${LAUNCH_URL}, connect a wallet on Robinhood Chain and fill in the token name, symbol and description above. The launch fee and gas are paid in ETH and shown by your wallet before you sign.`,
      "Pick the agent wallet carefully: it signs for the agent and receives its earnings.",
      `Run the agent with its own gateway key on a server (not in a browser): ${DEVELOPER_URL}. The instructions, tools and limits above are the same ones your robot uses in Orbio Valley (js/agents.js).`,
      "Back in Orbio Valley, link the agent at the Launchpad Tower with its agent ID or token address to see it in your town.",
    ],
  };
}
