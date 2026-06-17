# Contributing to WHO RUGGED?

Short version: keep the world consistent, keep 0G load-bearing, and use your tools to make it better than the blueprint. Here is how we work.

## Get set up

```bash
git clone <repo>
git clone https://github.com/0gfoundation/0g-agent-skills .0g-skills
npm install @0glabs/0g-ts-sdk @0glabs/0g-serving-broker ethers dotenv
cp .0g-skills/.env.example .env     # add PRIVATE_KEY and RPC_URL, fund at faucet.0g.ai
```

Read `docs/WHO-RUGGED_BUILD-SPEC.md` first. It is the source of truth for the design system, the architecture, and what to preserve versus what is free to change. Then open both files in `blueprints/` so you know the world you are working in.

## Use the skills, do not freehand it

- **UI, typography, motion, copy:** use the frontend-design skill, and the design skills if you have them (design-system, ux-copy, accessibility-review, design-critique). The blueprints are the floor. Your job is to raise spacing rhythm, hierarchy, states, and polish above them while keeping the identity. Do not regress the look to ship faster.
- **Anything touching 0G:** use the agent skills in `.0g-skills` and follow `AGENTS.md` exactly. Do not write 0G calls from memory.
- **Docs:** when you change behavior, update `CHANGELOG.md`, and update `README.md` if structure or setup changes. Keep the same plain, human voice these docs use.

## Golden rules (from the build spec)

Preserve these. They are the reason the project works.

1. The bait plus bond economy. It is the unique mechanic.
2. 0G stays load-bearing. Roles sealed in the TEE, the attestation visible, results settled on chain. Never collapse this into a normal backend.
3. The seal-to-attestation reveal and the fixed color meanings.

Free to improve: spacing, micro-interactions, sound, onboarding, mobile layout, the suspicion model, the dialogue prompts, the difficulty curve, and new roles, as long as new roles are gated by rank so complexity grows with skill.

## Design system quick reference

- **Palette with meaning:** sky `#5BB0E8` is the cop, gold `#F4B740` is loot, magenta `#FF5277` is the thief and alarm, lime `#A7E05A` is verified, on navy `#0C1626`. Color is not decoration, it signals role.
- **Type:** Pixelify Sans (display), Silkscreen (small labels and buttons), Space Mono (body and data).
- **Signature:** the sealed stamp that breaks into a TEE attestation. Keep it as the one hero moment.
- **Copy:** terse, investigative, crypto-native. Errors say what happened and how to fix it, never an apology.
- **No em dashes.** Anywhere. Use commas, colons, or periods. This is a hard house rule.

Full tokens and component specs are in `docs/WHO-RUGGED_BUILD-SPEC.md`.

## The 0G checklist (saves hours)

1. Call `processResponse()` after every Compute inference. Order: `(providerAddress, chatID, usageData)`.
2. Read `ChatID` from the `ZG-Res-Key` header first, body as fallback.
3. ethers v6, never v5.
4. Contracts compile with `evmVersion: "cancun"`.
5. Close `ZgFile` handles in a `finally` block.
6. Never hardcode keys.
7. A suspicion read must never reveal the role outright. Privacy is a mechanic.

## Branches and commits

- Branch per layer or feature: `feat/vault-contract`, `feat/sealed-roles`, `fix/meter-overflow`.
- Small commits with present-tense messages: `add vault escrow contract`, `wire sealed roles to compute`.
- Open a PR that says what changed, what 0G call it touches, and how you tested it on testnet.

## Definition of done

Before you mark anything done: it loads fast, plays on a phone, has visible keyboard focus, respects reduced motion, has no dead ends, the 0G call actually runs on testnet, and the changelog is updated. If the build spec lists a quality floor for the layer, hit it.

## Adding a new role or profession

1. Gate it behind a rank threshold so it only appears as players climb.
2. Give it one clear function, not three. Doctor clears one suspect, Lawyer boosts damages, Technician buys a clue.
3. Keep its color inside the existing palette meaning. Do not introduce a new accent.
4. Add a line to the changelog and, if it changes the loop, a note in the build spec.