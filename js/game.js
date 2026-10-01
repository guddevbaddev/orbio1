import * as Art from "./art.js";
import * as Orbio from "./orbio.js";

const { T } = Art;
const VIEW_W = 320, VIEW_H = 192;
const MAP_W = 30, MAP_H = 20;
const GROW_MS = 25_000;       // how long a crop takes to ripen (real time)
const REAL_MS_PER_10MIN = 7_000; // in-game clock speed
const SAVE_KEY = "orbio-valley-save-v1";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
Art.useContext(ctx);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- map

const tiles = Array.from({ length: MAP_H }, () => Array(MAP_W).fill("g"));
const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) tiles[y][x] = v; };

for (let x = 0; x < MAP_W; x++) { set(x, 0, "t"); set(x, MAP_H - 1, "t"); }
for (let y = 0; y < MAP_H; y++) { set(0, y, "t"); set(MAP_W - 1, y, "t"); }
for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
  if (((x - 22.5) / 5.5) ** 2 + ((y - 14.5) / 3.8) ** 2 < 1) set(x, y, "w");
}
for (let x = 1; x <= 28; x++) set(x, 7, "p");
set(4, 6, "p"); set(23, 6, "p"); set(24, 6, "p");
for (let y = 8; y <= 14; y++) set(14, y, "p");
set(15, 14, "p");
set(16, 14, "d"); set(17, 14, "d");
// the fenced field
for (let x = 5; x <= 11; x++) { if (x !== 8) set(x, 9, "fh"); set(x, 14, "fh"); }
for (let y = 10; y <= 13; y++) { set(5, y, "fv"); set(11, y, "fv"); }
for (const [x, y] of [[2, 10], [3, 13], [2, 16], [7, 17], [12, 17], [26, 9], [28, 9], [9, 3], [18, 2], [15, 17], [19, 4]]) set(x, y, "t");

const PLOTS = [[6, 10], [8, 10], [10, 10], [6, 12], [8, 12], [10, 12]];
const BUILDINGS = [
  { kind: "house", x: 2, y: 2, w: 5, h: 4, sign: "HOME" },
  { kind: "store", x: 21, y: 2, w: 6, h: 4, sign: "STORE" },
];
const PROPS = { mailbox: [7, 6], board: [16, 5] };
const orbyNpc = { x: 19 * T, y: 9 * T };

const buildingAt = (x, y) => BUILDINGS.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
const plotAt = (x, y) => PLOTS.findIndex(([px, py]) => px === x && py === y);
const propAt = (x, y) => Object.keys(PROPS).find((k) => PROPS[k][0] === x && PROPS[k][1] === y);
const isOrby = (x, y) => x === orbyNpc.x / T && y === orbyNpc.y / T;
const isWater = (x, y) => tiles[y]?.[x] === "w";

function solid(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  const t = tiles[y][x];
  return t === "t" || t === "w" || t === "fh" || t === "fv" || !!buildingAt(x, y) || !!propAt(x, y) || isOrby(x, y);
}

// ---------------------------------------------------------------- state

const fresh = () => ({
  day: 1, minutes: 0, plots: PLOTS.map(() => null), journal: [], fishLog: [],
  pond: [], pondDay: 0, spent: 0, px: 4 * T, py: 7 * T, dir: 0, metOrby: false,
});
let S = fresh();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    S = { ...fresh(), ...JSON.parse(raw) };
    // A scout that was still out when the page closed can't report back.
    S.plots = S.plots.map((p) => (p && p.status === "growing" && !p.result ? { ...p, status: "wilted", error: "Your scout wandered off while you were away." } : p));
  } catch { S = fresh(); }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

const player = { get x() { return S.px; }, set x(v) { S.px = v; }, get y() { return S.py; }, set y(v) { S.py = v; }, frame: 0, moving: false, animT: 0 };
let fishing = null;     // { tx, ty, phase: "wait" | "bite", at }
let stockingPond = false;
let started = false;
let dialogOpen = false;

// ---------------------------------------------------------------- input

const held = new Set();
const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };

addEventListener("keydown", (e) => {
  if (dialogOpen) {
    if (e.key === "Escape") closeDialog();
    else if ((e.key === "Enter" || e.key === " " || e.code === "KeyE") && !e.repeat && !e.target.closest?.("button, input")) {
      e.preventDefault();
      $("dialog").querySelector("[data-primary]")?.click();
    }
    return;
  }
  if (!started) return;
  if (KEYMAP[e.code]) { held.add(KEYMAP[e.code]); e.preventDefault(); }
  if ((e.code === "Space" || e.code === "KeyE" || e.code === "Enter") && !e.repeat) { e.preventDefault(); interact(); }
  if (e.code === "KeyJ") openJournal();
});
addEventListener("keyup", (e) => { if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]); });
addEventListener("blur", () => held.clear());

// touch pad
if (matchMedia("(pointer: coarse)").matches) {
  document.querySelectorAll(".dpad button").forEach((b) => {
    const on = (e) => { e.preventDefault(); held.add(b.dataset.dir); b.classList.add("on"); };
    const off = () => { held.delete(b.dataset.dir); b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });
  $("aBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); if (!dialogOpen) interact(); });
}

// ---------------------------------------------------------------- UI helpers

let toastTimer;
function toast(msg, ms = 2600) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

function icon(draw, size = 16) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  Art.useContext(c.getContext("2d"));
  draw(performance.now());
  Art.useContext(ctx);
  return c;
}
const ICONS = {
  orby: () => icon((t) => Art.orby(0, 0, t)),
  farmer: () => icon(() => Art.farmer(0, 0, 0, 0, false)),
  chatter: () => icon((t) => Art.crop(0, 1, "chatter", 3, 1)),
  rumor: () => icon((t) => Art.crop(0, 1, "rumor", 3, 1)),
  mail: () => icon(() => Art.mailbox(0, 0, true)),
  board: () => icon(() => Art.board(0, 0)),
};

// html: string. buttons: [{ label, primary, onClick }]. who: { name, icon }.
function openDialog({ who, html, buttons = [{ label: "OK", primary: true }], onOpen }) {
  const d = $("dialog");
  d.innerHTML = "";
  if (who) {
    const w = document.createElement("div");
    w.className = "who";
    w.append(who.icon(), document.createTextNode(who.name));
    d.append(w);
  }
  const body = document.createElement("div");
  body.innerHTML = html;
  d.append(body);
  if (buttons.length) {
    const row = document.createElement("div");
    row.className = "choices";
    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.className = "btn" + (b.primary ? " primary" : "");
      if (b.primary) btn.dataset.primary = "";
      btn.textContent = b.label;
      btn.addEventListener("click", () => { if (!b.keepOpen) closeDialog(); b.onClick?.(); });
      row.append(btn);
    }
    d.append(row);
  }
  d.hidden = false;
  d.tabIndex = -1;
  dialogOpen = true;
  document.body.classList.add("dialog-open");
  held.clear();
  onOpen?.(d);
  if (!d.contains(document.activeElement)) d.focus();
}
function closeDialog() {
  $("dialog").hidden = true;
  dialogOpen = false;
  document.body.classList.remove("dialog-open");
  canvas.focus?.();
}

const ORBY = { name: "Orby", icon: ICONS.orby };

// ---------------------------------------------------------------- interactions

function facingTile() {
  const cx = player.x + 8, cy = player.y + 12;
  const [dx, dy] = [[0, 1], [0, -1], [-1, 0], [1, 0]][S.dir];
  return [Math.floor((cx + dx * 12) / T), Math.floor((cy + dy * 12) / T)];
}
const standingTile = () => [Math.floor((player.x + 8) / T), Math.floor((player.y + 12) / T)];

function interact() {
  if (fishing) return reelIn();
  const [fx, fy] = facingTile();
  const b = buildingAt(fx, fy);
  if (b) return b.kind === "house" ? visitHouse() : visitStore();
  const prop = propAt(fx, fy);
  if (prop === "mailbox") return openMailbox();
  if (prop === "board") return openJournal();
  if (isOrby(fx, fy)) return talkToOrby();
  for (const [x, y] of [[fx, fy], standingTile()]) {
    const i = plotAt(x, y);
    if (i >= 0) return usePlot(i);
  }
  if (isWater(fx, fy)) return cast(fx, fy);
}

// --- Orby

const TIPS = [
  "Welcome to Orbio Valley! I'm Orby. Every crop on this farm is a little AI scout that goes out and reads the internet about a meme coin.",
  "Walk into the field and press <b>Space</b> (or <b>A</b>) on an empty patch of soil. Pick a seed, give it a ticker like <b>$PEPE</b>, and it ripens with a report.",
  "<b>Chatter Carrots</b> read what people on X are posting. <b>Rumor Radishes</b> search the open web. Both are summed up by an AI model.",
  "Stand on the dock and cast into the pond to catch whatever coins are trending today. Rarer fish = more hype. The pond restocks every morning.",
  "Everything runs on <b>Orbio</b>: one balance pays for the AI model <i>and</i> the X and web reads. Check the mailbox to sign in.",
  "Remember: scouts only look. Hype isn't value, and lots of these coins are rugs. Have fun, don't bet the farm!",
];
let tipIndex = 0;
function talkToOrby(first) {
  const i = first ? 0 : tipIndex;
  tipIndex = (i + 1) % TIPS.length;
  S.metOrby = true;
  openDialog({
    who: ORBY,
    html: `<p>${TIPS[i]}</p>`,
    buttons: [
      { label: tipIndex === 0 ? "Thanks, Orby!" : "Tell me more ▸", primary: true, onClick: () => tipIndex !== 0 && talkToOrby() },
      ...(tipIndex !== 0 ? [{ label: "Bye" }] : []),
    ],
  });
}

// --- house & store

function visitHouse() {
  openDialog({
    who: { name: "Farmhouse", icon: ICONS.farmer },
    html: `<p>It's ${clockText()}. Go to bed and start Day ${S.day + 1}? The pond restocks with fresh trending coins in the morning.</p>`,
    buttons: [{ label: "Sleep", primary: true, onClick: sleep }, { label: "Not yet" }],
  });
}

function sleep(passedOut) {
  fishing = null;
  S.day += 1;
  S.minutes = 0;
  S.px = 4 * T; S.py = 7 * T; S.dir = 0;
  save();
  fadeNight();
  toast(passedOut ? `You passed out at 2am… Day ${S.day}` : `☀ Good morning! Day ${S.day}`, 3200);
}

let fadeUntil = 0;
const fadeNight = () => { fadeUntil = performance.now() + 900; };

function visitStore() {
  openDialog({
    who: { name: "Orbio General Store", icon: ICONS.orby },
    html: `<p>Every scout on this farm runs on <b>Orbio credits</b>. One balance pays for the AI model and the X and web reads it does.</p>
      <p>Orbio sells credits below list price, resold by people who earned them. Want to see how much you'd save on your own AI bill?</p>`,
    buttons: [
      { label: "🐷 Open the piggy bank", primary: true, onClick: () => open("piggy.html", "_blank", "noopener") },
      { label: "Visit orbio.so", onClick: () => open("https://www.orbio.so", "_blank", "noopener") },
      { label: "Leave" },
    ],
  });
}

// --- mailbox: Sign in with Orbio

function openMailbox() {
  const who = { name: "Mailbox", icon: ICONS.mail };
  if (!Orbio.isConfigured()) {
    return openDialog({
      who,
      html: `<p>A letter from Orby: <i>"This farm isn't hooked up to an Orbio app yet, so your scouts are running in <b>pretend mode</b> with made-up coins."</i></p>
        <p class="hint">Farm owner: register a public app at orbio.so/developers, add this page's URL as a redirect URI, and paste the client ID into <code>js/orbio.js</code>.</p>`,
      buttons: [{ label: "Got it", primary: true }],
    });
  }
  if (!Orbio.isSignedIn()) {
    return openDialog({
      who,
      html: `<p>Sign in with Orbio so your scouts can read the real internet. Each scout costs about a cent, paid from your own Orbio balance.</p>
        <p class="hint">Right now you're in pretend mode: the coins are made up.</p>`,
      buttons: [{ label: "Sign in with Orbio", primary: true, onClick: () => Orbio.signIn() }, { label: "Later" }],
    });
  }
  openDialog({
    who,
    html: `<p>Signed in${Orbio.playerName() ? ` as <b>@${esc(Orbio.playerName())}</b>` : ""}. Your scouts are using real data.</p>
      <p>Spent on scouting so far: <b>${S.spent.toFixed(4)} CREDIT</b> (1 CREDIT = $1).</p>`,
    buttons: [{ label: "Close", primary: true }, { label: "Sign out", onClick: () => { Orbio.signOut(); toast("Signed out. Back to pretend mode."); } }],
  });
}

async function refreshBalance() {
  const el = $("balance");
  if (!Orbio.isSignedIn()) { el.textContent = "Pretend mode"; return; }
  try {
    const b = await Orbio.balance();
    el.textContent = b == null ? "Signed in" : `$${b.toFixed(2)}`;
  } catch { el.textContent = "Signed in"; }
}
Orbio.onAuthChange(refreshBalance);
$("purse").addEventListener("click", () => started && !dialogOpen && openMailbox());

// --- farming

const SEEDS = {
  chatter: { name: "Chatter Carrot", blurb: "Reads the top posts on X about a coin.", run: Orbio.scoutChatter },
  rumor: { name: "Rumor Radish", blurb: "Searches the web for news and rumors.", run: Orbio.scoutRumors },
};

function usePlot(i) {
  const p = S.plots[i];
  if (!p) return chooseSeed(i);
  if (p.status === "wilted") {
    S.plots[i] = null; save();
    return openDialog({ who: ORBY, html: `<p>This one wilted. ${esc(p.error)}</p><p class="hint">I cleared the soil so you can replant.</p>` });
  }
  if (p.status === "growing" && !(isRipe(p))) {
    const left = Math.max(0, Math.ceil((p.plantedAt + GROW_MS - Date.now()) / 1000));
    return toast(left > 0 ? `${SEEDS[p.kind].name} for $${p.ticker} — ripe in ${left}s` : `The $${p.ticker} scout is still out reading…`);
  }
  harvest(i);
}

function chooseSeed(i) {
  openDialog({
    who: ORBY,
    html: `<p>What should we plant?</p><div class="seed-row" id="seedRow"></div>`,
    buttons: [{ label: "Cancel" }],
    onOpen: (d) => {
      const row = d.querySelector("#seedRow");
      for (const [kind, s] of Object.entries(SEEDS)) {
        const btn = document.createElement("button");
        btn.className = "seed";
        btn.append(ICONS[kind]());
        const txt = document.createElement("div");
        txt.innerHTML = `<b>${s.name}</b><span>${s.blurb}</span>`;
        btn.append(txt);
        btn.addEventListener("click", () => askTicker(i, kind));
        row.append(btn);
      }
      row.querySelector("button").focus();
    },
  });
}

function askTicker(i, kind) {
  const plant = () => {
    const input = $("dialog").querySelector("input");
    const ticker = input.value.replace(/^\$/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
    if (!ticker) { input.focus(); return; }
    closeDialog();
    plantSeed(i, kind, ticker);
  };
  openDialog({
    who: ORBY,
    html: `<p>Which coin should this ${SEEDS[kind].name} sniff out?</p>
      <input type="text" maxlength="13" placeholder="$PEPE" aria-label="Coin ticker" autocomplete="off" spellcheck="false">
      <p class="hint">${Orbio.isSignedIn() ? "Costs about a cent from your Orbio balance." : "Pretend mode: you'll get made-up results until you sign in at the mailbox."}</p>`,
    buttons: [{ label: "🌱 Plant", primary: true, keepOpen: true, onClick: plant }, { label: "Cancel" }],
    onOpen: (d) => {
      const input = d.querySelector("input");
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); plant(); } });
      input.focus();
    },
  });
}

function plantSeed(i, kind, ticker) {
  const plot = { kind, ticker, plantedAt: Date.now(), status: "growing", result: null };
  S.plots[i] = plot;
  save();
  toast(`🌱 Planted a ${SEEDS[kind].name} for $${ticker}`);
  SEEDS[kind].run(ticker)
    .then((res) => { if (S.plots[i] === plot) { plot.result = res; save(); } })
    .catch((err) => {
      if (S.plots[i] !== plot) return;
      plot.status = "wilted";
      plot.error = errorText(err);
      save();
      toast(`🥀 The $${ticker} scout wilted`);
    });
}

const isRipe = (p) => p?.status === "growing" && p.result && Date.now() - p.plantedAt >= GROW_MS;

function errorText(err) {
  const m = err?.message || "";
  if (m === "no-balance") return "Your Orbio balance ran dry. Top up at orbio.so and try again.";
  if (m === "signed-out") return "You got signed out of Orbio. Visit the mailbox to sign back in.";
  return "It couldn't reach Orbio. Check your connection and replant.";
}

function harvest(i) {
  const p = S.plots[i];
  const r = p.result;
  const entry = { type: "crop", kind: p.kind, day: S.day, ...r };
  S.journal.unshift(entry);
  S.journal = S.journal.slice(0, 60);
  S.spent += r.cost || 0;
  S.plots[i] = null;
  save();
  if (r.real) refreshBalance();
  openDialog({
    who: { name: `${SEEDS[p.kind].name} harvested!`, icon: ICONS[p.kind] },
    html: cropCard(entry) + `<p class="hint">Saved to the bulletin board (press J).</p>`,
    buttons: [{ label: "Nice", primary: true }],
  });
}

function cropCard(e) {
  const flags = (e.flags || []).filter((f) => f && !/^none$/i.test(f));
  return `<div class="card">
    <div class="head"><span class="ticker">$${esc(e.ticker)}</span><span class="vibe ${esc(e.vibe)}">${esc(e.vibe)}</span>
      ${e.real ? "" : `<span class="pretend">pretend</span>`}</div>
    <div class="meter" title="hype ${+e.hype || 0}/100"><i style="width:${Math.max(0, Math.min(100, +e.hype || 0))}%"></i></div>
    <p>${esc(e.summary)}</p>
    ${flags.length ? `<div class="flags">⚑ ${flags.map(esc).join(" · ")}</div>` : ""}
    <div class="meta">Day ${e.day} · ${e.kind === "rumor" ? "web search" : "X posts"}${e.real ? ` · ${(+e.cost || 0).toFixed(4)} CREDIT` : ""}</div>
  </div>`;
}

// --- fishing

const RARITY = (h) => (h >= 85 ? "legendary" : h >= 60 ? "rare" : h >= 30 ? "uncommon" : "common");
const FISH_COLOR = { common: "#9a9488", uncommon: "#4fa8e0", rare: "#9a6ae0", legendary: "#ffd34d" };

async function cast(tx, ty) {
  if (stockingPond) return toast("Orby is still stocking the pond…");
  if (S.pondDay !== S.day) {
    stockingPond = true;
    toast("🎣 Orby is stocking the pond with today's trending coins…", 6000);
    try {
      const res = await Orbio.scoutPond();
      S.pond = res.fish;
      S.pondDay = S.day;
      S.spent += res.cost || 0;
      save();
      if (res.real) refreshBalance();
      toast(S.pond.length ? `The pond is stocked: ${S.pond.length} fish today!` : "Nothing's biting today. Try again tomorrow.");
    } catch (err) {
      toast(errorText(err), 4000);
    } finally {
      stockingPond = false;
    }
    return;
  }
  if (!S.pond.length) return toast("You've fished the pond empty! Sleep to restock it.");
  fishing = { tx, ty, phase: "wait", at: performance.now() + 1500 + Math.random() * 3000 };
  toast("Cast! Wait for the ❗ then press again.");
}

function updateFishing(now) {
  if (!fishing) return;
  if (fishing.phase === "wait" && now >= fishing.at) { fishing.phase = "bite"; fishing.at = now + 1000; }
  else if (fishing.phase === "bite" && now >= fishing.at) { fishing = null; toast("It got away…"); }
}

function reelIn() {
  const f = fishing;
  fishing = null;
  if (f.phase === "wait") return toast("Too early! The fish swam off.");
  const fish = S.pond.shift();
  const rarity = RARITY(+fish.hype || 0);
  const entry = { type: "fish", day: S.day, rarity, ...fish };
  S.fishLog.unshift(entry);
  S.fishLog = S.fishLog.slice(0, 80);
  save();
  openDialog({
    who: { name: `You caught a ${rarity} fish!`, icon: () => icon(() => Art.fishSprite(0, 0, FISH_COLOR[rarity])) },
    html: fishCard(entry),
    buttons: [{ label: "Into the bucket", primary: true }],
  });
}

function fishCard(e) {
  return `<div class="card">
    <div class="head"><span class="ticker">$${esc(e.ticker)}</span><span class="vibe ${e.rarity}">${e.rarity}</span>
      ${e.real ? "" : `<span class="pretend">pretend</span>`}</div>
    <div class="meter" title="hype ${+e.hype || 0}/100"><i style="width:${Math.max(0, Math.min(100, +e.hype || 0))}%"></i></div>
    <p>${esc(e.blurb)}</p>
    <div class="meta">Caught on Day ${e.day} · ${e.real ? "trending on X" : "made-up coin"}</div>
  </div>`;
}

// --- journal (bulletin board)

function openJournal(tab = "crops") {
  if (!started) return;
  const crops = S.journal, fish = S.fishLog;
  const list = tab === "crops"
    ? (crops.length ? crops.map(cropCard).join("") : `<p class="empty">No harvests yet. Plant a seed in the field!</p>`)
    : (fish.length ? fish.map(fishCard).join("") : `<p class="empty">No fish yet. Cast from the dock!</p>`);
  openDialog({
    who: { name: "Bulletin board", icon: ICONS.board },
    html: `<div class="tabs">
        <button class="btn" data-tab="crops" aria-pressed="${tab === "crops"}">🥕 Harvests (${crops.length})</button>
        <button class="btn" data-tab="fish" aria-pressed="${tab === "fish"}">🐟 Fish (${fish.length})</button>
      </div>${list}`,
    buttons: [{ label: "Close", primary: true }],
    onOpen: (d) => d.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => openJournal(b.dataset.tab))),
  });
}

// ---------------------------------------------------------------- update & draw

function clockText() {
  const total = 6 * 60 + S.minutes;
  const h24 = Math.floor(total / 60) % 24, m = total % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`;
}

let clockAcc = 0;
function updateClock(dt) {
  clockAcc += dt;
  while (clockAcc >= REAL_MS_PER_10MIN) {
    clockAcc -= REAL_MS_PER_10MIN;
    S.minutes += 10;
    if (S.minutes >= 20 * 60) { closeDialog(); sleep(true); }
    else if (S.minutes % 60 === 0) save();
  }
  $("day").textContent = `Day ${S.day}`;
  $("time").textContent = clockText();
}

function move(dt) {
  let dx = 0, dy = 0;
  if (held.has("left")) dx -= 1;
  if (held.has("right")) dx += 1;
  if (held.has("up")) dy -= 1;
  if (held.has("down")) dy += 1;
  player.moving = !!(dx || dy);
  if (!player.moving) return;
  if (fishing) { fishing = null; toast("You reeled in your line."); }
  if (dx) S.dir = dx < 0 ? 2 : 3; else S.dir = dy < 0 ? 1 : 0;
  const len = Math.hypot(dx, dy), speed = 0.07 * dt;
  tryMove((dx / len) * speed, 0);
  tryMove(0, (dy / len) * speed);
  player.animT += dt;
  player.frame = Math.floor(player.animT / 160) % 2;
}

function tryMove(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy;
  // feet hitbox
  const box = [[nx + 4, ny + 10], [nx + 11.9, ny + 10], [nx + 4, ny + 15.9], [nx + 11.9, ny + 15.9]];
  if (box.some(([x, y]) => solid(Math.floor(x / T), Math.floor(y / T)))) return;
  player.x = nx; player.y = ny;
}

function cropStage(p) {
  if (!p || p.status === "wilted") return -1;
  if (isRipe(p)) return 3;
  return Math.min(2, Math.floor(((Date.now() - p.plantedAt) / GROW_MS) * 3));
}

function draw(now) {
  const camX = Math.round(Math.max(0, Math.min(MAP_W * T - VIEW_W, player.x + 8 - VIEW_W / 2)));
  const camY = Math.round(Math.max(0, Math.min(MAP_H * T - VIEW_H, player.y + 8 - VIEW_H / 2)));
  ctx.save();
  ctx.translate(-camX, -camY);

  const x0 = Math.floor(camX / T), y0 = Math.floor(camY / T);
  for (let y = y0; y <= y0 + VIEW_H / T; y++) for (let x = x0; x <= x0 + VIEW_W / T; x++) {
    const t = tiles[y]?.[x];
    if (!t) continue;
    const px = x * T, py = y * T;
    if (t === "p") Art.path(px, py, x, y);
    else if (t === "w" || t === "d") {
      Art.water(px, py, x, y, now);
      Art.shore(px, py, !isWater(x, y - 1) && tiles[y - 1]?.[x] !== "d", !isWater(x, y + 1), !isWater(x - 1, y) && tiles[y]?.[x - 1] !== "d", !isWater(x + 1, y));
      if (t === "d") Art.dock(px, py);
    } else Art.grass(px, py, x, y);
    if (t === "fh") Art.fence(px, py, true);
    if (t === "fv") Art.fence(px, py, false);
  }

  PLOTS.forEach(([x, y], i) => {
    const p = S.plots[i];
    Art.soil(x * T, y * T, !!p && p.status !== "wilted");
    const st = cropStage(p);
    if (st >= 0) {
      Art.crop(x * T, y * T, p.kind, st, now);
      if (st === 2 && !p.result) Art.sproutWaiting(x * T, y * T, now);
    }
    if (p?.status === "wilted") { ctx.fillStyle = "#8a7a5a"; ctx.fillRect(x * T + 6, y * T + 8, 4, 4); }
  });

  for (const b of BUILDINGS) {
    const [r1, r2] = b.kind === "house" ? [Art.COLORS.roof, Art.COLORS.roof2] : [Art.COLORS.roofStore, Art.COLORS.roofStore2];
    Art.house(b.x * T, b.y * T, b.w * T, b.h * T, r1, r2, b.sign);
  }
  Art.mailbox(PROPS.mailbox[0] * T, PROPS.mailbox[1] * T, !Orbio.isSignedIn());
  Art.board(PROPS.board[0] * T, PROPS.board[1] * T);

  // trees after the ground so their canopies sit on top
  for (let y = y0; y <= y0 + VIEW_H / T; y++) for (let x = x0; x <= x0 + VIEW_W / T; x++) if (tiles[y]?.[x] === "t") Art.tree(x * T, y * T);

  const drawPlayer = () => Art.farmer(Math.round(player.x), Math.round(player.y), S.dir, player.frame, player.moving);
  const drawOrby = () => Art.orby(orbyNpc.x, orbyNpc.y, now);
  if (player.y > orbyNpc.y) { drawOrby(); drawPlayer(); } else { drawPlayer(); drawOrby(); }
  if (!S.metOrby && started) Art.exclaim(orbyNpc.x, orbyNpc.y - 2);

  if (fishing) {
    const bx = fishing.tx * T, by = fishing.ty * T;
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(player.x + 13, player.y + 4); ctx.quadraticCurveTo((player.x + bx) / 2 + 8, Math.min(player.y, by) - 6, bx + 8, by + 7); ctx.stroke();
    Art.bobber(bx, by, now, fishing.phase === "bite");
    if (fishing.phase === "bite") Art.exclaim(Math.round(player.x), Math.round(player.y) - 2);
  }

  // a little sparkle on the tile you'd interact with
  if (started && !dialogOpen && !fishing) {
    const [fx, fy] = facingTile();
    const p = plotAt(fx, fy) >= 0 ? S.plots[plotAt(fx, fy)] : undefined;
    const interesting = buildingAt(fx, fy) || propAt(fx, fy) || isOrby(fx, fy) || plotAt(fx, fy) >= 0 || isWater(fx, fy);
    if (interesting && Math.floor(now / 400) % 2) {
      ctx.strokeStyle = isRipe(p) ? Art.COLORS.gold : "rgba(255,255,255,.75)";
      ctx.strokeRect(fx * T + 0.5, fy * T + 0.5, T - 1, T - 1);
    }
  }
  ctx.restore();

  // evening & night tint
  const evening = Math.max(0, Math.min(1, (S.minutes - 12 * 60) / 180));
  if (evening > 0) { ctx.fillStyle = `rgba(30, 20, 80, ${evening * 0.45})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  if (now < fadeUntil) { ctx.fillStyle = `rgba(10, 8, 25, ${(fadeUntil - now) / 900})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;
  if (started && !dialogOpen) {
    move(dt);
    updateClock(dt);
    updateFishing(now);
  }
  canvas.dataset.fishing = fishing?.phase || "";
  draw(now);
  requestAnimationFrame(frame);
}

function fit() {
  const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  const scale = s >= 2 ? Math.floor(s * 2) / 2 : s;
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
addEventListener("resize", fit);

// ---------------------------------------------------------------- boot

function start() {
  if (started) return;
  started = true;
  $("title").hidden = true;
  $("hud").hidden = false;
  if (matchMedia("(pointer: coarse)").matches) $("pad").hidden = false;
  refreshBalance();
  if (!S.metOrby) setTimeout(() => talkToOrby(true), 400);
}

(async () => {
  load();
  fit();
  const titleOrb = $("titleOrb").getContext("2d");
  titleOrb.imageSmoothingEnabled = false;
  const animateTitle = (t) => {
    if (started) return;
    titleOrb.clearRect(0, 0, 32, 32);
    Art.useContext(titleOrb); titleOrb.save(); titleOrb.scale(2, 2); Art.orby(0, 0, t); titleOrb.restore(); Art.useContext(ctx);
    requestAnimationFrame(animateTitle);
  };
  requestAnimationFrame(animateTitle);
  requestAnimationFrame(frame);

  $("playBtn").addEventListener("click", start);
  $("titleSignIn").addEventListener("click", () => {
    if (Orbio.isConfigured()) Orbio.signIn();
    else { start(); setTimeout(openMailbox, 450); }
  });
  if (Orbio.isConfigured()) $("titleSignIn").textContent = "Sign in with Orbio";

  const result = await Orbio.handleRedirect();
  if (result === "signed-in") { start(); toast(`✨ Signed in with Orbio${Orbio.playerName() ? ` as @${Orbio.playerName()}` : ""}. Scouts are live!`, 4000); }
  else if (result === "cancelled") toast("Sign-in cancelled. You can still play in pretend mode.");
  else if (result === "error") toast("Sign-in didn't work. Try again from the mailbox.", 4000);
})();
