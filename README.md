# Orbio Valley

A cozy pixel farming game built on [Orbio](https://www.orbio.so). Little scout robots tend crops that are really AI reports on meme coins.

The look follows the concept paintings in `assets/` (also used for the title screen, the sleep screen and dialog banners): a timber farmhouse, red barn, coin silo, a glowing Scout Station, greenhouse, a river with a waterfall, a town square with the Coin Cat fountain and the Meme Gazette shop, and a lake. Time runs from morning through a golden sunset into a lantern-lit night.

- **Chatter Carrot** reads the top posts on X about a ticker (Orbio `social.x.posts` tool).
- **Rumor Radish** searches the web for a ticker (Orbio `web.search` tool).
- Every seed sends a **scout robot** out of the Scout Station to tend it; it carries the crate home when you harvest.
- **The lake** is stocked each morning with the meme coins people on X are buzzing about. Cast from the dock to catch them.
- **Town** across the bridge has townsfolk to chat with, market stalls, the Coin Cat fountain and the Meme Gazette.
- An AI model on Orbio's gateway sums each one up as a vibe (hot / warm / meh / sus), a hype meter and any red flags.
- Harvests and fish are saved to the bulletin board (press **J**).

Scouts only look. Nothing in the game buys or sells anything.

All the in-game pixel art is drawn in code (`js/art.js`); the painted concept art is only used for menus. There's no build step and no dependencies.

## Play locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Controls: arrow keys or WASD to walk, Space / E to use, J for the journal, Esc to close. On phones there's an on-screen pad.

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
| `js/art.js` | All pixel art, drawn with code |
| `js/orbio.js` | Sign in with Orbio, the chat gateway and tool calls, and pretend mode |
| `piggy.html` | The general store's piggy bank: a calculator for how much Orbio credits would save you |
