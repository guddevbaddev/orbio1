#!/usr/bin/env node
// Saves a snapshot of Orbio's agent launchpad to assets/launchpad.json.
// The launchpad's public API doesn't allow browser requests from other sites, so the
// game reads this file (it still tries the live API first, in case that changes).
//   node tools/fetch-launchpad.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://www.orbio.so/api/protocol/agents";

async function getJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    // Node's fetch ignores HTTPS_PROXY; curl doesn't.
    return JSON.parse(execFileSync("curl", ["-sSfL", "--retry", "3", url], { maxBuffer: 64 << 20 }).toString());
  }
}

// Most logos live under one storage prefix; store it once.
const LOGO_PREFIX = "https://ungjdxribocbyrxvogqh.supabase.co/storage/v1/object/public/agent-images/";
const slim = (a) => ({
  id: a.agentId, token: a.token, name: a.name, symbol: a.symbol,
  logo: a.logo?.startsWith(LOGO_PREFIX) ? `~${a.logo.slice(LOGO_PREFIX.length)}` : a.logo || null,
  launchedAt: +a.launchedAt || null,
  priceMicroUsd: a.price?.priceMicroUsd ?? null, marketCapMicroUsd: a.price?.marketCapMicroUsd ?? null,
  graduated: !!(a.price?.graduated ?? a.curve?.graduated), progressBps: a.curve?.progressBps ?? null,
  stakedWei: a.stake?.stakedWei ?? null, feesWei: a.stake?.claimedFeesWei ?? null,
  usdgAtoms: a.converted?.usdgAtoms ?? null, creditClaimedAtoms: a.credit?.claimedAtoms ?? null,
  description: String(a.description || "").replace(/\s+/g, " ").trim().slice(0, 180),
  website: a.socials?.website || null, twitter: a.socials?.twitter || null, explorer: a.links?.token || null,
});

const first = await getJSON(`${API}?limit=200&offset=0&sort=cap`);
const agents = [...first.data];
for (let offset = 200; offset < first.page.total; offset += 200) agents.push(...(await getJSON(`${API}?limit=200&offset=${offset}&sort=cap`)).data);
const terms = await getJSON(`${API}/terms`);

const out = {
  fetchedAt: new Date().toISOString(),
  logoPrefix: LOGO_PREFIX,
  chainId: first.chainId,
  orbioMicroUsd: first.orbioMicroUsd,
  totals: { agents: first.page.total, marketCapMicroUsd: first.totals?.marketCapMicroUsd ?? null },
  terms: { launchFeeWei: terms.launchFeeWei, paused: terms.paused, nextAgentId: terms.nextAgentId },
  agents: agents.map(slim),
};
fs.writeFileSync(path.join(root, "assets/launchpad.json"), JSON.stringify(out));
console.log(`assets/launchpad.json: ${out.agents.length} agents, ${(fs.statSync(path.join(root, "assets/launchpad.json")).size / 1024).toFixed(0)} KB`);
