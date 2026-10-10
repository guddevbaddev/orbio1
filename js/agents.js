// Scout robots that pick their own steps. Each seed gives its robot a toolbox (Orbio's
// X, web and chain read tools), a step limit and a spending cap. The robot is an AI model
// on Orbio's gateway running a tool-calling loop: it decides what to read next, reads it,
// and when it has seen enough writes a report. Every step is streamed back to the game
// so the robot can show what it's doing. Robots only look; nothing here can trade.

import * as Orbio from "./orbio.js";

// ---------------------------------------------------------------- tools

// What the model sees (name, description, parameters) and how each maps to an Orbio tool.
const TOOLS = {
  x_search: {
    icon: "x", verb: "Reading X",
    spec: {
      description: "Search posts on X (Twitter). Use X search syntax, e.g. '$PEPE', '$PEPE rug', 'from:handle', '$PEPE min_faves:50'. Returns up to 15 top posts with likes and follower counts.",
      parameters: { type: "object", properties: { query: { type: "string", description: "X search query" } }, required: ["query"] },
    },
    cap: 0.005,
    run: (a) => Orbio.tool("social.x.posts", { query: `${a.query} -filter:replies`, sort: "Top", limit: 15, max_cost: "0.005" }),
    digest: (r) => {
      const posts = (r?.tweets || []).map((t) => `@${t.user?.screen_name} (${t.user?.followers_count ?? "?"} followers, ${t.favorite_count ?? 0} likes, ${String(t.tweet_created_at || "").slice(0, 10)}): ${t.full_text}`.slice(0, 260));
      return { text: posts.join("\n") || "No posts found.", note: `${posts.length} posts` };
    },
    label: (a) => `"${a.query}"`,
  },
  web_search: {
    icon: "web", verb: "Searching the web",
    spec: {
      description: "Search the web. Returns titles, URLs and snippets of up to 6 results.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
    cap: 0.007,
    run: (a) => Orbio.tool("web.search", { query: a.query, limit: 6, max_cost: "0.007" }),
    digest: (r) => {
      const hits = (r?.results || []).map((h) => `${h.title} — ${h.description || ""} (${h.url})`.slice(0, 300));
      return { text: hits.join("\n") || "No results.", note: `${hits.length} results` };
    },
    label: (a) => `"${a.query}"`,
  },
  read_page: {
    icon: "page", verb: "Reading a page",
    spec: {
      description: "Read one web page (e.g. a project site, an article, a token page on a block explorer) as text. Use URLs you found in search results.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
    cap: 0.002,
    run: (a) => Orbio.tool("web.scrape", { url: a.url, max_cost: "0.002" }),
    digest: (r) => {
      const md = String(r?.markdown || r?.content || "").replace(/\n{3,}/g, "\n\n");
      return { text: md.slice(0, 3500) || "The page was empty.", note: md ? `${Math.round(md.length / 100) / 10}k chars` : "empty" };
    },
    label: (a) => { try { return new URL(a.url).hostname; } catch { return a.url; } },
  },
  chain_lookup: {
    icon: "chain", verb: "Checking the chain",
    spec: {
      description: "Look up an EVM token contract on-chain (only if you found its 0x contract address). 'token_info' returns name, symbol, decimals; 'recent_transfers' returns the latest transfers, useful to spot whales or a few wallets moving most of the supply. Solana and other non-EVM coins aren't supported.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["token_info", "recent_transfers"] },
          address: { type: "string", description: "0x… token contract address" },
          network: { type: "string", enum: ["ethereum", "base", "arbitrum", "optimism", "bnb", "robinhood"] },
        },
        required: ["kind", "address", "network"],
      },
    },
    cap: 0.002,
    run: (a) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(a.address || "")) return Promise.resolve({ result: { error: "That isn't a 0x contract address." }, cost: 0 });
      return a.kind === "recent_transfers"
        ? Orbio.tool("chain.read", { method: "alchemy_getAssetTransfers", network: a.network, max_cost: "0.002", params: [{ contractAddresses: [a.address], category: ["erc20"], order: "desc", maxCount: "0x14", withMetadata: true }] })
        : Orbio.tool("chain.read", { method: "alchemy_getTokenMetadata", network: a.network, max_cost: "0.002", params: [a.address] });
    },
    digest: (r) => ({ text: JSON.stringify(r).slice(0, 2500), note: "on-chain data" }),
    label: (a) => `${a.kind === "recent_transfers" ? "transfers" : "token"} on ${a.network}`,
  },
};

// ---------------------------------------------------------------- seeds

// Each seed is a kind of scout. More tools, steps and budget = a more thorough robot.
export const SEEDS = {
  chatter: {
    name: "Chatter Carrot", blurb: "Digs through X: what people say, who's saying it, and if it smells like a shill.",
    tools: ["x_search"], maxSteps: 3, budget: 0.02, growMs: 25_000,
  },
  rumor: {
    name: "Rumor Radish", blurb: "Searches the web and reads the pages it finds: news, project sites, warnings.",
    tools: ["web_search", "read_page"], maxSteps: 4, budget: 0.025, growMs: 30_000,
  },
  deep: {
    name: "Deep Root Daikon", blurb: "A thorough robot: X, the web, and the token's on-chain activity. Slow to grow.",
    tools: ["x_search", "web_search", "read_page", "chain_lookup"], maxSteps: 7, budget: 0.06, growMs: 45_000,
  },
};

const SYSTEM = (seed, ticker) => `You are a scout robot in a cozy farming game, investigating the meme coin $${ticker}.
You are cautious and you only observe: never tell anyone to buy, sell or hold.
You can call these tools: ${seed.tools.join(", ")}. You have at most ${seed.maxSteps} tool calls, so plan them.
Good habits: start broad, then follow up on what looks important (a contract address, a big account pushing it, a "rug" or "scam" claim, a project site). Notice red flags: brand new accounts shilling, copy-pasted posts, anonymous team, supply held by a few wallets, no real community.
When you're done, reply with JSON only, no other text:
{"vibe":"hot"|"warm"|"meh"|"sus","hype":0-100,"summary":"two or three short friendly sentences","flags":["up to 3 short red flags"],"sources":["up to 3 URLs or @handles you relied on"]}`;

// ---------------------------------------------------------------- the loop

// onStep({ i, tool, icon, verb, label, note, status: "start" | "done" | "think" }) is
// called as the robot works, so the game can show it.
export async function runScout(kind, rawTicker, onStep = () => {}) {
  const seed = SEEDS[kind];
  const ticker = Orbio.clean(rawTicker);
  if (!Orbio.isSignedIn()) return pretendScout(kind, ticker, onStep);
  const out = await runAgent(seed, SYSTEM(seed, ticker), `Investigate $${ticker}.`, onStep);
  return { ticker, ...out, real: true };
}

// ---------------------------------------------------------------- the night shift

// While the player sleeps, a robot re-checks a coin it reported on before and writes a
// "what changed" letter for the mailbox.
export const NIGHT = {
  name: "Night shift", tools: ["x_search", "web_search", "read_page"], maxSteps: 3, budget: 0.015,
};
export const WATCH_LIMIT = 3;

const NIGHT_SYSTEM = (ticker, last) => `You are a scout robot on the night shift in a cozy farming game, re-checking the meme coin $${ticker}.
You are cautious and you only observe: never tell anyone to buy, sell or hold.
On day ${last.day} you reported: vibe "${last.vibe}", hype ${last.hype}/100. Summary: "${String(last.summary || "").slice(0, 300)}"${last.flags?.length ? ` Red flags then: ${last.flags.join("; ")}.` : ""}
Find out what has changed since then: newest posts, fresh news, a shift in mood, new red flags, or nothing much.
You can call: ${NIGHT.tools.join(", ")}. At most ${NIGHT.maxSteps} tool calls; prefer recent results (e.g. sort by latest, add "today" or the date to searches).
When done, reply with JSON only:
{"headline":"a short letter title, e.g. 'Hype cooling off'","change":"up"|"down"|"same","vibe":"hot"|"warm"|"meh"|"sus","hype":0-100,"summary":"two short friendly sentences about what changed","flags":["new red flags, if any"],"sources":["up to 3 URLs or @handles"]}`;

export async function runNightCheck(rawTicker, last, onStep = () => {}) {
  const ticker = Orbio.clean(rawTicker);
  if (!Orbio.isSignedIn()) return pretendNight(ticker, last, onStep);
  const out = await runAgent(NIGHT, NIGHT_SYSTEM(ticker, last), `Re-check $${ticker}. What changed since day ${last.day}?`, onStep);
  return { ticker, ...out, from: { vibe: last.vibe, hype: last.hype, day: last.day }, real: true };
}

// ---------------------------------------------------------------- the agent loop

// The model calls tools from its toolbox until it's done or out of steps/budget, then
// writes a JSON report. Tools outside the toolbox are refused.
async function runAgent(seed, system, task, onStep) {
  const tools = seed.tools.map((n) => ({ type: "function", function: { name: n, ...TOOLS[n].spec } }));
  const messages = [{ role: "system", content: system }, { role: "user", content: task }];
  const trail = [];
  let cost = 0, steps = 0;

  const ask = async (final) => {
    const r = await Orbio.chat({
      // Tools stay declared (the history contains tool calls); "none" makes it answer.
      messages, max_tokens: 700, tools, tool_choice: final ? "none" : "auto",
    });
    cost += +(r.usage?.cost || 0);
    return r.choices?.[0]?.message || {};
  };

  let msg = await ask(false);
  while (msg.tool_calls?.length && steps < seed.maxSteps) {
    messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });
    if (msg.content?.trim()) onStep({ i: steps, status: "think", note: msg.content.trim().slice(0, 140) });
    for (const call of msg.tool_calls) {
      const t = TOOLS[call.function?.name];
      let args = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
      let content;
      if (!t || !seed.tools.includes(call.function.name)) content = "That tool isn't in your toolbox.";
      else if (steps >= seed.maxSteps) content = "Out of steps. Write your report now.";
      else if (cost + t.cap > seed.budget) content = "Out of budget. Write your report now.";
      else {
        const step = { i: steps++, tool: call.function.name, icon: t.icon, verb: t.verb, label: t.label(args) };
        onStep({ ...step, status: "start" });
        try {
          const res = await t.run(args);
          cost += res.cost || 0;
          const d = t.digest(res.result);
          content = d.text;
          step.note = d.note;
        } catch (e) {
          if (e.message === "no-balance" || e.message === "signed-out") throw e;
          content = `The tool failed (${e.message}). Try something else or write your report.`;
          step.note = "failed";
        }
        trail.push(step);
        onStep({ ...step, status: "done" });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
    msg = await ask(steps >= seed.maxSteps || cost >= seed.budget * 0.9);
  }

  let report = parseReport(msg.content);
  if (!report) {
    messages.push({ role: "assistant", content: msg.content || "" });
    messages.push({ role: "user", content: "Now write your report as the JSON object only." });
    report = parseReport((await ask(true)).content);
  }
  if (!report) throw new Error("bad-report");
  return { ...report, trail, steps, cost };
}

function parseReport(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const r = JSON.parse(m[0]);
    if (!r.vibe) return null;
    const out = { vibe: String(r.vibe).toLowerCase(), hype: Math.max(0, Math.min(100, +r.hype || 0)), summary: r.summary || "", flags: r.flags || [], sources: (r.sources || []).slice(0, 3) };
    if (r.headline) out.headline = String(r.headline).slice(0, 80);
    if (r.change) out.change = ["up", "down", "same"].includes(r.change) ? r.change : "same";
    return out;
  } catch { return null; }
}

// ---------------------------------------------------------------- pretend mode

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const PRETEND_STEPS = {
  x_search: (t) => [[`"$${t}"`, "15 posts"], [`"$${t} rug"`, "6 posts"], [`"$${t} min_faves:500"`, "4 posts"]],
  web_search: (t) => [[`"${t} meme coin"`, "6 results"], [`"${t} token contract"`, "5 results"]],
  read_page: () => [["coin-tracker.example", "3.4k chars"], ["memecoin-news.example", "2.1k chars"]],
  chain_lookup: () => [["token on base", "on-chain data"], ["transfers on base", "on-chain data"]],
};

async function pretendScout(kind, ticker, onStep) {
  const seed = SEEDS[kind];
  const h = Orbio.seeded(ticker + kind);
  const plan = [];
  const pools = seed.tools.map((n) => [n, PRETEND_STEPS[n](ticker)]);
  for (let i = 0; plan.length < Math.min(seed.maxSteps, 2 + (h % 3)); i++) {
    const [tool, options] = pools[i % pools.length];
    const opt = options[Math.floor(i / pools.length) % options.length];
    plan.push({ tool, label: opt[0], note: opt[1] });
  }
  const trail = [];
  for (const [i, p] of plan.entries()) {
    const t = TOOLS[p.tool];
    const step = { i, tool: p.tool, icon: t.icon, verb: t.verb, label: p.label };
    onStep({ ...step, status: "start" });
    await sleep(2200 + ((h >> i) % 1800));
    step.note = p.note;
    trail.push(step);
    onStep({ ...step, status: "done" });
  }
  const hype = h % 101;
  const vibe = hype > 80 ? "hot" : hype > 55 ? "warm" : h % 4 === 0 ? "sus" : "meh";
  const lines = {
    hot: `Pretend scouts say $${ticker} is everywhere today. Lots of rocket emojis.`,
    warm: `A steady trickle of $${ticker} posts. Some fans, some skeptics.`,
    meh: `$${ticker} is quiet. A few posts, mostly the same three accounts.`,
    sus: `$${ticker} chatter looks copy-pasted. Lots of brand new accounts.`,
  };
  return {
    ticker, vibe, hype, summary: `${lines[vibe]} (Pretend data — sign in for real scouting.)`,
    flags: vibe === "sus" ? ["new accounts shilling", "copy-paste posts"] : [], sources: [],
    trail, steps: trail.length, cost: 0, real: false,
  };
}

async function pretendNight(ticker, last, onStep) {
  const h = Orbio.seeded(`${ticker}night${last.day}`);
  const plan = [["x_search", `"$${ticker}" latest`, "12 posts"], ["web_search", `"${ticker}" news today`, "4 results"]];
  const trail = [];
  for (const [i, [tool, label, note]] of plan.entries()) {
    const t = TOOLS[tool];
    const step = { i, tool, icon: t.icon, verb: t.verb, label };
    onStep({ ...step, status: "start" });
    await sleep(2500 + ((h >> i) % 2000));
    step.note = note;
    trail.push(step);
    onStep({ ...step, status: "done" });
  }
  const delta = (h % 41) - 20;
  const hype = Math.max(0, Math.min(100, (+last.hype || 0) + delta));
  const change = delta > 5 ? "up" : delta < -5 ? "down" : "same";
  const vibe = hype > 80 ? "hot" : hype > 55 ? "warm" : h % 5 === 0 ? "sus" : "meh";
  const text = {
    up: [`$${ticker} heating up`, `More people are posting about $${ticker} than yesterday, and a couple of bigger accounts joined in.`],
    down: [`$${ticker} cooling off`, `The $${ticker} chatter has quietened down since day ${last.day}. Fewer posts, fewer rocket emojis.`],
    same: [`Not much new on $${ticker}`, `$${ticker} looks about the same as on day ${last.day}. Same crowd, same memes.`],
  }[change];
  return {
    ticker, headline: text[0], change, vibe, hype, summary: `${text[1]} (Pretend data — sign in for real scouting.)`,
    flags: vibe === "sus" ? ["sudden wave of new accounts"] : [], sources: [], trail, steps: trail.length, cost: 0,
    from: { vibe: last.vibe, hype: last.hype, day: last.day }, real: false,
  };
}
