/* Real engine: drives the solo case through the 0G Compute server (server/).
   Roles are sealed server-side and only revealed at resolve, so the client
   never holds the answer mid-game. Selected over the mock when VITE_COMPUTE_URL
   is set; otherwise the game runs fully local. */
import type { Difficulty, GameCase, GameEngine, PlayerProfile, ProbeResult, Suspect, Verdict } from '../lib/types'
import { buildVerdict, buildTimeoutVerdict } from './verdict'
import { hex } from '../lib/rng'

const BASE = (import.meta.env.VITE_COMPUTE_URL as string | undefined)?.replace(/\/$/, '')
export const computeConfigured = !!BASE

const caseKey = (caseNo: number) => `wr-${caseNo}`

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`compute ${res.status}`)
  return (await res.json()) as T
}

interface NewCaseResp {
  pool: number
  stolen: number
  bond: number
  probesAllowed: number
  difficulty: Difficulty
  sealAttestation: string
  suspects: { id: string; handle: string; profession: string; statement: string; attestation: string }[]
}
interface ProbeResp { read?: number; tell?: string; attestation?: string; error?: string }
interface ResolveResp {
  reveal: { suspectId: string; isThief: boolean; attestation: string }[]
  roles: { id: string; role: 'innocent' | 'thief' | 'baiter'; profession: string; handle: string; isThief: boolean }[]
  sealAttestation: string
}

export const computeEngine: GameEngine = {
  async openCase(caseNo: number, difficulty: Difficulty): Promise<GameCase> {
    const r = await post<NewCaseResp>('/case/new', { caseId: caseKey(caseNo), difficulty })
    const suspects: Suspect[] = r.suspects.map((s) => ({
      id: s.id,
      handle: s.handle,
      profession: s.profession,
      statement: s.statement,
      attestation: s.attestation,
      read: null,
      tell: null,
      mood: null,
      role: 'innocent', // sealed server-side; real value arrives at reveal
      isThief: false,
    }))
    return {
      caseId: caseNo,
      pool: r.pool,
      stolen: r.stolen,
      bond: r.bond,
      suspects,
      probesAllowed: r.probesAllowed,
      probesUsed: 0,
      status: 'open',
      accusedId: null,
      difficulty,
    }
  },

  async probe(gameCase: GameCase, suspectId: string): Promise<ProbeResult> {
    const r = await post<ProbeResp>('/case/probe', { caseId: caseKey(gameCase.caseId), suspectId })
    if (r.error || typeof r.read !== 'number') throw new Error(r.error ?? 'probe-failed')
    return { suspectId, read: r.read, tell: r.tell ?? '', attestation: r.attestation ?? '' }
  },

  async resolve(gameCase: GameCase, accusedId: string, player: PlayerProfile): Promise<Verdict> {
    void player
    const r = await post<ResolveResp>('/case/resolve', { caseId: caseKey(gameCase.caseId) })
    const role = r.roles.find((x) => x.id === accusedId)
    if (!role) throw new Error('unknown-accused')
    return {
      ...buildVerdict(gameCase.stolen, gameCase.bond, role),
      reveal: r.reveal,
      replayCid: '0x' + hex(56),
    }
  },

  async resolveTimeout(gameCase: GameCase, player: PlayerProfile): Promise<Verdict> {
    void player
    const r = await post<ResolveResp>('/case/resolve', { caseId: caseKey(gameCase.caseId) })
    return {
      ...buildTimeoutVerdict(gameCase.stolen, gameCase.bond),
      reveal: r.reveal,
      replayCid: '0x' + hex(56),
    }
  },
}
