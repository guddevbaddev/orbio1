// All the pixel art, drawn with code. Every function draws one 16×16 tile (or sprite)
// at pixel position (x, y) on a low-res canvas that is later scaled up with no smoothing.

export const T = 16;

const C = {
  grass: "#7cc45a", grass2: "#6ab44c", grass3: "#8fd468", blade: "#4f9a3a",
  dirt: "#d9a86c", dirt2: "#c8955a", soil: "#8a5a36", soil2: "#734a2c", soilWet: "#5e3b22",
  water: "#4fa8e0", water2: "#6cc0f0", foam: "#d8f2ff",
  wood: "#a8693a", wood2: "#8a542c", woodDark: "#5c3720",
  roof: "#d0574b", roof2: "#b24439", roofStore: "#4f7fd0", roofStore2: "#3d66b0",
  wall: "#f4e2bf", wall2: "#e3cc9f", window: "#9fd8ff",
  leaf: "#3f8f3f", leaf2: "#55a84a", leaf3: "#2f7333", trunk: "#7a4a2a",
  ink: "#141413", white: "#ffffff", neon: "#d4ff3f", neonDark: "#9cc61f",
  skin: "#f5c89a", hair: "#6b3f22", hat: "#f0c85a", hat2: "#d9ae3c", shirt: "#d4ff3f", pants: "#3d66b0", boot: "#5c3720",
  pink: "#ff9ec7", sky: "#9fd8ff", gold: "#ffd34d", gold2: "#e0a92a",
};
export const COLORS = C;

let ctx;
export const useContext = (c) => { ctx = c; };
const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// Deterministic per-tile noise so grass looks varied but doesn't flicker.
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

export function grass(x, y, tx, ty) {
  r(x, y, T, T, C.grass);
  const h = hash(tx, ty);
  for (let i = 0; i < 5; i++) {
    const px = (h >> (i * 3)) % 14, py = (h >> (i * 5 + 1)) % 14;
    r(x + px, y + py, 1, 2, i % 2 ? C.blade : C.grass3);
  }
  if (h % 9 === 0) { r(x + 6, y + 6, 2, 2, C.white); r(x + 7, y + 7, 1, 1, C.gold); }
  if (h % 13 === 1) { r(x + 10, y + 3, 2, 2, C.pink); r(x + 10, y + 3, 1, 1, C.white); }
}

export function path(x, y, tx, ty) {
  r(x, y, T, T, C.dirt);
  const h = hash(tx, ty);
  for (let i = 0; i < 4; i++) r(x + ((h >> (i * 4)) % 15), y + ((h >> (i * 4 + 2)) % 15), 2, 1, C.dirt2);
}

export function soil(x, y, watered) {
  r(x, y, T, T, C.grass);
  r(x + 1, y + 1, 14, 14, watered ? C.soilWet : C.soil);
  for (let i = 0; i < 3; i++) r(x + 2, y + 3 + i * 4, 12, 1, watered ? C.ink : C.soil2);
}

export function water(x, y, tx, ty, t) {
  r(x, y, T, T, C.water);
  const ph = Math.floor(t / 400 + tx * 0.7 + ty * 1.3) % 4;
  r(x + 2 + ph * 2, y + 4, 4, 1, C.water2);
  r(x + 9 - ph, y + 11, 4, 1, C.water2);
}

// Shoreline edge drawn on top of water tiles that touch land.
export function shore(x, y, n, s, w, e) {
  if (n) r(x, y, T, 2, C.foam);
  if (s) r(x, y + 14, T, 2, C.foam);
  if (w) r(x, y, 2, T, C.foam);
  if (e) r(x + 14, y, 2, T, C.foam);
}

export function tree(x, y) {
  r(x + 6, y + 10, 4, 6, C.trunk);
  r(x + 1, y + 2, 14, 9, C.leaf);
  r(x + 3, y, 10, 3, C.leaf);
  r(x + 3, y + 3, 4, 3, C.leaf2);
  r(x + 9, y + 7, 4, 3, C.leaf3);
  r(x + 2, y + 11, 12, 1, C.leaf3);
}

export function fence(x, y, horizontal) {
  if (horizontal) { r(x, y + 6, T, 2, C.wood); r(x, y + 11, T, 2, C.wood2); r(x + 2, y + 4, 3, 11, C.wood); r(x + 11, y + 4, 3, 11, C.wood); }
  else { r(x + 6, y, 4, T, C.wood); r(x + 6, y, 1, T, C.wood2); }
}

// Buildings are drawn as whole pieces spanning several tiles.
export function house(x, y, w, h, roof, roof2, sign) {
  const roofH = Math.floor(h * 0.45);
  r(x + 2, y + roofH, w - 4, h - roofH, C.wall);
  for (let i = 0; i < h - roofH; i += 4) r(x + 2, y + roofH + i, w - 4, 1, C.wall2);
  for (let i = 0; i < roofH; i++) {
    const inset = Math.max(0, roofH - i - 1) >> 1;
    r(x + inset, y + i, w - inset * 2, 1, i % 3 === 0 ? roof2 : roof);
  }
  r(x, y + roofH - 2, w, 3, roof2);
  const dx = x + Math.floor(w / 2) - 6;
  r(dx, y + h - 18, 12, 18, C.woodDark);
  r(dx + 1, y + h - 17, 10, 17, C.wood);
  r(dx + 8, y + h - 9, 2, 2, C.gold);
  for (const wx of [x + 8, x + w - 22]) {
    r(wx, y + roofH + 6, 14, 12, C.woodDark);
    r(wx + 1, y + roofH + 7, 12, 10, C.window);
    r(wx + 7, y + roofH + 7, 1, 10, C.woodDark);
    r(wx + 1, y + roofH + 11, 12, 1, C.woodDark);
    r(wx + 2, y + roofH + 8, 3, 2, C.white);
  }
  if (sign) {
    const sw = sign.length * 4 + 6, sx = x + (w - sw) / 2, sy = y + roofH - 12;
    r(sx, sy, sw, 9, C.woodDark); r(sx + 1, sy + 1, sw - 2, 7, C.wall);
    tinyText(sign, sx + 3, sy + 2, C.ink);
  }
}

export function mailbox(x, y, flag) {
  r(x + 7, y + 8, 2, 8, C.wood2);
  r(x + 3, y + 2, 10, 7, C.pants);
  r(x + 3, y + 2, 10, 2, C.roofStore2);
  r(x + 4, y + 5, 3, 2, C.ink);
  r(x + 13, y + (flag ? 0 : 4), 2, flag ? 6 : 3, C.roof);
}

export function board(x, y) {
  r(x + 2, y + 10, 2, 6, C.wood2); r(x + 12, y + 10, 2, 6, C.wood2);
  r(x, y + 1, 16, 11, C.woodDark); r(x + 1, y + 2, 14, 9, C.wood);
  r(x + 2, y + 3, 5, 4, C.white); r(x + 9, y + 4, 5, 5, C.wall);
  r(x + 3, y + 4, 3, 1, C.ink); r(x + 10, y + 5, 3, 1, C.ink); r(x + 10, y + 7, 2, 1, C.ink);
  r(x + 4, y + 2, 1, 1, C.roof); r(x + 11, y + 3, 1, 1, C.roof);
}

export function dock(x, y) {
  r(x, y + 2, T, 12, C.wood);
  for (let i = 0; i < 4; i++) r(x + i * 4, y + 2, 1, 12, C.wood2);
  r(x, y + 13, T, 1, C.woodDark);
}

// Seeds have four growth stages (0–3); stage 3 is ripe and shows the crop.
export function crop(x, y, kind, stage, t) {
  const stem = C.leaf2;
  if (stage === 0) { r(x + 6, y + 9, 1, 1, C.dirt); r(x + 9, y + 8, 1, 1, C.dirt); r(x + 7, y + 11, 1, 1, C.dirt); return; }
  if (stage === 1) { r(x + 7, y + 8, 2, 4, stem); r(x + 5, y + 7, 2, 2, stem); r(x + 9, y + 7, 2, 2, stem); return; }
  if (stage === 2) {
    r(x + 7, y + 5, 2, 7, stem); r(x + 4, y + 4, 3, 3, stem); r(x + 9, y + 4, 3, 3, stem); r(x + 6, y + 2, 4, 3, C.leaf);
    return;
  }
  const bob = Math.floor(t / 300) % 2;
  if (kind === "chatter") {
    // carrot: orange root peeking out, big leafy top
    r(x + 5, y + 2 - bob, 2, 4, C.leaf); r(x + 9, y + 2 - bob, 2, 4, C.leaf); r(x + 7, y + 1 - bob, 2, 5, C.leaf2);
    r(x + 5, y + 6, 6, 4, "#ff8a2a"); r(x + 6, y + 10, 4, 2, "#ff8a2a"); r(x + 7, y + 12, 2, 1, "#ff8a2a");
    r(x + 6, y + 7, 1, 1, "#ffb066");
  } else if (kind === "rumor") {
    // radish: round pink-red bulb
    r(x + 6, y + 1 - bob, 2, 4, C.leaf); r(x + 8, y + 2 - bob, 2, 3, C.leaf2);
    r(x + 4, y + 5, 8, 6, "#e84a6a"); r(x + 5, y + 4, 6, 8, "#e84a6a"); r(x + 7, y + 12, 2, 2, C.white);
    r(x + 5, y + 6, 2, 2, C.pink);
  }
  // sparkle = ready to harvest
  if (Math.floor(t / 250) % 3 === 0) { r(x + 13, y + 1, 1, 3, C.white); r(x + 12, y + 2, 3, 1, C.white); }
}

export function sproutWaiting(x, y, t) {
  // little thinking dots above a crop whose scout is still out
  const n = Math.floor(t / 300) % 4;
  for (let i = 0; i < n; i++) r(x + 4 + i * 3, y - 3, 2, 2, C.white);
}

// The farmer. dir: 0 down, 1 up, 2 left, 3 right. frame: 0/1 walk step.
export function farmer(x, y, dir, frame, moving) {
  const step = moving ? (frame ? 1 : -1) : 0;
  r(x + 4, y + 15, 8, 1, "rgba(0,0,0,.18)");
  // legs
  r(x + 5, y + 11, 2, 4 + (step > 0 ? -1 : 0), C.pants); r(x + 9, y + 11, 2, 4 + (step < 0 ? -1 : 0), C.pants);
  r(x + 5, y + 14 + (step > 0 ? -1 : 0), 2, 1, C.boot); r(x + 9, y + 14 + (step < 0 ? -1 : 0), 2, 1, C.boot);
  // body
  r(x + 4, y + 7, 8, 5, C.shirt); r(x + 4, y + 11, 8, 1, C.neonDark);
  r(x + 3, y + 8 + (moving && frame ? 1 : 0), 1, 3, C.skin); r(x + 12, y + 8 + (moving && !frame ? 1 : 0), 1, 3, C.skin);
  // head
  r(x + 4, y + 2, 8, 6, C.skin);
  if (dir === 1) r(x + 4, y + 3, 8, 5, C.hair);
  else if (dir === 0) { r(x + 5, y + 4, 1, 2, C.ink); r(x + 10, y + 4, 1, 2, C.ink); r(x + 7, y + 6, 2, 1, "#e08a7a"); r(x + 4, y + 3, 8, 1, C.hair); }
  else if (dir === 2) { r(x + 5, y + 4, 1, 2, C.ink); r(x + 8, y + 3, 4, 4, C.hair); }
  else { r(x + 10, y + 4, 1, 2, C.ink); r(x + 4, y + 3, 4, 4, C.hair); }
  // straw hat
  r(x + 2, y + 2, 12, 1, C.hat2); r(x + 4, y, 8, 2, C.hat); r(x + 4, y + 1, 8, 1, C.roof);
}

// Orby: the valley's floating orb spirit.
export function orby(x, y, t) {
  const b = Math.round(Math.sin(t / 400) * 1.5);
  r(x + 4, y + 15, 8, 1, "rgba(0,0,0,.18)");
  y += b;
  r(x + 4, y + 2, 8, 12, C.neon); r(x + 2, y + 4, 12, 8, C.neon); r(x + 3, y + 3, 10, 10, C.neon);
  r(x + 3, y + 2, 2, 1, C.ink); r(x + 11, y + 2, 2, 1, C.ink); r(x + 2, y + 3, 1, 2, C.ink); r(x + 13, y + 3, 1, 2, C.ink);
  r(x + 1, y + 5, 1, 6, C.ink); r(x + 14, y + 5, 1, 6, C.ink); r(x + 4, y + 1, 8, 1, C.ink); r(x + 4, y + 14, 8, 1, C.ink);
  r(x + 2, y + 11, 1, 2, C.ink); r(x + 13, y + 11, 1, 2, C.ink); r(x + 3, y + 13, 1, 1, C.ink); r(x + 12, y + 13, 1, 1, C.ink);
  r(x + 4, y + 4, 3, 2, C.white);
  const blink = Math.floor(t / 150) % 30 === 0;
  r(x + 5, y + 7, 2, blink ? 1 : 2, C.ink); r(x + 9, y + 7, 2, blink ? 1 : 2, C.ink);
  r(x + 3, y + 10, 2, 1, C.pink); r(x + 11, y + 10, 2, 1, C.pink);
  r(x + 7, y + 10, 2, 1, C.ink);
  // orbit ring
  r(x - 1, y + 9, 3, 1, C.sky); r(x + 14, y + 6, 3, 1, C.sky);
}

export function bobber(x, y, t, bite) {
  const b = bite ? (Math.floor(t / 80) % 2) * 2 : Math.round(Math.sin(t / 300));
  r(x + 6, y + 7 + b, 4, 2, C.roof); r(x + 6, y + 9 + b, 4, 2, C.white); r(x + 7, y + 5 + b, 2, 2, C.ink);
  r(x + 4, y + 11, 8, 1, C.foam);
}

export function exclaim(x, y) {
  r(x + 6, y - 10, 4, 8, C.gold); r(x + 6, y, 4, 3, C.gold);
  r(x + 7, y - 9, 2, 6, C.white); r(x + 7, y + 1, 2, 1, C.white);
}

export function fishSprite(x, y, color) {
  r(x + 3, y + 5, 8, 6, color); r(x + 2, y + 6, 10, 4, color); r(x + 11, y + 4, 3, 8, color);
  r(x + 4, y + 7, 1, 1, C.ink); r(x + 5, y + 6, 4, 1, C.white);
}

// A 3×5 pixel font for tiny signs.
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101",
  L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", Y: "101101010010010",
  " ": "000000000000000",
};
export function tinyText(s, x, y, c) {
  ctx.fillStyle = c;
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = FONT[ch] || FONT[" "];
    for (let p = 0; p < 15; p++) if (g[p] === "1") ctx.fillRect(x + i * 4 + (p % 3), y + Math.floor(p / 3), 1, 1);
  });
}
