/* Local mock of the GameEngine seam.
   This is Layer 1: the full loop runs client side so the game is playable and
   verifiable now. Each method is annotated with the 0G call that replaces it.
   The async signatures and tiny delays mirror real network latency so the
   "sealing" and reveal states are real states, not cosmetic.

   Privacy is a mechanic: the suspicion read and tell are derived from a noisy
   score, never from the true role, exactly as probe.ts must behave on Compute. */
import type {
  Difficulty,
  GameCase,
  GameEngine,
  PlayerProfile,
  ProbeResult,
  RoleType,
  Suspect,
  Verdict,
} from '../lib/types'
import { PROFESSIONS, HANDLES, STATEMENTS, TELLS } from './data'
import { DIFFICULTY } from './difficulty'
import { buildVerdict, buildTimeoutVerdict } from './verdict'
import { attestation, clamp, delay, hex, pick, shuffle } from '../lib/rng'

/** Base suspicion centre per role for the given difficulty. Thief and baiter
 *  both read hot, which is the whole point: a high meter is not proof. */
function baseTell(role: RoleType, difficulty: Difficulty): number {
  const cfg = DIFFICULTY[difficulty]
  if (role === 'thief') return cfg.thief
  if (role === 'baiter') return cfg.baiter
  return cfg.innocent
}

function tellNote(read: number): string {
  if (read >= 60) return pick(TELLS.high)
  if (read >= 38) return pick(TELLS.mid)
  return pick(TELLS.low)
}

export const mockEngine: GameEngine = {
  async openCase(caseNo: number, difficulty: Difficulty): Promise<GameCase> {
    // 0G: Vault.openCase(id, stolen) + sealRoles(caseId, agentIds) + agentSpeak()
    await delay(420) // stands in for sealing roles inside the TEE

    const cfg = DIFFICULTY[difficulty]
    const pool = 900 + Math.floor(Math.random() * 5) * 50
    const stolen = 250 + Math.floor(Math.random() * 5) * 50
    const bond = Math.round((150 + Math.floor(Math.random() * 3) * 50) * cfg.bondMul)

    const jobs = shuffle(PROFESSIONS).slice(0, 5)
    const handles = shuffle(HANDLES).slice(0, 5)

    const thiefIdx = Math.floor(Math.random() * 5)
    let baiterIdx: number
    do {
      baiterIdx = Math.floor(Math.random() * 5)
    } while (baiterIdx === thiefIdx)

    const suspects: Suspect[] = jobs.map((profession, i) => {
      const role: RoleType = i === thiefIdx ? 'thief' : i === baiterIdx ? 'baiter' : 'innocent'
      return {
        id: `s${caseNo}_${i}`,
        handle: handles[i],
        profession,
        statement: pick(STATEMENTS[role]),
        attestation: attestation(),
        read: null,
        tell: null,
        mood: null,
        role,
        isThief: i === thiefIdx,
      }
    })

    return {
      caseId: caseNo,
      pool,
      stolen,
      bond,
      suspects,
      probesAllowed: cfg.probes,
      probesUsed: 0,
      status: 'open',
      accusedId: null,
      difficulty,
    }
  },

  async probe(gameCase: GameCase, suspectId: string): Promise<ProbeResult> {
    // 0G: probe.ts -> one Compute call returning a NOISY 0..100 score + TEE receipt
    await delay(320)

    const suspect = gameCase.suspects.find((s) => s.id === suspectId)
    if (!suspect) throw new Error('Unknown suspect')

    const noise = DIFFICULTY[gameCase.difficulty].noise
    const noisy = baseTell(suspect.role, gameCase.difficulty) + (Math.random() * 2 - 1) * noise
    const read = clamp(Math.round(noisy), 5, 95)

    return {
      suspectId,
      read,
      tell: tellNote(read),
      attestation: attestation(),
    }
  },

  async resolve(gameCase: GameCase, accusedId: string, player: PlayerProfile): Promise<Verdict> {
    // 0G: verifyReveal(caseId) -> Vault.resolve(id, correct, accused, damages) -> saveReplay(case)
    await delay(260)

    const accused = gameCase.suspects.find((s) => s.id === accusedId)
    if (!accused) throw new Error('Unknown suspect')

    const reveal = gameCase.suspects.map((s) => ({
      suspectId: s.id,
      isThief: s.isThief,
      attestation: s.attestation,
    }))

    void player // reserved for memory-aware scoring once 0G Storage is wired
    return {
      ...buildVerdict(gameCase.stolen, gameCase.bond, accused),
      reveal,
      replayCid: '0x' + hex(56),
    }
  },

  async resolveTimeout(gameCase: GameCase, player: PlayerProfile): Promise<Verdict> {
    // 0G: Vault.resolve(id, correct=false, accused=0x0, damages=0) -> bond forfeited
    await delay(200)
    void player
    const reveal = gameCase.suspects.map((s) => ({
      suspectId: s.id,
      isThief: s.isThief,
      attestation: s.attestation,
    }))
    return {
      ...buildTimeoutVerdict(gameCase.stolen, gameCase.bond),
      reveal,
      replayCid: '0x' + hex(56),
    }
  },
}
