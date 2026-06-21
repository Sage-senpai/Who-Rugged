/* Local mock of the Crowdfunding Courtroom engine. The whole loop runs client
   side so the mode is playable now; each method is annotated with the 0G call
   that replaces it. AI seats are simulated here and become real players (or
   real Compute agents) behind the same interface later. */
import type { Difficulty, RoleType, Verdict } from '../lib/types'
import type { CourtCase, CourtEngine, CourtParticipant, RoundSpeech, TallyResult, Vote } from './types'
import { PROFESSIONS, HANDLES, STATEMENTS, TELLS, DEFENSE, LAWYER_DEFENSE } from '../game/data'
import { DIFFICULTY } from '../game/difficulty'
import { attestation, clamp, delay, hex, pick, shuffle } from '../lib/rng'

const SEATS = 5
const YOU = 'you'

// chance an innocent points at / votes the real thief; higher = easier
const SIGNAL: Record<Difficulty, number> = { rookie: 0.7, detective: 0.5, hardboiled: 0.32 }

function readCentre(role: RoleType, d: Difficulty): number {
  const cfg = DIFFICULTY[d]
  if (role === 'thief') return cfg.thief
  if (role === 'baiter') return cfg.baiter
  return cfg.innocent
}

function tellNote(read: number): string {
  if (read >= 60) return pick(TELLS.high)
  if (read >= 38) return pick(TELLS.mid)
  return pick(TELLS.low)
}

const others = (c: CourtCase, selfId: string) => c.participants.filter((p) => p.id !== selfId)
const innocentsOf = (c: CourtCase, selfId: string) =>
  c.participants.filter((p) => p.id !== selfId && p.role === 'innocent')
const thiefOf = (c: CourtCase) => c.participants.find((p) => p.isThief)

/** Who does this participant point a finger at, given their role? */
function accusationTarget(c: CourtCase, p: CourtParticipant): string | null {
  const sig = SIGNAL[c.difficulty]
  if (p.role === 'thief') {
    const inn = innocentsOf(c, p.id)
    return (inn.length ? pick(inn) : pick(others(c, p.id))).id // frame an innocent
  }
  if (p.role === 'baiter') {
    return pick(others(c, p.id)).id // chaos
  }
  // innocent: leak signal toward the thief, else noise
  const thief = thiefOf(c)
  if (thief && thief.id !== p.id && Math.random() < sig) return thief.id
  return pick(others(c, p.id)).id
}

export const courtEngine: CourtEngine = {
  async openCase(caseNo: number, difficulty: Difficulty): Promise<CourtCase> {
    // 0G: open a crowdfunded pool on Chain + sealRoles in the TEE
    await delay(420)

    const jobs = shuffle(PROFESSIONS).slice(0, SEATS)
    const handles = shuffle(HANDLES).slice(0, SEATS)
    const thiefIdx = Math.floor(Math.random() * SEATS)
    let baiterIdx: number
    do {
      baiterIdx = Math.floor(Math.random() * SEATS)
    } while (baiterIdx === thiefIdx)

    const participants: CourtParticipant[] = jobs.map((profession, i) => {
      const role: RoleType = i === thiefIdx ? 'thief' : i === baiterIdx ? 'baiter' : 'innocent'
      return {
        id: `c${caseNo}_${i}`,
        handle: handles[i],
        profession,
        attestation: attestation(),
        statement: '',
        accusesId: null,
        read: null,
        tell: null,
        mood: null,
        role,
        isThief: i === thiefIdx,
      }
    })

    // crowdfund: 6 backers (5 seats + you) pledge into the pot
    const pledge = () => (2 + Math.floor(Math.random() * 5)) * 50 // 100..300
    const yourStake = pledge()
    const pot = yourStake + participants.reduce((s) => s + pledge(), 0)

    return { caseId: caseNo, participants, pot, yourStake, rounds: 2, difficulty }
  },

  async speakRound(c: CourtCase, round: number): Promise<RoundSpeech[]> {
    // 0G: one Compute call per agent, conditioned on sealed role + memory
    await delay(300)
    void round
    return c.participants.map((p) => ({
      id: p.id,
      statement: pick(STATEMENTS[p.role]),
      accusesId: accusationTarget(c, p),
    }))
  },

  async press(c, id) {
    // 0G: probe.ts noisy suspicion read + TEE receipt
    await delay(300)
    const p = c.participants.find((x) => x.id === id)
    if (!p) throw new Error('Unknown participant')
    const noise = DIFFICULTY[c.difficulty].noise
    const read = clamp(Math.round(readCentre(p.role, c.difficulty) + (Math.random() * 2 - 1) * noise), 5, 95)
    return { id, read, tell: tellNote(read), attestation: attestation() }
  },

  async tally(c: CourtCase, humanVote: string | null): Promise<TallyResult> {
    // 0G: each agent's vote is a Compute call; the human's is on-chain
    await delay(260)
    const sig = SIGNAL[c.difficulty]
    const thief = thiefOf(c)

    const votes: Vote[] = c.participants.map((p) => {
      let targetId: string
      if (p.role === 'thief') {
        const inn = innocentsOf(c, p.id)
        targetId = (inn.length ? pick(inn) : pick(others(c, p.id))).id
      } else if (p.role === 'baiter') {
        targetId = pick(others(c, p.id)).id
      } else if (thief && thief.id !== p.id && Math.random() < sig) {
        targetId = thief.id
      } else {
        targetId = pick(others(c, p.id)).id
      }
      return { voterId: p.id, targetId }
    })
    votes.push({ voterId: YOU, targetId: humanVote })

    const counts: Record<string, number> = {}
    for (const v of votes) if (v.targetId) counts[v.targetId] = (counts[v.targetId] ?? 0) + 1

    let top: string | null = null
    let max = 0
    let tie = false
    for (const [id, n] of Object.entries(counts)) {
      if (n > max) {
        max = n
        top = id
        tie = false
      } else if (n === max) {
        tie = true
      }
    }

    const convictedId = !top || tie ? null : top
    return { tally: counts, votes, convictedId, skipped: convictedId === null }
  },

  async resolve(c: CourtCase, convictedId: string | null, humanVote: string | null): Promise<Verdict> {
    // 0G: verifyReveal + settle the pool on Chain + saveReplay to Storage
    await delay(240)
    void humanVote
    const reveal = c.participants.map((p) => ({ suspectId: p.id, isThief: p.isThief, attestation: p.attestation }))
    const replayCid = '0x' + hex(56)

    if (!convictedId) {
      return {
        kind: 'lose',
        title: 'No Conviction',
        subtitle: 'The room split, the thief walked with the pot',
        rows: [
          { label: 'Your pledge lost', amount: `-${c.yourStake} $GG`, sign: 'neg' },
          { label: 'Pot drained', amount: `-${c.pot} $GG`, sign: 'neg' },
          { label: 'Net', amount: `-${c.yourStake} $GG`, sign: 'neg' },
        ],
        delta: -c.yourStake,
        eloDelta: -(12 + Math.floor(Math.random() * 6)),
        replayCid,
        reveal,
        accusedHandle: '',
        accusedProfession: '',
        lawyerBoosted: false,
        defense: '',
        damages: 0,
      }
    }

    const convicted = c.participants.find((p) => p.id === convictedId)!
    const isLawyer = convicted.profession === 'Lawyer'

    if (convicted.isThief) {
      const reward = 120 + Math.floor(Math.random() * 6) * 20
      return {
        kind: 'win',
        title: 'Pot Recovered',
        subtitle: 'The room convicted the thief, the crowdfund is whole',
        rows: [
          { label: 'Vault recovered', amount: `+${c.pot} $GG`, sign: 'pos' },
          { label: 'Backer reward', amount: `+${reward} $GG`, sign: 'pos' },
          { label: 'Net', amount: `+${reward} $GG`, sign: 'pos' },
        ],
        delta: reward,
        eloDelta: 20 + Math.floor(Math.random() * 8),
        replayCid,
        reveal,
        accusedHandle: convicted.handle,
        accusedProfession: convicted.profession,
        lawyerBoosted: false,
        defense: '',
        damages: 0,
      }
    }

    // wrong conviction: the innocent sues the crowdfund
    let suit = 100 + Math.floor(Math.random() * 5) * 20
    if (isLawyer) suit = Math.round(suit * 1.3)
    const damages = c.yourStake + suit
    const baited = convicted.role === 'baiter'
    return {
      kind: 'lose',
      title: baited ? 'The Room Got Baited' : 'Wrongful Conviction',
      subtitle: isLawyer
        ? 'You convicted a Lawyer, the suit drained the pot'
        : baited
          ? 'The bait worked, the thief is still out there'
          : 'An innocent took the fall, the thief escaped',
      rows: [
        { label: 'Your pledge lost', amount: `-${c.yourStake} $GG`, sign: 'neg' },
        { label: isLawyer ? 'Lawsuit damages (boosted)' : 'Lawsuit damages', amount: `-${suit} $GG`, sign: 'neg' },
        { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
      ],
      delta: -damages,
      eloDelta: -(20 + Math.floor(Math.random() * 8)),
      replayCid,
      reveal,
      accusedHandle: convicted.handle,
      accusedProfession: convicted.profession,
      lawyerBoosted: isLawyer,
      defense: isLawyer ? pick(LAWYER_DEFENSE) : pick(DEFENSE),
      damages,
    }
  },
}
