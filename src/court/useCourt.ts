/* Crowdfunding Courtroom orchestration. Phases: sealing -> discuss (rounds of
   statements + cross-accusations, with a limited press budget) -> vote -> trial
   -> resolved. Shares the persisted player profile with the main game so rank
   and balance carry across modes. Engine is injected for the 0G swap. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Difficulty, PlayerProfile, Verdict } from '../lib/types'
import type { CourtCase, CourtEngine, TallyResult } from './types'
import { courtEngine } from './courtEngine'
import { DIFFICULTY } from '../game/difficulty'
import { ELO_FLOOR, loadPlayer, pushHistory, savePlayer } from '../game/profile'
import { sfx } from '../lib/sfx'

export type CourtPhase = 'sealing' | 'discuss' | 'vote' | 'resolving' | 'resolved' | 'error'
export type CourtOverlay = 'none' | 'trial' | 'verdict'

export function useCourt(
  engine: CourtEngine = courtEngine,
  difficulty: Difficulty = 'detective',
  frozen = false,
) {
  void frozen // reserved for a future round timer; pause already gates input
  const [player, setPlayer] = useState<PlayerProfile>(loadPlayer)
  const diffRef = useRef(difficulty)
  diffRef.current = difficulty

  const [courtCase, setCourtCase] = useState<CourtCase | null>(null)
  const [phase, setPhase] = useState<CourtPhase>('sealing')
  const [round, setRound] = useState(1)
  const [pressLeft, setPressLeft] = useState(0)
  const [busyPressId, setBusyPressId] = useState<string | null>(null)
  const [humanVote, setHumanVote] = useState<string | null>(null)
  const [tally, setTally] = useState<TallyResult | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [overlay, setOverlay] = useState<CourtOverlay>('none')
  const [error, setError] = useState<string | null>(null)
  const modalTimer = useRef<number | null>(null)

  const applyRound = useCallback((c: CourtCase, speeches: Awaited<ReturnType<CourtEngine['speakRound']>>) =>
    ({
      ...c,
      participants: c.participants.map((p) => {
        const s = speeches.find((x) => x.id === p.id)
        return s ? { ...p, statement: s.statement, accusesId: s.accusesId } : p
      }),
    }), [])

  const openCase = useCallback(
    async (caseNo: number) => {
      setPhase('sealing')
      setError(null)
      setVerdict(null)
      setRevealed(false)
      setOverlay('none')
      setTally(null)
      setHumanVote(null)
      setRound(1)
      setCourtCase(null)
      try {
        const c = await engine.openCase(caseNo, diffRef.current)
        const speeches = await engine.speakRound(c, 1)
        setCourtCase(applyRound(c, speeches))
        setPressLeft(DIFFICULTY[diffRef.current].probes)
        setPhase('discuss')
      } catch {
        setError('Could not seal the table. The enclave did not answer. Try again.')
        setPhase('error')
      }
    },
    [engine, applyRound],
  )

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

  const press = useCallback(
    async (id: string) => {
      if (!courtCase || phase !== 'discuss' || busyPressId || pressLeft <= 0) return
      const p = courtCase.participants.find((x) => x.id === id)
      if (!p || p.read !== null) return
      setBusyPressId(id)
      try {
        const r = await engine.press(courtCase, id)
        sfx.play('scan')
        setPressLeft((n) => n - 1)
        setCourtCase((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((x) =>
                  x.id === id ? { ...x, read: r.read, tell: r.tell, attestation: r.attestation } : x,
                ),
              }
            : prev,
        )
      } catch {
        setError('That press did not return a signed read. Try another.')
      } finally {
        setBusyPressId(null)
      }
    },
    [engine, courtCase, phase, busyPressId, pressLeft],
  )

  const nextRound = useCallback(async () => {
    if (!courtCase || phase !== 'discuss') return
    if (round >= courtCase.rounds) {
      sfx.play('select')
      setPhase('vote')
      return
    }
    sfx.play('select')
    try {
      const speeches = await engine.speakRound(courtCase, round + 1)
      setCourtCase((prev) => (prev ? applyRound(prev, speeches) : prev))
      setRound((r) => r + 1)
    } catch {
      setError('The room went quiet. Try again.')
    }
  }, [engine, courtCase, phase, round, applyRound])

  const castVote = useCallback(async () => {
    if (!courtCase || phase !== 'vote') return
    setPhase('resolving')
    sfx.play('select')
    try {
      const t = await engine.tally(courtCase, humanVote)
      setTally(t)
      const v = await engine.resolve(courtCase, t.convictedId, humanVote)
      setVerdict(v)
      setRevealed(true)
      setPhase('resolved')
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
        caseNo: courtCase.caseId,
        kind: v.kind,
        title: v.title,
        delta: v.delta,
        eloAfter,
        replayCid: v.replayCid,
        at: Date.now(),
      })
      modalTimer.current = window.setTimeout(() => {
        setOverlay(v.kind === 'lose' && v.accusedHandle ? 'trial' : 'verdict')
        sfx.play(v.kind)
      }, 820)
    } catch {
      setError('Settlement failed before payout. No funds moved. Try the vote again.')
      setPhase('vote')
    }
  }, [engine, courtCase, phase, humanVote, player])

  const showVerdict = useCallback(() => setOverlay('verdict'), [])

  const newCase = useCallback(() => {
    sfx.play('select')
    setPlayer((p) => {
      const caseNo = p.caseNo + 1
      void openCase(caseNo)
      return { ...p, caseNo }
    })
  }, [openCase])

  const continueGame = useCallback(() => {
    setOverlay('none')
    newCase()
  }, [newCase])

  const retry = useCallback(() => {
    void openCase(player.caseNo)
  }, [openCase, player.caseNo])

  return {
    player,
    courtCase,
    phase,
    round,
    pressLeft,
    busyPressId,
    humanVote,
    setHumanVote,
    tally,
    verdict,
    revealed,
    overlay,
    error,
    press,
    nextRound,
    castVote,
    showVerdict,
    newCase,
    continueGame,
    retry,
  }
}
