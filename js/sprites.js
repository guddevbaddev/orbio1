// Painted sprite overrides. Every sprite in the game has a named slot. If a PNG for that
// slot is listed in assets/sprites/manifest.json, the game draws it; otherwise it falls
// back to the code-drawn art in art.js. So art can be swapped in one piece at a time.
//
// Density: sprite PNGs are drawn at 2 image pixels per game pixel, so one 16px game tile
// is 32×32 in the PNG. Bigger images are scaled down smoothly. Static sprites are anchored
// at the bottom-centre of their footprint, so their height can differ from the code art.

import * as Art from "./art.js";
import * as Blocks from "./blocks.js";

export const SCALE = 2;

// "art" shows painted sprites, falling back to code art. "blocks" shows painted sprites,
// falling back to template blocks, so you can see the bare layout you're making art for.
let mode = (() => {
  try {
    const q = new URLSearchParams(location.search).get("art");
    if (q === "blocks" || q === "art") return q;
    return localStorage.getItem("orbio-art-mode") === "blocks" ? "blocks" : "art";
  } catch { return "art"; }
})();
export const blocksMode = () => mode === "blocks";
export function toggleMode() {
  mode = mode === "blocks" ? "art" : "blocks";
  try { localStorage.setItem("orbio-art-mode", mode); } catch {}
  return mode;
}
const DIR = "assets/sprites/";
const images = new Map();

export async function loadSprites() {
  let files = [];
  try {
    const res = await fetch(`${DIR}manifest.json`, { cache: "no-cache" });
    if (res.ok) files = (await res.json()).files || [];
  } catch {}
  await Promise.all(files.map((f) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => { images.set(f.replace(/\.png$/i, ""), img); ok(); };
    img.onerror = ok;
    img.src = DIR + f;
  })));
  return images.size;
}
export const get = (name) => images.get(name);
export const has = (name) => images.has(name);

function blit(img, sx, sy, sw, sh, dx, dy, dw, dh, flip) {
  const g = Art.getContext();
  const smooth = sw > dw * SCALE + 0.5;
  const prev = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = smooth;
  if (flip) {
    g.save(); g.translate(dx + dw, dy); g.scale(-1, 1);
    g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    g.restore();
  } else g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  g.imageSmoothingEnabled = prev;
}

// A whole-image sprite whose bottom-centre sits at (ax, ay) in game pixels.
export function drawStatic(name, ax, ay, lit) {
  const img = (lit && images.get(`${name}-night`)) || images.get(name);
  if (!img) {
    const slot = SLOT[name];
    if (!slot || !(blocksMode() || !slot.code)) return false;
    // repeated scenery stays unlabelled so the map stays readable
    return Blocks.staticBlock(name, slot.cat, ax, ay, slot.w, slot.h, slot.fw, slot.fh, !/^(fence|tree|bush|lantern)/.test(name));
  }
  const w = img.width / SCALE, h = img.height / SCALE;
  blit(img, 0, 0, img.width, img.height, Math.round(ax - w / 2), Math.round(ay - h), w, h);
  return true;
}

// A 16×16 ground tile. The PNG is a horizontal strip of square cells: variants for
// static tiles (picked per tile so the ground doesn't repeat), or animation frames.
export function drawTile(name, x, y, pick) {
  const img = images.get(name);
  if (!img) return blocksMode() && SLOT[name] ? Blocks.tileBlock(name, x, y, pick) : false;
  const cell = img.height, n = Math.max(1, Math.floor(img.width / cell));
  const i = ((pick % n) + n) % n;
  blit(img, i * cell, 0, cell, cell, x, y, 16, 16);
  return true;
}
export const tileFrames = (name) => { const img = images.get(name); return img ? Math.max(1, Math.floor(img.width / img.height)) : 0; };

// A character sheet: columns are frames, rows are directions (down, up, left, right),
// drawn with its bottom-centre at the bottom-centre of the 16×16 spot (x, y).
export function drawSheet(name, x, y, row, col, flip) {
  const slot = SLOT[name], img = images.get(name);
  if (!slot) return false;
  if (!img) return blocksMode() ? Blocks.sheetBlock(name, slot.cat, x, y, slot.cellW, slot.cellH, row, col) : false;
  const { cols, rows } = gridOf(slot, img);
  const cw = img.width / cols, ch = img.height / rows;
  const r = Math.min(row, rows - 1), c = Math.min(col, cols - 1);
  const w = slot.cellW / SCALE, h = slot.cellH / SCALE;
  blit(img, c * cw, r * ch, cw, ch, Math.round(x + 8 - w / 2), Math.round(y + 16 - h), w, h, flip);
  return true;
}
export const sheetRows = (name) => (SLOT[name] && images.get(name) ? gridOf(SLOT[name], images.get(name)).rows : 0);

// A sheet may be a full grid, a single row of frames, or just one still picture.
function gridOf(slot, img) {
  const aspect = slot.cellW / slot.cellH;
  if (Math.abs(img.width / img.height - aspect) / aspect < 0.2) return { cols: 1, rows: 1 };
  const cw = img.width / slot.cols;
  return { cols: slot.cols, rows: Math.max(1, Math.round(img.height / (cw / aspect))) };
}

// ---------------------------------------------------------------- the slot list
// kind: static (one image), tile (strip of 32×32 cells), sheet (grid of cells).
// w/h are game pixels for static sprites; cellW/cellH are PNG pixels for sheets.

const statics = (name, w, h, desc, code, night) => ({ name, kind: "static", w, h, desc, code, night });
export const SLOTS = [
  statics("farmhouse", 112, 112, "Your timber farmhouse. Footprint 7×4 tiles; the door is at the bottom centre.", (lit) => Art.farmhouse(lit), true),
  statics("barn", 80, 96, "Red barn with a big door at the bottom centre. Footprint 5×4 tiles.", (lit) => Art.barn(lit), true),
  statics("silo", 32, 88, "Tall coin silo with the Orbio orb emblem. Footprint 2×2 tiles.", () => Art.silo()),
  statics("station", 32, 48, "Scout Station, the robots' charging machine. The floating coin on top is animated by the game, so leave the top ~10px empty.", (lit) => Art.stationBody(lit), true),
  statics("greenhouse", 96, 88, "Glass greenhouse with a door at the bottom centre. Footprint 6×4 tiles.", (lit) => Art.greenhouse(lit), true),
  statics("gazette", 96, 104, "The Meme Gazette shop: green roof, big shiba coin sign, door at the bottom centre. Footprint 6×4 tiles.", (lit) => Art.gazette(lit), true),
  statics("fountain", 48, 72, "Town fountain with the stone cat holding a gold coin. Footprint 3×3 tiles.", () => Art.fountain()),
  statics("stall-red", 32, 40, "Market stall with a red-and-white awning and produce. Footprint 2×1 tiles.", () => Art.stall(Art.C.red)),
  statics("stall-blue", 32, 40, "Market stall, blue awning.", () => Art.stall(Art.C.overall)),
  statics("stall-green", 32, 40, "Market stall, green awning.", () => Art.stall(Art.C.roofGreen)),
  statics("stall-orange", 32, 40, "Market stall, orange awning.", () => Art.stall(Art.C.orange)),
  statics("lantern", 16, 32, "Iron lamp post. Footprint 1 tile.", (lit) => Art.lantern(lit), true),
  statics("tree-round", 32, 44, "Leafy round tree. Trunk sits on one tile.", () => Art.treeSprite("round")),
  statics("tree-apple", 32, 44, "Apple tree with red apples.", () => Art.treeSprite("apple")),
  statics("tree-cherry", 32, 44, "Pink cherry blossom tree.", () => Art.treeSprite("cherry")),
  statics("tree-pine", 32, 44, "Pine tree for the forest edge.", () => Art.treeSprite("pine")),
  statics("bush-pink", 16, 16, "Flowering bush, pink flowers.", () => Art.bushSprite("pink")),
  statics("bush-white", 16, 16, "Flowering bush, white flowers.", () => Art.bushSprite("white")),
  statics("bush-red", 16, 16, "Bush with red berries.", () => Art.bushSprite("red")),
  statics("bush-purple", 16, 16, "Flowering bush, purple flowers.", () => Art.bushSprite("purple")),
  statics("sunflower", 16, 30, "A pair of tall sunflowers.", () => Art.sunflowerSprite()),
  statics("crate", 16, 16, "Wooden crate of fruit.", () => Art.crate()),
  statics("barrel", 16, 18, "Wooden barrel.", () => Art.barrel()),
  statics("hay", 16, 14, "Hay bale.", () => Art.hay()),
  statics("board", 16, 24, "Bulletin board on two posts.", () => Art.board()),
  statics("mailbox", 16, 20, "Blue mailbox on a post.", () => Art.mailbox(true)),
  statics("fence-h", 16, 16, "Horizontal fence section (one tile, tiles left-right).", () => cell((g) => Art.fenceH(0, 0))),
  statics("fence-v", 16, 16, "Vertical fence section (one tile, tiles top-bottom).", () => cell((g) => Art.fenceV(0, 0))),

  { name: "grass", kind: "tile", n: 4, desc: "Grass. Any number of 32×32 variants side by side; they're scattered at random. Must tile seamlessly.", code: (x, y, i) => Art.grass(x, y, i * 7, i * 3) },
  { name: "cobble", kind: "tile", n: 2, desc: "Cobblestone road and town square. Seamless variants.", code: (x, y, i) => Art.cobble(x, y, i, i * 2) },
  { name: "dirt", kind: "tile", n: 2, desc: "Dirt footpath. Seamless variants.", code: (x, y, i) => Art.dirt(x, y, i * 5, i) },
  { name: "soil", kind: "tile", n: 1, desc: "Tilled soil patch (dry) where crops grow.", code: (x, y) => Art.soilPlot(x, y, false) },
  { name: "soil-wet", kind: "tile", n: 1, desc: "Tilled soil patch (watered, darker) while a crop is growing.", code: (x, y) => Art.soilPlot(x, y, true) },
  { name: "water", kind: "tile", n: 4, desc: "Lake and river water. Cells are animation frames, played left to right. Seamless.", code: (x, y, i) => Art.water(x, y, 0, 0, i * 380) },
  { name: "waterfall", kind: "tile", n: 4, desc: "Falling water. Animation frames, seamless top-to-bottom.", code: (x, y, i) => Art.waterfall(x, y, i * 90) },
  { name: "cliff", kind: "tile", n: 1, desc: "Rock cliff beside the waterfall.", code: (x, y) => Art.cliff(x, y) },
  { name: "bridge", kind: "tile", n: 1, desc: "Wooden bridge planks running left-right, with rails at top and bottom.", code: (x, y) => Art.bridge(x, y, true, true) },
  { name: "dock", kind: "tile", n: 1, desc: "Wooden dock planks out over the lake.", code: (x, y) => Art.dock(x, y) },

  { name: "farmer", kind: "sheet", cols: 3, rows: 4, cellW: 32, cellH: 40, desc: "The player. Columns: standing, step A, step B. Rows: facing down, up, left, right.", code: (d, f) => Art.person(0, 4, d, f ? f - 1 : 0, f > 0) },
  { name: "robot", kind: "sheet", cols: 3, rows: 5, cellW: 32, cellH: 40, desc: "Scout robot (white body, dark visor, cyan eyes, leaf sprout). Rows: down, up, left, right, and a 5th row carrying a crate of veg.", code: (d, f, t) => Art.robot(0, 4, d === 4 ? 0 : d, 400 + f * 180, { moving: f > 0, carrying: d === 4 }) },
  { name: "robot-hat", kind: "sheet", cols: 3, rows: 5, cellW: 32, cellH: 40, desc: "Farmhand robot wearing a straw hat. Same layout as robot.", code: (d, f) => Art.robot(0, 4, d === 4 ? 0 : d, 400 + f * 180, { moving: f > 0, carrying: d === 4, hat: true }) },
  ...[1, 2, 3, 4].map((i) => ({ name: `folk-${i}`, kind: "sheet", cols: 3, rows: 4, cellW: 32, cellH: 40, desc: `Townsperson #${i}. Same layout as farmer.`, folk: i - 1 })),
  { name: "cow", kind: "sheet", cols: 2, rows: 1, cellW: 48, cellH: 36, desc: "Cow facing right (flipped for left). Two idle/walk frames.", code: (d, f) => Art.cow(2, 2, 3, f * 400) },
  { name: "chicken", kind: "sheet", cols: 2, rows: 1, cellW: 32, cellH: 32, desc: "Chicken facing right. Frame 2 is pecking.", code: (d, f) => Art.chicken(0, 0, f ? 0 : 400, 0) },
  { name: "orby", kind: "sheet", cols: 4, rows: 1, cellW: 32, cellH: 32, desc: "Orby, the lime-green orb spirit (Orbio's mascot). Four frames of a gentle bob.", code: (d, f) => Art.orby(0, 0, f * 600) },
  { name: "crop-chatter", kind: "sheet", cols: 4, rows: 1, cellW: 32, cellH: 32, desc: "Chatter Carrot growth stages: seeds, sprout, leafy, ripe carrot.", code: (d, f) => Art.crop(0, 0, "chatter", f, 1) },
  { name: "crop-rumor", kind: "sheet", cols: 4, rows: 1, cellW: 32, cellH: 32, desc: "Rumor Radish growth stages: seeds, sprout, leafy, ripe radish.", code: (d, f) => Art.crop(0, 0, "rumor", f, 1) },
];
// Footprint (tiles the thing stands on) and category for each slot.
const FOOT = { farmhouse: [7, 4], barn: [5, 4], silo: [2, 2], station: [2, 2], greenhouse: [6, 4], gazette: [6, 4], fountain: [3, 3] };
for (const s of SLOTS) {
  if (s.kind === "static") {
    [s.fw, s.fh] = FOOT[s.name] || (s.name.startsWith("stall") ? [2, 1] : [1, 1]);
    s.cat = s.fw > 1 || s.name.startsWith("stall") ? "building" : /^(tree|bush|sunflower)/.test(s.name) ? "nature" : "prop";
  } else if (s.kind === "sheet") s.cat = s.name.startsWith("crop") ? "crop" : "character";
  else s.cat = "tile";
}
const SLOT = Object.fromEntries(SLOTS.map((s) => [s.name, s]));

// ---------------------------------------------------------------- the world file
// assets/world.json adds new props and buildings without touching code:
// { "decor": [ { "name": "well", "x": 26, "y": 17, "w": 1, "h": 1, "size": [32, 48],
//                "solid": true, "light": 0, "title": "Old well", "say": "…" } ] }
// x/y/w/h are the footprint in tiles; size is the PNG size (2× game pixels).
export async function loadWorld() {
  let world = { decor: [] };
  try {
    const res = await fetch("assets/world.json", { cache: "no-cache" });
    if (res.ok) world = { decor: [], ...(await res.json()) };
  } catch {}
  for (const d of world.decor) {
    if (!d.name || SLOT[d.name]) continue;
    const [pw, ph] = d.size || [(d.w || 1) * 32, (d.h || 1) * 32];
    const slot = { name: d.name, kind: "static", w: pw / SCALE, h: ph / SCALE, fw: d.w || 1, fh: d.h || 1, cat: d.category || "prop",
      desc: `${d.title || d.name} (from assets/world.json). Footprint ${d.w || 1}×${d.h || 1} tiles at (${d.x}, ${d.y}).`, custom: true };
    SLOTS.push(slot);
    SLOT[d.name] = slot;
  }
  return world;
}

// ---------------------------------------------------------------- templates
// Renders a slot's current code art at the target PNG size, for painting over.

function cell(draw, w = 16, h = 16) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const prev = Art.getContext();
  Art.useContext(c.getContext("2d"));
  draw();
  Art.useContext(prev);
  return c;
}
function upscale(src) {
  const c = document.createElement("canvas");
  c.width = src.width * SCALE; c.height = src.height * SCALE;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function template(slot, lit = false) {
  if (slot.kind === "static") return upscale(slot.code(lit));
  if (slot.kind === "tile") return upscale(cell(() => { for (let i = 0; i < slot.n; i++) slot.code(i * 16, 0, i); }, slot.n * 16, 16));
  const cw = slot.cellW / SCALE, ch = slot.cellH / SCALE;
  const LOOKS = [
    { hair: "#3b2416", hat: null, shirt: "#e0483a", pants: "#55331b" },
    { hair: "#f0d070", hat: Art.C.straw, shirt: "#5aa05a", pants: "#3f6fc0" },
    { hair: "#7a3a1a", hat: "#3f6fc0", shirt: "#f2f0e6", pants: "#6d4426" },
    { hair: "#cfcfcf", hat: null, shirt: "#9b6ad8", pants: "#2e3245" },
  ];
  return upscale(cell(() => {
    const g = Art.getContext();
    for (let row = 0; row < slot.rows; row++) for (let col = 0; col < slot.cols; col++) {
      g.save();
      g.translate(col * cw + (slot.cellH === 40 ? (cw - 16) / 2 : 0), row * ch);
      if (slot.folk != null) Art.person(0, 4, row, col ? col - 1 : 0, col > 0, LOOKS[slot.folk]);
      else slot.code(row, col);
      g.restore();
    }
  }, cw * slot.cols, ch * slot.rows));
}

// Block guide: the template block at the PNG size, with the tile grid, footprint and
// anchor marked, and each sheet cell labelled with its direction and frame.
export function blockTemplate(slot) {
  const prevMode = mode;
  mode = "blocks";
  let c;
  if (slot.kind === "static") {
    c = cell(() => Blocks.staticBlock(slot.name, slot.cat, slot.w / 2, slot.h, slot.w, slot.h, slot.fw, slot.fh), slot.w, slot.h);
  } else if (slot.kind === "tile") {
    c = cell(() => { for (let i = 0; i < slot.n; i++) { Blocks.tileBlock(slot.name, i * 16, 0, i); Art.tinyText(String(i + 1), i * 16 + 2, 2, "#24160f"); } }, slot.n * 16, 16);
  } else {
    const cw = slot.cellW / SCALE, ch = slot.cellH / SCALE;
    c = cell(() => {
      const g = Art.getContext();
      for (let row = 0; row < slot.rows; row++) for (let col = 0; col < slot.cols; col++) {
        const x0 = col * cw, y0 = row * ch;
        Blocks.sheetBlock(slot.name, slot.cat, x0 + cw / 2 - 8, y0 + ch - 16, slot.cellW, slot.cellH, slot.rows > 1 ? row : 3, col, false);
        g.fillStyle = "rgba(36,22,15,.35)"; g.fillRect(x0, y0 + ch - 1, cw, 1); g.fillRect(x0 + cw - 1, y0, 1, ch);
        if (slot.rows > 1 && col === 0) {
          const t = ["DN", "UP", "LT", "RT", "CRY"][row];
          g.fillStyle = "#fff"; g.fillRect(x0, y0, t.length * 4 + 1, 7);
          Art.tinyText(t, x0 + 1, y0 + 1, "#24160f");
        }
      }
    }, cw * slot.cols, ch * slot.rows);
  }
  mode = prevMode;
  const big = upscale(c);
  // tile grid lines every 32 PNG pixels (one game tile)
  const g = big.getContext("2d");
  g.fillStyle = "rgba(36,22,15,.18)";
  if (slot.kind !== "sheet") {
    for (let x = 32; x < big.width; x += 32) g.fillRect(x, 0, 1, big.height);
    for (let y = big.height - 32; y > 0; y -= 32) g.fillRect(0, y, big.width, 1);
  }
  return big;
}

export function sizeLabel(slot) {
  if (slot.kind === "static") return `${slot.w * SCALE}×${slot.h * SCALE}`;
  if (slot.kind === "tile") return `32×32 per cell (template has ${slot.n})`;
  return `${slot.cellW}×${slot.cellH} per cell, ${slot.cols} cols × ${slot.rows} rows = ${slot.cellW * slot.cols}×${slot.cellH * slot.rows}`;
}
