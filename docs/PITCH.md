# WHO RUGGED?, Pitch

**Police Catch the Thief, rebuilt as the first trust-minimized social-deduction game.**
A hidden-role heist game where you play against AI agents with sealed identities, a real prize pool, and a courtroom. Every secret is sealed inside a 0G TEE and every payout settles on-chain, so for the first time, an AI social-deduction game with money on the table is *provably fair*.

---

## The one-line hook
> Among Us, but the roles are cryptographically sealed, the agents remember you, and the pot is real.

## The problem with "AI game + crypto rewards"
Almost every entry in this category fails the same test: the AI is decorative. A companion that hands out hints could be a plain API call, the TEE and the chain add nothing. Judges see through it instantly.

Social deduction is different. **It structurally breaks without privacy and verifiability:**
- If the server knows who the thief is, the server can leak it, sell it, or be hacked.
- If money is in the pot, every loser will (rightly) suspect the role assignment was rigged.

This is the exact gap 0G's **Sealed Inference** was built to close: every inference runs inside an Intel TDX + NVIDIA H100/H200 TEE, and every response is signed by an enclave-born key. Nobody, not us, not a node operator, not other players, can see or alter who the thief is, and anyone can verify it after the fact.

**So 0G isn't a sponsor checkbox here. It's the only reason the game can exist.**

## The game
Five suspects sit at the table, each with a hidden profession (Doctor, Lawyer, Technician, DevRel, Community Builder…). One is the **Police**, one is the **Thief**, who has drained a shared vault. The Police must identify the thief.

- **Correct arrest** → thief convicted, vault recovered, Police rewarded, ELO up.
- **Wrong arrest** → the accused *sues*, collects damages, and the thief escapes with the loot.

## The mechanic nobody else has: the bait economy
Because a wrongful arrest *pays the accused*, an innocent player is incentivized to **act guilty on purpose**, to bait the cop into arresting them and farm the lawsuit. The thief gets to hide inside a crowd of people who are all *performing* guilt.

To keep it from collapsing into noise, the Police stakes a **bond** that funds the lawsuit. Now accusing is expensive, baiting is a gamble, and you get a poker-style check / call / bluff layer sitting on top of social deduction. That tension is the whole game.

## Why it's sticky and competitive
- **Short sessions** (2-3 min a case), instant "one more round" loop.
- **ELO ladder** that doubles as content unlock, climb to unlock Undercover Cops, then Two Thieves.
- **Agents that remember you** (stored on 0G Storage): the doctor you framed last week plays you more suspiciously this week. No centralized game can copy this.
- **Verifiable replays** ("watch me run the perfect heist"), shareable *and* impossible to fake, because the proof is in the attestation.
- **Tournament pools**: everyone buys in, plays their own AI table async, payouts rank against the field, competitive without fragile real-time lobbies.

## 0G stack usage (all load-bearing)
| Layer | What it does in the game |
|---|---|
| **0G Compute / Sealed Inference (TEE)** | Assigns + seals hidden roles; runs each AI agent's reasoning, lies, and bluffs privately; produces the suspicion "reads" the Police can trust. |
| **0G Chain (EVM)** | Vault escrow, the Police bond, lawsuit damages, reward payouts, on-chain ELO + leaderboard. |
| **0G Storage** | Per-player agent memory, verifiable case replays, leaderboard proofs. |

## Proof the lane wins
0G's own showcase rewards exactly this shape: **Warriors AI-rena** (battle game, 0G Compute for decisions, Storage for state) and **Battle AI** ("a trustless arena where privacy meets competition") were hackathon winners. Who Rugged? takes that pattern and adds the one thing those lacked: a genuinely social, bluff-driven loop a normal person wants to replay.

## Status & roadmap
- **Now (demo):** playable single-table round, mocked AI + sealed-role reveal, full bait/bond/lawsuit economy. *(see `police-catch-thief-demo.html`)*
- **v1 (submission):** live roles + agents on 0G Compute, vault/bond escrow on 0G Chain, replays on 0G Storage, ELO ladder.
- **v2:** persistent agent memory of each player; tournament prize pools.
- **v3:** Undercover Cops, Two Thieves, profession abilities, human/AI mixed tables (you can't tell which is which).

## The ask
Back the first social-deduction game whose fairness you don't have to trust, you can verify it.