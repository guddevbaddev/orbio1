# Sprite spec: making the game look like the concept art

The game draws everything with code until a painted PNG exists for it. Every picture has a **slot**. Put `<slot>.png` in `assets/sprites/`, list it in `assets/sprites/manifest.json`, and the game uses it. You can replace things one at a time; anything without a PNG keeps its code art.

- **See every slot:** open `sprites.html` (served next to the game). It shows the block guide, the current art, your version if there is one, and the exact size.
- **Blocks view:** press **B** in the game (or open it with `?art=blocks`) to see the whole map as template blocks: every slot drawn as a labelled placeholder with its real footprint. Your painted sprites show up in blocks view too, so you can watch the map fill in. Press B again for the normal art.
- **Block guides:** `assets/sprite-templates/blocks/` has a guide for every slot at the exact PNG size. Each guide shows the tile grid (32px = one tile), the footprint the thing stands on (the solid box), and the anchor dot at the bottom centre. Character sheets have one cell per frame, labelled by direction. Generate or paint to fit the guide.
- **Current art:** `assets/sprite-templates/reference/` has what the game draws today at the same sizes, for proportions and colour reference.
- **Raw images from an image generator:** `tools/prep-sprite.sh raw.png <slot> <WxH>` removes a flat background, trims, fits the image to the slot's size standing on the bottom edge, and adds it to the manifest. Or just send me the raw images and I'll do it.

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
- **Block colours:** orange is a building, green is nature, yellow is a prop, blue is a character, lime is a crop. Ground materials are flat colour tiles.

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
5. **Props and crops:** everything else.

## Prompt template for an image generator

> Pixel art game sprite of **[THING]**, cozy farming game style like Stardew Valley, top-down three-quarter view facing the camera (not isometric), warm golden palette, dark brown outlines, light from top left, single object centered, full object visible, plain flat magenta #ff00ff background, no text, no ground scenery.

Ground tiles, swap the middle for: *"seamless tileable square texture of [grass with tiny flowers / cobblestone / dirt path / blue water], top-down"*.

Characters: *"small cute white robot with a dark visor and glowing cyan eyes and a green leaf sprout on its head, facing the camera, full body"*. For a sheet, add *"sprite sheet, 3 columns of walk frames, 4 rows facing down, up, left, right, evenly spaced grid"*.

## Every slot

| File | Size | What it is |
| --- | --- | --- |
| `farmhouse.png` (+ `farmhouse-night.png`) | 224×224 | Your timber farmhouse. Footprint 7×4 tiles; the door is at the bottom centre. |
| `barn.png` (+ `barn-night.png`) | 160×192 | Red barn with a big door at the bottom centre. Footprint 5×4 tiles. |
| `silo.png` | 64×176 | Tall coin silo with the Orbio orb emblem. Footprint 2×2 tiles. |
| `station.png` (+ `station-night.png`) | 64×96 | Scout Station, the robots' charging machine. The floating coin on top is animated by the game, so leave the top ~10px empty. |
| `greenhouse.png` (+ `greenhouse-night.png`) | 192×176 | Glass greenhouse with a door at the bottom centre. Footprint 6×4 tiles. |
| `gazette.png` (+ `gazette-night.png`) | 192×208 | The Meme Gazette shop: green roof, big shiba coin sign, door at the bottom centre. Footprint 6×4 tiles. |
| `fountain.png` | 96×144 | Town fountain with the stone cat holding a gold coin. Footprint 3×3 tiles. |
| `stall-red.png` | 64×80 | Market stall with a red-and-white awning and produce. Footprint 2×1 tiles. |
| `stall-blue.png` | 64×80 | Market stall, blue awning. |
| `stall-green.png` | 64×80 | Market stall, green awning. |
| `stall-orange.png` | 64×80 | Market stall, orange awning. |
| `lantern.png` (+ `lantern-night.png`) | 32×64 | Iron lamp post. Footprint 1 tile. |
| `tree-round.png` | 64×88 | Leafy round tree. Trunk sits on one tile. |
| `tree-apple.png` | 64×88 | Apple tree with red apples. |
| `tree-cherry.png` | 64×88 | Pink cherry blossom tree. |
| `tree-pine.png` | 64×88 | Pine tree for the forest edge. |
| `bush-pink.png` | 32×32 | Flowering bush, pink flowers. |
| `bush-white.png` | 32×32 | Flowering bush, white flowers. |
| `bush-red.png` | 32×32 | Bush with red berries. |
| `bush-purple.png` | 32×32 | Flowering bush, purple flowers. |
| `sunflower.png` | 32×60 | A pair of tall sunflowers. |
| `crate.png` | 32×32 | Wooden crate of fruit. |
| `barrel.png` | 32×36 | Wooden barrel. |
| `hay.png` | 32×28 | Hay bale. |
| `board.png` | 32×48 | Bulletin board on two posts. |
| `mailbox.png` | 32×40 | Blue mailbox on a post. |
| `fence-h.png` | 32×32 | Horizontal fence section (one tile, tiles left-right). |
| `fence-v.png` | 32×32 | Vertical fence section (one tile, tiles top-bottom). |
| `grass.png` | 32×32 per cell (template has 4) | Grass. Any number of 32×32 variants side by side; they're scattered at random. Must tile seamlessly. |
| `cobble.png` | 32×32 per cell (template has 2) | Cobblestone road and town square. Seamless variants. |
| `dirt.png` | 32×32 per cell (template has 2) | Dirt footpath. Seamless variants. |
| `soil.png` | 32×32 per cell (template has 1) | Tilled soil patch (dry) where crops grow. |
| `soil-wet.png` | 32×32 per cell (template has 1) | Tilled soil patch (watered, darker) while a crop is growing. |
| `water.png` | 32×32 per cell (template has 4) | Lake and river water. Cells are animation frames, played left to right. Seamless. |
| `waterfall.png` | 32×32 per cell (template has 4) | Falling water. Animation frames, seamless top-to-bottom. |
| `cliff.png` | 32×32 per cell (template has 1) | Rock cliff beside the waterfall. |
| `bridge.png` | 32×32 per cell (template has 1) | Wooden bridge planks running left-right, with rails at top and bottom. |
| `dock.png` | 32×32 per cell (template has 1) | Wooden dock planks out over the lake. |
| `farmer.png` | 32×40 per cell, 3 cols × 4 rows = 96×160 | The player. Columns: standing, step A, step B. Rows: facing down, up, left, right. |
| `robot.png` | 32×40 per cell, 3 cols × 5 rows = 96×200 | Scout robot (white body, dark visor, cyan eyes, leaf sprout). Rows: down, up, left, right, and a 5th row carrying a crate of veg. |
| `robot-hat.png` | 32×40 per cell, 3 cols × 5 rows = 96×200 | Farmhand robot wearing a straw hat. Same layout as robot. |
| `folk-1.png` | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #1. Same layout as farmer. |
| `folk-2.png` | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #2. Same layout as farmer. |
| `folk-3.png` | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #3. Same layout as farmer. |
| `folk-4.png` | 32×40 per cell, 3 cols × 4 rows = 96×160 | Townsperson #4. Same layout as farmer. |
| `cow.png` | 48×36 per cell, 2 cols × 1 rows = 96×36 | Cow facing right (flipped for left). Two idle/walk frames. |
| `chicken.png` | 32×32 per cell, 2 cols × 1 rows = 64×32 | Chicken facing right. Frame 2 is pecking. |
| `orby.png` | 32×32 per cell, 4 cols × 1 rows = 128×32 | Orby, the lime-green orb spirit (Orbio's mascot). Four frames of a gentle bob. |
| `crop-chatter.png` | 32×32 per cell, 4 cols × 1 rows = 128×32 | Chatter Carrot growth stages: seeds, sprout, leafy, ripe carrot. |
| `crop-rumor.png` | 32×32 per cell, 4 cols × 1 rows = 128×32 | Rumor Radish growth stages: seeds, sprout, leafy, ripe radish. |
