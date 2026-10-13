# WHO RUGGED?

> Wallet-intelligence prediction markets on Solana — walk into a 3D casino floor, read a holder's real on-chain behavior, and bet on whether they sell before the window closes.

Built for **Colosseum**, 2026.

Two products live in this repo:

- **WHO SOLD? (the Arena)** — the Colosseum submission. A prediction-market engine that turns real on-chain wallet activity into a tradeable signal: pick a tracked holder, read their classified buy/sell/transfer/burn/bridge history and a sealed behavioral model, set your own probability, then bet real stakes on whether they sell within the window. Odds are pure parimutuel, zero house edge. Runs live at `/` as a walkable 3D casino floor (WebGL, with an automatic 2D fallback), with a Community Hall where anyone can list a verified Solana mint as a new table.
- **WHO RUGGED? (Catch the Thief)** — a separate hidden-role social-deduction game, built earlier for the 0G Zero Cup. Roles are sealed inside a 0G TEE, the pot settles on 0G Chain, and rounds are saved to 0G Storage as a verifiable replay. Still in the repo and still real, just not the product this submission is about. Lives at `/who-rugged`.

## WHO SOLD?, in more detail

- **Wallet intelligence**: every lookup classifies real transaction history as buy / sell / transfer / burn / bridge — never guesses a sell from a plain transfer — and accumulates into a persisted, cross-market wallet profile (`server/src/sold/walletProfile.ts`) instead of recomputing from scratch each time.
- **Three-signal model**: YOU (your stated probability) vs MARKET (real pool odds) vs MODEL (a sealed behavioral estimate that only reveals after you commit your own read, so it can't anchor you) — blended via a confidence-weighted Bayesian update (`src/sold/dmp/dmp.ts`).
- **Calibration**: every stated-probability bet is scored against its real outcome with a Brier score at resolution, surfaced on the leaderboard.
- **Market traction**: live rate-of-change of each market's real pool, so you can see which side is gaining conviction, not just which side is bigger right now.
- **Multi-chain**: built-in arenas on Solana (ANSEM, BONK, WIF) and BSC (FLOKI, BabyDoge, Broccoli), plus any Zash-launched token, plus a Community Hall where anyone can list a verified SPL mint (capped, rate-limited, min-holder-checked — `server/src/sold/community.ts`).
- **Panta integration** (`server/src/sold/PantaClient.ts`): a client for Panta's public API (docs.panta.market) to optionally settle the binary YES/NO dimension through their on-chain bonding-curve markets instead of (or alongside) our own parimutuel engine — non-custodial, Panta never holds a key.
- All of it reads real chain data live (Solana RPC via Alchemy, Bitquery for BSC) — never fabricates a number when the data isn't there; an empty read shows "n/a," not a guess.

## Status

The WHO SOLD? arena, 3D floor, Community Hall, wallet-intelligence pipeline, and multi-chain markets are live and deployed. Catch the Thief's Layer 1 (game shell, local mock engine) is also live; its 0G Compute/Chain/Storage layers are built per `docs/PROMPTS.md` and `MASTER_BUILD_PROMPT.md`, independent of the Solana work above.

## Repo layout

```text
who-rugged/
  index.html                    Vite entry, mounts the React app
  package.json  vite.config.ts  tsconfig.*.json
  src/
    main.tsx  App.tsx           entry + router — / is the 3D arena floor
    sold/                       WHO SOLD?: the prediction-market engine
      dmp/                      three-signal model, wallet behavioral scoring
      market/                   binary / magnitude / time-bucket market math
      arena/                    the flow: scan holders -> read -> predict -> commit
    floor/                      the walkable 3D casino floor + Community Hall
    landing/  menu/  game/  court/  lobby/   Catch the Thief (0G game) + shared shell
    wallet/                     Solana wallet connect + identity
    styles/tokens.css           shared design system
  server/                       Cloudflare Worker (Durable Objects): LobbyRoom,
                                 CaseSeal (0G game), Directory, PredictionPool,
                                 BucketMarket (WHO SOLD? markets)
    src/sold/
      SolanaOracle.ts  BscOracle.ts  ZashClient.ts   real chain reads, per chain
      walletProfile.ts                               persisted wallet intelligence
      PantaClient.ts                                 Panta API integration
      BucketMarket.ts  community.ts  types.ts         market engine, community hall
  docs/
    WHO-RUGGED_BUILD-SPEC.md    Catch the Thief: design system, architecture
    BUILD_GUIDE.md              Catch the Thief: 0G contract sketch, gotchas
    PITCH.md  PROMPTS.md
  README.md  CHANGELOG.md  CONTRIBUTING.md
```

## Run the app

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build to `dist/`), `npm run preview`, `npm run typecheck`.

## Run the server (Worker + Durable Objects)

```bash
cd server
npm install
npx wrangler dev
```

Local dev reads secrets from `server/.dev.vars` (gitignored):

```ini
ALCHEMY_API_KEY=...      # Solana RPC for WHO SOLD? — public RPC is used as a fallback, but rate-limits
BITQUERY_API_KEY=...     # optional, BSC arenas
PANTA_API_KEY=...        # optional, Panta settlement integration
OG_COMPUTE_API_URL=...   # optional, only needed for Catch the Thief's AI suspects
OG_COMPUTE_API_KEY=...
OG_COMPUTE_MODEL_ID=...
```

## Deploy

Two artifacts: the Worker (`server/`) and the static frontend (`dist/`).

### 1. The Worker

```bash
cd server
npx wrangler login
npx wrangler secret put ALCHEMY_API_KEY
npx wrangler secret put PANTA_API_KEY      # optional
npx wrangler secret put OG_COMPUTE_API_URL # optional, Catch the Thief only
npx wrangler secret put OG_COMPUTE_API_KEY
npx wrangler secret put OG_COMPUTE_MODEL_ID
npm run deploy
```

Wrangler prints a URL like `https://who-rugged-lobby.<sub>.workers.dev`.

### 2. The frontend

Deployed via Vercel (`vercel.json` ships the SPA rewrite). Point the app at the Worker URL from step 1, then:

```bash
npx vercel --prod
```

Any static host works as an alternative — just add an equivalent SPA fallback for client-side routing.

## Credits and licenses

- Suspect sprites: DiceBear pixel-art, design licensed CC0 1.0, library MIT.
- Fonts: Pixelify Sans, Silkscreen, Space Mono, all open via Google Fonts.
- WHO SOLD? runs on Solana, BSC, and Zash-launched tokens, with an optional Panta settlement path. Catch the Thief runs on 0G. Not actually from 1986.
