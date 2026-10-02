// Runs a real scout robot (js/agents.js) against a simulated Orbio: signs in through the
// OAuth redirect, then answers chat completions with scripted tool calls and checks the
// robot calls the right Orbio tools, respects its step limit and returns a report.
//   node tests/agent-loop.test.mjs
import assert from "node:assert/strict";

const store = new Map();
globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.location = { origin: "https://valley.example", pathname: "/", search: "", assign: () => {} };
globalThis.history = { replaceState: () => {} };

const calls = [];
let chatTurn = 0;
let script = [];
globalThis.fetch = async (url, opts = {}) => {
  const body = opts.body && typeof opts.body === "string" && opts.body.startsWith("{") ? JSON.parse(opts.body) : opts.body;
  calls.push({ url: String(url), body });
  const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
  if (String(url).endsWith("/api/oauth/token")) return json({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
  if (String(url).endsWith("/api/oauth/userinfo")) return json({ preferred_username: "tester" });
  if (String(url).includes("/tools/social.x.posts")) return json({ result: { tweets: [{ user: { screen_name: "whale", followers_count: 90000 }, favorite_count: 900, full_text: `$TEST to the moon, CA 0x${"a".repeat(40)}` }] }, cost: { credit: "0.0033" } });
  if (String(url).includes("/tools/web.search")) return json({ result: { results: [{ title: "TEST coin", url: "https://test.example", description: "A frog coin" }] }, cost: { credit: "0.0066" } });
  if (String(url).includes("/tools/chain.read")) return json({ result: { name: "Test", symbol: "TEST", decimals: 18 }, cost: { credit: "0.00002" } });
  if (String(url).includes("/chat/completions")) {
    const turn = script[chatTurn++] || { content: "{}" };
    return json({ choices: [{ message: turn }], usage: { cost: 0.0004 } });
  }
  return json({}, 404);
};

const Orbio = await import("../js/orbio.js");
const Agents = await import("../js/agents.js");

// Sign in through the redirect (needs a client ID, so fake one being configured).
sessionStorage.setItem("orbio_verifier", "v"); sessionStorage.setItem("orbio_state", "s");
location.search = "?code=c&state=s";
// ORBIO_CLIENT_ID is a const; the redirect handler doesn't check it, so this signs in.
assert.equal(await Orbio.handleRedirect(), "signed-in");
assert.ok(Orbio.isSignedIn());

const toolCall = (id, name, args) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });

// 1. A Deep Root Daikon follows a lead: X → finds a contract → checks the chain → reports.
script = [
  { content: "Let me see what X says.", tool_calls: [toolCall("1", "x_search", { query: "$TEST" })] },
  { content: "", tool_calls: [toolCall("2", "chain_lookup", { kind: "token_info", address: `0x${"a".repeat(40)}`, network: "base" })] },
  { content: '{"vibe":"warm","hype":64,"summary":"A whale is pushing it.","flags":["one big account"],"sources":["@whale"]}' },
];
chatTurn = 0; calls.length = 0;
const steps = [];
const r1 = await Agents.runScout("deep", "$test", (s) => steps.push(s));
assert.equal(r1.ticker, "TEST");
assert.equal(r1.vibe, "warm");
assert.equal(r1.hype, 64);
assert.equal(r1.steps, 2);
assert.deepEqual(r1.trail.map((t) => t.tool), ["x_search", "chain_lookup"]);
assert.ok(steps.some((s) => s.status === "think"));
assert.ok(calls.some((c) => c.url.includes("/tools/chain.read") && c.body.method === "alchemy_getTokenMetadata" && c.body.network === "base"));
const firstChat = calls.find((c) => c.url.includes("/chat/completions")).body;
assert.deepEqual(firstChat.tools.map((t) => t.function.name), ["x_search", "web_search", "read_page", "chain_lookup"]);
assert.ok(r1.cost > 0.003, `cost tracked: ${r1.cost}`);
console.log("✓ deep root daikon follows a lead and reports", r1.trail.map((t) => `${t.verb} ${t.label}`));

// 2. A Chatter Carrot only has the X tool: asking for another tool is refused, and the
//    robot is cut off at its 3-step limit and asked for the report.
script = [
  { content: "", tool_calls: [toolCall("1", "web_search", { query: "TEST" })] },
  { content: "", tool_calls: [toolCall("2", "x_search", { query: "$TEST" })] },
  { content: "", tool_calls: [toolCall("3", "x_search", { query: "$TEST rug" })] },
  { content: "", tool_calls: [toolCall("4", "x_search", { query: "$TEST scam" })] },
  { content: "", tool_calls: [toolCall("5", "x_search", { query: "$TEST more" })] },
  { content: '{"vibe":"sus","hype":20,"summary":"Mostly bots.","flags":["new accounts"]}' },
];
chatTurn = 0; calls.length = 0;
const r2 = await Agents.runScout("chatter", "TEST");
assert.equal(r2.vibe, "sus");
assert.equal(r2.steps, 3, "stops at the step limit");
assert.ok(!calls.some((c) => c.url.includes("/tools/web.search")), "never calls a tool outside its toolbox");
const lastChat = calls.filter((c) => c.url.includes("/chat/completions")).at(-1).body;
assert.equal(lastChat.tool_choice, "none", "final turn forces a written report");
console.log("✓ chatter carrot stays in its toolbox and stops at 3 steps");

// 3. A robot that answers in prose gets one nudge to write JSON.
script = [{ content: "It seems fine I guess." }, { content: '{"vibe":"meh","hype":10,"summary":"Quiet.","flags":[]}' }];
chatTurn = 0;
const r3 = await Agents.runScout("rumor", "TEST");
assert.equal(r3.vibe, "meh");
console.log("✓ a rambling robot is nudged into writing its report");

// 4. Pretend mode (signed out) acts out steps with made-up data.
Orbio.signOut();
const pSteps = [];
const r4 = await Agents.runScout("rumor", "SNAIL", (s) => pSteps.push(s));
assert.equal(r4.real, false);
assert.ok(r4.trail.length >= 2 && pSteps.filter((s) => s.status === "done").length === r4.trail.length);
console.log("✓ pretend mode acts out", r4.trail.length, "steps");
console.log("all agent tests passed");
