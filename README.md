# WHO RUGGED?

> Police Catch the Thief, rebuilt so the game can prove it never cheated. A hidden-role social deduction game on the 0G stack.

Five suspects sit at a table, each with a hidden profession. One of them drained the shared vault. You play the Police: read the statements, spend your scans, and make the bust. Get it right and the vault is recovered and you are paid. Get it wrong and the accused sues you, takes your bond, and the thief walks.

The whole point: a money game lives or dies on fairness. Roles are sealed inside a 0G TEE and every reveal is attested, the pot settles on 0G Chain, and each round is saved to 0G Storage as a verifiable replay. Nobody, including us, can see or fake who the thief is.

Built for the 0G Zero Cup, 2026.

## Status

Layer 1 is live, with a full game shell on top. The blueprint is now a real React + Vite + TypeScript app: the marketing site at `/`, a title menu at `/menu`, how-to-play, settings, and stats screens, and the playable game at `/play` with in-game pause and sound, all sharing one design system. The game loop runs end to end against a local engine that stands in for the 0G calls, with every seam marked for where Compute, Chain, and Storage drop in next. See `CHANGELOG.md` for what has shipped and `MASTER_BUILD_PROMPT.md` plus `docs/PROMPTS.md` for the remaining layers.

The two files in `blueprints/` stay as the frozen design contract. The app should read as the same world and should not regress their polish.

## Repo layout

```
who-rugged/
  index.html                    Vite entry, mounts the React app
  package.json  vite.config.ts  tsconfig.*.json
  .env.example  .gitignore
  src/
    main.tsx  App.tsx           entry + router (landing, menu, screens, game)
    styles/tokens.css           the shared design system (palette, type, CRT)
    settings/SettingsContext.tsx  persisted settings, applied as <html> classes
    components/
      Crt.tsx  RouteFallback.tsx  ScreenShell.tsx  Toggle.tsx
    lib/
      types.ts                  domain types + the GameEngine seam
      avatar.ts                 self-hosted DiceBear sprites (deterministic)
      rng.ts  sfx.ts            helpers + Web Audio arcade blips
    game/
      Game.tsx  SuspectCard.tsx  VerdictModal.tsx  PauseOverlay.tsx
      useGame.ts  mockEngine.ts  profile.ts  data.ts  game.css
    menu/
      Menu.tsx  HowToPlay.tsx  Settings.tsx  Stats.tsx  Profile.tsx  menu.css
    court/
      Court.tsx  ParticipantCard.tsx  useCourt.ts  courtEngine.ts  court.css
    wallet/
      WalletContext.tsx  ConnectButton.tsx  chain.ts  identity.ts
    cosmetics/skins.ts          rank-gated avatar skins
    lobby/
      Lobby.tsx  lobbyClient.ts  lobby.css
    landing/
      Landing.tsx  Lineup.tsx  landing.css
  server/                       Cloudflare Worker + LobbyRoom Durable Object (deploy separately)
  blueprints/
    who-rugged-landing.html     marketing site, visual + UX blueprint (frozen)
    who-rugged-game.html        playable game blueprint (logic mocked, identity final)
  docs/
    WHO-RUGGED_BUILD-SPEC.md    source of truth: design system, architecture, plan
    BUILD_GUIDE.md              contract sketch, verified 0G endpoints and gotchas
    PITCH.md                    judge and community facing pitch
    PROMPTS.md                  per-layer build prompts
  contracts/                    Vault.sol and friends (to build)
  .0g-skills/                   cloned 0G agent skills, used for all 0G code (gitignored)
  README.md  CHANGELOG.md  CONTRIBUTING.md  MASTER_BUILD_PROMPT.md
```

## Run the app

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build to `dist/`), `npm run preview` (serve the build), `npm run typecheck`. Suspect sprites are generated locally, so the app needs no network at runtime. Fonts load from Google Fonts and fall back to system mono offline.

## Run the blueprints

The originals are self-contained. Open either HTML file in a browser, or serve the folder:

```bash
npx serve blueprints
```

## Deploy

Two artifacts: the worker (`server/`) and the static frontend (`dist/`).

### 1. The worker (lobby + room directory + friends + 0G Compute)

```bash
cd server
npm install
npx wrangler login
# 0G Compute secrets (the direct API; consumes that account's credits):
npx wrangler secret put OG_COMPUTE_API_URL
npx wrangler secret put OG_COMPUTE_API_KEY
npx wrangler secret put OG_COMPUTE_MODEL_ID
npm run deploy
```

Wrangler prints a URL like `https://who-rugged-lobby.<sub>.workers.dev`.

### 2. Point the app at it, then build

In the repo root `.env` (copy from `.env.example`), set the production worker URLs:

```
VITE_LOBBY_URL=wss://who-rugged-lobby.<sub>.workers.dev
VITE_COMPUTE_URL=https://who-rugged-lobby.<sub>.workers.dev
```

```bash
npm run build
```

### 3. Host the frontend (Cloudflare Pages)

```bash
npx wrangler pages deploy dist --project-name who-rugged
```

`public/_redirects` ships SPA routing so `/play`, `/lobby`, etc. resolve. Any
static host works (Vercel, Netlify); just add an equivalent SPA fallback.

### Networks

Players pick Testnet (Galileo, free, faucet) or Mainnet (Aristotle, real) in the
Profile. Solo practice needs no tokens on either. No smart contract is required
for AI, lobby, friends, or discovery; a `Vault` escrow is only for real on-chain
pots, which is a later layer (`docs/PROMPTS.md`, gotchas in `docs/BUILD_GUIDE.md`).

## The identity at a glance

- Palette with meaning: sky blue is the cop, gold is loot, magenta is the thief and alarm, lime is verified, on a deep navy night.
- Type: Pixelify Sans for display, Silkscreen for small labels, Space Mono for body and data.
- Signature: the sealed stamp that breaks into a TEE attestation at the reveal.
- House rule: no em dashes in any copy.

Full tokens and component specs live in `docs/WHO-RUGGED_BUILD-SPEC.md`.

## Credits and licenses

- Suspect sprites: DiceBear pixel-art, design licensed CC0 1.0, library MIT. Self-host for production.
- Fonts: Pixelify Sans, Silkscreen, Space Mono, all open via Google Fonts.
- Built on 0G. Not actually from 1986.