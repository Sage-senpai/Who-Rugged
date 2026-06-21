/* Types for the Crowdfunding Courtroom mode: a table where everyone suspects
   everyone, the room votes, and the top-voted goes on trial. Single-player vs
   AI for now (AI backfills every seat); the same shapes drive real multiplayer
   later. Reuses the shared domain types where they fit. */
import type { Difficulty, LedgerRow, Mood, RoleType, Verdict } from '../lib/types'

export interface CourtParticipant {
  id: string
  handle: string
  profession: string
  attestation: string

  /* regenerated each discussion round */
  statement: string
  accusesId: string | null // who this participant points at this round

  /* set when the human presses them */
  read: number | null
  tell: string | null
  mood: Mood | null

  /* sealed until reveal (local-only in the mock, TEE-held in production) */
  role: RoleType
  isThief: boolean
}

export interface CourtCase {
  caseId: number
  participants: CourtParticipant[]
  /** Crowdfunded pot: everyone pledged, the thief drained it. */
  pot: number
  /** The human backer's own pledge at risk. */
  yourStake: number
  rounds: number
  difficulty: Difficulty
}

export interface Vote {
  voterId: string // participant id or 'you'
  targetId: string | null // null = abstain / skip
}

export interface TallyResult {
  /** votes counted per participant id */
  tally: Record<string, number>
  votes: Vote[]
  /** the convicted id, or null when the room could not agree (no conviction) */
  convictedId: string | null
  skipped: boolean
}

export interface RoundSpeech {
  id: string
  statement: string
  accusesId: string | null
}

export interface CourtEngine {
  openCase(caseNo: number, difficulty: Difficulty): Promise<CourtCase>
  /** Fresh statements + accusations for a discussion round. 0G Compute later. */
  speakRound(c: CourtCase, round: number): Promise<RoundSpeech[]>
  /** Privacy-preserving suspicion read on one participant. */
  press(c: CourtCase, id: string): Promise<{ id: string; read: number; tell: string; attestation: string }>
  /** The room votes (AI seats + the human's vote). */
  tally(c: CourtCase, humanVote: string | null): Promise<TallyResult>
  /** Settle the pot against the conviction (or non-conviction). */
  resolve(c: CourtCase, convictedId: string | null, humanVote: string | null): Promise<Verdict>
}

export type { LedgerRow }
