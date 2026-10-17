// Image-generator prompts for every sprite slot, in the style of the concept paintings
// (assets/*.webp). fullPrompt(slot) = shared style + what the thing is + how to frame it
// for that kind of slot (size, view, background, sheet layout). PROMPTS.md is generated
// from this file by tools/sprite-prompts.mjs.

export const STYLE = "Cozy pixel art for a farming game in the style of Stardew Valley, matching a warm golden-hour painting: rich greens, warm wood browns, cream plaster, slate-blue roofs, small lime-green (#d4ff3f) Orbio accents. Clean dark-brown outlines, light from the top-left, crisp hard pixel edges, no blur, no anti-aliasing smear.";

const BG = "Isolated on a flat solid magenta (#ff00ff) background. No ground, no scenery, no other objects, no text, no watermark.";
const VIEW = "Top-down three-quarter view like Stardew Valley: the camera looks down at about 45°, you see the top and the front face, the front faces straight toward the viewer. Not isometric, no diagonal walls.";

const FACES = ["facing down (toward the viewer)", "facing up (back to the viewer)", "facing left", "facing right"];
const robot = "a small cute rounded white robot with a dark navy visor face showing two glowing cyan eyes, stubby arms, little feet";

// What each slot shows. Anything missing falls back to its description.
export const SUBJECTS = {
  farmhouse: "a two-storey timber-frame farmhouse: cream plaster walls with dark brown wooden beams, a dark slate-blue shingled roof with two dormer windows, a stone chimney on the right, a small covered porch with steps and the front door at the bottom centre, flower boxes of pink and white flowers under the windows, a few climbing vines",
  barn: "a classic red wooden barn with white trim, a dark gambrel roof, big white X-braced double doors at the bottom centre, a small hayloft window with hay",
  silo: "a tall wooden grain silo with metal bands and a rounded copper dome on top, with a round lime-green (#d4ff3f) orb emblem with a cute smiling face painted on its side, and a small window showing a pile of gold coins",
  station: "the Scout Station: a chunky grey-blue metal charging machine for little robots, with a screen showing a cute robot face in glowing cyan, a few glowing buttons and cables. Leave the top 20 px empty (a floating coin is drawn there separately)",
  greenhouse: "a glass greenhouse with a wooden frame and a gabled glass roof, green plants and red tomatoes visible inside, a few vines on the frame, a wooden door at the bottom centre",
  gazette: "the Meme Gazette, a small town shop: timber-frame walls, a green shingled roof, a green-and-white striped awning, a big round gold coin sign with a cheerful shiba dog face on the roof, a little chalkboard over the door with a green line chart going up, the door at the bottom centre",
  launchpad: "the Launchpad Tower: a round stone tower with an arched wooden door at the bottom centre, two small windows, a blue banner with a lime-green orb emblem, topped by a round metal landing pad with a glowing lime-green ring and a small white rocket with red fins standing on it",
  fountain: "a round town fountain: a stone basin full of blue water ringed with colourful flowers, and in the middle a stone statue of a chubby sitting cat proudly holding a big gold coin",
  "stall-red": "a market stall with a red-and-white striped awning on wooden poles, a wooden counter with crates of colourful fruit and vegetables",
  "stall-blue": "a market stall with a blue-and-white striped awning on wooden poles, a wooden counter with crates of colourful fruit and vegetables",
  "stall-green": "a market stall with a green-and-white striped awning on wooden poles, a wooden counter with jars, bread and vegetables",
  "stall-orange": "a market stall with an orange-and-white striped awning on wooden poles, a wooden counter with pumpkins, apples and sunflowers",
  lantern: "a black iron street lamp post with a glowing warm-yellow lantern on top",
  "tree-round": "a leafy round deciduous tree with a full green canopy and a brown trunk",
  "tree-apple": "a round apple tree with a full green canopy dotted with shiny red apples and a brown trunk",
  "tree-cherry": "a cherry blossom tree with a fluffy pink canopy of blossoms and a brown trunk",
  "tree-pine": "a tall dark-green pine tree",
  "bush-pink": "a small round green bush with pink flowers",
  "bush-white": "a small round green bush with white flowers",
  "bush-red": "a small round green bush with red berries",
  "bush-purple": "a small round green bush with purple flowers",
  sunflower: "a pair of tall sunflowers with green stems and leaves",
  crate: "a wooden crate full of red apples and oranges",
  barrel: "a wooden barrel with iron bands",
  hay: "a rectangular golden hay bale tied with twine",
  board: "a wooden bulletin board on two posts with a few pinned paper notes",
  mailbox: "a blue metal mailbox on a wooden post, with its red flag down",
  "mailbox-flag": "a blue metal mailbox on a wooden post, with its red flag raised up (mail is waiting)",
  "fence-h": "one section of wooden rail fence running left to right, two rails and a post at each end, so copies join seamlessly side by side",
  "fence-v": "one section of wooden fence running away from the viewer (top to bottom of the picture): a single post-and-rail line seen from above, so copies join seamlessly top to bottom",

  grass: "lush green grass with a few tiny white, yellow and pink wildflowers",
  cobble: "warm beige rounded cobblestone paving",
  dirt: "a packed light-brown dirt path with a few small pebbles",
  soil: "a square patch of dry tilled farm soil with neat horizontal furrows and a slightly darker rim",
  "soil-wet": "a square patch of freshly watered tilled farm soil, darker and glistening, with neat horizontal furrows",
  water: "blue lake water with soft light ripples",
  waterfall: "falling water: bright white and light-blue vertical streaks",
  cliff: "a grey rock cliff face with a grassy top edge",
  bridge: "wooden bridge planks running left to right, with a wooden rail along the top and bottom edges",
  dock: "wooden dock planks running left to right over water",

  farmer: "the player, a young farmer: straw hat with a red band, orange hair, white shirt, blue overalls, brown boots",
  robot: `a scout robot, ${robot}, with a green two-leaf sprout growing from the top of its head`,
  "robot-hat": `a farmhand robot, ${robot}, wearing a straw hat with a red band`,
  "robot-night": `a night-shift robot, ${robot}, wearing a blue nightcap with a white pompom`,
  "robot-visitor": `a visiting robot, ${robot}, wearing a purple scarf and a green leaf sprout on its head`,
  "robot-launched": `a proud robot, ${robot}, wearing a gold scarf and a shiny gold rocket badge on its chest`,
  "folk-1": "Mabel, a friendly older townswoman with dark brown hair in a bun, a red blouse and brown trousers",
  "folk-2": "Gus, a cheerful blond townsman with a straw hat, a green shirt and blue overalls",
  "folk-3": "Juniper, a young townswoman with auburn hair, a blue cap, a white shirt and brown trousers",
  "folk-4": "Old Pete, an old townsman with grey hair and a grey beard, a purple shirt and dark trousers",
  cow: "a black-and-white dairy cow with a pink nose and small horns, side view facing right",
  chicken: "a white hen with a red comb, side view facing right",
  orby: "Orby, the valley's spirit: a round floating glowing lime-green (#d4ff3f) orb with a cute face, two dark eyes, rosy pink cheeks, a tiny smile and a thin light-blue orbit ring around it",
  "crop-chatter": "a carrot (bright orange root with a leafy green top)",
  "crop-rumor": "a round pink-red radish with a small white tip and green leaves",
  "crop-deep": "a long white daikon radish with a big crown of green leaves",
  "station-coin": "a gold coin with a lime-green orb face on it, spinning",

  "bubble-x": "a bold black X logo (the X social network)",
  "bubble-web": "a small blue globe",
  "bubble-page": "a small paper page with lines of text",
  "bubble-chain": "two linked gold chain links",
  "bubble-think": "three dots (thinking)",
  "bubble-done": "a green check mark",
  "bubble-mail": "a white envelope with a red wax seal",
  "seed-chatter": "a small paper seed packet with an orange top band and a picture of a carrot",
  "seed-rumor": "a small paper seed packet with a pink-red top band and a picture of a radish",
  "seed-deep": "a small paper seed packet with a white top band and a picture of a long white daikon",
  "fish-common": "a plain grey fish, side view facing right",
  "fish-uncommon": "a blue fish with a lighter belly, side view facing right",
  "fish-rare": "a purple fish with shimmering fins, side view facing right",
  "fish-legendary": "a shining golden fish with sparkles, side view facing right",
  bobber: "a red-and-white fishing bobber floating with a tiny ring of ripple",
  exclaim: "a bold yellow exclamation mark with a dark outline, like a speech alert",
  "icon-mailbox": "a blue mailbox with its red flag up",
  "icon-board": "a wooden bulletin board with pinned notes",
  "icon-rocket": "a small white rocket with red fins and a cyan window",
  "icon-letter": "a white envelope with a red wax seal",
  "icon-coin": "a shiny gold coin",
  "icon-harvests": "a carrot",
  "icon-fish": "a little blue fish",
  "icon-letters": "a white envelope",
  "icon-agents": "a cute white robot head with a dark visor and cyan eyes",
  "icon-graduate": "a graduation cap with a gold tassel",
  "icon-watch": "an open eye",
  "icon-plant": "a green sprout in a patch of soil",
  "icon-piggy": "a pink piggy bank with a gold coin going in",
  "icon-kit": "a wooden crate with a gold label",
  "icon-flag": "a small red flag on a pole",
  "icon-sun": "a bright yellow sun",
  "icon-sparkle": "a gold sparkle star",
  "icon-wilted": "a drooping wilted brown flower",
  "icon-x": "a bold black X logo",
  "icon-web": "a blue globe",
  "icon-page": "a paper page with lines of text",
  "icon-chain": "two linked gold chain links",
  cursor: "a square selection frame: four bright white-and-gold corner brackets with an empty transparent middle",

  "portrait-orby": "Orby, a round glowing lime-green (#d4ff3f) orb spirit with a cute face, two dark eyes, rosy cheeks and a tiny smile, a light-blue orbit ring",
  "portrait-farmer": "the young farmer: straw hat with a red band, orange hair, freckles, white shirt and blue overalls, warm smile",
  "portrait-robot": `a scout robot: ${robot}, a green two-leaf sprout on its head, happy eyes`,
  "portrait-shopkeeper": "a cheerful market vendor with blond hair, a straw hat, a green shirt and an apron",
  "portrait-folk-1": "Mabel, a friendly older woman with dark brown hair in a bun and a red blouse",
  "portrait-folk-2": "Gus, a cheerful blond man with a straw hat and a green shirt",
  "portrait-folk-3": "Juniper, a young woman with auburn hair, a blue cap and a white shirt",
  "portrait-folk-4": "Old Pete, an old man with grey hair, a grey beard and a purple shirt",

  "skin-panel": "a dialog box frame: a thick dark-brown wooden border with a lighter wood inner bevel and small decorated corners, around a plain warm cream parchment middle",
  "skin-card": "a report card: a thin dark-brown border around a plain off-white paper middle",
  "skin-button": "a game button: a beige wooden plaque with a dark-brown border and a darker bottom edge so it looks pressable",
  "skin-button-primary": "a game button: a lime-green (#d4ff3f) plaque with a dark-brown border and a darker bottom edge so it looks pressable",
  "skin-hud": "a small HUD panel: cream parchment with a thin dark-brown wooden border",
  "skin-input": "a text input box: plain white middle with a dark-brown inset border",
  "skin-seed": "a choice card: a light wooden plaque with a dark-brown border",
  "skin-dpad": "a touch-control button: a rounded cream square with a dark-brown border and a darker bottom edge",
  "skin-meter": "a glowing hype meter fill: a horizontal bar fading from lime green on the left to warm orange on the right",
  "skin-abutton": "a round lime-green (#d4ff3f) touch button with a dark-brown rim and a bold dark letter A in the middle",
  "title-logo": "a game logo wordmark reading exactly \"Orbio Valley\" on two lines, chunky rounded lime-green (#d4ff3f) pixel letters with a dark-brown outline and a warm drop shadow, a tiny glowing orb dotting the i",
};

// How to frame each kind of slot. Sizes are the final PNG size (2 image pixels per game pixel).
export function framing(slot) {
  const size = slot.kind === "static" ? [slot.w * 2, slot.h * 2] : slot.kind === "skin" ? [slot.pw, slot.ph] : null;
  if (slot.kind === "tile") {
    const what = slot.name === "water" || slot.name === "waterfall"
      ? `${slot.n} animation frames side by side in one row (a looping ripple), each a 32×32 square`
      : slot.n > 1 ? `${slot.n} slight variations side by side in one row, each a 32×32 square` : "one 32×32 square";
    return `Seamless tileable square ground texture, straight top-down view, filling the whole square edge to edge with no border and no vignette, even lighting so it repeats invisibly. Make ${what}.`;
  }
  if (slot.kind === "sheet") {
    const cell = `${slot.cellW}×${slot.cellH} px`;
    if (slot.cat === "crop") return `Sprite strip on a flat magenta (#ff00ff) background: 4 equal square cells (${cell}) in one row showing the growth stages left to right: seeds in a little soil, a small sprout, a leafy young plant, the ripe crop poking out of the soil. Same scale in every cell, plant centred at the bottom of each cell.`;
    if (slot.name === "station-coin") return `Sprite strip on a flat magenta (#ff00ff) background: 4 equal square cells (${cell}) in one row, a spinning coin: face-on, turned three-quarters, edge-on (a thin vertical sliver), turned three-quarters back.`;
    if (slot.name === "orby") return `Sprite strip on a flat magenta (#ff00ff) background: 4 equal square cells (${cell}) in one row, a gentle floating bob (up a little, up, down a little, centre). Same character, same size in every cell.`;
    if (slot.rows === 1) return `Sprite strip on a flat magenta (#ff00ff) background: ${slot.cols} equal cells (${cell}) in one row: standing, then a walking or pecking step. Same character, same size and colours in every cell, feet on the bottom edge of each cell.`;
    const rows = FACES.slice(0, Math.min(4, slot.rows)).concat(slot.rows === 5 ? ["facing down while carrying a wooden crate of carrots and radishes"] : []);
    return `Character sprite sheet on a flat magenta (#ff00ff) background: a grid of ${slot.cols} columns × ${slot.rows} rows of equal cells (${cell} each, ${slot.cellW * slot.cols}×${slot.cellH * slot.rows} px in total). Rows from top to bottom: ${rows.join("; ")}. Columns from left to right: standing still, walking step A, walking step B. The exact same character in every cell, same size and colours, feet on the bottom edge of each cell, centred. Simpler is fine: a single still image facing the viewer also works.`;
  }
  if (slot.cat === "portrait") return `Character portrait for a dialog box: head and shoulders, facing the viewer, friendly expression, filling a ${size[0]}×${size[1]} px square. Flat magenta (#ff00ff) background, no text.`;
  if (slot.kind === "skin") {
    if (slot.name === "title-logo") return `Game title logo, ${size[0]}×${size[1]} px, flat front-on, on a flat magenta (#ff00ff) background. The text must read exactly "Orbio Valley" and nothing else.`;
    if (slot.name === "skin-meter") return `Flat front-on horizontal bar texture, exactly ${size[0]}×${size[1]} px, filling the whole image edge to edge (it is stretched to the meter's length), no border, no text.`;
    if (!slot.slice) return `Flat front-on game UI element (no perspective), ${size[0]}×${size[1]} px, on a flat magenta (#ff00ff) background, no text other than what's described.`;
    return `Flat front-on game UI frame (no perspective), exactly ${size[0]}×${size[1]} px, for 9-slice scaling: the outer ${slot.slice} px on every side is the border, with decorated corners and straight, even edges that can stretch; the middle is plain and evenly coloured so it can stretch. Fill the whole image, no background around it, no text.`;
  }
  if (slot.name.startsWith("bubble-")) return `A small white thought bubble with a dark outline and a little tail pointing down at the bottom centre, with the picture inside it. ${size[0]}×${size[1]} px, readable at that size. ${BG}`;
  if (slot.cat === "ui" || slot.cat === "menu") return `A single small game icon, bold simple silhouette with a thick dark outline that reads clearly at ${size[0]}×${size[1]} px, centred. ${BG}`;
  const foot = `It stands on a footprint of ${slot.fw}×${slot.fh} tiles (one tile is 32 px), so its base is about ${slot.fw * 32} px wide; the base sits on the bottom edge of the image, with a soft shadow under it.`;
  return `${VIEW} One single object, centred, whole object visible. Final size ${size[0]}×${size[1]} px. ${foot} ${BG}`;
}

export function fullPrompt(slot) {
  const subject = slot.prompt || SUBJECTS[slot.name] || slot.desc;
  const lead = slot.kind === "tile" ? `Texture of ${subject}.` : slot.kind === "skin" ? `${subject[0].toUpperCase()}${subject.slice(1)}.` : `Pixel art sprite of ${subject}.`;
  // ground textures shouldn't get outlines, or the tiles show a grid
  const style = slot.kind === "tile" ? STYLE.replace("Clean dark-brown outlines, light", "No outlines, soft light") : STYLE;
  return `${lead} ${framing(slot)} ${style}`;
}

// How to turn a raw generated image into the slot's PNG.
export function prepCommand(slot) {
  if (slot.kind === "tile") return `tools/prep-sprite.sh raw.png ${slot.name} ${slot.n * 32}x32 tile`;
  if (slot.kind === "skin") return `tools/prep-sprite.sh raw.png ${slot.name} ${slot.pw}x${slot.ph} ${slot.slice || slot.name === "skin-meter" ? "frame" : slot.name === "title-logo" ? "exact" : "fit"}`;
  if (slot.kind === "sheet") return `tools/make-sheet.sh ${slot.name} ${slot.cols} ${slot.rows} ${slot.cellW}x${slot.cellH} frame1.png frame2.png …  (or: tools/prep-sprite.sh raw.png ${slot.name} ${slot.cellW * slot.cols}x${slot.cellH * slot.rows} exact)`;
  return `tools/prep-sprite.sh raw.png ${slot.name} ${slot.w * 2}x${slot.h * 2}`;
}
