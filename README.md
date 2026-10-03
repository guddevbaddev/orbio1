# Orbio Valley

A cozy pixel farming game built on [Orbio](https://www.orbio.so). Little scout robots tend crops that are really AI reports on meme coins.

The look follows the concept paintings in `assets/` (also used for the title screen, the sleep screen and dialog banners): a timber farmhouse, red barn, coin silo, a glowing Scout Station, greenhouse, a river with a waterfall, a town square with the Coin Cat fountain and the Meme Gazette shop, and a lake. Time runs from morning through a golden sunset into a lantern-lit night.

- Every seed sends a **scout robot** out of the Scout Station. Each robot is an AI agent: a model on Orbio's gateway with a toolbox of Orbio's read tools, a step limit and a spending cap. It decides for itself what to read next, shows what it's doing in a thought bubble, and grows the answer into a crop.
  - **Chatter Carrot:** reads X (`social.x.posts`). 3 steps, up to 2¢.
  - **Rumor Radish:** searches and reads the web (`web.search`, `web.scrape`). 4 steps, up to 3¢.
  - **Deep Root Daikon:** reads X and the web, and checks the token on-chain (`chain.read`: token info and recent transfers on EVM chains). 7 steps, up to 6¢, slower to grow.
- Walk up to a growing crop to watch its robot's steps live. The harvest report shows the trail it took and its sources.
- **Night shift:** press **Watch overnight** on a harvest report (up to 3 coins). Each time you sleep, a robot in a nightcap re-checks every watched coin against its last report (X, web search and pages; 3 steps, up to 1.5¢). In the morning it walks to the mailbox and leaves a letter: what changed, hype before and after, and the trail it took. Manage the watchlist at the Scout Station; letters are also on the bulletin board.
- **Launchpad Tower:** Orbio's agent launchpad is live on Robinhood Chain. The tower in town shows its agents (search, biggest, newest) with market cap, stake and fees, and the three biggest visit the town square wearing their logos. **Graduate a robot** prepares a launch kit for one of your scout types: token name, symbol and description for Orbio's launch form, plus the robot's instructions, tools and limits to run as a real agent. Launching happens on orbio.so with your own wallet; the game never touches wallets or tokens. Link your launched agent by ID or token address and it moves into town with a rocket badge.
- **The lake** is stocked each morning with the meme coins people on X are buzzing about. Cast from the dock to catch them.
- **Town** across the bridge has townsfolk to chat with, market stalls, the Coin Cat fountain and the Meme Gazette.
- An AI model on Orbio's gateway sums each one up as a vibe (hot / warm / meh / sus), a hype meter and any red flags.
- Harvests and fish are saved to the bulletin board (press **J**).

Scouts only look. Nothing in the game buys, sells or launches anything, and it never connects to a wallet.

All the in-game art is drawn in code (`js/art.js`) until painted sprites replace it. There's no build step and no dependencies.

## Painted sprites

Every picture in the game is a named slot. Drop `<slot>.png` into `assets/sprites/` and list it in `assets/sprites/manifest.json` to replace the code art for that slot.

- Press **B** in the game (or open `?art=blocks`) for blocks view: every slot as a labelled placeholder with its real footprint.
- `sprites.html` shows every slot with its block guide, current art and size. The guides are also in `assets/sprite-templates/blocks/` (current art in `reference/`).
- `assets/world.json` adds new props and buildings without code.
- `SPRITES.md` has the style guide, sizes and image-generator prompts; `tools/prep-sprite.sh` turns a raw generated image into a game-ready sprite.
- `SPRITE_TRACKER.md` lists every slot and whether it's painted yet, most important first. Regenerate it with `node tools/sprite-tracker.mjs`.
- `PROMPTS.md` has a ready-to-paste image prompt for every slot (generated from `js/prompts.js` by `node tools/sprite-prompts.mjs`), with the prep command for each. `tools/make-sheet.sh` assembles character sheets from separate frames.
- Menus are skinnable too: dialog frames, buttons, HUD panels, the title logo, menu icons and the cursor all have slots, and keep their current look until painted.

## How the scout robots work

`js/agents.js` runs a tool-calling loop on Orbio's chat gateway (OpenAI-compatible `tools`). Each turn the model either calls one of its seed's tools, which runs the matching Orbio tool with a `max_cost` cap, or writes its report as JSON. The loop stops at the seed's step limit or budget and forces a final report (`tool_choice: "none"`). Tools outside a seed's toolbox are refused. Robots only read; nothing can trade. Signed out, robots act out their steps with made-up data.

The night shift uses the same loop (`runNightCheck`) with the coin's last report in its instructions, and answers with a headline and an up/down/same change.

`node tests/agent-loop.test.mjs` runs the loop against a simulated Orbio and checks tool choice, limits and report parsing.

## Launchpad data

Orbio's launchpad API (`/api/protocol/agents`) is public but doesn't allow browser reads from other sites, so the game reads a snapshot, `assets/launchpad.json`, saved by `node tools/fetch-launchpad.mjs`. It still tries the live API in the background in case that changes. `.github/workflows/launchpad-snapshot.yml` refreshes the snapshot daily once this is on the default branch (or run it by hand from the Actions tab). `node tests/launchpad.test.mjs` checks loading, search, formatting and the launch kit.

## Play locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Controls: arrow keys or WASD to walk, Space / E to use, J for the journal (harvests, fish, letters), B to switch between art and blocks view, Esc to close. On phones there's an on-screen pad.

## Connect it to Orbio

Without an Orbio app the game runs in **pretend mode** with made-up coins. To make the scouts real:

1. Sign in at <https://www.orbio.so/developers> and create a **public** app.
2. Add the exact URL the game is served from as a redirect URI (for example `http://localhost:8000/` or `https://you.github.io/orbio1/`).
3. Paste the client ID into `ORBIO_CLIENT_ID` at the top of `js/orbio.js`.

Players then sign in with their own Orbio account at the mailbox (Sign in with Orbio, OAuth 2.1 + PKCE). Every scout is paid from the player's own balance, about a cent each. You can set an app fee on your Orbio app to earn a cut. Tokens are kept in memory only, so a page reload signs the player out.

## Files

| File | What it is |
| --- | --- |
| `index.html`, `style.css` | Page shell, title and sleep screens, dialog boxes, HUD |
| `assets/` | Concept paintings and the dialog banners cropped from them |
| `js/game.js` | Map, robots, townsfolk, animals, farming, fishing, day/night lighting, save game |
| `js/art.js` | Code-drawn pixel art (the fallback for every sprite slot) |
| `js/sprites.js` | Sprite slots, painted-PNG loading, blocks view, `world.json` loading and templates |
| `js/blocks.js` | Template blocks (placeholders for every slot) |
| `assets/world.json` | Extra props and buildings placed on the map |
| `sprites.html`, `SPRITES.md`, `assets/sprite-templates/`, `tools/prep-sprite.sh` | Making painted sprites |
| `js/orbio.js` | Sign in with Orbio, the chat gateway and tool calls, and the lake's trending-coin stock |
| `js/agents.js` | The scout robots: seeds, toolboxes and the tool-calling agent loop |
| `js/launchpad.js` | Orbio launchpad directory, number formatting and the launch kit |
| `assets/launchpad.json`, `tools/fetch-launchpad.mjs` | Launchpad snapshot and the script that refreshes it |
| `tests/*.test.mjs` | Tests: agent loop against a simulated Orbio, launchpad module against the snapshot, a prompt for every sprite slot |
| `js/prompts.js`, `PROMPTS.md`, `assets/sprite-prompts.json`, `tools/sprite-prompts.mjs` | Image prompts for every sprite slot |
| `SPRITE_TRACKER.md`, `tools/sprite-tracker.mjs` | Which sprites still need art |
| `piggy.html` | The Credit Silo's piggy bank: a calculator for how much Orbio credits would save you |
