/* Orchestration hook for WHO SOLD? — mirrors the useGame.ts pattern. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PredictionWindow, Prediction, PredictorScore } from './soldTypes'
import { getCurrentWindow, getMyPredictions, getLeaderboard, placePrediction } from './soldClient'

const POLL_MS = 30_000

export type SoldStatus = 'loading' | 'open' | 'resolving' | 'settled' | 'unconfigured' | 'error'

export interface UseSoldReturn {
  status: SoldStatus
  window: PredictionWindow | null
  myPredictions: Prediction[]
  leaderboard: PredictorScore[]
  predict: (wallet: string, vote: 'yes' | 'no', stake: number) => Promise<{ ok: boolean; error?: string }>
}

export function useSold(predictorAddress: string | null): UseSoldReturn {
  const [status, setStatus] = useState<SoldStatus>('loading')
  const [window, setWindow] = useState<PredictionWindow | null>(null)
  const [myPredictions, setMyPredictions] = useState<Prediction[]>([])
  const [leaderboard, setLeaderboard] = useState<PredictorScore[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    const win = await getCurrentWindow()
    setWindow(win)
    if (!win) { setStatus('error'); return }
    setStatus(win.status as SoldStatus)

    if (predictorAddress) {
      const preds = await getMyPredictions(predictorAddress)
      setMyPredictions(preds)
    }

    if (win.status === 'settled') {
      const lb = await getLeaderboard()
      setLeaderboard(lb)
    }
  }, [predictorAddress])

  useEffect(() => {
    const VITE_SOLD_URL = import.meta.env.VITE_SOLD_URL as string | undefined
    if (!VITE_SOLD_URL) { setStatus('unconfigured'); return }

    void refresh()
    pollRef.current = setInterval(() => { void refresh() }, POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [refresh])

  const predict = useCallback(
    async (wallet: string, vote: 'yes' | 'no', stake: number) => {
      if (!predictorAddress || !window) return { ok: false, error: 'not-ready' }
      const result = await placePrediction(window.windowId, wallet, predictorAddress, vote, stake)
      if (result.ok) {
        setMyPredictions((prev) => {
          const next = prev.filter((p) => !(p.wallet === wallet))
          return [...next, { windowId: window.windowId, wallet, predictor: predictorAddress, vote, stake, placedAt: Date.now() }]
        })
      }
      return result
    },
    [predictorAddress, window],
  )

  return { status, window, myPredictions, leaderboard, predict }
}
