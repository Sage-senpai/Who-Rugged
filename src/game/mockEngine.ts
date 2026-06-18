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
  LedgerRow,
  PlayerProfile,
  ProbeResult,
  RoleType,
  Suspect,
  Verdict,
} from '../lib/types'
import { PROFESSIONS, HANDLES, STATEMENTS, TELLS, DEFENSE, LAWYER_DEFENSE } from './data'
import { DIFFICULTY } from './difficulty'
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
    const replayCid = '0x' + hex(56)

    const isLawyer = accused.profession === 'Lawyer'
    let kind: Verdict['kind']
    let title: string
    let subtitle: string
    let rows: LedgerRow[]
    let delta: number
    let eloDelta: number
    let damages = 0
    let lawyerBoosted = false
    let defense = ''

    if (accused.isThief) {
      const bounty = 100 + Math.floor(Math.random() * 5) * 20
      delta = gameCase.stolen + bounty
      eloDelta = 22 + Math.floor(Math.random() * 8)
      kind = 'win'
      title = 'Conviction Secured'
      subtitle = 'Thief identified, vault recovered'
      rows = [
        { label: 'Vault recovered', amount: `+${gameCase.stolen} $GG`, sign: 'pos' },
        { label: 'State bounty', amount: `+${bounty} $GG`, sign: 'pos' },
        { label: 'Net', amount: `+${delta} $GG`, sign: 'pos' },
      ]
    } else if (accused.role === 'baiter') {
      let suit = 120 + Math.floor(Math.random() * 5) * 20
      if (isLawyer) {
        suit = Math.round(suit * 1.3)
        lawyerBoosted = true
      }
      damages = gameCase.bond + suit
      delta = -damages
      eloDelta = -(28 + Math.floor(Math.random() * 8))
      kind = 'lose'
      title = 'You Got Baited'
      subtitle = isLawyer
        ? 'Wrongful bust, and the baiter was a Lawyer'
        : 'Wrongful bust, the bait worked'
      rows = [
        { label: 'Bond forfeited', amount: `-${gameCase.bond} $GG`, sign: 'neg' },
        { label: lawyerBoosted ? 'Lawsuit damages (boosted)' : 'Lawsuit damages', amount: `-${suit} $GG`, sign: 'neg' },
        { label: 'Thief escaped with', amount: `-${gameCase.stolen} $GG`, sign: 'neg' },
        { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
      ]
      defense = isLawyer ? pick(LAWYER_DEFENSE) : pick(DEFENSE)
    } else {
      const suit = isLawyer ? Math.round(gameCase.bond * 0.5) : 0
      lawyerBoosted = isLawyer
      damages = gameCase.bond + suit
      delta = -damages
      eloDelta = -(18 + Math.floor(Math.random() * 6))
      kind = 'lose'
      title = 'Wrongful Bust'
      subtitle = isLawyer
        ? 'Innocent suspect, and they lawyered up'
        : 'Innocent suspect, the thief is still loose'
      rows = isLawyer
        ? [
            { label: 'Bond forfeited', amount: `-${gameCase.bond} $GG`, sign: 'neg' },
            { label: 'Lawsuit damages (boosted)', amount: `-${suit} $GG`, sign: 'neg' },
            { label: 'Thief escaped with', amount: `-${gameCase.stolen} $GG`, sign: 'neg' },
            { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
          ]
        : [
            { label: 'Bond forfeited', amount: `-${gameCase.bond} $GG`, sign: 'neg' },
            { label: 'Thief escaped with', amount: `-${gameCase.stolen} $GG`, sign: 'neg' },
            { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
          ]
      defense = isLawyer ? pick(LAWYER_DEFENSE) : pick(DEFENSE)
    }

    void player // reserved for memory-aware scoring once 0G Storage is wired
    return {
      kind,
      title,
      subtitle,
      rows,
      delta,
      eloDelta,
      replayCid,
      reveal,
      accusedHandle: accused.handle,
      accusedProfession: accused.profession,
      lawyerBoosted,
      defense,
      damages,
    }
  },
}
