# Sprite spec: making the game look like the concept art

The game draws everything with code until a painted PNG exists for it. Every picture has a **slot**. Put `<slot>.png` in `assets/sprites/`, list it in `assets/sprites/manifest.json`, and the game uses it. You can replace things one at a time; anything without a PNG keeps its code art.

- **See every slot:** open `sprites.html` (served next to the game). It shows the block guide, the current art, your version if there is one, and the exact size.
- **Blocks view:** press **B** in the game (or open it with `?art=blocks`) to see the whole map as template blocks: every slot drawn as a labelled placeholder with its real footprint. Your painted sprites show up in blocks view too, so you can watch the map fill in. Press B again for the normal art.
- **Block guides:** `assets/sprite-templates/blocks/` has a guide for every slot at the exact PNG size. Each guide shows the tile grid (32px = one tile), the footprint the thing stands on (the solid box), and the anchor dot at the bottom centre. Character sheets have one cell per frame, labelled by direction. Generate or paint to fit the guide.
- **Current art:** `assets/sprite-templates/reference/` has what the game draws today at the same sizes, for proportions and colour reference.
- **Prompts:** `PROMPTS.md` has a ready-to-paste image prompt and prep command for every slot.
- **Raw images from an image generator:** `tools/prep-sprite.sh` and `tools/make-sheet.sh` turn them into game-ready PNGs (see Prep tools below). Or just send me the raw images and I'll do it.

## Style (match the concept paintings)

- **Camera:** top-down 3/4, like Stardew Valley. You look down at about 45°: you see the roof from above and the front wall facing you. **Not isometric**: no diagonal walls, buildings face straight down the screen.
- **Look:** cozy pixel art, warm palette, dark brown outlines, light from the top-left, soft shadow on the ground at the base.
- **Background:** transparent PNG. If your tool can't do transparency, use a flat magenta (`#ff00ff`) background and run it through `tools/prep-sprite.sh`.
- **Density:** 2 image pixels per game pixel, so **one ground tile is 32×32**. Larger images are scaled down smoothly, so 2× or 4× the listed size is fine **as long as the proportions match**.
- **Anchoring:** buildings, trees and props stand on the **bottom-centre** of their image, and that point sits on the bottom-centre of their footprint. Taller is fine; it just rises higher.
- **Night versions** (optional): `<slot>-night.png` with glowing windows. Without one, the game darkens the day version and adds lantern light.

## Reading a block guide

- **Faded box:** the picture area. Roofs, tree canopies and anything else that rises above the ground go here.
- **Solid box:** the footprint, the tiles it stands on and blocks the player from. The bottom of your art should sit on the bottom edge of this box.
- **Dot at the bottom centre:** the anchor. The game lines this point up with the footprint, so you can make art taller than the guide and it will still stand in the right place.
- **Block colours:**
  - orange: buildings
  - green: nature
  - yellow: props
  - blue: characters
  - lime: crops
  - purple: UI (bubbles, icons, seed packets, fish) and menus
  - pink: dialog portraits
  - flat colour tiles: ground materials

  Menu frames show their 9-slice corners shaded, with dashed lines where the edges stretch.

## What still needs art

`SPRITE_TRACKER.md` is the checklist: every slot, painted or not, most important first, with its size and which update added it. Re-run `node tools/sprite-tracker.mjs` after adding sprites. Every new feature adds its own slots, so the tracker is how you spot new work. `sprites.html` can also filter to "still needs art" and by update.

## Adding new things (no code)

New props and buildings go in `assets/world.json`. Each entry gets its own sprite slot, shows up as a block until its PNG exists, and can be walked up to and inspected:

```json
{ "decor": [
  { "name": "windmill", "title": "Windmill", "x": 8, "y": 25, "w": 2, "h": 2,
    "size": [64, 160], "category": "building", "light": 30,
    "say": "The windmill powers the Scout Station's chargers by night." }
] }
```

- **Position and footprint:** `x`, `y` are the top-left tile of the footprint, and `w`, `h` are its size in tiles. Open the game in blocks view to find free tiles. An entry that overlaps something is skipped, with a warning in the browser console.
- **`size`:** the PNG size, at 2× game pixels.
- **`category`:** sets the block colour.
- **`solid: false`:** lets the player walk through it.
- **`light`:** a glow radius at night.
- **`say`:** what it says when the player inspects it.

The two entries already in the file, `well` and `windmill`, are examples: they show as blocks until you add `well.png` and `windmill.png`.

## Character sheets

- **Columns** are frames: standing, step A, step B.
- **Rows** are the direction they face: down, up, left, right. The `robot` sheets have a 5th row: carrying a crate.
- **Simpler sheets work too.** A single row of frames is fine (they'll face one way). So is **one still picture** (it just won't animate). Start with that if an image generator can't keep a character consistent across frames.

## Order to make them in (biggest visual win first)

1. **Ground tiles:** `grass`, `cobble`, `dirt`, `water`. These cover most of the screen.
2. **Main buildings:** `farmhouse`, `barn`, `station`, `silo`, `gazette`, `fountain`, `greenhouse`.
3. **Trees:** `tree-round`, `tree-apple`, `tree-cherry`, `tree-pine`.
4. **Characters:** `robot`, `robot-hat`, `farmer`, `orby`, then `folk-1`…`folk-4`, `cow`, `chicken`.
5. **Crops:** `crop-chatter`, `crop-rumor`, `crop-deep`.
6. **Props, portraits and UI:** everything else. Dialog portraits are 96×96 and shown about 40px tall; UI icons and thought bubbles are 32×32.

## Prompts

**Every slot has a ready-to-paste image prompt in `PROMPTS.md`**, built from `js/prompts.js`. Each prompt includes:
- the shared style (matching the concept paintings);
- what the thing is;
- the camera view;
- the exact size and sheet layout;
- a flat magenta background, which the prep scripts remove.

Under each prompt is the command that turns the raw image into the game's PNG. `sprites.html` has a **Copy prompt** button on every slot, and `assets/sprite-prompts.json` has them all for batch tools. To change the wording, edit `js/prompts.js` and run `node tools/sprite-prompts.mjs`.

## Prep tools

`tools/prep-sprite.sh raw.png <slot> <WxH> [mode]` turns a raw image into `assets/sprites/<slot>.png` and adds it to the manifest. The modes:

| Mode | What it does | Use it for |
| --- | --- | --- |
| `fit` (default) | Removes the magenta background, trims, fits the image into the size and stands it on the bottom centre | Buildings, props, trees, icons, portraits |
| `exact` | Removes the background and resizes to exactly the size, with no trimming | The title logo, and sprite sheets that are already laid out on the grid |
| `tile` / `frame` | No background removal; resizes to exactly the size | Ground textures, 9-slice menu frames, the meter bar |

`tools/make-sheet.sh <slot> <cols> <rows> <cellW>x<cellH> frame1.png frame2.png …` builds a character or crop sheet from separately generated frames, row by row. Missing frames repeat the last one, so a single front view works as a start.

## Menus

Menu art has slots too, all marked "menus" in the tracker. Until each PNG exists, the menus keep their current look and emoji.
- **Frames:** `skin-panel` (the dialog box), `skin-card`, `skin-button`, `skin-button-primary`, `skin-hud`, `skin-input`, `skin-seed` and `skin-dpad`. These are 9-slice: the corners stay fixed while the edges and middle stretch to any size. The guide images mark the corner size.
- **Other menu pieces:** `skin-meter` (the hype bar), `skin-abutton` (the phone A button) and `title-logo` (replaces the title text).
- **Icons and cursor:** `icon-*` icons for tabs, buttons, toasts and the robot's step list, plus `cursor` (the highlight on the tile you're facing).

## Every slot

| File | Size | What it is |
| --- | --- | --- |
| [`farmhouse.png`](PROMPTS.md#farmhouse) (+ `farmhouse-night.png`) | 224×224 | Your timber farmhouse. Footprint 7×4 tiles; the door is at the bottom centre. |
| [`barn.png`](PROMPTS.md#barn) (+ `barn-night.png`) | 160×192 | Red barn with a big door at the bottom centre. Footprint 5×4 tiles. |
| [`silo.png`](PROMPTS.md#silo) | 64×176 | Tall coin silo with the Orbio orb emblem. Footprint 2×2 tiles. |
| [`station.png`](PROMPTS.md#station) (+ `station-night.png`) | 64×96 | Scout Station, the robots' charging machine. The floating coin on top is animated by the game, so leave the top ~10px empty. |
| [`greenhouse.png`](PROMPTS.md#greenhouse) (+ `greenhouse-night.png`) | 192×176 | Glass greenhouse with a door at the bottom centre. Footprint 6×4 tiles. |
| [`gazette.png`](PROMPTS.md#gazette) (+ `gazette-night.png`) | 192×208 | The Meme Gazette shop: green roof, big shiba coin sign, door at the bottom centre. Footprint 6×4 tiles. |
| [`launchpad.png`](PROMPTS.md#launchpad) (+ `launchpad-night.png`) | 128×224 | The Launchpad Tower in town: a stone tower with a glowing landing pad and a rocket on top. Footprint 4×4 tiles, door at the bottom centre. |
| [`fountain.png`](PROMPTS.md#fountain) | 96×144 | Town fountain with the stone cat holding a gold coin. Footprint 3×3 tiles. |
| [`stall-red.png`](PROMPTS.md#stall-red) | 64×80 | Market stall with a red-and-white awning and produce. Footprint 2×1 tiles. |
| [`stall-blue.png`](PROMPTS.md#stall-blue) | 64×80 | Market stall, blue awning. |
| [`stall-green.png`](PROMPTS.md#stall-green) | 64×80 | Market stall, green awning. |
| [`stall-orange.png`](PROMPTS.md#stall-orange) | 64×80 | Market stall, orange awning. |
| [`lantern.png`](PROMPTS.md#lantern) (+ `lantern-night.png`) | 32×64 | Iron lamp post. Footprint 1 tile. |
| [`tree-round.png`](PROMPTS.md#tree-round) | 64×88 | Leafy round tree. Trunk sits on one tile. |
| [`tree-apple.png`](PROMPTS.md#tree-apple) | 64×88 | Apple tree with red apples. |
| [`tree-cherry.png`](PROMPTS.md#tree-cherry) | 64×88 | Pink cherry blossom tree. |
| [`tree-pine.png`](PROMPTS.md#tree-pine) | 64×88 | Pine tree for the forest edge. |
| [`bush-pink.png`](PROMPTS.md#bush-pink) | 32×32 | Flowering bush, pink flowers. |
| [`bush-white.png`](PROMPTS.md#bush-white) | 32×32 | Flowering bush, white flowers. |
| [`bush-red.png`](PROMPTS.md#bush-red) | 32×32 | Bush with red berries. |
| [`bush-purple.png`](PROMPTS.md#bush-purple) | 32×32 | Flowering bush, purple flowers. |
| [`sunflower.png`](PROMPTS.md#sunflower) | 32×60 | A pair of tall sunflowers. |
| [`crate.png`](PROMPTS.md#crate) | 32×32 | Wooden crate of fruit. |
| [`barrel.png`](PROMPTS.md#barrel) | 32×36 | Wooden barrel. |
| [`hay.png`](PROMPTS.md#hay) | 32×28 | Hay bale. |
| [`board.png`](PROMPTS.md#board) | 32×48 | Bulletin board on two posts. |
| [`mailbox.png`](PROMPTS.md#mailbox) | 32×40 | Blue mailbox on a post, flag down (no mail). |
| [`mailbox-flag.png`](PROMPTS.md#mailbox-flag) | 32×40 | The same mailbox with its red flag up: a letter from the night shift is waiting. |
| [`fence-h.png`](PROMPTS.md#fence-h) | 32×32 | Horizontal fence section (one tile, tiles left-right). |
| [`fence-v.png`](PROMPTS.md#fence-v) | 32×32 | Vertical fence section (one tile, tiles top-bottom). |
| [`grass.png`](PROMPTS.md#grass) | 32×32 per cell (template has 4) | Grass. Any number of 32×32 variants side by side; they're scattered at random. Must tile seamlessly. |
| [`cobble.png`](PROMPTS.md#cobble) | 32×32 per cell (template has 2) | Cobblestone road and town square. Seamless variants. |
| [`dirt.png`](PROMPTS.md#dirt) | 32×32 per cell (template has 2) | Dirt footpath. Seamless variants. |
| [`soil.png`](PROMPTS.md#soil) | 32×32 per cell (template has 1) | Tilled soil patch (dry) where crops grow. |
| [`soil-wet.png`](PROMPTS.md#soil-wet) | 32×32 per cell (template has 1) | Tilled soil patch (watered, darker) while a crop is growing. |
| [`water.png`](PROMPTS.md#water) | 32×32 per cell (template has 4) | Lake and river water. Cells are animation frames, played left to right. Seamless. |
| [`waterfall.png`](PROMPTS.md#waterfall) | 32×32 per cell (template has 4) | Falling water. Animation frames, seamless top-to-bottom. |
| [`cliff.png`](PROMPTS.md#cliff) | 32×32 per cell (template has 1) | Rock cliff beside the waterfall. |
| [`bridge.png`](PROMPTS.md#bridge) | 32×32 per cell (template has 1) | Wooden bridge planks running left-right, with rails at top and bottom. |
| [`dock.png`](PROMPTS.md#dock) | 32×32 per cell (template has 1) | Wooden dock planks out over the lake. |
| [`farmer.png`](PROMPTS.md#farmer) | 32×40 per cell, 3 cols × 4 rows = 96×160 | The player. Columns: standing, step A, step B. Rows: facing down, up, left, right. |
| [`robot.png`](PROMPTS.md#robot) | 32×40 per cell, 3 cols × 5 rows = 96×200 | Scout robot (white body, dark visor, cyan eyes, leaf sprout). Rows: down, up, left, right, and a 5th row carrying a crate of veg. |
| [`robot-hat.png`](PROMPTS.md#robot-hat) | 32×40 per cell, 3 cols × 5 rows = 96×200 | Farmhand robot wearing a straw hat. Same layout as robot. |
| [`robot-night.png`](PROMPTS.md#robot-night) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Night-shift robot: the scout robot in a blue nightcap. Same layout as robot (no carrying row). |
| [`robot-visitor.png`](PROMPTS.md#robot-visitor) | 32×40 per cell, 3 cols × 4 rows = 96×160 | A visiting Orbio launchpad agent: a scout robot in a coloured scarf. The game floats the agent's real logo above its head. Same layout as robot. |
| [`robot-launched.png`](PROMPTS.md#robot-launched) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Your own launched agent: the scout robot with a gold rocket badge. Same layout as robot. |
| [`folk-1.png`](PROMPTS.md#folk-1) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #1. Same layout as farmer. |
| [`folk-2.png`](PROMPTS.md#folk-2) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #2. Same layout as farmer. |
| [`folk-3.png`](PROMPTS.md#folk-3) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #3. Same layout as farmer. |
| [`folk-4.png`](PROMPTS.md#folk-4) | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #4. Same layout as farmer. |
| [`cow.png`](PROMPTS.md#cow) | 48×36 per cell, 2 cols × 1 rows = 96×36 | Cow facing right (flipped for left). Two idle/walk frames. |
| [`chicken.png`](PROMPTS.md#chicken) | 32×32 per cell, 2 cols × 1 rows = 64×32 | Chicken facing right. Frame 2 is pecking. |
| [`orby.png`](PROMPTS.md#orby) | 32×32 per cell, 4 cols × 1 rows = 128×32 | Orby, the lime-green orb spirit (Orbio's mascot). Four frames of a gentle bob. |
| [`crop-chatter.png`](PROMPTS.md#crop-chatter) | 32×32 per cell, 4 cols × 1 rows = 128×32 | Chatter Carrot growth stages: seeds, sprout, leafy, ripe carrot. |
| [`crop-rumor.png`](PROMPTS.md#crop-rumor) | 32×32 per cell, 4 cols × 1 rows = 128×32 | Rumor Radish growth stages: seeds, sprout, leafy, ripe radish. |
| [`crop-deep.png`](PROMPTS.md#crop-deep) | 32×32 per cell, 4 cols × 1 rows = 128×32 | Deep Root Daikon growth stages: seeds, sprout, leafy, ripe long white daikon. |
| [`station-coin.png`](PROMPTS.md#station-coin) | 32×32 per cell, 4 cols × 1 rows = 128×32 | The orb-coin floating and spinning above the Scout Station. Four frames: face-on, turning, edge-on, turning back. |
| [`bubble-x.png`](PROMPTS.md#bubble-x) | 32×32 | Robot thought bubble: reading X. The tail points down at the robot's head. |
| [`bubble-web.png`](PROMPTS.md#bubble-web) | 32×32 | Robot thought bubble: searching the web. The tail points down at the robot's head. |
| [`bubble-page.png`](PROMPTS.md#bubble-page) | 32×32 | Robot thought bubble: reading a web page. The tail points down at the robot's head. |
| [`bubble-chain.png`](PROMPTS.md#bubble-chain) | 32×32 | Robot thought bubble: checking the blockchain. The tail points down at the robot's head. |
| [`bubble-think.png`](PROMPTS.md#bubble-think) | 32×32 | Robot thought bubble: thinking (between steps). The tail points down at the robot's head. |
| [`bubble-done.png`](PROMPTS.md#bubble-done) | 32×32 | Robot thought bubble: finished, ready to harvest. The tail points down at the robot's head. |
| [`bubble-mail.png`](PROMPTS.md#bubble-mail) | 32×32 | Robot thought bubble: delivering a night-shift letter. The tail points down at the robot's head. |
| [`seed-chatter.png`](PROMPTS.md#seed-chatter) | 32×32 | Seed packet for Chatter Carrot (orange), shown in the planting menu. |
| [`seed-rumor.png`](PROMPTS.md#seed-rumor) | 32×32 | Seed packet for Rumor Radish (pink-red), shown in the planting menu. |
| [`seed-deep.png`](PROMPTS.md#seed-deep) | 32×32 | Seed packet for Deep Root Daikon (white), shown in the planting menu. |
| [`fish-common.png`](PROMPTS.md#fish-common) | 32×32 | A common fish (each one is a trending meme coin). Shown when you catch it. |
| [`fish-uncommon.png`](PROMPTS.md#fish-uncommon) | 32×32 | A uncommon fish (each one is a trending meme coin). Shown when you catch it. |
| [`fish-rare.png`](PROMPTS.md#fish-rare) | 32×32 | A rare fish (each one is a trending meme coin). Shown when you catch it. |
| [`fish-legendary.png`](PROMPTS.md#fish-legendary) | 32×32 | A legendary fish (each one is a trending meme coin). Shown when you catch it. |
| [`bobber.png`](PROMPTS.md#bobber) | 32×32 | Fishing bobber floating on the water. |
| [`exclaim.png`](PROMPTS.md#exclaim) | 32×32 | The ! that pops up when a fish bites (and over Orby before you meet). |
| [`icon-mailbox.png`](PROMPTS.md#icon-mailbox) | 32×32 | Dialog icon for the mailbox (Sign in with Orbio). |
| [`icon-board.png`](PROMPTS.md#icon-board) | 32×32 | Dialog icon for the bulletin board (journal). |
| [`icon-rocket.png`](PROMPTS.md#icon-rocket) | 32×32 | A little rocket: the icon for the Launchpad Tower and its dialogs. |
| [`icon-letter.png`](PROMPTS.md#icon-letter) | 32×32 | An envelope with a red seal: a night-shift letter in the mail list. |
| [`icon-coin.png`](PROMPTS.md#icon-coin) | 32×32 | Dialog icon for coins: the Credit Silo, the Meme Gazette, the Coin Cat fountain. |
| [`icon-harvests.png`](PROMPTS.md#icon-harvests) | 32×32 | Menu icon. Harvests tab on the bulletin board: a carrot. Until painted, the menus show 🥕. |
| [`icon-fish.png`](PROMPTS.md#icon-fish) | 32×32 | Menu icon. Fish tab: a little fish. Until painted, the menus show 🐟. |
| [`icon-letters.png`](PROMPTS.md#icon-letters) | 32×32 | Menu icon. Letters tab: an envelope. Until painted, the menus show 📬. |
| [`icon-agents.png`](PROMPTS.md#icon-agents) | 32×32 | Menu icon. Agents tab at the Launchpad Tower: a robot head. Until painted, the menus show 🤖. |
| [`icon-graduate.png`](PROMPTS.md#icon-graduate) | 32×32 | Menu icon. Graduate-a-robot tab: a graduation cap. Until painted, the menus show 🎓. |
| [`icon-watch.png`](PROMPTS.md#icon-watch) | 32×32 | Menu icon. Watch overnight button: an eye. Until painted, the menus show 👁. |
| [`icon-plant.png`](PROMPTS.md#icon-plant) | 32×32 | Menu icon. Plant button: a sprout in soil. Until painted, the menus show 🌱. |
| [`icon-piggy.png`](PROMPTS.md#icon-piggy) | 32×32 | Menu icon. Piggy bank button at the Credit Silo: a piggy bank. Until painted, the menus show 🐷. |
| [`icon-kit.png`](PROMPTS.md#icon-kit) | 32×32 | Menu icon. Launch kit downloaded: a wooden crate with a gold label. Until painted, the menus show 📦. |
| [`icon-flag.png`](PROMPTS.md#icon-flag) | 32×32 | Menu icon. Red flag marker in reports. Until painted, the menus show ⚑. |
| [`icon-sun.png`](PROMPTS.md#icon-sun) | 32×32 | Menu icon. Good morning toast: a sun. Until painted, the menus show ☀. |
| [`icon-sparkle.png`](PROMPTS.md#icon-sparkle) | 32×32 | Menu icon. Signed in toast: a sparkle. Until painted, the menus show ✨. |
| [`icon-wilted.png`](PROMPTS.md#icon-wilted) | 32×32 | Menu icon. Wilted crop toast: a drooping flower. Until painted, the menus show 🥀. |
| [`icon-x.png`](PROMPTS.md#icon-x) | 32×32 | Menu icon. Robot step: reading X. Until painted, the menus show 𝕏. |
| [`icon-web.png`](PROMPTS.md#icon-web) | 32×32 | Menu icon. Robot step: searching the web (a globe). Until painted, the menus show 🌐. |
| [`icon-page.png`](PROMPTS.md#icon-page) | 32×32 | Menu icon. Robot step: reading a page. Until painted, the menus show 📄. |
| [`icon-chain.png`](PROMPTS.md#icon-chain) | 32×32 | Menu icon. Robot step: checking the blockchain (chain links). Until painted, the menus show ⛓️. |
| [`cursor.png`](PROMPTS.md#cursor) | 32×32 | The highlight frame on the tile you're facing (what Space would use). Transparent middle. |
| [`skin-panel.png`](PROMPTS.md#skin-panel) | 96×96 (9-slice, 24px corners) | Dialog box frame: the big wooden panel every conversation and menu opens in. Plain parchment middle. |
| [`skin-card.png`](PROMPTS.md#skin-card) | 48×48 (9-slice, 12px corners) | Report card inside dialogs (harvests, fish, letters, agents): a clean paper card with a thin border. |
| [`skin-button.png`](PROMPTS.md#skin-button) | 48×48 (9-slice, 12px corners) | Normal button (Cancel, Close, tabs). |
| [`skin-button-primary.png`](PROMPTS.md#skin-button-primary) | 48×48 (9-slice, 12px corners) | Main button (OK, Plant, Sleep) and the selected tab: lime green, Orbio's colour. |
| [`skin-hud.png`](PROMPTS.md#skin-hud) | 48×48 (9-slice, 12px corners) | Small HUD panels: the clock, the Orbio balance and pop-up toasts. |
| [`skin-input.png`](PROMPTS.md#skin-input) | 48×48 (9-slice, 12px corners) | Text box and dropdown (ticker entry, search, launch kit form). |
| [`skin-seed.png`](PROMPTS.md#skin-seed) | 48×48 (9-slice, 12px corners) | Seed choice card in the planting menu. |
| [`skin-dpad.png`](PROMPTS.md#skin-dpad) | 64×64 (9-slice, 16px corners) | Phone touch controls: one arrow button of the d-pad (the arrow is drawn on top). |
| [`skin-meter.png`](PROMPTS.md#skin-meter) | 64×16 | Fill of the hype meter bar (stretched to length): a green-to-orange glowing bar. |
| [`skin-abutton.png`](PROMPTS.md#skin-abutton) | 128×128 | Phone touch controls: the round A (use) button, with the letter A. |
| [`title-logo.png`](PROMPTS.md#title-logo) | 800×360 | Title screen wordmark: "Orbio Valley" in chunky lime-green pixel letters, replaces the title text. |
| [`portrait-orby.png`](PROMPTS.md#portrait-orby) | 96×96 | Dialog portrait: Orby, the lime-green orb spirit and your guide. |
| [`portrait-farmer.png`](PROMPTS.md#portrait-farmer) | 96×96 | Dialog portrait: The player: straw hat, orange hair, blue overalls. |
| [`portrait-robot.png`](PROMPTS.md#portrait-robot) | 96×96 | Dialog portrait: A scout robot: white body, dark visor, cyan eyes, leaf sprout. |
| [`portrait-shopkeeper.png`](PROMPTS.md#portrait-shopkeeper) | 96×96 | Dialog portrait: Market stall keeper and Meme Gazette clerk. |
| [`portrait-folk-1.png`](PROMPTS.md#portrait-folk-1) | 96×96 | Dialog portrait: Mabel, a townsperson (matches folk-1). |
| [`portrait-folk-2.png`](PROMPTS.md#portrait-folk-2) | 96×96 | Dialog portrait: Gus, a townsperson (matches folk-2). |
| [`portrait-folk-3.png`](PROMPTS.md#portrait-folk-3) | 96×96 | Dialog portrait: Juniper, a townsperson (matches folk-3). |
| [`portrait-folk-4.png`](PROMPTS.md#portrait-folk-4) | 96×96 | Dialog portrait: Old Pete, a townsperson (matches folk-4). |
