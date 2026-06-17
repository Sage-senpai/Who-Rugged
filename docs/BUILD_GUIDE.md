# WHO RUGGED?, Build Guide

Everything you need to take the demo to a submittable v1 in ~9 days. Verified against 0G's live docs and the `0g-agent-skills` repo (Apr-Jun 2026).

---

## 0. Stack at a glance

| Concern | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS (the demo) → optionally React + Vite later | Lightweight, fast to ship, no engine needed |
| AI agents + role sealing | **0G Compute** via `@0glabs/0g-serving-broker` (OpenAI-compatible) | TEE = the trust backbone |
| Economy (vault, bond, payouts) | **0G Chain** (EVM) + Solidity, `ethers v6` | On-chain escrow, verifiable |
| Memory + replays | **0G Storage** via `@0glabs/0g-ts-sdk` | User-owned, verifiable persistence |
| Dev accelerator | `0g-agent-skills` repo dropped into your project | Turns Claude/Cursor into a correct-by-default 0G dev |

### Verified endpoints & packages (testnet)
```
RPC_URL              = https://evmrpc-testnet.0g.ai
STORAGE_INDEXER      = https://indexer-storage-testnet-turbo.0g.ai
COMPUTE (router)     = https://router-api.0g.ai/v1   (OpenAI-compatible; Private Computer at pc.0g.ai)
Faucet               = faucet.0g.ai
Docs                 = docs.0g.ai
Packages             = @0glabs/0g-ts-sdk  @0glabs/0g-serving-broker  ethers(v6)  dotenv
Models available     = DeepSeek Chat V3, Qwen3.6-Plus, GLM-5-FP8, Qwen3-VL-30B (vision), Whisper-large-v3
```

### Non-negotiable 0G rules (from the agent-skills repo, save yourself the debugging)
1. Always call `processResponse()` after **every** compute inference, param order `(providerAddress, chatID, usageData)`.
2. Extract `ChatID` from the `ZG-Res-Key` response header first; body is fallback.
3. Use **ethers v6**, never v5.
4. Solidity contracts: `evmVersion: "cancun"`.
5. Close `ZgFile` handles with `file.close()` in a `finally` block.
6. Never hardcode private keys, use `.env`.

---

## 1. Architecture

```
                        ┌─────────────────────────────────────┐
   Browser (you)        │            Game client              │
   ──────────────       │  case UI · suspicion meters · court │
                        └───────────────┬─────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
   ┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
   │  0G COMPUTE      │        │   0G CHAIN        │        │   0G STORAGE      │
   │  (Sealed Infer.) │        │   (EVM escrow)    │        │   (persistence)   │
   ├─────────────────┤        ├──────────────────┤        ├──────────────────┤
   │ • seal roles     │        │ • vault pool      │        │ • case replays    │
   │ • agent dialogue │        │ • police bond     │        │ • agent memory    │
   │ • lies / bluffs  │        │ • lawsuit damages │        │ • leaderboard     │
   │ • suspicion read │        │ • reward payout   │        │   proofs          │
   │ • TEE attestation│        │ • on-chain ELO    │        │                   │
   └─────────────────┘        └──────────────────┘        └──────────────────┘
```

**Trust flow that wins judges:** role assignment happens *inside* the TEE → the assignment is sealed and signed by the enclave key → at reveal, the attestation proves no one (not even you, the dev) could have peeked or rigged it → the result settles on-chain where anyone can audit the payout.

---

## 2. Game loop (data model)

```
Case = {
  caseId, pool, stolen, bond,
  seats: [ { agentId, profession, role: SEALED, statement, attestation } x5 ],
  hiddenRoles: { police, thief },        // never leaves the TEE until reveal
  probesAllowed, probesUsed,
  accusation, verdict, payouts, replayCID
}
```

Roles to support, gated by ELO:
- **Bronze (v1):** Police, Thief, 3 civilian professions.
- **1200+:** Undercover Cop (a second hidden investigator).
- **1400+:** Two Thieves (split or compete for the loot).
- **Later:** profession abilities, Doctor clears one suspect, Lawyer boosts lawsuit payout, Technician buys a private clue, Community Builder swings votes.

---

## 3. Phased breakdown (9-day slice)

**Day 1-2, Skeleton & economy on testnet**
- Fork the demo as the UI base. Wire wallet connect (RainbowKit/wagmi or plain ethers).
- Write + deploy `Vault.sol` (escrow + bond + payout). Test on 0G testnet with faucet tokens.

**Day 3-4, Sealed roles + agents on 0G Compute**
- Role-sealer call: prompt the TEE model to assign roles from a seed; keep mapping server-side/in-enclave, return only sealed handles + attestation.
- Agent dialogue: one Compute call per agent per round, system-prompted with their hidden role + persona. Thief lies, baiter bait, innocents alibi.
- Suspicion read: a Compute call returning a noisy 0-100 score (never the literal answer) + attestation receipt.

**Day 5, Storage + replays**
- On case end, serialize the full case + reveal and upload to 0G Storage; store returned CID. "Verifiable replay" link plays it back.

**Day 6, ELO, leaderboard, unlocks**
- On-chain ELO update in `Vault.sol` (or a separate `Ranking.sol`). Read top-N for leaderboard. Gate roles by ELO.

**Day 7, Bait/bond economy polish + courtroom mini-phase**
- Wrong arrest → short trial screen where clues are presented; lawyer profession matters here.

**Day 8, Juice & mobile**
- Reveal animations (the demo's seal-break), sound, responsive pass, empty/error states.

**Day 9, Submission**
- Record demo video, finalize `PITCH.md`, deploy, write 0G-integration notes for judges (they reward clear, real usage).

---

## 4. `Vault.sol` sketch (starting point, not audited)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;            // compile with evmVersion: "cancun"

contract Vault {
    struct Case { uint256 pool; uint256 stolen; uint256 bond; address police; bool open; }
    mapping(uint256 => Case) public cases;
    mapping(address => int256) public elo;

    function openCase(uint256 id, uint256 stolen) external payable {
        require(msg.value > 0, "bond required");
        cases[id] = Case(msg.value * 5, stolen, msg.value, msg.sender, true);
    }

    // settlement is called by the verifier after the TEE reveal + attestation check
    function resolve(uint256 id, bool correct, address accused, uint256 damages) external {
        Case storage c = cases[id]; require(c.open, "closed"); c.open = false;
        if (correct) { payable(c.police).transfer(c.bond + c.stolen); elo[c.police] += 22; }
        else { payable(accused).transfer(c.bond + damages); elo[c.police] -= 20; }
    }
}
```
Keep the attestation-verification + payout authorization off-chain in v1 (a trusted resolver), then decentralize in v2. Document this clearly, judges prefer honest scope over fake decentralization.

---

## 5. Where to get mockups, UI, and assets (all free / freemium)

**Wireframe & mockup tools**
- **Figma** (free tier), design the case/court screens; tons of community kits. Search "dark dashboard kit", "card game UI".
- **Excalidraw**, fast flow/architecture sketches for the pitch deck.
- **tldraw**, quick interactive wireframes.
- **Penpot** (open-source Figma alternative) if you want self-hosted.

**UI components / styling**
- **shadcn/ui** + **Tailwind** if you move to React, fast, clean, themeable.
- **Radix UI** primitives for accessible modals/menus (the courtroom + verdict overlays).
- **DaisyUI** for quick prototyping on plain HTML.

**Icons & type**
- **Lucide** / **Phosphor** icons (free, MIT). Good for evidence/badge glyphs.
- **Google Fonts**, the demo uses *Special Elite* (typewriter), *IBM Plex Sans/Mono*. Free, embeddable.

**Game art / portraits (avoid copyrighted IP)**
- **Kenney.nl**, free CC0 game art packs (UI, cards, icons). Great for a heist/board look.
- **OpenGameArt.org**, CC-licensed sprites (check each license).
- **DiceBear** / **Boring Avatars**, generated suspect avatars (no IP risk, deterministic from a seed, handy since each agent has an id).
- **unDraw** / **Heroicons**, open illustrations for empty states.

**Sound (juice)**
- **Freesound.org** (CC), **Pixabay audio** (free), stamp/gavel/cash sounds. Mind attribution.

**Pitch deck**
- **Pitch.com**, **Canva** (free tiers), or just clean Markdown → slides via your editor.

---

## 6. 0G resources
- Agent skills (drop into project): `github.com/0gfoundation/0g-agent-skills`
- Showcase / inspiration: `github.com/0glabs/awesome-0g` (look at Warriors AI-rena, Battle AI)
- Docs: `docs.0g.ai` · Faucet: `faucet.0g.ai` · Studio: `app.0g.ai` · Build hub: `build.0g.ai`
- Arena / competition details + deadline: `0g.ai/arena` *(confirm the current submission date there)*