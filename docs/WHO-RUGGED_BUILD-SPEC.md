# WHO RUGGED? Build Spec

> Single source of truth for building the game. Hand this whole file to 0G Studio or Claude/Cursor. It is written to be implemented and then improved on by the AI building it; section 9 says what to keep and what is free to change.

**Working title:** WHO RUGGED?
**Tagline:** Police Catch the Thief, rebuilt so the game can prove it never cheated.
**Built for:** 0G Zero Cup (group stage submission due June 23, 2026; iterate every round to July 19).

---

## 1. North star

A hidden-role social deduction game. One human plays the Police against five AI suspects who each have a hidden profession. One suspect is the Thief and has drained a shared vault. The Police reads statements, spends limited interrogations, and makes one arrest.

Get it right and the vault is recovered and the Police is rewarded. Get it wrong and the accused sues, collects damages, and the thief escapes with the loot.

The reason this is a 0G game and not just a fun game: a deduction game with money in the pot is unplayable unless players can trust that the roles were not rigged and the result was not faked. That trust is exactly what 0G's Sealed Inference provides. Roles are sealed inside a hardware TEE and every AI response is signed by the enclave. So 0G is load bearing, not decoration.

**The one hook:** Among Us, but the roles are cryptographically sealed, the agents remember you, and the pot is real.

---

## 2. The pitch (condensed)

Most "AI app + crypto rewards" entries fail one test: the AI is decorative. A hint-giving companion could be a plain API call, so the TEE and the chain add nothing. Social deduction is the rare genre that structurally needs both privacy and verifiability, which is why it is a clean fit for 0G.

- **Privacy:** if a server knows who the thief is, it can leak it, sell it, or be hacked. The TEE means nobody, including us the builders, can see the role.
- **Verifiability:** the instant someone loses money, they will suspect the assignment was rigged. The signed attestation proves it was not.

The unique mechanic is the **bait economy**. Because a wrongful arrest pays the accused, an innocent suspect is incentivized to act guilty on purpose, to bait the Police into arresting them and farm the lawsuit. The thief gets to hide inside a crowd of people performing guilt. To stop that collapsing into noise, the Police stakes a bond that funds the lawsuit, so accusing is expensive and baiting is a real gamble. That is a poker style bluff layer on top of deduction, and it is the heart of the game.

Proof the lane wins: 0G's own showcase rewarded Warriors AI-rena (battle game using Compute for decisions and Storage for state) and Battle AI ("a trustless arena where privacy meets competition"). WHO RUGGED? takes that pattern and adds a genuinely social, replayable loop.

---

## 3. Core loop

```
1. OPEN     A vault of $GG is shown. It was drained overnight. 5 suspects, hidden professions.
            Roles (Police = you, one Thief, one Baiter, rest innocents) are sealed in the TEE.
2. READ     Each suspect emits a short statement. Thief lies or deflects. Baiter acts guilty.
            Innocents give alibis.
3. PROBE    You spend up to N interrogations. Each returns a NOISY suspicion read (0-100) plus
            a TEE attestation. The read never names the thief outright (privacy is the mechanic).
4. ACCUSE   You pick one suspect and lock it. Your bond is now at risk.
5. REVEAL   Seals break into attestations. Settlement runs on-chain:
              correct  -> vault recovered, reward + bounty, ELO up
              baiter   -> big lawsuit payout to them, bond + damages lost, ELO down hard
              innocent -> bond lost, thief escapes with loot, ELO down
6. RECORD   The full case + reveal is written to 0G Storage as a verifiable replay.
```

**Roles, gated by ELO (this is the unlock system):**
- Bronze v1: Police, Thief, three civilian professions.
- ELO 1200+: Undercover Cop (a second hidden investigator).
- ELO 1400+: Two Thieves (split or compete for the loot).
- Later: profession abilities. Doctor clears one suspect, Lawyer boosts the lawsuit payout, Technician buys a private clue, Community Builder swings a vote.

---

## 4. The master 0G Studio prompt

Paste this into 0G Studio to scaffold the project, then iterate with the follow-ups. The design tokens in section 6 should be pasted alongside it.

```
Build a browser game called WHO RUGGED?, a hidden-role social deduction game (Police Catch
the Thief) on the 0G stack.

CORE LOOP
- The player is the Police. Five AI suspects sit at a table, each with a hidden profession
  (Doctor, Lawyer, Technician, DevRel, Community Builder). One suspect is the Thief who drained
  a shared vault of in-game currency ($GG). One innocent is a "Baiter" who acts guilty on
  purpose to provoke a wrongful arrest.
- Each round, every suspect shows one short in-character statement. The Police can spend up to
  2 interrogations, each revealing a noisy 0-100 suspicion read (never the literal answer).
- The Police accuses one suspect. Correct: vault recovered, reward, rank up. Wrong: the accused
  sues and is paid damages from the Police's staked bond, and the thief escapes; rank down.
- Track player balance, an ELO rank, and win record across rounds.

0G INTEGRATION (do this with the 0G stack, not a normal server)
- Role assignment and all AI suspect reasoning run on 0G Compute (Sealed Inference / TEE) so
  nobody can see or fake who the thief is. Show the TEE attestation at the reveal.
- The vault, the Police bond, lawsuit damages, rewards, and ELO settle on 0G Chain via a
  Solidity escrow contract.
- Each finished case is saved to 0G Storage as a verifiable replay, and agents keep a private
  memory of the player across games.

FEEL
- Theme: a precinct case file inside a dim interrogation room. Dark room, aged-paper dossier
  cards. The signature moment is a wax "Sealed" stamp on each suspect that breaks open into a
  TEE attestation at the reveal. Short, punchy, crypto-native voice.
- Mobile responsive, keyboard accessible, respect reduced motion.

Start with a single playable round, then add wallet connect, the escrow contract, and Storage
replays one layer at a time.
```

**Iteration follow-ups (one at a time):**
- "Add wallet connect and deploy the escrow contract to 0G testnet."
- "Replace the placeholder roles with real sealed assignment on 0G Compute, and show the attestation."
- "Make each suspect's statement a live 0G Compute call based on their hidden role."
- "Save each finished case to 0G Storage and add a shareable verifiable replay link."
- "Add the courtroom mini-screen on a wrong arrest, where the Lawyer profession boosts damages."
- "Add the ELO ladder and unlock Undercover Cop at 1200."

---

## 5. Architecture

```
                        +-------------------------------------+
   Browser (you)        |            Game client              |
   --------------       |  case UI · suspicion meters · court |
                        +---------------+---------------------+
                                        |
            +---------------------------+---------------------------+
            v                           v                           v
   +-----------------+        +------------------+        +------------------+
   |  0G COMPUTE      |        |   0G CHAIN        |        |   0G STORAGE      |
   |  (Sealed Infer.) |        |   (EVM escrow)    |        |   (persistence)   |
   +-----------------+        +------------------+        +------------------+
   | seal roles       |        | vault pool        |        | case replays      |
   | agent dialogue   |        | police bond       |        | agent memory      |
   | lies / bluffs    |        | lawsuit damages   |        | leaderboard proof |
   | suspicion read   |        | reward payout     |        |                   |
   | TEE attestation  |        | on-chain ELO      |        |                   |
   +-----------------+        +------------------+        +------------------+
```

**Trust flow:** role assignment happens inside the TEE, the assignment is sealed and signed by the enclave key, at reveal the attestation proves nobody could peek or rig it, and the result settles on-chain where anyone can audit the payout.

---

## 6. Design system

This is written to be implemented and then refined. Keep the named tokens and the signature element; improve spacing, polish, and motion freely.

### Concept
A precinct case file in a dim interrogation room. The contrast is the idea: a dark room (the chain, the unknown) against warm aged-paper dossiers (the human suspects on the desk). We deliberately avoid the default crypto look of acid green on black. The single signature element is the wax "Sealed" stamp that breaks into a TEE attestation at the reveal, which ties the visuals directly to 0G's Sealed Inference.

### Color tokens
```
--ink        #14161B   room background (deep blue-charcoal, not pure black)
--ink-2      #1B1F27   raised panels
--ink-3      #232936   panel highlights
--paper      #E9E1CF   dossier card surface (warm)
--paper-2    #E0D7C0   dossier gradient base
--paper-edge #CCBF9F   card border
--steel      #4C7DB2   POLICE accent (cold blue)
--ember      #C8702F   LOOT / alert accent (warm)
--stamp      #B0382F   SEALED / redacted stamp (red)
--gold       #C9A227   VERIFIED attestation accent
--ok         #6E9A63   cleared / win (muted green)
--txt        #EDE7D8   primary text on dark
--dim        #8B919E   secondary text
```
Rule: cold blue is always the Police and the player's side. Warm ember is always money and danger. Red is only ever "sealed or accused". Gold is only ever "verified by the TEE". Color carries meaning, it is not decoration.

### Typography
```
Display / stamps   Special Elite     typewriter; case headers, the SEALED/VERIFIED marks. Use sparingly.
UI / body          IBM Plex Sans     buttons, names, prose
Data / proof       IBM Plex Mono     balances, ELO, hashes, attestations
```
The pairing is the point: a typewriter says "case file", the mono says "cryptographic data". Those are the two halves of the game.

### Components
- **Suspect dossier card.** Paper surface, inner hairline border, a mug glyph (initials), handle + profession, the statement in a quoted typewriter block, a suspicion meter, and two actions: Interrogate, Accuse. Carries a "Sealed · TEE" stamp during play.
- **Suspicion meter.** A bar that is flat and grey while "sealed" (unread), and fills with a green to ember to red gradient once interrogated. Shows a percent in mono.
- **Seal stamp (the signature).** Two states. Sealed: red stamp, slight rotation. Revealed: it is replaced by a large double-ruled stamp that slams in (THIEF in red, CLEAR in green), followed by the mono attestation string under the card.
- **Verdict modal.** Title, subtitle, a mono "ledger" of the payout math (positive in green, negative in ember), then the verifiable replay id and a one-line note that the result was sealed and settled on-chain.
- **Action button system.** Primary is steel (Police actions). Ghost is outline only. Never apologize in copy, state what happens.
- **Courtroom screen (v2).** Triggered on a wrong arrest. The accused presents clues, the Lawyer profession boosts damages, the verdict animates before settling.

### Motion
Card deal-in on a new case (staggered). Seal-slam on reveal (staggered per card). Meter fill on interrogate. All of it must be disabled under `prefers-reduced-motion`. One orchestrated reveal beats scattered effects.

### Voice and copy
Investigative, terse, crypto-native. Statements under 25 words. Errors explain what happened and how to fix it, in the game's voice, never an apology. Examples of suspect lines:
- Innocent: "I was reconciling the multisig logs when the vault drained. Timestamps clear me."
- Thief: "Why are you looking at me? I'm the one who reported the drain."
- Baiter: "Arrest me. I dare you. My lawyer's already on retainer."

### Accessibility floor
Visible keyboard focus, contrast that passes on both the dark room and the paper cards, full layout down to a phone width, reduced motion respected.

---

## 7. 0G integration (verified specs)

### Endpoints and packages (testnet)
```
RPC_URL          = https://evmrpc-testnet.0g.ai
STORAGE_INDEXER  = https://indexer-storage-testnet-turbo.0g.ai
COMPUTE (router) = https://router-api.0g.ai/v1   (OpenAI-compatible; Private Computer at pc.0g.ai)
Faucet           = faucet.0g.ai      Docs = docs.0g.ai      Studio = app.0g.ai
Packages         = @0glabs/0g-ts-sdk  @0glabs/0g-serving-broker  ethers(v6)  dotenv
Models           = DeepSeek Chat V3, Qwen3.6-Plus, GLM-5-FP8, Qwen3-VL-30B, Whisper-large-v3
Accelerator      = git clone https://github.com/0gfoundation/0g-agent-skills .0g-skills
```

### Non-negotiable rules (from the 0g-agent-skills repo, saves hours of debugging)
1. Call `processResponse()` after every Compute inference. Param order: `(providerAddress, chatID, usageData)`.
2. Read `ChatID` from the `ZG-Res-Key` response header first, body as fallback.
3. Use ethers v6, never v5.
4. Contracts compile with `evmVersion: "cancun"`.
5. Close `ZgFile` handles with `file.close()` in a `finally` block.
6. Never hardcode keys, use `.env`.

### What each layer does
- **Compute / Sealed Inference:** seals role assignment, runs each suspect's dialogue and bluffing, returns the noisy suspicion reads, and provides the attestation shown at reveal.
- **Chain:** vault escrow, Police bond, lawsuit damages, reward payout, on-chain ELO and leaderboard. A `Vault.sol` starting sketch is in the build guide.
- **Storage:** verifiable case replays and per-player agent memory that feeds future dialogue.

Honest scope for v1: keep attestation verification and payout authorization in a trusted off-chain resolver, then decentralize in v2. Document this for judges. They prefer honest scope over fake decentralization.

---

## 8. Build plan mapped to the bracket

The competition's real edge is iterating between rounds. Plan features against the actual dates.

| Window | Round | Ship this |
|---|---|---|
| now to **Jun 23** | Group stage | Playable core loop. Real 0G Compute role sealing + attestation if possible, otherwise the polished demo with the escrow contract live on testnet. In-app "how this uses 0G" panel. Pitch + demo video. |
| Jun 24 to **Jun 27** | Top 32 cut | Harden, fix the most-noticed rough edges, deepen one 0G layer (live agent dialogue on Compute). |
| Jun 28 to **Jul 3** | Top 16 | 0G Storage replays + shareable replay links. Leaderboard reading from chain. |
| Jul 4 to **Jul 7** | Top 8 (last judge round) | Agent memory of the player. ELO ladder + Undercover Cop unlock. Strongest "real 0G usage" story for judges. |
| Jul 8 to **Jul 19** | QF to Final (community vote) | Promotion mode. Short clips of the bait moment, GIFs, X threads tagging @0G_labs, Discord/Telegram pushes. Keep shipping visible polish during voting. |

The single most shareable asset to record: arresting the Baiter, eating the lawsuit, watching the thief walk. That ten seconds sells the whole concept.

---

## 9. For the AI or skills improving this

**Preserve:**
- The bait + bond economy. It is the unique mechanic and the reason the game is more than a clone.
- 0G as load-bearing. Roles must be sealed in the TEE and the attestation must be visible. Do not "simplify" this into a normal backend, it removes the entire reason the project exists.
- The signature seal-to-attestation reveal and the color meanings in section 6.

**Free to improve:**
- Spacing, polish, micro-interactions, sound, onboarding, mobile layout.
- The exact suspicion-read model, the dialogue prompts, the difficulty curve.
- Adding roles, professions, and abilities, as long as they are gated by ELO so complexity grows with skill.

**Quality floor before any submission:** loads fast, playable on a phone, keyboard focus visible, reduced motion respected, no dead ends, and a one-screen explanation of how it uses 0G.