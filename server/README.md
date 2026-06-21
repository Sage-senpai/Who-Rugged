# WHO RUGGED? lobby server

Turn-based lobby rooms on Cloudflare Durable Objects. One `LobbyRoom` per room
code coordinates up to six seats over a hibernatable WebSocket. AI seats
backfill empty slots so a table can always start.

This is a separate package from the web app and is deployed on your own
Cloudflare account. It is not part of `npm run build` at the repo root.

## Deploy

```bash
cd server
npm install
npx wrangler login
npm run deploy
```

Wrangler prints the deployed URL, for example
`https://who-rugged-lobby.<your-subdomain>.workers.dev`.

## Point the app at it

In the repo root `.env`, set the WebSocket origin (use `wss://`):

```
VITE_LOBBY_URL=wss://who-rugged-lobby.<your-subdomain>.workers.dev
```

Rebuild the app. The Multiplayer Lobby screen connects to `/room/<CODE>` on that
origin. Until it is set, the lobby screen shows a "server not configured" state
and the rest of the game is unaffected.

## Protocol

Client to server (JSON over WebSocket):

- `{ type: "join", address, username }`
- `{ type: "ready", address, ready }`
- `{ type: "addAI" }` / `{ type: "removeAI", index }`
- `{ type: "start", address }` (host only; fills empty seats with AI)
- `{ type: "leave", address }`

Server to client: `{ type: "state", room }` on every change, where `room` is
`{ code, hostAddress, status, seats[] }`.

## Local dev

```bash
npm run dev   # wrangler dev, then VITE_LOBBY_URL=ws://localhost:8787
```

## 0G Compute (sealed solo case)

The same worker also seals a solo case server-side and drives the AI suspects
through 0G Compute, so roles never reach the browser until reveal. It uses the
OpenAI-compatible direct API, configured by three secrets:

```
OG_COMPUTE_API_URL    e.g. https://<gateway>/v1
OG_COMPUTE_API_KEY    app-sk-...   (consumes that account's compute credits)
OG_COMPUTE_MODEL_ID   e.g. qwen3.6-plus
```

Local dev: put them in `server/.dev.vars` (gitignored) and run `npm run dev`.
Production: set them as secrets, then deploy:

```bash
npx wrangler secret put OG_COMPUTE_API_URL
npx wrangler secret put OG_COMPUTE_API_KEY
npx wrangler secret put OG_COMPUTE_MODEL_ID
npm run deploy
```

Then in the app root `.env`, point the client at the worker's https origin:

```
VITE_COMPUTE_URL=https://who-rugged-lobby.<your-subdomain>.workers.dev
```

Endpoints (POST JSON):

- `/case/new`     `{ caseId, difficulty }` -> sealed case (no roles) + `sealAttestation`
- `/case/probe`   `{ caseId, suspectId }`  -> `{ read, tell, attestation }` (privacy-preserving)
- `/case/resolve` `{ caseId }`             -> `{ reveal[], roles[], sealAttestation }`

With `VITE_COMPUTE_URL` unset the app runs the AI fully local (mock), so it
always works without the server. Note the direct API is mainnet and bills real
compute credits per call.

## Next

The room layer is done. Synchronizing the actual Crowdfunding Courtroom rounds
(statements, presses, votes) across seats runs through this same DO next, with
0G sealing the roles and settling the pot.
