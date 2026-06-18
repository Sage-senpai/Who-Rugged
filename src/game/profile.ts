/* Local persistence for the player profile and case history.
   Shared by the game loop (writes) and the stats screen (reads). This is the
   seam for 0G: the profile becomes on-chain rank/balance, the history becomes
   0G Storage replays. Until then it lives in localStorage. */
import type { HistoryEntry, PlayerProfile } from '../lib/types'

const PLAYER_KEY = 'who-rugged:player'
const HISTORY_KEY = 'who-rugged:history'
const HISTORY_CAP = 20

export const ELO_FLOOR = 800

export const DEFAULT_PLAYER: PlayerProfile = {
  balance: 1000,
  elo: 1000,
  played: 0,
  wins: 0,
  caseNo: 1,
}

export function loadPlayer(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PLAYER_KEY)
    if (!raw) return { ...DEFAULT_PLAYER }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    return { ...DEFAULT_PLAYER, ...parsed }
  } catch {
    return { ...DEFAULT_PLAYER }
  }
}

export function savePlayer(p: PlayerProfile): void {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p))
  } catch {
    /* storage may be unavailable (private mode); the round still plays */
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushHistory(entry: HistoryEntry): void {
  try {
    const next = [entry, ...loadHistory()].slice(0, HISTORY_CAP)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* non-fatal */
  }
}

/** Wipes profile and history. Used by Settings -> Reset progress. */
export function clearProgress(): void {
  try {
    localStorage.removeItem(PLAYER_KEY)
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* non-fatal */
  }
}

export function nextUnlock(elo: number): string {
  if (elo >= 1400) return 'UNLOCKED: Two Thieves'
  if (elo >= 1200) return 'UNLOCKED: Undercover Cops'
  return 'Reach RANK 1200 to unlock Undercover Cops'
}

/** Progress toward the next rank unlock, 0..1, plus its label and target. */
export function unlockProgress(elo: number): { pct: number; label: string; target: number } {
  if (elo >= 1400) return { pct: 1, label: 'All roles unlocked', target: 1400 }
  if (elo >= 1200) {
    return { pct: Math.min(1, (elo - 1200) / 200), label: 'Two Thieves', target: 1400 }
  }
  return { pct: Math.min(1, Math.max(0, (elo - ELO_FLOOR) / (1200 - ELO_FLOOR))), label: 'Undercover Cops', target: 1200 }
}
