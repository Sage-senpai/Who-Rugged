# Changelog

All notable changes to WHO RUGGED?. Format follows Keep a Changelog, and we date entries as we go. Newest on top.

## [Unreleased]

Planned, in build order. See `MASTER_BUILD_PROMPT.md`.

### To add
- `Vault.sol` deployed to 0G testnet: vault escrow, Police bond, lawsuit damages, payouts, rank.
- Sealed role assignment on 0G Compute, with the attestation surfaced at the reveal.
- Live suspect dialogue and suspicion reads via 0G Compute.
- Verifiable case replays and per-player agent memory on 0G Storage.
- Rank ladder with Undercover Cop unlock at 1200, then Two Thieves at 1400.
- Courtroom mini-screen on a wrong bust, where the Lawyer profession boosts damages.

## [0.4.0] - 2026-06-17

Layer 1. The blueprint became a real app. The two blueprint HTML files moved to `blueprints/` as the design contract, and the playable game plus the marketing site were ported to a React + Vite + TypeScript build with the identity intact.

### Added
- React + Vite + TypeScript app. Two routes: the landing site at `/` and the playable game at `/play`, sharing one design-token stylesheet so the world stays consistent.
- A `GameEngine` seam (`src/lib/types.ts`) with a local mock (`src/game/mockEngine.ts`). Every method is annotated with the 0G call that replaces it, so Compute, Chain, and Storage can drop in without touching the UI.
- Self-hosted suspect sprites via `@dicebear/core`, generated locally and cached, deterministic per handle. Removes the runtime dependency on the DiceBear public API the blueprint used, and works offline.
- Persisted player profile (score, rank, record) across reloads via localStorage. Each scan and reveal carries its own attestation string.
- A real sealing state. Opening a case shows a "SEALING ROLES · 0G COMPUTE" skeleton while the engine resolves, mapping the TEE latency to a visible state instead of a cosmetic one. Scanning shows a live pulsing meter and a privacy-preserving tell that is derived from the noisy read, never the role.
- Accessibility pass: skip link, focus-visible rings on every control, a focus-trapped verdict dialog that closes on Escape or backdrop, `aria-live` on the brief and notes, and full reduced-motion handling.
- Empty, loading, and error states across the game loop, including a "Reseal the case" retry when the enclave does not answer. No dead ends.
- Repo foundation: `.gitignore` (node_modules, `.env`, `.0g-skills`, contract artifacts, build output), `.env.example` with the verified 0G endpoints, and the documented `blueprints/` and `docs/` layout.

### Changed
- Repo reorganized to match the documented structure: blueprint HTML into `blueprints/`, the doc set into `docs/`, root docs uppercased (`README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `MASTER_BUILD_PROMPT.md`).

## [0.3.0] - 2026-06-16

The re-skin. We unified the marketing site and the game into one visual world and dropped the purple for sky blue.

### Added
- DiceBear pixel-art suspect sprites, seed-deterministic per handle so a suspect always looks the same. Each card falls back to a pixel initial if the sprite host is unreachable.
- A note on how to skin or self-host the sprites, since the design is CC0.

### Changed
- Rebuilt the game in the arcade cartridge identity to match the landing: pixel HUD, CRT scanlines, hard shadows, siren-red vault-drained banner, sky-blue Scan and alarm-red Accuse buttons, and the seal-to-attestation reveal.
- Repainted the whole palette from purple to navy plus sky blue across both files. Color now carries fixed meaning: sky is cop, gold is loot, magenta is thief, lime is verified.

### Removed
- The original dossier-noir demo (`police-catch-thief-demo.html`) is superseded by the arcade game and can be deleted.

## [0.2.0] - 2026-06-16

The landing page and the visual identity.

### Added
- `who-rugged-landing.html`: a full single-page marketing site in the retro arcade direction. Interactive police-lineup hero where tapping a suspect breaks the seals and reveals CLEAR or RUGGED, the four-beat loop, the bait-economy banner, the three 0G layers shown as cartridge chips, and a footer marquee.
- A UI kit section that doubles as the component library: buttons, suspicion meter, sealed-to-verified stamps, verdict ledger, badges, and the palette with its meanings.
- Accessibility floor: keyboard focus, responsive down to phone width, reduced-motion handling for the CRT flicker and marquee.

## [0.1.0] - 2026-06-15

First playable blueprint and the core design work.

### Added
- A playable single-file game demo with the full loop: sealed hidden roles, suspect statements, limited interrogations that return a noisy attested read, accusation, and a verdict with the payout ledger.
- The bait economy: an innocent Baiter who acts guilty on purpose, and a Police bond that funds the lawsuit, which is the mechanic that makes the game more than a clone.
- The seal-to-attestation reveal that ties the visuals to 0G Sealed Inference.
- The doc set: `WHO-RUGGED_BUILD-SPEC.md`, `PITCH.md`, `BUILD_GUIDE.md`, `PROMPTS.md`, with verified 0G endpoints, packages, and the six integration gotchas.

### House rules set
- No em dashes in any copy or docs.
- 0G must stay load-bearing. Roles sealed in the TEE, results settled on chain. Do not simplify this into a normal server, it removes the reason the project exists.