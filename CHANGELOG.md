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

## [0.9.0] - 2026-06-18

A clock and a buzzer. The case now has a hard time limit, and running out of scans is called out loud.

### Added
- A per-case countdown timer with a hard limit by difficulty: 120s on Rookie, 90s on Detective, 60s on Hardboiled. It shows in the case brief and turns alarm red and blinks in the last 15 seconds, with a warning beep at 10.
- The clock pauses with the game. It freezes during pause, onboarding, the courtroom, and the verdict, and resumes on return, so a paused game never loses time.
- Time's Up. When the clock hits zero a buzzer sounds and the case auto-settles as a loss: bond forfeited, thief escaped. It skips the courtroom (no one was accused) and goes straight to the verdict.
- An out-of-scans buzzer and toast. Spending the last scan, or trying to scan with none left, sounds a buzzer and shows a "You're out of scans" banner. Pressing a number key on an already-scanned or unavailable suspect buzzes too.

### Changed
- The engine gained `resolveTimeout` for the buzzer loss, settled the same way a wrong bust is.

## [0.8.0] - 2026-06-18

Expressions and difficulty. Suspect faces emote, and the case can be tuned from Rookie to Hardboiled.

### Added
- Mood-driven pixel faces. Each suspect's DiceBear mouth shifts with their mood: calm at rest, nervous or rattled as their suspicion meter climbs, and the thief smirks at the reveal. The mood is derived only from the meter the player already sees, so it never leaks the role. A `mood` field on the suspect is the seam for a Compute agent to drive expressions directly later.
- Three difficulty levels, chosen in Settings and persisted: Rookie (three scans, clearer reads, obvious bait), Detective (two scans, standard), and Hardboiled (one scan, heavy noise, the baiter reads almost exactly like the thief, higher bond). The active mode shows in the case brief and applies to the next case.

### Changed
- The engine reads a difficulty config for scan count, read noise, the per-role suspicion centres, and the bond multiplier. `openCase` now takes the difficulty.

## [0.7.0] - 2026-06-18

Sound. A chiptune music engine with a unique theme per screen, plus richer effects.

### Added
- A Web Audio chiptune music engine (`src/lib/music.ts`): a step sequencer with bass, lead, hat, and kick voices, fade in and out, and gapless looping. Zero audio assets, no licensing, in keeping with the arcade identity.
- A distinct looping theme per area: an attract loop on the landing, a calmer menu theme, an ambient settings pad, a brighter stats theme, a lighter how-to theme, and a tense, driving gameplay loop. The track follows the route and crossfades on navigation.
- A Music toggle in Settings and in the in-game pause panel, separate from sound effects. Both persist on the device.
- Richer sound effects with fuller envelopes, and new blips for menu navigation, back, and toggles.

### Changed
- Audio respects the browser autoplay rules: music starts on the first pointer or key, never before.

### Notes
- These themes are synthesized chiptunes, not licensed recordings. The engine has a clear seam to swap in CC-licensed audio files later if desired.

## [0.6.0] - 2026-06-18

Game feel. First-run onboarding, the courtroom mini-screen, keyboard shortcuts, and more sound.

### Added
- First-run onboarding: a one-time coach card on the first case explaining the four beats and the keyboard shortcuts, dismissible and remembered on the device.
- Courtroom mini-screen on a wrong bust (spec layer 7). Before the verdict, the suspect you wrongly arrested presents a defense, the damages figure slams in, and a Lawyer collects boosted damages with its own banner. A win goes straight to the verdict.
- The Lawyer profession now matters: arresting a Lawyer boosts the lawsuit damages (and adds a suit to an otherwise bond-only innocent bust), surfaced in the ledger and the courtroom.
- Keyboard shortcuts in a case: 1 to 5 scan that suspect, P pause, N new case. Suspended while any overlay is open, and documented in How to Play and the onboarding card.
- More sound: arcade blips now also fire on accuse and new case, alongside the existing scan, seal break, and verdict stings.

### Changed
- The post-reveal flow is now a single overlay state (none, courtroom, verdict) so a loss routes through the courtroom and a win does not.
- The verdict model carries the accused handle, profession, defense line, total damages, and a lawyer-boost flag.

## [0.5.0] - 2026-06-18

The game shell. The app is now a proper game and not just a single case screen: a title menu, settings, a how-to-play screen, a stats and leaderboard screen, in-game pause, and sound.

### Added
- Main menu at `/menu` (Play, How to Play, Stats, Settings). The landing's Press Start now opens the menu instead of dropping straight into a case.
- How to Play at `/how`: the four beats, the bait economy, controls, the color legend, and why it cannot cheat.
- Settings at `/settings`, persisted on the device: CRT scanlines, screen flicker, sound effects, an explicit reduce-motion override on top of the system preference, and a two-step "Reset progress" wipe.
- Stats at `/stats`: balance, rank, record, win rate, a progress bar toward the next rank unlock, your recent cases, and a sample leaderboard that drops in your rank (reads on-chain once the contract lands).
- In-game pause overlay with quick toggles for sound, scanlines, and motion, plus links to How to Play, Settings, and Quit to Menu. Escape resumes; opening it does not lose the case.
- Synthesized arcade sound effects via Web Audio (zero audio assets, no licensing): blips on scan, seal break, and the win or lose verdict, all gated by the sound setting.
- Case history persistence: every resolved case is recorded locally, the seam for 0G Storage replays.

### Changed
- Settings apply globally as classes on the document root, so CRT flicker and motion respond in plain CSS. The CRT overlay is removed from the DOM entirely when scanlines are off.
- Player and history persistence moved into a shared `src/game/profile.ts` used by both the game loop and the stats screen.
- Every screen loads as its own route chunk, keeping each entry point small.

## [0.4.1] - 2026-06-17

Polish pass over Layer 1. Responsiveness, performance, and accessibility raised without touching the arcade identity.

### Added
- Route-level code splitting. The landing no longer ships the game engine or the DiceBear sprite library; the game chunk loads on demand at `/play`. A themed "INSERT COIN" fallback covers the load.
- Open Graph and Twitter share tags and an inline pixel favicon (gold question mark on navy), since shareable replays are part of the hook.

### Changed
- Full responsive pass down to 320px: trimmed the oversized logo hard-shadow on narrow phones so it never clips, tightened HUD wrapping, stacked the action bar, and kept the five-wide police lineup legible on the smallest screens.
- Touch devices now get 44px minimum tap targets on every button (WCAG 2.5.5), while mouse and keyboard keep the compact arcade sizing.
- Suspect cards gain a cop-blue border and a deeper hard shadow on hover, using box-shadow rather than transform so the deal-in animation does not cancel it.
- The hero lineup reset is now a real button instead of a div with a button role, so it is reachable and operable by keyboard and screen readers.

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