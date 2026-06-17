# MASTER BUILD PROMPT

Paste this into Claude Code or Cursor at the root of the repo. It is the single kickoff instruction for building the production version of WHO RUGGED?. It assumes the two blueprint HTML files and the docs in this repo are present.

---

```
You are building the production version of WHO RUGGED?, a hidden-role social deduction game
(Police Catch the Thief) on the 0G stack. One human plays the Police against five AI suspects.
One suspect is the Thief who drained a shared vault. Wrong accusations let the accused sue;
correct ones recover the vault.

THE BLUEPRINT (this is a contract, not a suggestion)
- blueprints/who-rugged-landing.html  = the marketing site visual + UX blueprint
- blueprints/who-rugged-game.html     = the playable game visual + UX blueprint (logic is mocked)
Treat these two files as the FLOOR for look, feel, layout, motion, and copy, never the ceiling.
The shipped product must read as the same world: the "lost 1986 crime arcade cartridge" identity,
navy night background, sky-blue cop, gold loot, magenta thief, lime verified, pixel display type
with a mono body, CRT scanlines, hard pixel shadows, and the seal-to-attestation reveal.

USE YOUR SKILLS TO BEAT THE BLUEPRINT
- Use your frontend-design skill (and any design skills you have: design-system, ux-copy,
  accessibility-review, design-critique) to raise the bar on typography, spacing rhythm,
  hierarchy, micro-interactions, empty/loading/error states, and mobile layout. The blueprint
  proves the direction; your job is to make it more refined, more consistent, and more polished,
  while keeping the identity intact.
- Use the 0G agent skills in .0g-skills for every piece of 0G integration. Follow its AGENTS.md
  rules exactly. Do not invent endpoints or SDK calls from memory.
- Use your engineering documentation skill to keep README.md and CHANGELOG.md current as you
  build. Every meaningful change updates the changelog.

SOURCE OF TRUTH
- docs/WHO-RUGGED_BUILD-SPEC.md holds the design tokens, the architecture, the 0G integration
  map, the bracket-mapped plan, and the explicit "preserve vs improve" rules. Read it first and
  defer to it. docs/BUILD_GUIDE.md has the contract sketch and the verified endpoints/packages.

WHAT EACH 0G LAYER DOES (all load-bearing, do not collapse into a normal backend)
- 0G Compute (Sealed Inference / TEE): seals role assignment, runs each suspect's dialogue and
  bluffing, returns noisy suspicion reads, and provides the attestation shown at the reveal.
- 0G Chain (EVM): vault escrow, the Police bond, lawsuit damages, rewards, on-chain rank.
- 0G Storage: verifiable case replays and per-player agent memory that feeds future dialogue.

BUILD ORDER (one layer at a time, verify on testnet before moving on)
1. Port the blueprint game into a real frontend (React + Vite recommended) with the identity intact.
2. Deploy Vault.sol to 0G testnet; wire wallet connect; move the vault/bond/payout to chain.
3. Replace mocked roles with real sealed assignment on 0G Compute; show the attestation.
4. Make each suspect statement and each suspicion read a live 0G Compute call.
5. Save finished cases to 0G Storage; add a shareable verifiable replay link.
6. Add the rank ladder and unlock Undercover Cop at rank 1200.
7. Add the courtroom mini-screen on a wrong bust, where the Lawyer profession boosts damages.

HARD CONSTRAINTS
- No em dashes anywhere in UI copy, code comments, or docs. Use commas, colons, or periods.
- Keep color meanings fixed: sky = cop, gold = loot, magenta = thief/alarm, lime = verified.
- Suspect sprites are DiceBear pixel-art (CC0). Keep them seed-deterministic per handle. For
  production, self-host DiceBear rather than the public API.
- Privacy is a mechanic: a suspicion read must never reveal the role outright.
- Honest scope: v1 may keep attestation verification and payout authorization in a trusted
  off-chain resolver. Document that clearly. Decentralize in v2.

DEFINITION OF DONE (every layer)
Loads fast, playable on a phone, visible keyboard focus, reduced motion respected, no dead ends,
the 0G call actually runs on testnet, and README + CHANGELOG are updated.

Start by reading docs/WHO-RUGGED_BUILD-SPEC.md and both blueprint files, then propose a short
plan for layer 1 before writing code.
```


makke sure to read all files and understand them, gitignore the ones that needs to be and build properly