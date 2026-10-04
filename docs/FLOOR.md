# The 3D floor and community tables

The arena entry (`/` and `/arena`) is a walkable 3D casino floor. Each live arena is a table. Sitting at one runs the real Scan, Holder, Thesis, Predict, Commit flow in a dock beside the room, so the player never leaves it. `/arena/map` is the flat arena list, and `/arena/:id` is the flat page for one arena. Both stay as the explicit 2D route and as the fallback when WebGL is missing.

## Where things live

| Piece | File |
| --- | --- |
| Floor screen: HUD, entrance, listing panel, seated dock | `src/floor/ArenaFloor.tsx`, `src/floor/floor.css` |
| three.js scene, characters, camera, input (no React inside) | `src/floor/FloorWorld.ts` |
| "Paste a coin" form, shared by the floor and the map | `src/floor/ListCoin.tsx`, `src/floor/listcoin.css` |
| Real arena flow, shared by the floor dock and `/arena/:id` | `ArenaScenes` in `src/sold/arena/ArenaFlow.tsx` |
| One market hook per live arena, shared by the map and floor | `src/sold/arena/useAllArenaMarkets.ts` |
| Community registry client and arena lookup | `src/sold/arena/communityClient.ts`, `src/sold/arena/arenas.ts` |
| Community registry server | `server/src/index.ts` (`Directory` DO, `/sold/community*`), `server/src/sold/community.ts` |

## What is real and what is scenery

Real: the tables (one per live arena), the holder data in the dock, the model sell risk and holder count on each table sign, the window countdown, your stakes in play, and the community tables. The cashier opens Portfolio, the leaderboard door opens Leaderboard, and the jukebox toggles the real music setting.

Scenery: the wandering and seated players. The HUD labels them "AMBIENT CROWD". Live players belong to the presence room in the multiplayer roadmap and should replace them, not mix with them.

Not built on purpose: the slot machines (they are props that say so) and an instant "settlement reel". Real markets resolve later, when a holder's balance is sampled, so a reveal belongs on the resolution event. When it is built it must show the 10% rule: a sale under 10% still counts as HELD.

## Controls

Desktop: W A S D or arrows walk, drag to look, wheel to zoom, click the floor to walk there, E uses what is nearby, Esc stands up. Touch: left stick walks, drag the room to look, pinch zooms, USE acts. Seated, drag orbits the camera around the table (Recenter view resets it) and the dock holds the real flow. Emotes sit behind one small button so the room stays clear.

## Community tables

Anyone can open a table for a Solana meme coin by pasting its mint at the listing desk in the Community Hall (the doorway on the main hall's right wall), at an open pedestal, or on the map page.

Server contract (`server/src/index.ts`):

- `GET /sold/community` returns `{ tables, cap: 8, ttlDays: 7 }`.
- `POST /sold/community/list` with `{ mint }` returns `{ ok: true, table, created }` or `{ ok: false, error }`. Errors: `bad-mint` 400, `not-a-token` 422, `too-few-holders` 422, `full` 409, `rate-limited` 429, `unreachable` 503.
- A community arena id is `sol-<mint>`. An id that is not currently listed returns 404 `unknown-arena` from every `/sold` route. Other unknown ids keep their old fallback to `ansem`.

Guardrails: at most 8 live community tables, idle tables expire after 7 days (a normal `/sold/markets` read renews them, written at most every 10 minutes; the floor's sign reads send `passive=1` and do not, so standing on the floor never keeps a table alive), 3 new listings per client IP per hour, the mint must be a real SPL token mint with at least 3 holders, and symbol and name are sanitised. Already-listed mints and the built-in Solana arenas are never duplicated or counted again.

Known limits: an invalid mint still costs one RPC call per attempt, because only new listings are rate limited. Holder data comes from the top 11 token accounts. BSC coins are not supported yet.

## Before this goes live

1. Deploy the worker: `cd server && npm run deploy`. No new secrets or bindings. `ALCHEMY_API_KEY` is used if set, with the public RPC as fallback.
2. Set `VITE_SOLD_URL` for the web build. Without it the floor still works, and the listing form says community tables need the live server.
3. Exercise the real endpoints once: list a small test coin, sit at its table, place a test prediction, then let its window close.
4. Decide whether `/` should stay the floor or go back to a lighter landing. The floor chunk is about 150 kB gzipped and loads for first-time visitors.
