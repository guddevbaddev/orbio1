import * as Art from "./art.js";
import * as Orbio from "./orbio.js";

const { T, C } = Art;
const VIEW_W = 384, VIEW_H = 224;
const MAP_W = 48, MAP_H = 30;
const GROW_MS = 25_000;          // how long a crop takes to ripen (real time)
const REAL_MS_PER_10MIN = 7_000; // in-game clock speed
const SAVE_KEY = "orbio-valley-save-v2";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
Art.useContext(ctx);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rand = (a, b) => a + Math.random() * (b - a);

// ================================================================ the map

// Ground: g grass, c cobble, d dirt, w water, b bridge, k dock, f waterfall, r cliff
const ground = Array.from({ length: MAP_H }, () => Array(MAP_W).fill("g"));
const owner = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(null)); // entity occupying a tile
const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
const setG = (x, y, v) => { if (inMap(x, y)) ground[y][x] = v; };
const fillG = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setG(x, y, v); };

// lake + river + waterfall
for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (((x - 38) / 9.5) ** 2 + ((y - 25.5) / 4.6) ** 2 < 1) setG(x, y, "w");
fillG(30, 0, 31, 22, "w");
fillG(30, 0, 31, 2, "f");
fillG(28, 0, 29, 2, "r"); fillG(32, 0, 33, 2, "r");
// roads and paths
fillG(1, 8, 46, 8, "c");
setG(30, 8, "b"); setG(31, 8, "b");
fillG(33, 9, 46, 17, "c");      // town plaza
fillG(7, 8, 7, 8, "c");
fillG(4, 9, 4, 10, "d");        // to the barn
fillG(17, 9, 17, 11, "d");      // to the field gate
fillG(23, 9, 23, 23, "d");      // down to the lake
fillG(24, 23, 29, 23, "d");
setG(30, 23, "k"); setG(31, 23, "k"); setG(32, 23, "k");
fillG(43, 9, 43, 9, "c");
fillG(25, 15, 28, 15, "d");     // greenhouse door path
fillG(9, 23, 22, 23, "d");      // orchard path

const isWater = (x, y) => inMap(x, y) && (ground[y][x] === "w" || ground[y][x] === "f");
const walkableGround = (x, y) => inMap(x, y) && !["w", "f", "r"].includes(ground[y][x]);

// ---------------------------------------------------------------- entities

const ents = [];
function place(e) {
  ents.push(e);
  if (e.solid !== false) for (let y = e.ty; y < e.ty + (e.fh || 1); y++) for (let x = e.tx; x < e.tx + (e.fw || 1); x++) if (inMap(x, y)) owner[y][x] = e;
  e.baseY = (e.ty + (e.fh || 1)) * T;
  return e;
}
// A sprite centred on its footprint and standing on its bottom edge.
function spriteEnt(kind, tx, ty, fw, fh, w, h, sprite, extra = {}) {
  const x = tx * T + (fw * T - w) / 2, y = (ty + fh) * T - h;
  return place({ kind, tx, ty, fw, fh, x, y, w, h, draw: (t, lit) => ctx.drawImage(sprite(lit), x, y), ...extra });
}
const tree = (kind, tx, ty) => spriteEnt("tree", tx, ty, 1, 1, 32, 44, () => Art.treeSprite(kind));
const bush = (kind, tx, ty) => spriteEnt("bush", tx, ty, 1, 1, 16, 16, () => Art.bushSprite(kind));
const lamp = (tx, ty) => spriteEnt("lantern", tx, ty, 1, 1, 16, 32, (lit) => Art.lantern(lit), { lights: [[8, 6, 46]] });

// buildings
const B = {};
B.house = spriteEnt("house", 4, 4, 7, 4, 112, 112, (lit) => Art.farmhouse(lit), {
  lights: [[21, 75, 40], [91, 75, 40], [56, 92, 34], [31, 41, 26], [81, 41, 26]],
  after: (e, t) => Art.smoke(e.x + 90, e.y + 2, t),
});
B.silo = spriteEnt("silo", 1, 6, 2, 2, 32, 88, () => Art.silo(), { lights: [[16, 48, 20]] });
B.station = spriteEnt("station", 14, 6, 2, 2, 32, 48, null, {
  draw: (t, lit) => { ctx.save(); ctx.translate(B.station.x, B.station.y); Art.station(t, lit); ctx.restore(); },
  lights: [[16, 6, 40], [16, 30, 22]],
});
B.barn = spriteEnt("barn", 2, 11, 5, 4, 80, 96, (lit) => Art.barn(lit), { lights: [[40, 28, 26], [40, 80, 34]] });
B.greenhouse = spriteEnt("greenhouse", 24, 11, 6, 4, 96, 88, (lit) => Art.greenhouse(lit), { lights: [[48, 60, 56]] });
B.gazette = spriteEnt("gazette", 40, 4, 6, 4, 96, 104, (lit) => Art.gazette(lit), { lights: [[48, 18, 36], [19, 76, 30], [77, 76, 30], [48, 86, 30]] });
B.fountain = spriteEnt("fountain", 38, 11, 3, 3, 48, 72, () => Art.fountain(), { after: (e, t) => Art.fountainWater(e.x, e.y, t), lights: [[24, 27, 24]] });
const STALL_COLORS = [C.red, C.overall, C.roofGreen, C.orange];
[[34, 11], [34, 15], [44, 12], [44, 15]].forEach(([x, y], i) => spriteEnt("stall", x, y, 2, 1, 32, 40, () => Art.stall(STALL_COLORS[i])));
const mailbox = spriteEnt("mailbox", 11, 7, 1, 1, 16, 20, () => Art.mailbox(!Orbio.isSignedIn()));
mailbox.draw = (t) => ctx.drawImage(Art.mailbox(!Orbio.isSignedIn()), mailbox.x, mailbox.y);
spriteEnt("board", 17, 7, 1, 1, 16, 24, () => Art.board());
for (const [x, y] of [[8, 10], [9, 10], [1, 9]]) spriteEnt("crate", x, y, 1, 1, 16, 16, () => Art.crate());
for (const [x, y] of [[3, 7], [12, 7], [36, 7], [33, 17]]) spriteEnt("barrel", x, y, 1, 1, 16, 18, () => Art.barrel());
for (const [x, y] of [[7, 15], [8, 15], [9, 13]]) spriteEnt("hay", x, y, 1, 1, 16, 14, () => Art.hay());

// lanterns
for (const [x, y] of [[3, 9], [13, 9], [21, 9], [27, 9], [29, 7], [33, 7], [37, 10], [41, 10], [37, 15], [41, 15], [46, 9], [22, 22], [29, 22]]) lamp(x, y);

// field fence (gate at x=17) with sunflowers along the east side
const fenceH = (x, y) => place({ kind: "fence", tx: x, ty: y, draw: () => Art.fenceH(x * T, y * T) });
const fenceV = (x, y) => place({ kind: "fence", tx: x, ty: y, draw: () => Art.fenceV(x * T, y * T) });
for (let x = 12; x <= 22; x++) { if (x !== 17) fenceH(x, 11); fenceH(x, 19); }
for (let y = 12; y <= 18; y++) { fenceV(12, y); fenceV(22, y); }
for (const y of [12, 14, 16, 18]) spriteEnt("sunflower", 21, y, 1, 1, 16, 30, () => Art.sunflowerSprite());
// animal pen (gate at x=4)
for (let x = 1; x <= 10; x++) { if (x !== 4) fenceH(x, 16); fenceH(x, 21); }
for (let y = 17; y <= 20; y++) { fenceV(1, y); fenceV(10, y); }

// trees: pine forest round the edge, orchards and blossoms inside
for (let x = 0; x < MAP_W; x++) { if (x < 28 || x > 33) tree("pine", x, 0); if (!isWater(x, MAP_H - 1)) tree("pine", x, MAP_H - 1); }
for (let y = 1; y < MAP_H - 1; y++) { if (y !== 8) { tree("pine", 0, y); if (!isWater(MAP_W - 1, y)) tree("pine", MAP_W - 1, y); } }
for (let x = 1; x < 28; x += 2) if (x < 3 || x > 12) tree(x % 4 === 1 ? "pine" : "round", x, 1);
for (const [x, y] of [[34, 1], [36, 2], [38, 1], [40, 2], [42, 1], [44, 2], [46, 1]]) tree("pine", x, y);
for (const [x, y] of [[13, 22], [17, 25], [11, 26], [20, 27], [15, 27], [25, 25], [6, 24], [26, 20], [3, 23]]) tree("apple", x, y);
for (const [x, y] of [[24, 6], [35, 4], [19, 3], [27, 4]]) tree("cherry", x, y);
for (const [x, y] of [[2, 26], [4, 27], [8, 28], [1, 21], [12, 3], [25, 2]]) tree("pine", x, y);
for (const [x, y, k] of [[11, 4, "pink"], [12, 5, "white"], [21, 6, "red"], [22, 7, "purple"], [34, 8 - 1, "pink"], [39, 7, "white"], [26, 7, "pink"], [33, 18, "red"], [36, 18, "white"], [46, 17, "purple"], [9, 22, "white"], [26, 9 + 1, "pink"]]) {
  if (!owner[y][x] && walkableGround(x, y) && ground[y][x] === "g") bush(k, x, y);
}

const PLOTS = [];
for (const y of [13, 15, 17]) for (const x of [14, 16, 18, 20]) PLOTS.push([x, y]);
const plotAt = (x, y) => PLOTS.findIndex(([px, py]) => px === x && py === y);
const FIELD_GATE = [17, 11];

function solidTile(x, y) {
  if (!inMap(x, y)) return true;
  if (!walkableGround(x, y)) return true;
  return !!owner[y][x];
}

// ================================================================ state

const fresh = () => ({
  day: 1, minutes: 0, plots: PLOTS.map(() => null), journal: [], fishLog: [],
  pond: [], pondDay: 0, spent: 0, px: 7 * T, py: 8 * T, dir: 0, metOrby: false,
});
let S = fresh();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    S = { ...fresh(), ...JSON.parse(raw) };
    S.plots = PLOTS.map((_, i) => S.plots[i] || null);
    // A scout that was still out when the page closed can't report back.
    S.plots = S.plots.map((p) => (p && p.status === "growing" && !p.result ? { ...p, status: "wilted", error: "Your scout wandered off while you were away." } : p));
  } catch { S = fresh(); }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} }

const player = { frame: 0, moving: false, animT: 0, get x() { return S.px; }, set x(v) { S.px = v; }, get y() { return S.py; }, set y(v) { S.py = v; } };
let fishing = null;     // { tx, ty, phase: "wait" | "bite", at }
let stockingPond = false;
let started = false;
let dialogOpen = false;

// ================================================================ actors

const orbyNpc = place({ kind: "orby", tx: 19, ty: 6, draw: (t) => Art.orby(19 * T, 6 * T, t) });

// Scout robots: one walks out of the Scout Station for every crop you plant.
const bots = [];
const tileC = ([x, y]) => [x * T, y * T];
function routeToPlot(i) {
  const [px, py] = PLOTS[i];
  return [[15, 8], [17, 8], [17, 10], [17, py - 1], [px, py - 1]].map(tileC);
}
function spawnScoutBot(i, atPlot) {
  const route = routeToPlot(i);
  const start = atPlot ? route[route.length - 1] : [14 * T + 8, 8 * T];
  const bot = { plot: i, x: start[0], y: start[1], path: atPlot ? [] : route, dir: 0, seed: Math.random() * 10, state: atPlot ? "work" : "walk" };
  bots.push(bot);
  return bot;
}
function sendBotHome(i) {
  const bot = bots.find((b) => b.plot === i);
  if (!bot) return;
  bot.plot = null;
  bot.state = "home";
  bot.carrying = true;
  bot.path = routeToPlot(i).reverse().concat([[14 * T + 8, 8 * T], [14 * T + 8, 7 * T + 8]]);
}
// Two farmhand bots that just potter about for atmosphere.
const ambient = [
  { x: 2 * T, y: 9 * T, hat: true, seed: 3, loop: [[2, 9], [4, 9], [4, 10], [4, 9], [10, 9], [10, 9], [2, 9]].map(tileC) },
  { x: 13 * T, y: 12 * T, hat: true, seed: 7, loop: [[13, 12], [13, 18], [19, 18], [19, 12], [15, 12], [15, 18], [13, 18], [13, 12]].map(tileC) },
  { x: 33 * T, y: 9 * T, seed: 5, loop: [[33, 9], [36, 9], [36, 16], [42, 16], [42, 9], [33, 9]].map(tileC) },
];
ambient.forEach((a) => { a.path = []; a.i = 0; a.dir = 0; a.wait = 0; a.ambient = true; });

function stepAlongPath(a, dt, speed) {
  if (!a.path.length) return false;
  const [tx, ty] = a.path[0];
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  const s = speed * dt;
  if (d <= s) { a.x = tx; a.y = ty; a.path.shift(); }
  else { a.x += (dx / d) * s; a.y += (dy / d) * s; }
  if (Math.abs(dx) > Math.abs(dy)) a.dir = dx < 0 ? 2 : 3; else if (d > 0.1) a.dir = dy < 0 ? 1 : 0;
  return true;
}

function updateBots(dt) {
  for (const b of bots) {
    b.moving = stepAlongPath(b, dt, 0.045);
    if (!b.moving) {
      if (b.state === "walk") b.state = "work";
      if (b.state === "home") b.gone = true;
      if (b.state === "work") b.dir = 0;
    }
    const p = b.plot != null ? S.plots[b.plot] : null;
    b.busy = b.state === "work" && p && !isRipe(p);
    b.carrying = b.state === "home" || (b.state === "work" && isRipe(p));
  }
  for (let i = bots.length - 1; i >= 0; i--) if (bots[i].gone) bots.splice(i, 1);
  for (const a of ambient) {
    if (a.wait > 0) { a.wait -= dt; a.moving = false; continue; }
    if (!a.path.length) { a.i = (a.i + 1) % a.loop.length; a.path = [a.loop[a.i]]; if (Math.random() < 0.35) a.wait = rand(800, 2500); }
    a.moving = stepAlongPath(a, dt, 0.03);
  }
}

// Townsfolk who mill about the plaza and have opinions about meme coins.
const LOOKS = [
  { hair: "#3b2416", hat: null, shirt: "#e0483a", pants: "#55331b" },
  { hair: "#f0d070", hat: C.straw, shirt: "#5aa05a", pants: "#3f6fc0" },
  { hair: "#7a3a1a", hat: "#3f6fc0", shirt: "#f2f0e6", pants: "#6d4426" },
  { hair: "#cfcfcf", hat: null, shirt: "#9b6ad8", pants: "#2e3245" },
];
const QUOTES = [
  ["Mabel", "My grandson put his allowance into a frog coin. The frog is doing better than the stock market and I hate it."],
  ["Gus", "I don't trust any coin whose logo is a dog in sunglasses. Two dogs in sunglasses? Now we're talking."],
  ["Juniper", "The trick is to read the posts <i>before</i> the influencers do. That's why I keep a Chatter Carrot patch."],
  ["Old Pete", "Back in my day a rug pull was something you did to a rug. Scout first, I always say."],
  ["Mabel", "The fish in that lake are named after whatever's trending. Caught a $BONK last week. Lovely fish."],
  ["Juniper", "Orbio credits are cheaper than buying AI straight from the big labs. My scouts run on pocket change."],
];
const FOLK_START = [[35, 13], [42, 10], [36, 17], [45, 14]];
const folks = LOOKS.map((look, i) => ({ look, name: QUOTES[i][0], x: FOLK_START[i][0] * T, y: FOLK_START[i][1] * T, dir: 0, frame: 0, animT: 0, moving: false, t: 0, dx: 0, dy: 0, q: i }));
const TOWN = { x0: 33, y0: 9, x1: 46, y1: 18 };

function updateFolks(dt) {
  for (const f of folks) {
    f.t -= dt;
    if (f.t <= 0) {
      f.t = rand(900, 2600);
      const r = Math.random();
      [f.dx, f.dy] = r < 0.35 ? [0, 0] : [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
    }
    f.moving = !!(f.dx || f.dy);
    if (!f.moving) continue;
    const nx = f.x + f.dx * 0.025 * dt, ny = f.y + f.dy * 0.025 * dt;
    const ok = boxFree(nx, ny) && nx >= TOWN.x0 * T && ny >= TOWN.y0 * T && nx <= TOWN.x1 * T && ny <= TOWN.y1 * T && !nearPlayer(nx, ny);
    if (ok) { f.x = nx; f.y = ny; } else f.t = 0;
    f.dir = f.dx < 0 ? 2 : f.dx > 0 ? 3 : f.dy < 0 ? 1 : 0;
    f.animT += dt; f.frame = Math.floor(f.animT / 180) % 2;
  }
}
const nearPlayer = (x, y) => Math.abs(x - player.x) < 12 && Math.abs(y - player.y) < 10;

// Animals in the pen.
const animals = [
  { kind: "cow", x: 3 * T, y: 18 * T }, { kind: "cow", x: 7 * T, y: 19 * T },
  { kind: "chicken", x: 5 * T, y: 17 * T }, { kind: "chicken", x: 8 * T, y: 17 * T }, { kind: "chicken", x: 3 * T, y: 20 * T },
].map((a, i) => ({ ...a, seed: i, dir: 3, t: 0, dx: 0, dy: 0 }));
function updateAnimals(dt) {
  for (const a of animals) {
    a.t -= dt;
    if (a.t <= 0) { a.t = rand(1200, 3500); [a.dx, a.dy] = Math.random() < 0.5 ? [0, 0] : [rand(-1, 1), rand(-0.6, 0.6)]; }
    const sp = a.kind === "cow" ? 0.008 : 0.014;
    a.x = Math.max(2 * T, Math.min(8.5 * T, a.x + a.dx * sp * dt));
    a.y = Math.max(16.6 * T, Math.min(19.8 * T, a.y + a.dy * sp * dt));
    if (a.dx) a.dir = a.dx < 0 ? 2 : 3;
  }
}

// ================================================================ input

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

if (matchMedia("(pointer: coarse)").matches) {
  document.querySelectorAll(".dpad button").forEach((b) => {
    const on = (e) => { e.preventDefault(); held.add(b.dataset.dir); b.classList.add("on"); };
    const off = () => { held.delete(b.dataset.dir); b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });
  $("aBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); if (!dialogOpen) interact(); });
}

// ================================================================ UI helpers

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
  const prev = Art.getContext();
  Art.useContext(c.getContext("2d"));
  draw(performance.now());
  Art.useContext(prev);
  return c;
}
const ICONS = {
  orby: () => icon((t) => Art.orby(0, 0, t)),
  farmer: () => icon(() => Art.person(0, 1, 0, 0, false)),
  robot: () => icon((t) => Art.robot(0, 2, 0, 1000, { busy: true })),
  chatter: () => icon(() => Art.crop(0, 1, "chatter", 3, 1)),
  rumor: () => icon(() => Art.crop(0, 1, "rumor", 3, 1)),
  mail: () => icon(() => Art.getContext().drawImage(Art.mailbox(true), 0, -3)),
  board: () => icon(() => Art.getContext().drawImage(Art.board(), 0, -6)),
  coin: () => icon(() => { const g = Art.getContext(); g.fillStyle = C.gold2; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill(); g.fillStyle = C.gold; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.fill(); }),
  person: (look) => () => icon(() => Art.person(0, 1, 0, 0, false, look)),
};

// html: string. buttons: [{ label, primary, onClick, keepOpen }]. who: { name, icon }. banner: image url.
function openDialog({ who, html, banner, buttons = [{ label: "OK", primary: true }], onOpen }) {
  const d = $("dialog");
  d.innerHTML = "";
  if (banner) {
    const img = document.createElement("img");
    img.className = "banner"; img.src = banner; img.alt = "";
    d.append(img);
  }
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
}

const ORBY = { name: "Orby", icon: ICONS.orby };

// ================================================================ interactions

function facingTile() {
  const cx = player.x + 8, cy = player.y + 12;
  const [dx, dy] = [[0, 1], [0, -1], [-1, 0], [1, 0]][S.dir];
  return [Math.floor((cx + dx * 12) / T), Math.floor((cy + dy * 16) / T)];
}
const standingTile = () => [Math.floor((player.x + 8) / T), Math.floor((player.y + 12) / T)];

function personAt(x, y) {
  const cx = x * T + 8, cy = y * T + 8;
  return folks.find((f) => Math.abs(f.x + 8 - cx) < 14 && Math.abs(f.y + 10 - cy) < 14);
}

function interact() {
  if (fishing) return reelIn();
  const [fx, fy] = facingTile();
  const folk = personAt(fx, fy);
  if (folk) return chat(folk);
  const e = inMap(fx, fy) ? owner[fy][fx] : null;
  if (e) {
    const actions = {
      house: visitHouse, silo: visitSilo, station: visitStation, barn: visitBarn, greenhouse: visitGreenhouse,
      gazette: visitGazette, fountain: visitFountain, stall: visitStall, mailbox: openMailbox, board: () => openJournal(), orby: () => talkToOrby(),
    };
    if (actions[e.kind]) return actions[e.kind]();
  }
  for (const [x, y] of [[fx, fy], standingTile()]) {
    const i = plotAt(x, y);
    if (i >= 0) return usePlot(i);
  }
  if (isWater(fx, fy)) return cast(fx, fy);
}

// --- Orby

const TIPS = [
  "Welcome to Orbio Valley! I'm Orby. Every crop on this farm is grown by a little AI scout robot that reads the internet about a meme coin.",
  "Head into the fenced field and press <b>Space</b> (or <b>A</b>) on an empty patch of soil. Pick a seed, give it a ticker like <b>$PEPE</b>, and a robot will tend it.",
  "<b>Chatter Carrots</b> read what people on X are posting. <b>Rumor Radishes</b> search the open web. When it ripens you harvest the report.",
  "Walk down to the lake dock and cast a line to catch whatever coins are trending today. Rarer fish means more hype. The lake restocks every morning.",
  "Everything runs on <b>Orbio</b>: one balance pays for the AI model <i>and</i> the X and web reads. Check the mailbox to sign in, and the silo to see your spending.",
  "Over the bridge is town. Folks there love to gossip about coins. Remember: scouts only look. Hype isn't value, and lots of these coins are rugs!",
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

function chat(f) {
  f.dx = f.dy = 0; f.t = 3000;
  f.dir = player.x < f.x - 6 ? 2 : player.x > f.x + 6 ? 3 : player.y < f.y ? 1 : 0;
  const [name, line] = QUOTES[f.q % QUOTES.length];
  f.q += LOOKS.length;
  openDialog({ who: { name, icon: ICONS.person(f.look) }, html: `<p>${line}</p>` });
}

// --- places

function visitHouse() {
  openDialog({
    who: { name: "Farmhouse", icon: ICONS.farmer },
    html: `<p>It's ${clockText()}. Go to bed and start Day ${S.day + 1}? The lake restocks with fresh trending coins in the morning.</p>`,
    buttons: [{ label: "Sleep", primary: true, onClick: () => sleep() }, { label: "Not yet" }],
  });
}

function sleep(passedOut) {
  fishing = null;
  S.day += 1;
  S.minutes = 0;
  S.px = 7 * T; S.py = 8 * T; S.dir = 0;
  save();
  const card = $("sleepCard");
  $("sleepDay").textContent = `Day ${S.day}`;
  $("sleepMsg").textContent = passedOut ? "You stayed out too late and passed out… the robots carried you home." : "The robots kept watch over the farm all night.";
  card.hidden = false;
  card.classList.remove("fade");
  setTimeout(() => card.classList.add("fade"), 2200);
  setTimeout(() => { card.hidden = true; toast(`☀ Good morning! Day ${S.day}`); }, 3000);
}

function visitStation() {
  const working = bots.filter((b) => b.state === "work" || b.state === "walk").length;
  openDialog({
    banner: "assets/banner-station.webp",
    who: { name: "Scout Station", icon: ICONS.robot },
    html: `<p>This is where your scout robots charge up. Every seed you plant sends one out to the field. It reads X or the web through Orbio, asks an AI model what it all means, and grows the answer into a crop.</p>
      <p><b>${working}</b> scout${working === 1 ? "" : "s"} out in the field right now.</p>`,
  });
}

function visitSilo() {
  openDialog({
    who: { name: "Credit Silo", icon: ICONS.coin },
    html: `<p>The silo keeps track of the Orbio credits your farm burns through. 1 CREDIT = $1 of AI and data.</p>
      <p>Spent on scouting so far: <b>${S.spent.toFixed(4)} CREDIT</b>${Orbio.isSignedIn() ? "" : " (pretend mode is free)"}.</p>
      <p>Orbio sells credits below list price, resold by people who earned them. Want to see how much it would save on your own AI bill?</p>`,
    buttons: [
      { label: "🐷 Open the piggy bank", primary: true, onClick: () => open("piggy.html", "_blank", "noopener") },
      { label: "Visit orbio.so", onClick: () => open("https://www.orbio.so", "_blank", "noopener") },
      { label: "Leave" },
    ],
  });
}

function visitBarn() {
  openDialog({ who: { name: "Barn", icon: ICONS.robot }, html: `<p>The cows don't care about meme coins. The chickens are suspiciously into $EGG.</p>` });
}
function visitGreenhouse() {
  openDialog({ who: { name: "Greenhouse", icon: ICONS.robot }, html: `<p>Warm and glowing. A sign on the door says: <i>"Rare seeds coming soon: Whale Watermelons that track big wallets on-chain."</i></p>` });
}
function visitStall() {
  const lines = ["Fresh turnips! Not a coin. Just turnips.", "Today's special: a pumpkin shaped like a candle chart.", "I'll trade you an apple for one hot tip.", "Sunflowers! They always point up, unlike my portfolio."];
  openDialog({ who: { name: "Market stall", icon: ICONS.person(LOOKS[1]) }, html: `<p>${lines[Math.floor(Math.random() * lines.length)]}</p>` });
}
function visitFountain() {
  openDialog({ who: { name: "The Coin Cat statue", icon: ICONS.coin }, html: `<p>The town's founding cat, cast in stone, clutching a single golden coin. Locals toss pebbles in and whisper tickers for luck.</p>` });
}

function visitGazette() {
  const recent = [...S.fishLog.slice(0, 3)];
  openDialog({
    banner: "assets/banner-town.webp",
    who: { name: "The Meme Gazette", icon: ICONS.coin },
    html: `<p>"Read all about it! Whatever the valley is buzzing about, the lake is full of it. Our reporters are robots, our sources are posts on X, and none of this is financial advice."</p>
      ${recent.length ? `<p>Latest catches around town:</p>${recent.map(fishCard).join("")}` : `<p class="hint">Nothing in the paper yet. Go catch something from the lake dock!</p>`}`,
    buttons: [{ label: "Read the whole journal", primary: true, onClick: () => openJournal("fish") }, { label: "Leave" }],
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
    sendBotHome(i);
    return openDialog({ who: ORBY, html: `<p>This one wilted. ${esc(p.error)}</p><p class="hint">I cleared the soil so you can replant.</p>` });
  }
  if (!isRipe(p)) {
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
  spawnScoutBot(i);
  toast(`🌱 Planted a ${SEEDS[kind].name} for $${ticker}. A scout bot is on its way!`);
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
  sendBotHome(i);
  if (r.real) refreshBalance();
  openDialog({
    who: { name: `${SEEDS[p.kind].name} harvested!`, icon: ICONS[p.kind] },
    html: cropCard(entry) + `<p class="hint">Your scout bot is carrying the crate home. Saved to the bulletin board (press J).</p>`,
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
  if (stockingPond) return toast("Orby is still stocking the lake…");
  if (S.pondDay !== S.day) {
    stockingPond = true;
    toast("🎣 Orby is stocking the lake with today's trending coins…", 6000);
    try {
      const res = await Orbio.scoutPond();
      S.pond = res.fish;
      S.pondDay = S.day;
      S.spent += res.cost || 0;
      save();
      if (res.real) refreshBalance();
      toast(S.pond.length ? `The lake is stocked: ${S.pond.length} fish today! Cast again.` : "Nothing's biting today. Try again tomorrow.");
    } catch (err) {
      toast(errorText(err), 4000);
    } finally {
      stockingPond = false;
    }
    return;
  }
  if (!S.pond.length) return toast("You've fished the lake empty! Sleep to restock it.");
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
    : (fish.length ? fish.map(fishCard).join("") : `<p class="empty">No fish yet. Cast from the lake dock!</p>`);
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

// ================================================================ update

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
  const len = Math.hypot(dx, dy), speed = 0.075 * dt;
  tryMove((dx / len) * speed, 0);
  tryMove(0, (dy / len) * speed);
  player.animT += dt;
  player.frame = Math.floor(player.animT / 150) % 2;
}

// feet hitbox
function boxFree(nx, ny) {
  return ![[nx + 4, ny + 10], [nx + 11.9, ny + 10], [nx + 4, ny + 15.9], [nx + 11.9, ny + 15.9]]
    .some(([x, y]) => solidTile(Math.floor(x / T), Math.floor(y / T)));
}
function tryMove(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy;
  if (!boxFree(nx, ny)) return;
  if (folks.some((f) => Math.abs(f.x - nx) < 9 && Math.abs(f.y - ny) < 6)) return;
  player.x = nx; player.y = ny;
}

function cropStage(p) {
  if (!p || p.status === "wilted") return -1;
  if (isRipe(p)) return 3;
  return Math.min(2, Math.floor(((Date.now() - p.plantedAt) / GROW_MS) * 3));
}

// ================================================================ draw

// Static ground is painted once into an offscreen canvas.
const groundLayer = document.createElement("canvas");
groundLayer.width = MAP_W * T; groundLayer.height = MAP_H * T;
function paintGround() {
  const prev = Art.getContext();
  Art.useContext(groundLayer.getContext("2d"));
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const g = ground[y][x], px = x * T, py = y * T;
    if (g === "c") Art.cobble(px, py, x, y);
    else if (g === "d") Art.dirt(px, py, x, y);
    else if (g === "r") Art.cliff(px, py);
    else if (g === "b") Art.bridge(px, py, true, true);
    else if (g === "k") Art.dock(px, py);
    else if (g === "w" || g === "f") Art.water(px, py, x, y, 0);
    else Art.grass(px, py, x, y);
    if (walkableGround(x, y) && g !== "b" && g !== "k") Art.bank(px, py, isWater(x, y - 1), isWater(x, y + 1), isWater(x - 1, y), isWater(x + 1, y));
  }
  Art.useContext(prev);
}

// Light level through the day: 0 = noon, 1 = deep night. Plus a warm sunset tint.
function lighting() {
  const h = 6 + S.minutes / 60;
  const night = h < 7 ? 0.35 * (7 - h) : h < 17 ? 0 : h < 20.5 ? (h - 17) / 3.5 : 1;
  const sunset = h < 7 ? 0.5 * (7 - h) : h < 16 ? 0 : h < 18.5 ? (h - 16) / 2.5 : h < 20.5 ? 1 - (h - 18.5) / 2 : 0;
  return { night: Math.max(0, Math.min(1, night)), sunset: Math.max(0, Math.min(1, sunset)), lit: h >= 17.5 || h < 6.5 };
}

const lightLayer = document.createElement("canvas");
lightLayer.width = VIEW_W; lightLayer.height = VIEW_H;
const lctx = lightLayer.getContext("2d");

const fireflies = Array.from({ length: 26 }, () => ({ x: rand(1, MAP_W - 1) * T, y: rand(9, MAP_H - 2) * T, ph: rand(0, 6.28) }));

function draw(now) {
  const camX = Math.round(Math.max(0, Math.min(MAP_W * T - VIEW_W, player.x + 8 - VIEW_W / 2)));
  const camY = Math.round(Math.max(0, Math.min(MAP_H * T - VIEW_H, player.y + 8 - VIEW_H / 2)));
  const L = lighting();
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.drawImage(groundLayer, camX, camY, VIEW_W, VIEW_H, camX, camY, VIEW_W, VIEW_H);

  // animated water
  const x0 = Math.floor(camX / T), y0 = Math.floor(camY / T);
  for (let y = y0; y <= y0 + VIEW_H / T + 1; y++) for (let x = x0; x <= x0 + VIEW_W / T + 1; x++) {
    if (!inMap(x, y)) continue;
    const g = ground[y][x];
    if (g === "w") Art.water(x * T, y * T, x, y, now);
    else if (g === "f") Art.waterfall(x * T, y * T, now);
  }

  // plots and crops
  const lights = [];
  PLOTS.forEach(([x, y], i) => {
    const p = S.plots[i];
    Art.soilPlot(x * T, y * T, !!p && p.status !== "wilted");
    const st = cropStage(p);
    if (st >= 0) {
      Art.crop(x * T, y * T, p.kind, st, now, L.lit);
      if (st === 3) lights.push([x * T + 8, y * T + 8, 22, "rgba(120,255,200,"]);
    }
    if (p?.status === "wilted") { ctx.fillStyle = "#8a7a5a"; ctx.fillRect(x * T + 6, y * T + 8, 4, 4); }
  });

  // everything that stands up, sorted by where it touches the ground
  const viewL = camX - 64, viewR = camX + VIEW_W + 64, viewT = camY - 16, viewB = camY + VIEW_H + 120;
  const list = [];
  for (const e of ents) {
    if (e.kind === "orby") continue;
    const ex = e.x ?? e.tx * T;
    if (ex > viewR || ex + (e.w || T) < viewL || e.baseY < viewT || e.baseY > viewB) continue;
    list.push({ y: e.baseY, draw: () => { e.draw(now, L.lit); e.after?.(e, now); } });
    if (L.lit && e.lights) for (const [lx, ly, rad] of e.lights) lights.push([e.x + lx, e.y + ly, rad]);
  }
  list.push({ y: orbyNpc.baseY, draw: () => orbyNpc.draw(now) });
  if (!S.metOrby && started) list.push({ y: 9999, draw: () => Art.exclaim(19 * T, 6 * T - 2) });
  list.push({ y: player.y + 16, draw: () => Art.person(Math.round(player.x), Math.round(player.y), S.dir, player.frame, player.moving) });
  for (const b of [...bots, ...ambient]) list.push({ y: b.y + 16, draw: () => Art.robot(Math.round(b.x), Math.round(b.y), b.dir, now, b) });
  for (const f of folks) list.push({ y: f.y + 16, draw: () => Art.person(Math.round(f.x), Math.round(f.y), f.dir, f.frame, f.moving, f.look) });
  for (const a of animals) list.push({ y: a.y + 16, draw: () => (a.kind === "cow" ? Art.cow(Math.round(a.x), Math.round(a.y), a.dir, now) : Art.chicken(Math.round(a.x), Math.round(a.y), now, a.seed)) });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.draw();

  // festival bunting across the plaza
  Art.bunting(37 * T + 8, 10 * T - 12, 41 * T + 8, 10 * T - 12, now);
  Art.bunting(37 * T + 8, 15 * T - 12, 41 * T + 8, 15 * T - 12, now);

  if (fishing) {
    const bx = fishing.tx * T, by = fishing.ty * T;
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(player.x + 13, player.y + 4); ctx.quadraticCurveTo((player.x + bx) / 2 + 8, Math.min(player.y, by) - 6, bx + 8, by + 7); ctx.stroke();
    Art.bobber(bx, by, now, fishing.phase === "bite");
    if (fishing.phase === "bite") Art.exclaim(Math.round(player.x), Math.round(player.y) - 4);
  }

  // highlight what you'd interact with
  if (started && !dialogOpen && !fishing) {
    const [fx, fy] = facingTile();
    const pi = plotAt(fx, fy);
    const e = inMap(fx, fy) ? owner[fy][fx] : null;
    const interesting = personAt(fx, fy) || (e && e.kind !== "tree" && e.kind !== "fence" && e.kind !== "bush" && e.kind !== "lantern") || pi >= 0 || isWater(fx, fy);
    if (interesting && Math.floor(now / 400) % 2) {
      ctx.strokeStyle = pi >= 0 && isRipe(S.plots[pi]) ? C.gold : "rgba(255,255,255,.8)";
      ctx.strokeRect(fx * T + 0.5, fy * T + 0.5, T - 1, T - 1);
    }
  }
  ctx.restore();

  // ---- lighting pass
  if (L.sunset > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = `rgba(255,120,60,${0.55 * L.sunset})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(255,150,90,${0.12 * L.sunset})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }
  if (L.night > 0) {
    lights.push([player.x + 8, player.y + 8, 30]);
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    lctx.fillStyle = `rgba(16,14,52,${0.68 * L.night})`;
    lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    lctx.globalCompositeOperation = "destination-out";
    for (const [lx, ly, rad] of lights) {
      const x = lx - camX, y = ly - camY;
      if (x < -rad || y < -rad || x > VIEW_W + rad || y > VIEW_H + rad) continue;
      const g = lctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = g; lctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.drawImage(lightLayer, 0, 0);
    // warm additive glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [lx, ly, rad, tint] of lights) {
      const x = lx - camX, y = ly - camY;
      if (x < -rad || y < -rad || x > VIEW_W + rad || y > VIEW_H + rad) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 0.8);
      g.addColorStop(0, `${tint || "rgba(255,170,70,"}${(0.32 * L.night).toFixed(2)})`); g.addColorStop(1, `${tint || "rgba(255,170,70,"}0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // fireflies
    for (const f of fireflies) {
      const fx = f.x + Math.sin(now / 1300 + f.ph) * 12 - camX, fy = f.y + Math.cos(now / 1700 + f.ph * 2) * 8 - camY;
      const a = (0.5 + 0.5 * Math.sin(now / 300 + f.ph * 5)) * L.night;
      ctx.fillStyle = `rgba(230,255,140,${a.toFixed(2)})`;
      ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      ctx.fillStyle = `rgba(230,255,140,${(a * 0.25).toFixed(2)})`;
      ctx.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3);
    }
    ctx.restore();
  }
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
  updateBots(dt);
  updateFolks(dt);
  updateAnimals(dt);
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

// ================================================================ boot

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
  // Robots go back to any plots that are still growing or waiting to be picked.
  S.plots.forEach((p, i) => { if (p && p.status !== "wilted") spawnScoutBot(i, true); });
  paintGround();
  fit();
  requestAnimationFrame(frame);

  $("playBtn").addEventListener("click", start);
  $("titleSignIn").addEventListener("click", () => {
    if (Orbio.isConfigured()) Orbio.signIn();
    else { start(); setTimeout(openMailbox, 450); }
  });

  const result = await Orbio.handleRedirect();
  if (result === "signed-in") { start(); toast(`✨ Signed in with Orbio${Orbio.playerName() ? ` as @${Orbio.playerName()}` : ""}. Scouts are live!`, 4000); }
  else if (result === "cancelled") toast("Sign-in cancelled. You can still play in pretend mode.");
  else if (result === "error") toast("Sign-in didn't work. Try again from the mailbox.", 4000);
})();
