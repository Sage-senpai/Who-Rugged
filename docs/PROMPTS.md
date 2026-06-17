# WHO RUGGED?, Build Prompt Pack

Copy-paste prompts for Claude Code / Cursor / Copilot, in build order. They assume you've dropped the 0G agent skills into your repo so the assistant generates correct 0G code by default.

> **Do this once, first:**
> ```bash
> git clone https://github.com/0gfoundation/0g-agent-skills .0g-skills
> npm install @0glabs/0g-ts-sdk @0glabs/0g-serving-broker ethers dotenv
> cp .0g-skills/.env.example .env   # then add PRIVATE_KEY + RPC_URL from faucet.0g.ai
> ```
> In Cursor/Claude Code, tell the assistant to always reference `.0g-skills/AGENTS.md` and the `patterns/` files.

---

## Prompt 0, Project context (paste at the start of every session)
```
We're building "Who Rugged?", a hidden-role social-deduction game (Police Catch the Thief)
on the 0G stack. One human (Police) vs 5 AI agents; one agent is the Thief who drained a
shared vault. Wrong accusations let the accused sue; correct ones recover the vault.

Use the 0G Agent Skills in .0g-skills and follow its AGENTS.md rules exactly:
- ethers v6 only
- call processResponse(providerAddress, chatID, usageData) after every Compute inference
- extract ChatID from the ZG-Res-Key header first
- evmVersion "cancun" for contracts
- close ZgFile handles in finally blocks
- never hardcode keys

The starting UI is the single-file demo police-catch-thief-demo.html (vanilla HTML/JS,
mocked AI). We are now replacing the mocks with real 0G calls, one layer at a time.
```

## Prompt 1, Vault escrow contract (0G Chain)
```
Write a Solidity contract Vault.sol for Who Rugged?, compiled for 0G Chain (evmVersion "cancun"):
- openCase(id, stolen) payable: caller is the Police, msg.value is their bond, pool = bond*5
- resolve(id, correct, accused, damages): if correct, pay Police bond+stolen and +ELO;
  if wrong, pay the accused bond+damages and -ELO; mark case closed
- track int256 elo per address and expose a view to read it
- emit events for CaseOpened and CaseResolved
Then give me an ethers v6 script to deploy it to 0G testnet (RPC https://evmrpc-testnet.0g.ai)
using PRIVATE_KEY from .env, and print the deployed address.
```

## Prompt 2, Seal the roles (0G Compute / TEE)
```
Using 0G Compute (0g-serving-broker, OpenAI-compatible), write a TypeScript module sealRoles.ts:
- input: caseId + the 5 agent ids
- call a TEE model to assign exactly one Thief and one Baiter (innocent who will act guilty),
  the rest plain innocents, from a random seed
- return ONLY sealed handles to the client (no role text) plus the TEE attestation/ChatID
- keep the role->agent mapping server-side; expose a verifyReveal(caseId) that returns the
  mapping + attestation only after the accusation is locked
Follow .0g-skills rules: processResponse() after the call, ChatID from ZG-Res-Key header.
```

## Prompt 3, Agent dialogue + bluffing
```
Write agentSpeak.ts: for a given agent, make one 0G Compute call that returns a single
in-character statement for the current round. System prompt includes the agent's hidden role:
- thief: deflect, lie, or accuse others, never confess
- baiter: act suspicious on purpose to provoke a wrongful arrest
- innocent: give a plausible alibi
Keep statements under 25 words, in a crypto-native voice. Return text + attestation.
Batch the 5 agents efficiently and handle rate limits / retries.
```

## Prompt 4, Suspicion read (privacy-preserving)
```
Write probe.ts: the Police spends an interrogation on one agent. Make a 0G Compute call that
returns a NOISY suspicion score 0-100, it must NOT reveal the role directly (privacy is the
mechanic). Add a short "tell" note (e.g. "elevated deflection"). Return score + note + the TEE
attestation so the client can prove the read wasn't fabricated. Enforce a per-case probe limit.
```

## Prompt 5, Replays + agent memory (0G Storage)
```
Using 0G Storage (0g-ts-sdk), write storage.ts with:
- saveReplay(case): serialize the full case + reveal to JSON, upload, return the CID/root hash
- loadReplay(cid): fetch + verify (merkle) and return it
- appendMemory(agentId, playerAddr, note) / getMemory(agentId, playerAddr): persist how an
  agent "remembers" this player across cases, to feed future agentSpeak prompts
Use ZgFile, close handles in finally, follow .0g-skills STORAGE.md patterns.
```

## Prompt 6, Wire the client to real calls
```
Refactor police-catch-thief-demo.html (or port it to React+Vite) to replace the mocked logic:
- newCase() -> openCase on Vault.sol + sealRoles()
- statements -> agentSpeak()
- interrogate() -> probe()
- accuse() -> lock accusation, call verifyReveal(), then Vault.resolve(), then saveReplay()
Keep the existing UI, animations, and the seal-break reveal. Show the real TEE attestation
hash and the Storage CID in the verdict modal. Add wallet connect (wagmi or plain ethers v6).
```

## Prompt 7, ELO ladder + unlocks
```
Read on-chain ELO in the header. Gate roles by ELO: 1200 unlocks Undercover Cop, 1400 unlocks
Two Thieves. Add a simple leaderboard view that reads top scorers from the contract. Show the
next unlock as a progress hint (the demo already has a placeholder for this).
```

## Prompt 8, Courtroom mini-phase
```
Add a short courtroom screen triggered on a wrong arrest: the accused presents clues, a Lawyer
profession (if present) boosts their damages, and the verdict animates before settling on-chain.
Keep it under ~15 seconds of interaction so the core loop stays fast.
```

---

### Iteration tips
- Build and verify **one layer at a time** on testnet before moving on, don't wire all three 0G services at once.
- After each prompt, ask the assistant: *"show me how to test this against 0G testnet and what a successful response looks like."*
- When something fails, paste the exact error and say *"check this against .0g-skills/patterns/NETWORK_CONFIG.md and AGENTS.md."*
- For the demo video, script the bait moment, arresting the baiter and eating the lawsuit is the most memorable 10 seconds you can show a judge.