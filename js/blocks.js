// Template blocks: plain labelled placeholders for every sprite slot. They show exactly
// where each piece of art goes, how much room it has and where it touches the ground,
// so painted sprites can be made to fit. The game shows them in blocks view (press B,
// or open the game with ?art=blocks), and sprites.html exports them as PNG guides.

import * as Art from "./art.js";

export const COLORS = {
  building: "#d9825b", nature: "#6fae5a", prop: "#d6b04e", character: "#5b8fd8", crop: "#a3c94a", ui: "#c98ad8", portrait: "#e28bb0",
  grass: "#9ccc74", cobble: "#cbbb9c", dirt: "#d0a46e", water: "#62aee4", waterfall: "#9fd8f7", cliff: "#8e8b86",
  bridge: "#b07f4c", dock: "#a8774a", soil: "#7d5638", "soil-wet": "#5c3c26",
};
const INK = "#24160f";

const ctx = () => Art.getContext();
function rect(x, y, w, h, c) { const g = ctx(); g.fillStyle = c; g.fillRect(x, y, w, h); }
function outline(x, y, w, h, c) { rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c); rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// Label, shortened to fit the width it has.
function label(text, cx, y, maxW, color = INK) {
  let t = text.toUpperCase();
  const fit = Math.max(1, Math.floor((maxW - 2) / 4));
  if (t.length > fit) t = t.replace(/[AEIOU]/g, (m, i) => (i === 0 ? m : "")).slice(0, fit);
  const w = t.length * 4 - 1;
  rect(Math.round(cx - w / 2) - 1, y - 1, w + 2, 7, "rgba(255,255,255,.75)");
  Art.tinyText(t, Math.round(cx - w / 2), y, color);
}

// A building, tree or prop: its full picture box, its footprint on the ground, and the anchor.
export function staticBlock(name, category, ax, ay, w, h, fw = 1, fh = 1, showName = true) {
  const base = COLORS[category] || COLORS.prop;
  const x = Math.round(ax - w / 2), y = Math.round(ay - h);
  const fpW = fw * 16, fpH = fh * 16, fx = Math.round(ax - fpW / 2), fy = ay - fpH;
  // picture box ("air" above the footprint)
  const g = ctx();
  g.fillStyle = base; g.globalAlpha = 0.45; g.fillRect(x, y, w, h - fpH); g.globalAlpha = 1;
  // footprint: solid, with a front face so it reads as standing up
  rect(fx, fy, fpW, fpH, shade(base, 0.85));
  rect(fx, Math.max(fy, ay - Math.min(fpH, 6)), fpW, Math.min(fpH, 6), shade(base, 0.6));
  for (let i = -fpH; i < fpW; i += 4) { const x0 = Math.max(0, i), x1 = Math.min(fpW, i + fpH); if (x1 > x0) rect(fx + x0, fy + (x0 - i), 1, 1, shade(base, 0.7)); }
  outline(x, y, w, h, shade(base, 0.45));
  outline(fx, fy, fpW, fpH, INK);
  // anchor (bottom centre)
  rect(Math.round(ax) - 1, ay - 2, 2, 2, INK);
  if (showName) label(name, ax, y + 2, w);
  return true;
}

// A ground material tile.
export function tileBlock(name, x, y, pick = 0) {
  const base = COLORS[name] || COLORS.grass;
  rect(x, y, 16, 16, base);
  rect(x, y, 16, 1, shade(base, 1.12)); rect(x, y, 1, 16, shade(base, 1.12));
  rect(x, y + 15, 16, 1, shade(base, 0.88)); rect(x + 15, y, 1, 16, shade(base, 0.88));
  if (name === "water" || name === "waterfall") { const o = ((pick % 4) + 4) % 4; rect(x + 3 + o * 2, y + 6 + (name === "waterfall" ? o * 2 : 0), 5, 1, shade(base, 1.2)); }
  if (name === "bridge" || name === "dock") for (let i = 3; i < 16; i += 4) rect(x + i, y, 1, 16, shade(base, 0.8));
  if (name === "soil" || name === "soil-wet") for (let i = 3; i < 16; i += 4) rect(x + 2, y + i, 12, 1, shade(base, 0.75));
  return true;
}

// A character or crop: its cell box, a body, and an arrow showing which way it faces.
const DIRS = ["DOWN", "UP", "LEFT", "RIGHT", "CARRY"];
export function sheetBlock(name, category, x, y, cellW, cellH, row, col, showName = true) {
  const base = COLORS[category] || COLORS.character;
  const w = cellW / 2, h = cellH / 2;
  const bx = Math.round(x + 8 - w / 2), by = y + 16 - h;
  if (category === "ui") {
    rect(bx + 1, by + 1, w - 2, h - 2, base); outline(bx + 1, by + 1, w - 2, h - 2, INK);
    Art.tinyText(String(col + 1), Math.round(x + 7), by + Math.round(h / 2) - 2, INK);
    if (showName) label(name, x + 8, by - 6, 40);
    return true;
  }
  if (category === "crop") {
    const hgt = [3, 6, 10, 14][Math.min(3, col)];
    rect(x + 4, y + 16 - hgt - 1, 8, hgt, shade(base, 0.9 + col * 0.05)); outline(x + 4, y + 16 - hgt - 1, 8, hgt, INK);
    Art.tinyText(String(col), x + 7, y + 16 - hgt + 1, INK);
    return true;
  }
  rect(bx + 2, by + 2, w - 4, h - 3, base);
  rect(bx + 2, by + h - 5, w - 4, 4, shade(base, 0.7));
  outline(bx + 2, by + 2, w - 4, h - 3, INK);
  rect(Math.round(x + 8) - 1, y + 14, 2, 2, INK);
  // facing arrow
  const cx = Math.round(x + 8), cy = by + Math.round(h / 2) - 1;
  const r = row === 4 ? 0 : row;
  const pts = [[[0, 2], [-2, -1], [2, -1]], [[0, -2], [-2, 1], [2, 1]], [[-2, 0], [1, -2], [1, 2]], [[2, 0], [-1, -2], [-1, 2]]][r];
  const g = ctx(); g.fillStyle = "#fff"; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(cx + px * 1.5, cy + py * 1.5) : g.moveTo(cx + px * 1.5, cy + py * 1.5))); g.closePath(); g.fill();
  if (row === 4) rect(cx - 4, cy + 3, 8, 4, COLORS.prop);
  if (showName) label(name.replace(/^folk-/, "F"), x + 8, by - 6, 40);
  return true;
}
export const DIR_NAMES = DIRS;
