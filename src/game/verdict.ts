/* Shared verdict math. Both the local mock and the 0G compute engine call this
   so the ledger, rank change, and courtroom defense are identical no matter who
   sealed the roles. The caller adds `reveal` and `replayCid`. */
import type { LedgerRow, RoleType, Verdict } from '../lib/types'
import { DEFENSE, LAWYER_DEFENSE } from './data'
import { pick } from '../lib/rng'

export type VerdictCore = Omit<Verdict, 'reveal' | 'replayCid'>

interface AccusedInfo {
  isThief: boolean
  role: RoleType
  profession: string
  handle: string
}

export function buildVerdict(stolen: number, bond: number, accused: AccusedInfo): VerdictCore {
  const isLawyer = accused.profession === 'Lawyer'

  if (accused.isThief) {
    const bounty = 100 + Math.floor(Math.random() * 5) * 20
    const delta = stolen + bounty
    return {
      kind: 'win',
      title: 'Conviction Secured',
      subtitle: 'Thief identified, vault recovered',
      rows: [
        { label: 'Vault recovered', amount: `+${stolen} $GG`, sign: 'pos' },
        { label: 'State bounty', amount: `+${bounty} $GG`, sign: 'pos' },
        { label: 'Net', amount: `+${delta} $GG`, sign: 'pos' },
      ],
      delta,
      eloDelta: 22 + Math.floor(Math.random() * 8),
      accusedHandle: accused.handle,
      accusedProfession: accused.profession,
      lawyerBoosted: false,
      defense: '',
      damages: 0,
    }
  }

  if (accused.role === 'baiter') {
    let suit = 120 + Math.floor(Math.random() * 5) * 20
    let lawyerBoosted = false
    if (isLawyer) {
      suit = Math.round(suit * 1.3)
      lawyerBoosted = true
    }
    const damages = bond + suit
    const rows: LedgerRow[] = [
      { label: 'Bond forfeited', amount: `-${bond} $GG`, sign: 'neg' },
      { label: lawyerBoosted ? 'Lawsuit damages (boosted)' : 'Lawsuit damages', amount: `-${suit} $GG`, sign: 'neg' },
      { label: 'Thief escaped with', amount: `-${stolen} $GG`, sign: 'neg' },
      { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
    ]
    return {
      kind: 'lose',
      title: 'You Got Baited',
      subtitle: isLawyer ? 'Wrongful bust, and the baiter was a Lawyer' : 'Wrongful bust, the bait worked',
      rows,
      delta: -damages,
      eloDelta: -(28 + Math.floor(Math.random() * 8)),
      accusedHandle: accused.handle,
      accusedProfession: accused.profession,
      lawyerBoosted,
      defense: isLawyer ? pick(LAWYER_DEFENSE) : pick(DEFENSE),
      damages,
    }
  }

  // plain innocent
  const suit = isLawyer ? Math.round(bond * 0.5) : 0
  const damages = bond + suit
  const rows: LedgerRow[] = isLawyer
    ? [
        { label: 'Bond forfeited', amount: `-${bond} $GG`, sign: 'neg' },
        { label: 'Lawsuit damages (boosted)', amount: `-${suit} $GG`, sign: 'neg' },
        { label: 'Thief escaped with', amount: `-${stolen} $GG`, sign: 'neg' },
        { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
      ]
    : [
        { label: 'Bond forfeited', amount: `-${bond} $GG`, sign: 'neg' },
        { label: 'Thief escaped with', amount: `-${stolen} $GG`, sign: 'neg' },
        { label: 'Net', amount: `-${damages} $GG`, sign: 'neg' },
      ]
  return {
    kind: 'lose',
    title: 'Wrongful Bust',
    subtitle: isLawyer ? 'Innocent suspect, and they lawyered up' : 'Innocent suspect, the thief is still loose',
    rows,
    delta: -damages,
    eloDelta: -(18 + Math.floor(Math.random() * 6)),
    accusedHandle: accused.handle,
    accusedProfession: accused.profession,
    lawyerBoosted: isLawyer,
    defense: isLawyer ? pick(LAWYER_DEFENSE) : pick(DEFENSE),
    damages,
  }
}

export function buildTimeoutVerdict(stolen: number, bond: number): VerdictCore {
  return {
    kind: 'lose',
    title: "Time's Up",
    subtitle: 'You ran out the clock, the thief slipped away',
    rows: [
      { label: 'Bond forfeited', amount: `-${bond} $GG`, sign: 'neg' },
      { label: 'Thief escaped with', amount: `-${stolen} $GG`, sign: 'neg' },
      { label: 'Net', amount: `-${bond} $GG`, sign: 'neg' },
    ],
    delta: -bond,
    eloDelta: -(15 + Math.floor(Math.random() * 6)),
    accusedHandle: '',
    accusedProfession: '',
    lawyerBoosted: false,
    defense: '',
    damages: 0,
  }
}
