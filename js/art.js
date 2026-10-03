// All in-game pixel art, drawn with code, in the warm style of the concept paintings
// (assets/*.webp). Ground tiles are 16×16. Tall things (buildings, trees, people) are
// drawn as sprites anchored at the bottom of their footprint so they can overlap what's
// behind them. Static sprites are rendered once and cached.

export const T = 16;

export const C = {
  ink: "#24160f", outline: "#3a2416",
  grass: "#6fb04a", grass2: "#5e9d3d", grass3: "#86c65a", grassDark: "#4c8a32",
  cobble: "#cdb48c", cobble2: "#b39871", cobbleGap: "#8e7656", cobbleHi: "#e2cba3",
  dirt: "#c99456", dirt2: "#b58046", soil: "#6b4428", soil2: "#57361f", soilWet: "#4a2c19",
  water: "#3b93d4", water2: "#58b2ec", water3: "#2c78b8", foam: "#d9f3ff",
  rock: "#8d8a83", rock2: "#6e6b65", rockHi: "#aeaba3",
  wood: "#9a6334", wood2: "#7c4c26", woodDark: "#55331b", woodHi: "#b97c45",
  plaster: "#ecdbb4", plaster2: "#d9c398",
  slate: "#3d4257", slate2: "#2e3245", slateHi: "#525a74",
  barn: "#b8402f", barn2: "#93311f", trim: "#f1e6d2",
  roofGreen: "#3f7f5a", roofGreen2: "#2f6446",
  glow: "#ffd36b", glow2: "#ffb54a", windowDay: "#8fc8e8", windowDay2: "#6aa6cc",
  leaf: "#3f8a3a", leaf2: "#55a447", leaf3: "#2d6a2e", leafHi: "#7cc35a", trunk: "#6d4426", trunk2: "#53321b",
  pine: "#2f6b45", pine2: "#245636", pineHi: "#3f8656",
  cherry: "#f0a3c8", cherry2: "#dc7fb0", cherryHi: "#ffd0e6",
  apple: "#d83a2e", gold: "#ffcc3d", gold2: "#e09e1e", goldHi: "#fff0a0",
  neon: "#d4ff3f", neon2: "#9cc61f",
  metal: "#9fb0c2", metal2: "#71839a", metalHi: "#d3dde8", screen: "#1c2b45", cyan: "#5fe0ff",
  robot: "#eef2f6", robot2: "#c9d2dc", visor: "#1d2a44",
  skin: "#f6c89b", skin2: "#e0a77a", hair: "#d86a2c", straw: "#efc561", straw2: "#cc9c3a",
  shirt: "#f2f0e6", overall: "#3f6fc0", overall2: "#2f569a", boot: "#55331b",
  pink: "#ff9ec7", white: "#ffffff", red: "#e0483a", orange: "#ff8a2a", purple: "#9b6ad8", sky: "#9fd8ff",
  sunflower: "#ffcf2e", sunflower2: "#b56a1f",
};

let ctx;
export const useContext = (c) => { ctx = c; };
export const getContext = () => ctx;
const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const p = (x, y, c) => r(x, y, 1, 1, c);
function ellipse(cx, cy, rx, ry, c) {
  ctx.fillStyle = c;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
  }
}
// Isoceles triangle pointing up: apex at (cx, top), base width w at y = top + h.
function tri(cx, top, w, h, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < h; i++) {
    const half = Math.round(((i + 1) / h) * (w / 2));
    ctx.fillRect(cx - half, top + i, half * 2, 1);
  }
}
const shadow = (cx, cy, rx, ry) => ellipse(cx, cy, rx, ry, "rgba(30,20,10,.22)");
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

// ---------------------------------------------------------------- sprite cache

const cache = new Map();
export function cached(key, w, h, draw) {
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = w; c.height = h;
    const prev = ctx;
    ctx = c.getContext("2d");
    draw();
    ctx = prev;
    cache.set(key, c);
  }
  return c;
}

// ---------------------------------------------------------------- ground

export function grass(x, y, tx, ty) {
  r(x, y, T, T, C.grass);
  const h = hash(tx, ty);
  if (h % 5 === 0) r(x + (h % 9), y + ((h >> 4) % 9), 6, 5, C.grass2);
  for (let i = 0; i < 6; i++) {
    const px = (h >> (i * 3)) % 15, py = (h >> (i * 5 + 1)) % 14;
    r(x + px, y + py, 1, 2, i % 2 ? C.grassDark : C.grass3);
  }
  if (h % 11 === 0) { p(x + 6, y + 6, C.white); p(x + 7, y + 7, C.gold); p(x + 5, y + 7, C.white); p(x + 6, y + 8, C.white); p(x + 7, y + 6, C.white); }
  if (h % 17 === 3) { r(x + 10, y + 3, 2, 2, C.pink); p(x + 10, y + 3, C.white); }
  if (h % 23 === 5) { r(x + 3, y + 11, 2, 2, C.purple); }
}

export function cobble(x, y, tx, ty) {
  r(x, y, T, T, C.cobbleGap);
  const h = hash(tx, ty);
  // two staggered rows of rounded stones
  for (let row = 0; row < 3; row++) {
    const off = (row + tx + ty) % 2 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const sx = x + col * 7 + off, sy = y + row * 6 - 1;
      const sw = 6, sh = 5;
      const cx0 = Math.max(x, sx), cx1 = Math.min(x + T, sx + sw);
      const cy0 = Math.max(y, sy), cy1 = Math.min(y + T, sy + sh);
      if (cx1 <= cx0 || cy1 <= cy0) continue;
      r(cx0, cy0, cx1 - cx0, cy1 - cy0, ((h >> (row * 3 + col + 1)) & 3) === 0 ? C.cobble2 : C.cobble);
      if (sy >= y) r(cx0, sy, Math.min(3, cx1 - cx0), 1, C.cobbleHi);
    }
  }
}

export function dirt(x, y, tx, ty) {
  r(x, y, T, T, C.dirt);
  const h = hash(tx, ty);
  for (let i = 0; i < 5; i++) r(x + ((h >> (i * 4)) % 15), y + ((h >> (i * 4 + 2)) % 15), 2, 1, C.dirt2);
  if (h % 7 === 0) r(x + 4, y + 9, 2, 2, C.rock);
}

export function soilPlot(x, y, watered) {
  r(x, y, T, T, C.soil2);
  r(x + 1, y + 1, 14, 14, watered ? C.soilWet : C.soil);
  for (let i = 0; i < 3; i++) r(x + 2, y + 3 + i * 4, 12, 1, watered ? "#3a2213" : C.soil2);
  r(x + 1, y + 1, 14, 1, "#8a5a36");
}

export function water(x, y, tx, ty, t) {
  r(x, y, T, T, C.water);
  const ph = Math.floor(t / 380 + tx * 0.7 + ty * 1.3) % 4;
  r(x + 2 + ph * 2, y + 4, 4, 1, C.water2);
  r(x + 9 - ph, y + 11, 4, 1, C.water2);
  if ((tx + ty) % 3 === 0) r(x + 5, y + 8 + (ph % 2), 3, 1, C.water3);
}

// Rocky bank drawn on land tiles that touch water: dir flags say where the water is.
export function bank(x, y, n, s, w, e) {
  if (n) { r(x, y, T, 4, C.rock2); for (let i = 0; i < 4; i++) r(x + i * 4 + 1, y, 3, 3, C.rock); r(x, y, T, 1, C.foam); }
  if (s) { r(x, y + 12, T, 4, C.rock2); for (let i = 0; i < 4; i++) r(x + i * 4, y + 12, 3, 2, C.rockHi); }
  if (w) { r(x, y, 3, T, C.rock2); r(x + 1, y + 2, 2, 4, C.rock); r(x + 1, y + 9, 2, 4, C.rock); }
  if (e) { r(x + 13, y, 3, T, C.rock2); r(x + 13, y + 4, 2, 4, C.rock); r(x + 13, y + 11, 2, 4, C.rock); }
}

export function bridge(x, y, top, bottom) {
  r(x, y, T, T, C.wood);
  for (let i = 0; i < 4; i++) { r(x + i * 4, y, 1, T, C.wood2); r(x + i * 4 + 1, y, 1, T, C.woodHi); }
  if (top) { r(x, y, T, 3, C.woodDark); r(x, y + 1, T, 1, C.wood); }
  if (bottom) { r(x, y + 13, T, 3, C.woodDark); r(x, y + 14, T, 1, C.wood); }
}

export function dock(x, y) {
  r(x, y, T, T, C.wood);
  for (let i = 0; i < 4; i++) { r(x, y + i * 4, T, 1, C.wood2); r(x, y + i * 4 + 1, T, 1, C.woodHi); }
  r(x, y, 2, T, C.woodDark); r(x + 14, y, 2, T, C.woodDark);
}

export function waterfall(x, y, t) {
  r(x, y, T, T, C.water2);
  for (let i = 0; i < 4; i++) {
    const off = Math.floor(t / 90 + i * 5) % T;
    r(x + i * 4 + 1, y + off, 2, 5, C.foam);
    r(x + i * 4 + 2, y + ((off + 8) % T), 1, 3, C.white);
  }
}
export function cliff(x, y) {
  r(x, y, T, T, C.rock2);
  r(x, y, T, 3, C.grassDark); r(x, y + 3, T, 1, C.rockHi);
  r(x + 2, y + 6, 5, 4, C.rock); r(x + 9, y + 9, 5, 4, C.rock); r(x + 3, y + 13, 3, 2, C.rockHi);
}

// ---------------------------------------------------------------- plants

export const treeSprite = (kind) => cached(`tree-${kind}`, 32, 44, () => {
  shadow(16, 41, 11, 3);
  if (kind === "pine") {
    r(14, 32, 4, 10, C.trunk);
    tri(16, 2, 26, 14, C.pine2); tri(16, 10, 30, 16, C.pine2); tri(16, 18, 30, 17, C.pine2);
    tri(16, 3, 22, 12, C.pine); tri(16, 11, 26, 14, C.pine); tri(16, 19, 26, 15, C.pine);
    tri(13, 6, 8, 8, C.pineHi); tri(12, 14, 10, 9, C.pineHi); tri(12, 22, 10, 9, C.pineHi);
    return;
  }
  r(13, 26, 6, 16, C.trunk); r(13, 26, 2, 16, C.trunk2); r(11, 40, 10, 2, C.trunk2);
  const [base, dark, hi] = kind === "cherry" ? [C.cherry, C.cherry2, C.cherryHi] : [C.leaf2, C.leaf3, C.leafHi];
  ellipse(16, 17, 15, 14, dark);
  ellipse(16, 16, 14, 13, base);
  ellipse(9, 13, 6, 5, base); ellipse(23, 12, 6, 6, base);
  ellipse(12, 10, 5, 4, hi); ellipse(21, 8, 4, 3, hi); ellipse(8, 18, 3, 2, hi);
  r(4, 24, 24, 3, dark);
  if (kind === "apple") for (const [ax, ay] of [[8, 14], [20, 18], [14, 22], [24, 13], [11, 7], [18, 12]]) { r(ax, ay, 3, 3, C.apple); p(ax, ay, "#ff8a7a"); }
  if (kind === "cherry") for (const [ax, ay] of [[7, 20], [22, 22], [16, 6]]) r(ax, ay, 2, 2, C.white);
});

export const bushSprite = (kind) => cached(`bush-${kind}`, 16, 16, () => {
  shadow(8, 14, 7, 2);
  ellipse(8, 9, 7, 6, C.leaf3); ellipse(8, 8, 6, 5, C.leaf2); ellipse(6, 6, 3, 2, C.leafHi);
  const flowers = { pink: C.pink, white: C.white, red: C.red, purple: C.purple }[kind];
  if (flowers) for (const [fx, fy] of [[3, 7], [8, 4], [12, 8], [6, 11], [10, 11]]) { r(fx, fy, 2, 2, flowers); p(fx, fy, C.white); }
});

export const sunflowerSprite = () => cached("sunflower", 16, 30, () => {
  for (const [sx, h] of [[4, 18], [11, 22]]) {
    r(sx + 1, 30 - h, 1, h, C.leaf3);
    r(sx - 2, 30 - h + 9, 3, 2, C.leaf2); r(sx + 2, 30 - h + 13, 3, 2, C.leaf2);
    ellipse(sx + 1, 30 - h, 4, 4, C.sunflower); ellipse(sx + 1, 30 - h, 2, 2, C.sunflower2);
  }
});

export function crop(x, y, kind, stage, t, glow) {
  const stem = C.leaf2;
  if (stage === 0) { r(x + 6, y + 9, 1, 1, C.dirt); r(x + 9, y + 8, 1, 1, C.dirt); r(x + 7, y + 11, 1, 1, C.dirt); return; }
  if (stage === 1) { r(x + 7, y + 8, 2, 4, stem); r(x + 5, y + 7, 2, 2, stem); r(x + 9, y + 7, 2, 2, stem); return; }
  if (stage === 2) {
    r(x + 7, y + 5, 2, 7, stem); r(x + 4, y + 4, 3, 3, stem); r(x + 9, y + 4, 3, 3, stem); r(x + 6, y + 2, 4, 3, C.leaf);
    return;
  }
  const bob = Math.floor(t / 300) % 2;
  if (kind === "chatter") {
    r(x + 5, y + 1 - bob, 2, 5, C.leaf); r(x + 9, y + 1 - bob, 2, 5, C.leaf); r(x + 7, y - bob, 2, 6, C.leafHi);
    r(x + 5, y + 6, 6, 4, C.orange); r(x + 6, y + 10, 4, 2, C.orange); r(x + 7, y + 12, 2, 1, C.orange);
    r(x + 6, y + 7, 1, 2, "#ffb066"); r(x + 9, y + 8, 1, 1, "#c95f12");
  } else if (kind === "deep") {
    // daikon: a long white root under a big leafy crown
    r(x + 3, y - bob, 3, 6, C.leaf); r(x + 10, y - bob, 3, 6, C.leaf); r(x + 6, y - 1 - bob, 4, 7, C.leafHi); r(x + 5, y + 2, 6, 3, C.leaf3);
    r(x + 5, y + 5, 6, 5, "#f4f1e6"); r(x + 6, y + 10, 4, 3, "#f4f1e6"); r(x + 7, y + 13, 2, 2, "#e6e0cc");
    r(x + 6, y + 6, 1, 3, C.white); r(x + 9, y + 8, 1, 1, "#d8d0b8");
  } else {
    r(x + 6, y - bob, 2, 5, C.leaf); r(x + 8, y + 1 - bob, 2, 4, C.leafHi);
    r(x + 4, y + 5, 8, 6, "#e84a6a"); r(x + 5, y + 4, 6, 8, "#e84a6a"); r(x + 7, y + 12, 2, 2, C.white);
    r(x + 5, y + 6, 2, 2, C.pink);
  }
  if (glow || Math.floor(t / 250) % 3 === 0) { r(x + 13, y, 1, 3, C.white); r(x + 12, y + 1, 3, 1, C.white); }
}

// ---------------------------------------------------------------- buildings
// Each returns a cached canvas. Footprint = bottom (fw × fh tiles); the rest rises above.

function window(x, y, w, h, lit) {
  r(x - 1, y - 1, w + 2, h + 2, C.woodDark);
  r(x, y, w, h, lit ? C.glow : C.windowDay);
  r(x, y + h - 3, w, 3, lit ? C.glow2 : C.windowDay2);
  r(x + (w >> 1), y, 1, h, C.woodDark); r(x, y + (h >> 1), w, 1, C.woodDark);
  if (!lit) r(x + 1, y + 1, 2, 2, C.white);
}
function flowerBox(x, y, w) {
  r(x, y, w, 3, C.wood2);
  for (let i = 0; i < w; i += 3) { r(x + i, y - 2, 2, 2, i % 6 ? C.pink : C.white); r(x + i + 1, y - 1, 1, 1, C.leaf2); }
}
function shingles(x, y, w, h, base, dark) {
  r(x, y, w, h, base);
  for (let row = 0; row < h; row += 4) {
    r(x, y + row + 3, w, 1, dark);
    for (let col = (row / 4) % 2 ? 0 : 3; col < w; col += 6) r(x + col, y + row, 1, 3, dark);
  }
}

export const farmhouse = (lit) => cached(`farmhouse-${lit}`, 112, 112, () => {
  shadow(56, 108, 54, 5);
  // chimney
  r(84, 4, 12, 30, C.rock2); for (let i = 0; i < 6; i++) r(84 + (i % 2) * 6, 6 + i * 5, 5, 3, C.rock); r(82, 2, 16, 4, C.rock2);
  // walls (timber frame)
  r(4, 62, 104, 44, C.plaster);
  for (let bx = 4; bx <= 104; bx += 20) r(bx, 62, 4, 44, C.wood2);
  r(4, 62, 104, 3, C.woodDark); r(4, 82, 104, 2, C.wood2); r(4, 103, 104, 3, C.woodDark);
  window(14, 70, 14, 11, lit); window(84, 70, 14, 11, lit); window(14, 88, 12, 10, lit); window(86, 88, 12, 10, lit);
  flowerBox(13, 83, 16); flowerBox(83, 83, 16);
  // door + porch
  r(48, 80, 16, 26, C.woodDark); r(50, 82, 12, 24, C.wood); r(50, 82, 12, 2, C.woodHi); r(59, 93, 2, 2, C.gold);
  r(40, 104, 32, 4, C.wood2); r(36, 107, 40, 3, C.woodDark);
  r(40, 66, 2, 38, C.wood2); r(70, 66, 2, 38, C.wood2);
  // roof
  shingles(0, 22, 112, 42, C.slate, C.slate2);
  for (let i = 0; i < 12; i++) r(i, 22 + i * 3, 1, 3, C.slate2), r(111 - i, 22 + i * 3, 1, 3, C.slate2);
  r(0, 60, 112, 4, C.woodDark); r(0, 22, 112, 2, C.slateHi);
  // dormers
  for (const dx of [22, 72]) {
    r(dx, 32, 18, 20, C.plaster); r(dx, 32, 2, 20, C.wood2); r(dx + 16, 32, 2, 20, C.wood2);
    tri(dx + 9, 20, 24, 13, C.slate2); tri(dx + 9, 22, 20, 11, C.slate);
    window(dx + 5, 37, 8, 9, lit);
  }
  // porch roof over door
  tri(56, 58, 36, 10, C.slate2); tri(56, 60, 32, 8, C.slate);
  // vines
  for (const [vx, vy] of [[4, 64], [6, 70], [5, 78], [104, 66], [102, 74], [105, 80]]) { r(vx, vy, 3, 3, C.leaf2); p(vx + 1, vy, C.pink); }
});

export const barn = (lit) => cached(`barn-${lit}`, 80, 96, () => {
  shadow(40, 92, 40, 4);
  r(4, 44, 72, 48, C.barn);
  for (let i = 4; i < 76; i += 4) r(i, 44, 1, 48, C.barn2);
  r(4, 44, 72, 2, C.trim); r(4, 89, 72, 3, C.trim); r(4, 44, 2, 48, C.trim); r(74, 44, 2, 48, C.trim);
  // big door
  r(24, 60, 32, 32, C.trim); r(26, 62, 28, 30, lit ? "#5a3a1a" : C.barn2);
  if (lit) r(26, 78, 28, 14, C.straw);
  ctx.strokeStyle = C.trim; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(26, 62); ctx.lineTo(40, 92); ctx.moveTo(54, 62); ctx.lineTo(40, 92); ctx.stroke();
  r(39, 62, 2, 30, C.trim);
  // gambrel roof
  shingles(0, 14, 80, 32, C.slate, C.slate2);
  tri(40, 0, 60, 16, C.slate2); tri(40, 2, 52, 14, C.slate);
  r(0, 44, 80, 3, C.woodDark);
  // hayloft
  r(32, 20, 16, 14, C.trim); r(34, 22, 12, 12, lit ? C.glow : C.woodDark); r(34, 28, 12, 6, C.straw);
});

export const silo = () => cached("silo", 32, 88, () => {
  shadow(16, 85, 15, 3);
  r(3, 22, 26, 62, C.wood); r(3, 22, 4, 62, C.woodHi); r(23, 22, 6, 62, C.wood2);
  for (let y = 30; y < 84; y += 12) r(2, y, 28, 2, C.metal2);
  ellipse(16, 22, 14, 18, C.gold2); ellipse(16, 21, 13, 17, "#c9772c"); ellipse(11, 14, 4, 6, "#e9a050");
  r(2, 22, 28, 3, C.metal2);
  // Orbio orb emblem
  ellipse(16, 48, 8, 8, C.ink); ellipse(16, 48, 7, 7, C.neon); r(12, 46, 2, 2, C.ink); r(18, 46, 2, 2, C.ink); r(14, 51, 4, 1, C.ink); r(11, 43, 3, 2, C.white);
  // coin window
  r(10, 64, 12, 10, C.woodDark); r(11, 65, 10, 8, C.gold); r(12, 66, 3, 2, C.goldHi); r(16, 69, 3, 2, C.goldHi);
  r(0, 76, 4, 4, C.metal); r(28, 70, 4, 10, C.metal2);
});

export const stationBody = (lit) => cached(`station-${lit}`, 32, 48, () => {
    shadow(16, 46, 16, 3);
    r(2, 18, 28, 28, C.metal2); r(3, 19, 26, 26, C.metal); r(3, 19, 26, 2, C.metalHi);
    r(7, 24, 18, 12, C.ink); r(8, 25, 16, 10, C.screen);
    // robot face on the screen
    r(11, 28, 3, 3, C.cyan); r(18, 28, 3, 3, C.cyan); r(13, 32, 6, 1, C.cyan);
    r(5, 39, 4, 3, C.gold); r(23, 39, 4, 3, C.cyan); r(12, 40, 8, 2, C.metal2);
    r(0, 30, 3, 10, C.metal2); r(29, 26, 3, 14, C.metal2); r(30, 24, 2, 3, C.gold);
    r(12, 14, 8, 5, C.metal2); r(14, 12, 4, 3, C.metalHi);
});
export function station(t, lit) {
  ctx.drawImage(stationBody(lit), 0, 0);
  stationCoin(t);
}
// the floating, spinning orb-coin on top of the station
export function stationCoin(t) {
  const spin = Math.abs(Math.cos(t / 400));
  const w = Math.max(1, Math.round(9 * spin)), bob = Math.round(Math.sin(t / 350) * 1.5);
  ellipse(16, 6 + bob, w, 6, C.gold2); ellipse(16, 6 + bob, Math.max(1, w - 1), 5, C.neon);
  if (spin > 0.5) { r(14, 4 + bob, 1, 2, C.ink); r(18, 4 + bob, 1, 2, C.ink); }
}

export const greenhouse = (lit) => cached(`greenhouse-${lit}`, 96, 88, () => {
  shadow(48, 84, 48, 4);
  r(2, 34, 92, 50, lit ? "#3f6a3a" : "#5b8f5a");
  // plants inside
  for (let i = 0; i < 9; i++) { ellipse(10 + i * 10, 60 + (i % 2) * 6, 5, 6, C.leaf2); r(9 + i * 10, 56 + (i % 2) * 6, 2, 2, i % 3 ? C.apple : C.gold); }
  ctx.fillStyle = lit ? "rgba(255,214,120,.35)" : "rgba(200,235,255,.45)"; ctx.fillRect(2, 34, 92, 50);
  for (let x = 2; x <= 94; x += 13) r(x, 34, 2, 50, C.wood);
  r(2, 34, 92, 2, C.wood); r(2, 56, 92, 1, C.wood); r(2, 82, 92, 2, C.woodDark);
  // glass gable roof
  ctx.fillStyle = lit ? "rgba(255,214,120,.45)" : "rgba(210,240,255,.7)";
  ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(48, 4); ctx.lineTo(96, 36); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.wood; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 36); ctx.lineTo(48, 4); ctx.stroke(); }
  r(40, 62, 16, 22, C.woodDark); r(42, 64, 12, 20, lit ? C.glow : "#9fd0e6"); r(47, 64, 2, 20, C.wood);
  for (const [vx, vy] of [[6, 34], [30, 20], [70, 18], [88, 32]]) { r(vx, vy, 4, 3, C.leaf2); r(vx + 1, vy + 3, 2, 3, C.leaf); }
});

export const gazette = (lit) => cached(`gazette-${lit}`, 96, 104, () => {
  shadow(48, 100, 48, 4);
  r(4, 58, 88, 42, C.plaster);
  for (let bx = 4; bx <= 88; bx += 22) r(bx, 58, 4, 42, C.wood2);
  r(4, 97, 88, 3, C.woodDark);
  window(12, 70, 14, 12, lit); window(70, 70, 14, 12, lit);
  r(38, 72, 20, 28, C.woodDark); r(40, 74, 16, 26, lit ? C.glow2 : C.wood); r(54, 86, 2, 2, C.gold);
  // ticker board with an up-only chart
  r(30, 60, 36, 10, C.ink); r(31, 61, 34, 8, C.screen);
  ctx.strokeStyle = C.neon; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(33, 67); ctx.lineTo(39, 65); ctx.lineTo(44, 66); ctx.lineTo(51, 63); ctx.lineTo(57, 64); ctx.lineTo(63, 62); ctx.stroke();
  // awning
  for (let i = 0; i < 11; i++) r(4 + i * 8, 52, 8, 7, i % 2 ? C.white : C.roofGreen);
  for (let i = 0; i < 11; i++) tri(8 + i * 8, 58, 8, 3, i % 2 ? C.white : C.roofGreen);
  // roof
  shingles(0, 22, 96, 32, C.roofGreen, C.roofGreen2);
  r(0, 22, 96, 2, "#5fa07a"); r(0, 50, 96, 3, C.woodDark);
  // big meme coin sign: a doge-ish shiba face
  ellipse(48, 18, 17, 17, C.gold2); ellipse(48, 18, 15, 15, C.gold); ellipse(48, 18, 12, 12, C.gold2); ellipse(48, 18, 11, 11, C.gold);
  tri(41, 8, 6, 6, C.orange); tri(55, 8, 6, 6, C.orange);
  ellipse(48, 19, 8, 7, C.orange); ellipse(48, 22, 5, 4, C.trim);
  r(44, 17, 2, 2, C.ink); r(50, 17, 2, 2, C.ink); r(47, 21, 2, 1, C.ink);
});

export const stall = (color) => cached(`stall-${color}`, 32, 40, () => {
  shadow(16, 38, 15, 3);
  r(3, 12, 2, 26, C.wood2); r(27, 12, 2, 26, C.wood2);
  for (let i = 0; i < 4; i++) r(1 + i * 8, 6, 8, 8, i % 2 ? C.white : color);
  for (let i = 0; i < 4; i++) tri(5 + i * 8, 13, 8, 3, i % 2 ? C.white : color);
  r(2, 26, 28, 12, C.wood); r(2, 26, 28, 2, C.woodHi); r(2, 35, 28, 3, C.wood2);
  for (let i = 0; i < 6; i++) { ellipse(6 + i * 4, 24, 2, 2, [C.apple, C.orange, C.gold, C.leaf2, C.purple, C.apple][i]); }
});

export const fountain = () => cached("fountain", 48, 72, () => {
  shadow(24, 66, 24, 5);
  ellipse(24, 56, 23, 13, C.rock2); ellipse(24, 55, 22, 12, C.rock); ellipse(24, 54, 18, 9, C.water3);
  // flower ring
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; r(Math.round(24 + Math.cos(a) * 21), Math.round(56 + Math.sin(a) * 11), 2, 2, [C.gold, C.pink, C.red, C.white][i % 4]); }
  // pedestal + cat statue holding a coin
  r(18, 38, 12, 16, C.rock2); r(19, 38, 10, 14, C.rock); r(16, 36, 16, 3, C.rockHi);
  ellipse(24, 26, 10, 11, C.rock2); ellipse(24, 25, 9, 10, "#a3a09a");
  ellipse(24, 10, 8, 7, C.rock2); ellipse(24, 10, 7, 6, "#a3a09a");
  tri(18, 1, 6, 5, C.rock2); tri(30, 1, 6, 5, C.rock2);
  r(20, 9, 2, 2, C.ink); r(26, 9, 2, 2, C.ink); r(23, 12, 2, 1, C.ink);
  ellipse(24, 27, 6, 6, C.gold2); ellipse(24, 27, 5, 5, C.gold); r(22, 25, 2, 3, C.goldHi);
  r(16, 24, 4, 6, C.rock2); r(28, 24, 4, 6, C.rock2);
});
export function fountainWater(x, y, t) {
  const ph = Math.floor(t / 200) % 3;
  for (let i = 0; i < 3; i++) r(x + 14 + i * 9, y + 50 + ((ph + i) % 3), 3, 1, C.foam);
  r(x + 10 + ph * 3, y + 56, 4, 1, C.water2);
}

export const lantern = (lit) => cached(`lantern-${lit}`, 16, 32, () => {
  shadow(8, 30, 4, 1);
  r(7, 10, 2, 20, C.ink); r(5, 28, 6, 2, C.ink);
  r(4, 2, 8, 9, C.ink); r(5, 3, 6, 7, lit ? C.glow : "#d8c48a"); r(3, 1, 10, 2, C.ink); r(7, 0, 2, 1, C.ink);
  if (lit) r(6, 4, 2, 3, C.white);
});

export const crate = () => cached("crate", 16, 16, () => {
  shadow(8, 15, 7, 1);
  r(2, 4, 12, 11, C.wood); r(2, 4, 12, 2, C.woodHi); r(2, 9, 12, 1, C.wood2); r(2, 14, 12, 1, C.woodDark);
  r(4, 2, 3, 3, C.apple); r(8, 1, 3, 3, C.orange); r(10, 3, 3, 2, C.leaf2);
});
export const barrel = () => cached("barrel", 16, 18, () => {
  shadow(8, 17, 6, 1);
  ellipse(8, 10, 6, 7, C.wood); r(2, 5, 12, 1, C.metal2); r(2, 13, 12, 1, C.metal2); ellipse(8, 4, 5, 2, C.wood2); r(5, 7, 2, 6, C.woodHi);
});
export const hay = () => cached("hay", 16, 14, () => {
  shadow(8, 13, 7, 1);
  r(1, 3, 14, 10, C.straw); r(1, 3, 14, 2, "#ffe08a"); r(1, 7, 14, 1, C.straw2); r(5, 3, 1, 10, C.straw2); r(10, 3, 1, 10, C.straw2);
});
export const board = () => cached("board", 16, 24, () => {
  shadow(8, 23, 7, 1);
  r(2, 14, 2, 9, C.wood2); r(12, 14, 2, 9, C.wood2);
  r(0, 2, 16, 14, C.woodDark); r(1, 3, 14, 12, C.wood);
  r(2, 4, 5, 5, C.white); r(9, 5, 5, 6, C.plaster); r(3, 11, 4, 3, C.goldHi);
  r(3, 5, 3, 1, C.ink); r(10, 6, 3, 1, C.ink); r(10, 8, 2, 1, C.ink); r(4, 4, 1, 1, C.red); r(11, 5, 1, 1, C.red);
});
export const mailbox = (flag) => cached(`mailbox-${flag}`, 16, 20, () => {
  shadow(8, 19, 5, 1);
  r(7, 10, 2, 9, C.wood2);
  r(3, 3, 10, 8, C.overall); r(3, 3, 10, 2, C.overall2); r(4, 6, 3, 2, C.ink);
  r(13, flag ? 0 : 5, 2, flag ? 7 : 3, C.red);
});

export function fenceH(x, y) { r(x, y + 5, T, 2, C.wood); r(x, y + 10, T, 2, C.wood2); r(x + 1, y + 2, 3, 13, C.wood); r(x + 1, y + 2, 3, 1, C.woodHi); r(x + 12, y + 2, 3, 13, C.wood); r(x + 12, y + 2, 3, 1, C.woodHi); }
export function fenceV(x, y) { r(x + 6, y, 4, T, C.wood); r(x + 6, y, 1, T, C.woodHi); r(x + 9, y, 1, T, C.wood2); }

export function bunting(x0, y0, x1, y1, t) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath();
  const midX = (x0 + x1) / 2, sag = 6;
  ctx.moveTo(x0, y0); ctx.quadraticCurveTo(midX, Math.max(y0, y1) + sag, x1, y1); ctx.stroke();
  const colors = [C.red, C.gold, C.roofGreen, C.sky, C.pink, C.orange];
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 7);
  for (let i = 1; i < n; i++) {
    const u = i / n, q = 1 - u;
    const fx = q * q * x0 + 2 * q * u * midX + u * u * x1;
    const fy = q * q * y0 + 2 * q * u * (Math.max(y0, y1) + sag) + u * u * y1;
    const wob = Math.round(Math.sin(t / 300 + i) * 0.6);
    tri(Math.round(fx), Math.round(fy), 4, 5 + wob, colors[i % colors.length]);
    ctx.save(); ctx.translate(0, 0); ctx.restore();
  }
}

// ---------------------------------------------------------------- characters

// People: dir 0 down, 1 up, 2 left, 3 right. look = palette overrides.
export function person(x, y, dir, frame, moving, look = {}) {
  const L = { skin: C.skin, hair: C.hair, hat: C.straw, shirt: C.shirt, pants: C.overall, ...look };
  const step = moving ? (frame ? 1 : -1) : 0;
  shadow(x + 8, y + 15, 5, 1);
  r(x + 5, y + 11, 2, 4 + (step > 0 ? -1 : 0), L.pants); r(x + 9, y + 11, 2, 4 + (step < 0 ? -1 : 0), L.pants);
  r(x + 5, y + 14 + (step > 0 ? -1 : 0), 2, 1, C.boot); r(x + 9, y + 14 + (step < 0 ? -1 : 0), 2, 1, C.boot);
  r(x + 4, y + 7, 8, 5, L.shirt);
  r(x + 5, y + 8, 6, 4, L.pants); r(x + 5, y + 7, 1, 2, L.pants); r(x + 10, y + 7, 1, 2, L.pants);
  r(x + 3, y + 8 + (moving && frame ? 1 : 0), 1, 3, L.skin); r(x + 12, y + 8 + (moving && !frame ? 1 : 0), 1, 3, L.skin);
  r(x + 4, y + 2, 8, 6, L.skin);
  if (dir === 1) r(x + 4, y + 2, 8, 6, L.hair);
  else if (dir === 0) { r(x + 5, y + 4, 1, 2, C.ink); r(x + 10, y + 4, 1, 2, C.ink); r(x + 7, y + 6, 2, 1, "#d07a6a"); r(x + 4, y + 2, 8, 2, L.hair); r(x + 4, y + 2, 1, 5, L.hair); r(x + 11, y + 2, 1, 5, L.hair); }
  else if (dir === 2) { r(x + 5, y + 4, 1, 2, C.ink); r(x + 7, y + 2, 5, 5, L.hair); }
  else { r(x + 10, y + 4, 1, 2, C.ink); r(x + 4, y + 2, 5, 5, L.hair); }
  if (L.hat) { r(x + 2, y + 2, 12, 1, L.hat === C.straw ? C.straw2 : L.hat); r(x + 4, y - 1, 8, 3, L.hat); r(x + 4, y + 1, 8, 1, C.red); }
}

// The little scout robots from the concept art: white body, dark visor, cyan eyes,
// a leaf sprout on top. carrying: show a crate. hat: straw hat.
export function robot(x, y, dir, t, opts = {}) {
  const bob = Math.round(Math.sin(t / 180 + (opts.seed || 0)) * (opts.moving ? 1 : 0.5));
  shadow(x + 8, y + 15, 5, 1);
  y += bob;
  // feet
  r(x + 4, y + 13, 3, 2, C.robot2); r(x + 9, y + 13, 3, 2, C.robot2);
  // body
  r(x + 4, y + 9, 8, 5, C.robot); r(x + 4, y + 13, 8, 1, C.robot2); r(x + 7, y + 10, 2, 2, opts.busy ? C.cyan : C.metal);
  // head
  r(x + 2, y + 2, 12, 8, C.robot); r(x + 3, y + 1, 10, 1, C.robot); r(x + 2, y + 9, 12, 1, C.robot2);
  if (dir !== 1) {
    r(x + 3, y + 3, 10, 5, C.visor);
    const blink = Math.floor((t + (opts.seed || 0) * 977) / 120) % 40 === 0;
    const ex = dir === 2 ? -1 : dir === 3 ? 1 : 0;
    r(x + 5 + ex, y + 4, 2, blink ? 1 : 3, C.cyan); r(x + 9 + ex, y + 4, 2, blink ? 1 : 3, C.cyan);
  } else r(x + 3, y + 3, 10, 5, C.robot2);
  // arms
  if (opts.carrying) {
    r(x + 2, y + 9, 2, 3, C.robot2); r(x + 12, y + 9, 2, 3, C.robot2);
    r(x + 3, y + 9, 10, 6, C.wood); r(x + 3, y + 9, 10, 1, C.woodHi);
    r(x + 4, y + 7, 3, 3, C.orange); r(x + 8, y + 7, 3, 3, "#e84a6a"); r(x + 6, y + 6, 2, 2, C.leaf2);
  } else {
    const wave = opts.busy ? Math.floor(t / 150) % 2 : 0;
    r(x + 2, y + 9 - wave, 2, 3, C.robot2); r(x + 12, y + 9 + wave - (opts.busy ? 1 : 0), 2, 3, C.robot2);
  }
  // visiting launchpad agents wear a coloured scarf; your launched agent wears a rocket badge
  if (opts.scarf) { r(x + 3, y + 9, 10, 2, opts.scarf); if (dir !== 1) r(x + 9, y + 11, 2, 3, opts.scarf); }
  if (opts.badge) { r(x + 6, y + 10, 4, 3, C.gold2); r(x + 7, y + 10, 2, 2, C.goldHi); }
  // sprout, straw hat or (night shift) a nightcap
  if (opts.nightcap) { r(x + 3, y, 10, 2, C.overall2); r(x + 4, y - 2, 8, 2, C.overall); r(x + 8, y - 4, 4, 2, C.overall); r(x + 12, y - 5, 2, 2, C.white); r(x + 3, y + 1, 10, 1, C.white); }
  else if (opts.hat) { r(x + 1, y + 1, 14, 1, C.straw2); r(x + 4, y - 2, 8, 3, C.straw); r(x + 4, y, 8, 1, C.red); }
  else { r(x + 7, y - 2, 1, 3, C.leaf3); r(x + 4, y - 3, 3, 2, C.leaf2); r(x + 8, y - 4, 3, 2, C.leafHi); }
  if (opts.busy && Math.floor(t / 300) % 2) { r(x + 13, y - 3, 2, 2, C.white); r(x + 15, y - 6, 1, 1, C.white); }
}

export function cow(x, y, dir, t) {
  const flip = dir === 2;
  shadow(x + 10, y + 15, 9, 2);
  ctx.save();
  if (flip) { ctx.translate(x * 2 + 20, 0); ctx.scale(-1, 1); }
  r(x + 2, y + 5, 15, 8, C.white); r(x + 5, y + 6, 5, 4, C.ink); r(x + 12, y + 9, 3, 3, C.ink);
  r(x + 3, y + 13, 2, 3, C.white); r(x + 14, y + 13, 2, 3, C.white); r(x + 7, y + 13, 2, 2, C.white);
  r(x + 15, y + 2, 6, 7, C.white); r(x + 17, y + 6, 4, 3, C.pink); r(x + 16, y + 3, 1, 1, C.ink); r(x + 15, y + 1, 2, 2, C.straw);
  r(x + 1, y + 5, 1, 5, C.ink);
  ctx.restore();
}
export function chicken(x, y, t, seed) {
  const peck = Math.floor(t / 400 + seed) % 5 === 0 ? 1 : 0;
  shadow(x + 8, y + 15, 4, 1);
  r(x + 5, y + 9, 7, 5, C.white); r(x + 4, y + 10, 2, 3, C.white); r(x + 10, y + 6 + peck, 4, 4, C.white);
  r(x + 11, y + 5 + peck, 2, 1, C.red); r(x + 14, y + 8 + peck, 2, 1, C.gold); r(x + 12, y + 7 + peck, 1, 1, C.ink);
  r(x + 7, y + 14, 1, 2, C.gold); r(x + 10, y + 14, 1, 2, C.gold);
}

// Orby: the valley's floating orb spirit.
export function orby(x, y, t) {
  const b = Math.round(Math.sin(t / 400) * 1.5);
  shadow(x + 8, y + 15, 4, 1);
  y += b;
  ellipse(x + 8, y + 8, 7, 7, C.ink); ellipse(x + 8, y + 8, 6, 6, C.neon);
  r(x + 4, y + 4, 3, 2, C.white);
  const blink = Math.floor(t / 150) % 30 === 0;
  r(x + 5, y + 7, 2, blink ? 1 : 2, C.ink); r(x + 9, y + 7, 2, blink ? 1 : 2, C.ink);
  r(x + 3, y + 10, 2, 1, C.pink); r(x + 11, y + 10, 2, 1, C.pink);
  r(x + 7, y + 10, 2, 1, C.ink);
  const ring = Math.floor(t / 200) % 16;
  r(x - 2 + ring, y + 13 - Math.round(ring / 3), 2, 1, C.sky);
}

export function bobber(x, y, t, bite) {
  const b = bite ? (Math.floor(t / 80) % 2) * 2 : Math.round(Math.sin(t / 300));
  r(x + 6, y + 7 + b, 4, 2, C.red); r(x + 6, y + 9 + b, 4, 2, C.white); r(x + 7, y + 5 + b, 2, 2, C.ink);
  r(x + 4, y + 11, 8, 1, C.foam);
}

// A thought bubble a robot shows while it works: what tool it is using right now.
// (x, y) is the 16×16 spot; the bubble's tail points at the bottom centre.
export function bubble(x, y, icon, t) {
  r(x + 1, y + 1, 14, 11, C.ink); r(x + 2, y, 12, 13, C.ink);
  r(x + 2, y + 1, 12, 11, C.white); r(x + 3, y + 2, 10, 9, C.white);
  r(x + 6, y + 13, 4, 1, C.ink); r(x + 7, y + 14, 2, 1, C.ink); r(x + 7, y + 12, 2, 2, C.white);
  const ph = Math.floor(t / 250) % 3;
  if (["x", "web", "page", "chain"].includes(icon)) glyph(icon, x, y);
  else if (icon === "mail") { r(x + 3, y + 3, 10, 7, C.plaster); r(x + 3, y + 3, 10, 1, C.ink); r(x + 3, y + 9, 10, 1, C.ink); r(x + 3, y + 3, 1, 7, C.ink); r(x + 12, y + 3, 1, 7, C.ink); for (let i = 0; i < 4; i++) { p(x + 4 + i, y + 4 + i, C.ink); p(x + 11 - i, y + 4 + i, C.ink); } r(x + 7, y + 7, 2, 2, C.red); }
  else if (icon === "done") { for (let i = 0; i < 3; i++) p(x + 4 + i, y + 6 + i, C.leaf); for (let i = 0; i < 5; i++) p(x + 7 + i, y + 8 - i, C.leaf); }
  else for (let i = 0; i < 3; i++) r(x + 4 + i * 3, y + 6 - (i === ph ? 1 : 0), 2, 2, C.ink);
}

// Small 16×16 menu icons (tabs, buttons, toasts). Each is a sprite slot; this is the
// code-drawn fallback and template reference.
export function menuIcon(kind, x, y) {
  switch (kind) {
    case "harvests": // carrot
      r(x + 6, y + 1, 2, 4, C.leaf); r(x + 9, y + 1, 2, 4, C.leafHi); r(x + 5, y + 5, 7, 4, C.orange); r(x + 6, y + 9, 5, 3, C.orange); r(x + 7, y + 12, 3, 2, C.orange); r(x + 8, y + 14, 1, 1, C.orange); r(x + 6, y + 6, 1, 3, "#ffb066"); break;
    case "fish": fishSprite(x, y, C.sky); break;
    case "letters": letter(x, y); break;
    case "agents": robot(x, y + 1, 0, 1000, {}); break;
    case "graduate": // mortarboard
      r(x + 1, y + 5, 14, 3, C.ink); r(x + 3, y + 4, 10, 1, C.ink); r(x + 4, y + 8, 8, 4, C.slate); r(x + 13, y + 7, 1, 5, C.gold); r(x + 12, y + 11, 3, 2, C.gold); break;
    case "watch": // eye
      ellipse(x + 8, y + 8, 7, 4, C.ink); ellipse(x + 8, y + 8, 6, 3, C.white); ellipse(x + 8, y + 8, 3, 3, C.overall); r(x + 7, y + 7, 2, 2, C.ink); r(x + 9, y + 6, 1, 1, C.white); break;
    case "plant": // sprout in soil
      r(x + 2, y + 11, 12, 4, C.soil); r(x + 2, y + 11, 12, 1, "#8a5a36"); r(x + 7, y + 6, 2, 5, C.leaf2); ellipse(x + 5, y + 6, 3, 2, C.leaf2); ellipse(x + 11, y + 5, 3, 2, C.leafHi); break;
    case "piggy":
      ellipse(x + 8, y + 9, 6, 5, C.pink); r(x + 4, y + 3, 2, 3, C.pink); ellipse(x + 13, y + 9, 2, 2, "#f07ab0"); r(x + 9, y + 6, 1, 1, C.ink); r(x + 5, y + 13, 2, 2, C.pink); r(x + 10, y + 13, 2, 2, C.pink); r(x + 6, y + 4, 4, 1, C.gold); break;
    case "kit": r(x + 2, y + 5, 12, 9, C.wood); r(x + 2, y + 5, 12, 2, C.woodHi); r(x + 7, y + 5, 2, 9, C.wood2); r(x + 2, y + 13, 12, 1, C.woodDark); r(x + 5, y + 2, 6, 3, C.gold); break;
    case "flag": r(x + 4, y + 2, 1, 12, C.ink); r(x + 5, y + 2, 7, 5, C.red); r(x + 5, y + 7, 4, 1, C.red); break;
    case "sun": ellipse(x + 8, y + 8, 4, 4, C.gold); for (const [dx, dy] of [[0, -7], [0, 6], [-7, 0], [6, 0], [-5, -5], [4, -5], [-5, 4], [4, 4]]) r(x + 8 + dx, y + 8 + dy, 2, 2, C.gold2); break;
    case "sparkle": r(x + 7, y + 1, 2, 14, C.goldHi); r(x + 1, y + 7, 14, 2, C.goldHi); r(x + 6, y + 6, 4, 4, C.white); r(x + 12, y + 2, 2, 2, C.gold); r(x + 2, y + 12, 2, 2, C.gold); break;
    case "wilted": r(x + 7, y + 6, 2, 8, C.leaf3); ellipse(x + 5, y + 6, 3, 2, "#a0522d"); r(x + 10, y + 9, 3, 2, C.leaf3); r(x + 3, y + 7, 2, 2, "#8a7a5a"); break;
    case "x": case "web": case "page": case "chain": glyph(kind, x, y); break;
    default: r(x + 4, y + 4, 8, 8, C.neon);
  }
}
// The pictures inside thought bubbles, also used as menu icons for the robot's steps.
export function glyph(icon, x, y) {
  if (icon === "x") { for (let i = 0; i < 7; i++) { p(x + 4 + i, y + 3 + i, C.ink); p(x + 10 - i, y + 3 + i, C.ink); } }
  else if (icon === "web") { ellipse(x + 8, y + 6, 4, 4, C.overall); r(x + 4, y + 6, 9, 1, C.sky); r(x + 8, y + 2, 1, 9, C.sky); }
  else if (icon === "page") { r(x + 5, y + 2, 6, 9, C.plaster2); for (let i = 0; i < 3; i++) r(x + 6, y + 4 + i * 2, 4, 1, C.ink); }
  else if (icon === "chain") { r(x + 4, y + 4, 4, 3, C.gold2); r(x + 8, y + 6, 4, 3, C.gold2); r(x + 5, y + 5, 2, 1, C.white); r(x + 9, y + 7, 2, 1, C.white); }
}

// The current CSS look of menu frames, drawn for template references.
export function frame(w, h, kind) {
  const look = {
    panel: [C.woodDark, C.wood, "#f6e2b3", "#fff3d6", 4], card: [C.woodDark, C.woodDark, "#ffffff", "#ffffff", 3],
    button: [C.woodDark, C.woodDark, "#f6e2b3", "#f6e2b3", 3], "button-primary": [C.woodDark, C.woodDark, C.neon, C.neon, 3],
    hud: [C.woodDark, C.woodDark, "#fff3d6", "#fff3d6", 3], input: [C.woodDark, C.woodDark, "#ffffff", "#ffffff", 3],
    seed: [C.woodDark, C.woodDark, "#f6e2b3", "#f6e2b3", 3], dpad: [C.woodDark, C.woodDark, "#fff3d6", "#fff3d6", 3],
  }[kind] || [C.woodDark, C.wood, "#f6e2b3", "#fff3d6", 4];
  const [outer, inner, inner2, fill, b] = look;
  r(0, 0, w, h, outer); r(b, b, w - b * 2, h - b * 2, inner); r(b + 2, b + 2, w - b * 2 - 4, h - b * 2 - 4, inner2); r(b + 3, b + 3, w - b * 2 - 6, h - b * 2 - 6, fill);
  if (kind === "button" || kind === "button-primary" || kind === "dpad") r(0, h - 3, w, 3, C.woodDark);
}

// A little rocket: the launchpad's icon.
export function rocket(x, y) {
  r(x + 6, y + 2, 4, 9, C.white); r(x + 7, y + 1, 2, 1, C.white); r(x + 6, y + 2, 1, 9, C.robot2);
  r(x + 7, y + 4, 2, 2, C.cyan); r(x + 4, y + 8, 2, 4, C.red); r(x + 10, y + 8, 2, 4, C.red);
  r(x + 7, y + 11, 2, 2, C.orange); r(x + 7, y + 13, 2, 2, C.gold);
}

// The Launchpad Tower: a stone tower with a glowing landing pad on top, where your
// robots can "graduate" into Orbio launchpad agents.
export const launchpadTower = (lit) => cached(`launchpad-${lit}`, 64, 112, () => {
  shadow(32, 108, 30, 4);
  // stone tower
  r(10, 44, 44, 64, C.rock2); r(12, 44, 40, 62, C.rock);
  for (let row = 0; row < 15; row++) for (let col = 0; col < 5; col++) r(12 + col * 8 + (row % 2) * 4, 46 + row * 4, 7, 1, C.rock2);
  r(12, 44, 40, 2, C.rockHi);
  // arched door
  ellipse(32, 88, 8, 6, C.woodDark); r(24, 88, 16, 18, C.woodDark); ellipse(32, 89, 7, 5, lit ? C.glow2 : C.wood); r(25, 89, 14, 17, lit ? C.glow2 : C.wood); r(36, 96, 2, 2, C.gold);
  // windows and a banner
  window(16, 60, 8, 10, lit); window(40, 60, 8, 10, lit);
  r(28, 50, 8, 26, C.overall2); r(29, 50, 6, 24, C.overall); tri(32, 74, 8, 4, C.overall2);
  ellipse(32, 58, 3, 3, C.neon);
  // landing pad deck
  ellipse(32, 40, 30, 8, C.metal2); ellipse(32, 39, 28, 7, C.metal); ellipse(32, 39, 20, 5, C.ink); ellipse(32, 39, 18, 4, lit ? C.neon : C.neon2);
  ellipse(32, 39, 12, 3, C.metal); r(2, 40, 2, 6, C.metal2); r(60, 40, 2, 6, C.metal2);
  // a rocket waiting on the pad
  r(28, 10, 8, 26, C.white); ellipse(32, 10, 4, 6, C.white); r(28, 12, 2, 24, C.robot2);
  r(30, 16, 4, 4, C.ink); r(31, 17, 2, 2, C.cyan);
  tri(25, 26, 6, 10, C.red); tri(39, 26, 6, 10, C.red); r(30, 36, 4, 2, C.orange);
});

// An envelope from the night shift, for the mail list.
export function letter(x, y) {
  r(x + 1, y + 3, 14, 10, C.ink); r(x + 2, y + 4, 12, 8, C.plaster);
  for (let i = 0; i < 6; i++) { p(x + 2 + i, y + 4 + i, C.plaster2); p(x + 13 - i, y + 4 + i, C.plaster2); }
  r(x + 7, y + 8, 3, 3, C.red); p(x + 8, y + 9, C.pink);
}

// Seed packet for the planting menu.
export function seedPacket(x, y, kind) {
  const col = { chatter: C.orange, rumor: "#e84a6a", deep: "#f4f1e6" }[kind] || C.gold;
  r(x + 3, y + 1, 10, 14, C.woodDark); r(x + 4, y + 2, 8, 12, C.plaster);
  r(x + 4, y + 2, 8, 3, col); r(x + 4, y + 2, 8, 1, C.ink);
  ellipse(x + 8, y + 9, 2, 3, col); r(x + 7, y + 5, 2, 2, C.leaf2);
}

export function exclaim(x, y) {
  r(x + 6, y - 10, 4, 8, C.gold); r(x + 6, y, 4, 3, C.gold);
  r(x + 7, y - 9, 2, 6, C.white); r(x + 7, y + 1, 2, 1, C.white);
}

export function fishSprite(x, y, color) {
  r(x + 3, y + 5, 8, 6, color); r(x + 2, y + 6, 10, 4, color); r(x + 11, y + 4, 3, 8, color);
  r(x + 4, y + 7, 1, 1, C.ink); r(x + 5, y + 6, 4, 1, C.white);
}

export function smoke(x, y, t) {
  for (let i = 0; i < 4; i++) {
    const k = ((t / 1400 + i / 4) % 1);
    const a = 0.45 * (1 - k);
    ellipse(x + Math.sin(k * 6 + i) * 3, y - k * 26, 2 + k * 4, 2 + k * 3, `rgba(235,235,240,${a.toFixed(2)})`);
  }
}

// A 3×5 pixel font for tiny signs.
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101",
  L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", W: "101101111111101",
  Y: "101101010010010", Z: "111001010100111", " ": "000000000000000",
  J: "001001001101010", Q: "010101101110011", V: "101101101101010", X: "101101010101101",
  0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001",
  5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
  "-": "000000111000000", ".": "000000000000010", "/": "001001010100100", ":": "000010000010000",
};
export function tinyText(s, x, y, c) {
  ctx.fillStyle = c;
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = FONT[ch] || FONT[" "];
    for (let q = 0; q < 15; q++) if (g[q] === "1") ctx.fillRect(x + i * 4 + (q % 3), y + Math.floor(q / 3), 1, 1);
  });
}
export function sign(x, y, text) {
  const w = text.length * 4 + 5;
  r(x - 1, y - 1, w + 2, 9, C.woodDark); r(x, y, w, 7, C.plaster);
  tinyText(text, x + 3, y + 1, C.ink);
}
