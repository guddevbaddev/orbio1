// Launchpad directory and launch kit, against the saved snapshot.
//   node tests/launchpad.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";

const snapshot = fs.readFileSync(new URL("../assets/launchpad.json", import.meta.url), "utf8");
// The live API refuses cross-site browser reads, so the module falls back to the snapshot.
globalThis.fetch = async (url) => {
  if (String(url).startsWith("https://")) throw new TypeError("Failed to fetch (CORS)");
  return { ok: true, json: async () => JSON.parse(snapshot) };
};
const L = await import("../js/launchpad.js");

const d = await L.loadDirectory();
assert.equal(d.source, "snapshot");
assert.ok(d.agents.length > 100, `${d.agents.length} agents`);
assert.ok(d.agents.every((a) => !a.logo || a.logo.startsWith("https://")), "logo prefixes are expanded");
assert.equal(await L.tryLive(), null, "live read blocked: keep the snapshot");
assert.equal((await L.loadDirectory()).source, "snapshot");
console.log(`✓ snapshot loads: ${d.agents.length} agents from ${d.fetchedAt}`);

const top = L.list(d, { sort: "cap", limit: 3 });
assert.ok(Number(top[0].marketCapMicroUsd) >= Number(top[1].marketCapMicroUsd));
const newest = L.list(d, { sort: "newest", limit: 2 });
assert.ok(newest[0].launchedAt >= newest[1].launchedAt);
assert.equal(L.find(d, top[0].id).token, top[0].token);
assert.equal(L.find(d, top[0].token.toUpperCase()).id, top[0].id, "token lookup ignores case");
assert.equal(L.find(d, "not-an-agent"), null);
assert.ok(L.list(d, { q: `$${top[0].symbol}` }).some((a) => a.id === top[0].id), "search by $SYMBOL");
console.log("✓ sort, search and lookup:", top.map((a) => `${a.name} ${L.usd(a.marketCapMicroUsd)}`).join(", "));

assert.equal(L.usd(null), "–");
assert.equal(L.usd("817629191348"), "$817.6k");
assert.equal(L.usd("1500000"), "$1.50");
assert.equal(L.orbioUsd("1000000000000000000", "90000"), "$0.090");
assert.equal(L.eth("500000000000000"), "0.0005 ETH");
console.log("✓ number formatting (null shows a dash)");

const kit = L.launchKit({ name: "Valley Scout", symbol: "SCOUT", seedKind: "deep" });
assert.equal(kit.token.symbol, "SCOUT");
assert.deepEqual(kit.agent.orbioTools, ["social.x.posts", "web.search", "web.scrape", "chain.read"]);
assert.equal(kit.agent.maxSteps, 7);
assert.match(kit.agent.instructions, /only observe/);
assert.match(kit.howTo[0], /launchpad\/launch/);
console.log("✓ launch kit for a Deep Root Daikon");
console.log("all launchpad tests passed");
