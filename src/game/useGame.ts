/* Game orchestration. Holds the player profile (persisted), the active case,
   and the loading / sealing / revealing states that map to real 0G latency.
   The engine is injected so a real 0G engine can replace the mock with no
   change here. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Difficulty, GameCase, GameEngine, PlayerProfile, Verdict } from '../lib/types'
import { mockEngine } from './mockEngine'
import { ELO_FLOOR, loadPlayer, pushHistory, savePlayer } from './profile'
import { sfx } from '../lib/sfx'

export type GameStatus = 'sealing' | 'open' | 'resolving' | 'resolved' | 'error'
export type Overlay = 'none' | 'courtroom' | 'verdict'

export function useGame(engine: GameEngine = mockEngine, difficulty: Difficulty = 'detective') {
  const [player, setPlayer] = useState<PlayerProfile>(loadPlayer)
  // ref so changing difficulty applies to the next case, not the current one
  const diffRef = useRef(difficulty)
  diffRef.current = difficulty
  const [gameCase, setGameCase] = useState<GameCase | null>(null)
  const [status, setStatus] = useState<GameStatus>('sealing')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>('none')
  const [busyScanId, setBusyScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modalTimer = useRef<number | null>(null)

  const openCase = useCallback(
    async (caseNo: number) => {
      setStatus('sealing')
      setError(null)
      setVerdict(null)
      setRevealed(false)
      setOverlay('none')
      setGameCase(null)
      try {
        const c = await engine.openCase(caseNo, diffRef.current)
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
        sfx.play('scan')
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
      sfx.play('select')
      setStatus('resolving')
      try {
        const v = await engine.resolve(gameCase, suspectId, player)
        setGameCase((prev) => (prev ? { ...prev, status: 'resolved', accusedId: suspectId } : prev))
        setVerdict(v)
        setRevealed(true) // break the seals
        setStatus('resolved')
        sfx.play('seal')

        const eloAfter = Math.max(ELO_FLOOR, player.elo + v.eloDelta)
        setPlayer((p) => ({
          ...p,
          balance: p.balance + v.delta,
          elo: Math.max(ELO_FLOOR, p.elo + v.eloDelta),
          played: p.played + 1,
          wins: p.wins + (v.kind === 'win' ? 1 : 0),
        }))
        pushHistory({
          caseNo: gameCase.caseId,
          kind: v.kind,
          title: v.title,
          delta: v.delta,
          eloAfter,
          replayCid: v.replayCid,
          at: Date.now(),
        })

        modalTimer.current = window.setTimeout(() => {
          // a wrong bust goes through the courtroom first, a win straight to the verdict
          setOverlay(v.kind === 'lose' ? 'courtroom' : 'verdict')
          sfx.play(v.kind)
        }, 720)
      } catch {
        setError('Settlement failed before payout. No funds moved. Try the accusation again.')
        setStatus('open')
      }
    },
    [engine, gameCase, status, player],
  )

  const newCase = useCallback(() => {
    sfx.play('select')
    setPlayer((p) => {
      const caseNo = p.caseNo + 1
      void openCase(caseNo)
      return { ...p, caseNo }
    })
  }, [openCase])

  const showVerdict = useCallback(() => setOverlay('verdict'), [])

  const continueGame = useCallback(() => {
    setOverlay('none')
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
    overlay,
    busyScanId,
    error,
    probesLeft,
    scan,
    accuse,
    newCase,
    showVerdict,
    continueGame,
    retry,
  }
}
