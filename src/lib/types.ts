/* Core domain types for WHO RUGGED?.
   The shape mirrors docs/BUILD_GUIDE.md section 2 (Case data model) so the
   real 0G engine can return the same structures the mock does. */

/** Hidden role. In production this never leaves the TEE until reveal. */
export type RoleType = 'innocent' | 'thief' | 'baiter'

export interface Suspect {
  id: string
  handle: string
  profession: string
  /** In-character line for the round. From 0G Compute agentSpeak() in production. */
  statement: string
  /** Per-suspect TEE attestation string, shown when the seal breaks. */
  attestation: string
  /** Noisy suspicion read 0..100, or null while sealed. Never the literal role. */
  read: number | null
  /** Short non-revealing tell shown next to a read, e.g. "elevated deflection". */
  tell: string | null

  /* --- sealed until reveal ---
     These live here for the local mock only. The real engine keeps the
     role to agent mapping inside the enclave and exposes it solely through
     reveal(), after the accusation is locked. Never render these pre-reveal. */
  role: RoleType
  isThief: boolean
}

export type CaseStatus = 'sealing' | 'open' | 'resolved'

export interface GameCase {
  caseId: number
  /** Total pool of $GG in escrow. */
  pool: number
  /** Amount drained from the vault. */
  stolen: number
  /** Police bond at risk on this case. */
  bond: number
  suspects: Suspect[]
  probesAllowed: number
  probesUsed: number
  status: CaseStatus
  accusedId: string | null
}

export interface LedgerRow {
  label: string
  amount: string
  sign: 'pos' | 'neg'
}

export interface RevealEntry {
  suspectId: string
  isThief: boolean
  attestation: string
}

export interface Verdict {
  kind: 'win' | 'lose'
  title: string
  subtitle: string
  rows: LedgerRow[]
  /** Net balance change in $GG. */
  delta: number
  eloDelta: number
  /** 0G Storage replay id / root hash. */
  replayCid: string
  reveal: RevealEntry[]
  /** Who got arrested, for the reveal and the courtroom screen. */
  accusedHandle: string
  accusedProfession: string
  /** True when the accused was a Lawyer and the lawsuit damages were boosted. */
  lawyerBoosted: boolean
  /** In-character defense line shown in the courtroom on a wrong bust. */
  defense: string
  /** Total damages the accused collects on a wrong bust, 0 on a win. */
  damages: number
}

export interface PlayerProfile {
  balance: number
  elo: number
  played: number
  wins: number
  caseNo: number
}

/** A resolved case, kept locally for the stats screen. In production this is
 *  what gets written to 0G Storage as a verifiable replay. */
export interface HistoryEntry {
  caseNo: number
  kind: 'win' | 'lose'
  title: string
  delta: number
  eloAfter: number
  replayCid: string
  /** ms epoch, stamped by the caller (engine stays time-free). */
  at: number
}

export interface ProbeResult {
  suspectId: string
  read: number
  tell: string
  attestation: string
}

/** The seam every 0G layer plugs into.
 *  Mock today (src/game/mockEngine.ts), real 0G Compute/Chain/Storage later. */
export interface GameEngine {
  /** openCase on Vault.sol + sealRoles() + agentSpeak() in production. */
  openCase(caseNo: number): Promise<GameCase>
  /** A single privacy-preserving suspicion read via 0G Compute. */
  probe(gameCase: GameCase, suspectId: string): Promise<ProbeResult>
  /** verifyReveal() + Vault.resolve() + saveReplay() in production. */
  resolve(gameCase: GameCase, accusedId: string, player: PlayerProfile): Promise<Verdict>
}
