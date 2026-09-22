/* Orchestrates the WHO SOLD? time-bucket markets for the play screen.

   Prefers the worker (shared pools, oracle-sampled resolution) when the
   `/sold/markets` endpoint answers; otherwise falls back to the local
   parimutuel engine so the market is always interactive. Both paths speak the
   same HolderMarket shape, so the card UI above is identical either way. */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMarkets, betBucket, getMarketPositions, betBinary, getBinaryPositions,
  betMagnitude, getMagnitudePositions, type ArenaAnalytics,
} from '../soldClient'
import type { BucketId } from './buckets'
import type { BinarySide } from './binary'
import type { MagnitudeBand } from './magnitude'
import type {
  HolderMarket, MarketPosition, BinaryMarketPosition, MagnitudeMarketPosition, PlaceResult,
} from './marketTypes'
import {
  buildMarket, placeBet, myPositions, placeBinaryBet, myBinaryPositions,
  placeMagnitudeBet, myMagnitudePositions, DEFAULT_STAKE,
} from './localMarket'
import { FALLBACK_HOLDERS, currentWindow } from './holders'

const POLL_MS = 30_000

export interface UseMarketsReturn {
  windowId: string
  opensAt: number
  closesAt: number
  markets: HolderMarket[]
  positions: MarketPosition[]
  binaryPositions: BinaryMarketPosition[]
  magnitudePositions: MagnitudeMarketPosition[]
  loading: boolean
  /** true when pools are shared/server-backed, false when local-only. */
  live: boolean
  /** The "i" icon signal, when the backend has one for this arena — see
      server/src/sold/walletAnalytics.ts. Undefined (not just loading) means
      this arena's data source can't be scored yet, not that it failed. */
  analytics?: ArenaAnalytics
  place: (wallet: string, bucket: BucketId, stake?: number) => Promise<PlaceResult>
  placeBinary: (wallet: string, side: BinarySide, stake?: number, probabilityYes?: number) => Promise<PlaceResult>
  placeMagnitude: (wallet: string, band: MagnitudeBand, stake?: number) => Promise<PlaceResult>
  defaultStake: number
}

export function useMarkets(predictor: string | null, arenaId = 'ansem'): UseMarketsReturn {
  const [win, setWin] = useState(currentWindow)
  const [markets, setMarkets] = useState<HolderMarket[]>([])
  const [positions, setPositions] = useState<MarketPosition[]>([])
  const [binaryPositions, setBinaryPositions] = useState<BinaryMarketPosition[]>([])
  const [magnitudePositions, setMagnitudePositions] = useState<MagnitudeMarketPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [analytics, setAnalytics] = useState<ArenaAnalytics | undefined>(undefined)
  const liveRef = useRef(false)

  // The local parimutuel fallback only has fixture data for the original
  // ANSEM arena — for any other arena, faking that same fixture under a
  // different token's name would be actively misleading, so a failed fetch
  // there just shows empty rather than fabricating holders.
  const loadLocal = useCallback(() => {
    setAnalytics(undefined)
    if (arenaId !== 'ansem') {
      setMarkets([])
      setPositions([])
      setBinaryPositions([])
      setMagnitudePositions([])
      return
    }
    const w = currentWindow()
    setWin(w)
    setMarkets(FALLBACK_HOLDERS.map((h) => buildMarket(h, w.windowId, w.opensAt, w.closesAt)))
    setPositions(myPositions(w.windowId, predictor))
    setBinaryPositions(myBinaryPositions(w.windowId, predictor))
    setMagnitudePositions(myMagnitudePositions(w.windowId, predictor))
  }, [predictor, arenaId])

  const loadServer = useCallback(async (): Promise<boolean> => {
    const m = await getMarkets(arenaId)
    if (!m || !m.holders?.length) return false
    setWin({ windowId: m.windowId, opensAt: m.opensAt, closesAt: m.closesAt })
    setMarkets(m.holders)
    setAnalytics(m.analytics)
    setPositions(predictor ? await getMarketPositions(predictor, arenaId) : [])
    setBinaryPositions(predictor ? await getBinaryPositions(predictor, arenaId) : [])
    setMagnitudePositions(predictor ? await getMagnitudePositions(predictor, arenaId) : [])
    return true
  }, [predictor, arenaId])

  const refresh = useCallback(async () => {
    const ok = await loadServer()
    liveRef.current = ok
    setLive(ok)
    if (!ok) loadLocal()
  }, [loadServer, loadLocal])

  useEffect(() => {
    let active = true
    void (async () => {
      await refresh()
      if (active) setLoading(false)
    })()
    const t = setInterval(() => { void refresh() }, POLL_MS)
    return () => { active = false; clearInterval(t) }
  }, [refresh])

  const place = useCallback(
    async (wallet: string, bucket: BucketId, stake: number = DEFAULT_STAKE): Promise<PlaceResult> => {
      if (!predictor) return { ok: false, error: 'not-connected' }
      if (liveRef.current) {
        const res = await betBucket(wallet, predictor, bucket, stake, arenaId)
        if (res.ok) await refresh()
        return res
      }
      const res = placeBet(win.windowId, wallet, bucket, stake, predictor)
      if (res.ok) loadLocal()
      return res
    },
    [predictor, arenaId, win.windowId, refresh, loadLocal],
  )

  const placeBinary = useCallback(
    async (wallet: string, side: BinarySide, stake: number = DEFAULT_STAKE, probabilityYes?: number): Promise<PlaceResult> => {
      if (!predictor) return { ok: false, error: 'not-connected' }
      if (liveRef.current) {
        const res = await betBinary(wallet, predictor, side, stake, arenaId, probabilityYes)
        if (res.ok) await refresh()
        return res
      }
      const res = placeBinaryBet(win.windowId, wallet, side, stake, predictor)
      if (res.ok) loadLocal()
      return res
    },
    [predictor, arenaId, win.windowId, refresh, loadLocal],
  )

  const placeMagnitude = useCallback(
    async (wallet: string, band: MagnitudeBand, stake: number = DEFAULT_STAKE): Promise<PlaceResult> => {
      if (!predictor) return { ok: false, error: 'not-connected' }
      if (liveRef.current) {
        const res = await betMagnitude(wallet, predictor, band, stake, arenaId)
        if (res.ok) await refresh()
        return res
      }
      const res = placeMagnitudeBet(win.windowId, wallet, band, stake, predictor)
      if (res.ok) loadLocal()
      return res
    },
    [predictor, arenaId, win.windowId, refresh, loadLocal],
  )

  return {
    windowId: win.windowId,
    opensAt: win.opensAt,
    closesAt: win.closesAt,
    markets,
    positions,
    binaryPositions,
    magnitudePositions,
    loading,
    live,
    analytics,
    place,
    placeBinary,
    placeMagnitude,
    defaultStake: DEFAULT_STAKE,
  }
}
