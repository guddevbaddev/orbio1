// Every sprite slot has a usable image prompt and prep command.
//   node tests/prompts.test.mjs
import assert from "node:assert/strict";
const { SLOTS, sizeLabel } = await import("../js/sprites.js");
const P = await import("../js/prompts.js");

for (const s of SLOTS) {
  assert.ok(P.SUBJECTS[s.name], `${s.name} has a subject`);
  const prompt = P.fullPrompt(s);
  assert.ok(prompt.includes(P.STYLE.slice(0, 40)), `${s.name} carries the shared style`);
  if (s.kind === "static") assert.ok(prompt.includes(`${s.w * 2}×${s.h * 2}`), `${s.name} prompt states its size`);
  if (s.kind === "skin") assert.ok(prompt.includes(`${s.pw}×${s.ph}`), `${s.name} prompt states its size`);
  if (s.kind === "sheet") assert.ok(prompt.includes(`${s.cellW}×${s.cellH}`), `${s.name} prompt states its cell size`);
  if (s.kind === "tile") assert.ok(!/dark-brown outlines/.test(prompt), `${s.name} tile has no outlines`);
  assert.ok(P.prepCommand(s).includes(s.name), `${s.name} prep command`);
  assert.ok(sizeLabel(s), `${s.name} size label`);
}
assert.match(P.prepCommand(SLOTS.find((s) => s.name === "skin-panel")), / frame$/, "9-slice frames keep their edges");
assert.match(P.prepCommand(SLOTS.find((s) => s.name === "grass")), / tile$/);
assert.match(P.fullPrompt(SLOTS.find((s) => s.name === "title-logo")), /"Orbio Valley"/);
console.log(`✓ ${SLOTS.length} slots all have prompts, sizes and prep commands`);
