/* Game orchestration. Holds the player profile (persisted), the active case,
   and the loading / sealing / revealing states that map to real 0G latency.
   The engine is injected so a real 0G engine can replace the mock with no
   change here. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameCase, GameEngine, PlayerProfile, Verdict } from '../lib/types'
import { mockEngine } from './mockEngine'

export type GameStatus = 'sealing' | 'open' | 'resolving' | 'resolved' | 'error'

const STORAGE_KEY = 'who-rugged:player'
const ELO_FLOOR = 800

const DEFAULT_PLAYER: PlayerProfile = {
  balance: 1000,
  elo: 1000,
  played: 0,
  wins: 0,
  caseNo: 1,
}

function loadPlayer(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLAYER }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    return { ...DEFAULT_PLAYER, ...parsed }
  } catch {
    return { ...DEFAULT_PLAYER }
  }
}

function savePlayer(p: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* storage may be unavailable (private mode); the round still plays */
  }
}

export function nextUnlock(elo: number): string {
  if (elo >= 1400) return 'UNLOCKED: Two Thieves'
  if (elo >= 1200) return 'UNLOCKED: Undercover Cops'
  return 'Reach RANK 1200 to unlock Undercover Cops'
}

export function useGame(engine: GameEngine = mockEngine) {
  const [player, setPlayer] = useState<PlayerProfile>(loadPlayer)
  const [gameCase, setGameCase] = useState<GameCase | null>(null)
  const [status, setStatus] = useState<GameStatus>('sealing')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [busyScanId, setBusyScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modalTimer = useRef<number | null>(null)

  const openCase = useCallback(
    async (caseNo: number) => {
      setStatus('sealing')
      setError(null)
      setVerdict(null)
      setRevealed(false)
      setModalOpen(false)
      setGameCase(null)
      try {
        const c = await engine.openCase(caseNo)
        setGameCase(c)
        setStatus('open')
      } catch {
        setError('Could not seal the case. The enclave did not answer. Try again.')
        setStatus('error')
      }
    },
    [engine],
  )

  // first case on mount
  useEffect(() => {
    void openCase(player.caseNo)
    return () => {
      if (modalTimer.current) window.clearTimeout(modalTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    savePlayer(player)
  }, [player])

  const scan = useCallback(
    async (suspectId: string) => {
      if (!gameCase || status !== 'open' || busyScanId) return
      if (gameCase.probesUsed >= gameCase.probesAllowed) return
      const target = gameCase.suspects.find((s) => s.id === suspectId)
      if (!target || target.read !== null) return

      setBusyScanId(suspectId)
      try {
        const result = await engine.probe(gameCase, suspectId)
        setGameCase((prev) =>
          prev
            ? {
                ...prev,
                probesUsed: prev.probesUsed + 1,
                suspects: prev.suspects.map((s) =>
                  s.id === suspectId
                    ? { ...s, read: result.read, tell: result.tell, attestation: result.attestation }
                    : s,
                ),
              }
            : prev,
        )
      } catch {
        setError('The scan did not return a signed read. Try another suspect.')
      } finally {
        setBusyScanId(null)
      }
    },
    [engine, gameCase, status, busyScanId],
  )

  const accuse = useCallback(
    async (suspectId: string) => {
      if (!gameCase || status !== 'open') return
      setStatus('resolving')
      try {
        const v = await engine.resolve(gameCase, suspectId, player)
        setGameCase((prev) => (prev ? { ...prev, status: 'resolved', accusedId: suspectId } : prev))
        setVerdict(v)
        setRevealed(true) // break the seals
        setStatus('resolved')
        setPlayer((p) => ({
          ...p,
          balance: p.balance + v.delta,
          elo: Math.max(ELO_FLOOR, p.elo + v.eloDelta),
          played: p.played + 1,
          wins: p.wins + (v.kind === 'win' ? 1 : 0),
        }))
        modalTimer.current = window.setTimeout(() => setModalOpen(true), 720)
      } catch {
        setError('Settlement failed before payout. No funds moved. Try the accusation again.')
        setStatus('open')
      }
    },
    [engine, gameCase, status, player],
  )

  const newCase = useCallback(() => {
    setPlayer((p) => {
      const caseNo = p.caseNo + 1
      void openCase(caseNo)
      return { ...p, caseNo }
    })
  }, [openCase])

  const continueGame = useCallback(() => {
    setModalOpen(false)
    newCase()
  }, [newCase])

  const retry = useCallback(() => {
    void openCase(player.caseNo)
  }, [openCase, player.caseNo])

  const probesLeft = gameCase ? gameCase.probesAllowed - gameCase.probesUsed : 0

  return {
    player,
    gameCase,
    status,
    verdict,
    revealed,
    modalOpen,
    busyScanId,
    error,
    probesLeft,
    scan,
    accuse,
    newCase,
    continueGame,
    retry,
  }
}
