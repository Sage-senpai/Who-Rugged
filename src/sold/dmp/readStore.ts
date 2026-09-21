/* Persists each player's Read (their probability plus what the model and pools
   said at the time) once the bet lands. The server engine only stores side and
   stake, so this is the only record of the probability itself. It is what a
   resolution screen and Brier scoring will read from. Client-side only for now:
   clearing site data loses it. */
import type { ReadDraft } from './dmp'

const KEY = 'who-rugged:reads:v1'
const MAX = 300

export interface StoredRead extends ReadDraft {
  arenaId: string
  windowId: string
  wallet: string
  side: 'yes' | 'no'
  committedAt: number
}

export function getReads(): StoredRead[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredRead[]) : []
  } catch {
    return []
  }
}

export function saveRead(read: StoredRead): void {
  try {
    const rest = getReads().filter(
      (r) => !(r.arenaId === read.arenaId && r.windowId === read.windowId && r.wallet === read.wallet),
    )
    localStorage.setItem(KEY, JSON.stringify([read, ...rest].slice(0, MAX)))
  } catch {
    /* storage unavailable or full: the bet is already placed, losing the read is non-fatal */
  }
}
