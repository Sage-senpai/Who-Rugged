/* Game orchestration. Holds the player profile (persisted), the active case,
   and the loading / sealing / revealing states that map to real 0G latency.
   The engine is injected so a real 0G engine can replace the mock with no
   change here. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Difficulty, GameCase, GameEngine, PlayerProfile, Verdict } from '../lib/types'
import { mockEngine } from './mockEngine'
import { DIFFICULTY } from './difficulty'
import { ELO_FLOOR, loadPlayer, pushHistory, savePlayer } from './profile'
import { sfx } from '../lib/sfx'

export type GameStatus = 'sealing' | 'open' | 'resolving' | 'resolved' | 'error'
export type Overlay = 'none' | 'courtroom' | 'verdict'

export function useGame(
  engine: GameEngine = mockEngine,
  difficulty: Difficulty = 'detective',
  frozen = false,
) {
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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const modalTimer = useRef<number | null>(null)

  const openCase = useCallback(
    async (caseNo: number) => {
      setStatus('sealing')
      setError(null)
      setVerdict(null)
      setRevealed(false)
      setOverlay('none')
      setGameCase(null)
      setSecondsLeft(null)
      try {
        const c = await engine.openCase(caseNo, diffRef.current)
        setGameCase(c)
        setSecondsLeft(DIFFICULTY[diffRef.current].timeLimit)
        setStatus('open')
      } catch {
        setError('Could not seal the case. The enclave did not answer. Try again.')
        setStatus('error')
      }
    },
    [engine],
  )

  // settle a resolved case: reveal, score, record, then route to the overlay.
  // useCourtroom is false for a timeout (there is no accused to put on trial).
  const settle = useCallback(
    (v: Verdict, caseId: number, useCourtroom: boolean) => {
      setVerdict(v)
      setRevealed(true)
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
        caseNo: caseId,
        kind: v.kind,
        title: v.title,
        delta: v.delta,
        eloAfter,
        replayCid: v.replayCid,
        at: Date.now(),
      })
      modalTimer.current = window.setTimeout(() => {
        setOverlay(useCourtroom && v.kind === 'lose' ? 'courtroom' : 'verdict')
        sfx.play(v.kind)
      }, 720)
    },
    [player],
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
        settle(v, gameCase.caseId, true)
      } catch {
        setError('Settlement failed before payout. No funds moved. Try the accusation again.')
        setStatus('open')
      }
    },
    [engine, gameCase, status, player, settle],
  )

  const handleTimeout = useCallback(async () => {
    if (!gameCase || status !== 'open') return
    setStatus('resolving')
    sfx.play('buzz')
    try {
      const v = await engine.resolveTimeout(gameCase, player)
      setGameCase((prev) => (prev ? { ...prev, status: 'resolved' } : prev))
      settle(v, gameCase.caseId, false) // no accused, skip the courtroom
    } catch {
      setError('Settlement failed at the buzzer. Try a new case.')
      setStatus('open')
    }
  }, [engine, gameCase, status, player, settle])

  // the countdown: ticks only while a case is open, no overlay is up, and the
  // game is not frozen (paused or onboarding). That is the pause behavior.
  useEffect(() => {
    if (status !== 'open' || overlay !== 'none' || frozen) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1)))
    }, 1000)
    return () => window.clearInterval(id)
  }, [status, overlay, frozen])

  // a single warning beep as the clock enters the last ten seconds
  useEffect(() => {
    if (secondsLeft === 10) sfx.play('warn')
  }, [secondsLeft])

  // buzzer + settlement when the clock hits zero
  useEffect(() => {
    if (secondsLeft === 0 && status === 'open') void handleTimeout()
  }, [secondsLeft, status, handleTimeout])

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
    secondsLeft,
    scan,
    accuse,
    newCase,
    showVerdict,
    continueGame,
    retry,
  }
}
