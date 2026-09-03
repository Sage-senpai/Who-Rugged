/* Orchestrates the WHO SOLD? time-bucket markets for the play screen.

   Prefers the worker (shared pools, oracle-sampled resolution) when the
   `/sold/markets` endpoint answers; otherwise falls back to the local
   parimutuel engine so the market is always interactive. Both paths speak the
   same HolderMarket shape, so the card UI above is identical either way. */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMarkets, betBucket, getMarketPositions, betBinary, getBinaryPositions,
  betMagnitude, getMagnitudePositions,
} from '../soldClient'
import type { BucketId } from './buckets'
import type { BinarySide } from './binary'
import type { MagnitudeBand } from './magnitude'
import type { HolderMarket, MarketPosition, BinaryMarketPosition, MagnitudeMarketPosition } from './marketTypes'
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
  place: (wallet: string, bucket: BucketId, stake?: number) => void
  placeBinary: (wallet: string, side: BinarySide, stake?: number) => void
  placeMagnitude: (wallet: string, band: MagnitudeBand, stake?: number) => void
  defaultStake: number
}

export function useMarkets(predictor: string | null): UseMarketsReturn {
  const [win, setWin] = useState(currentWindow)
  const [markets, setMarkets] = useState<HolderMarket[]>([])
  const [positions, setPositions] = useState<MarketPosition[]>([])
  const [binaryPositions, setBinaryPositions] = useState<BinaryMarketPosition[]>([])
  const [magnitudePositions, setMagnitudePositions] = useState<MagnitudeMarketPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const liveRef = useRef(false)

  const loadLocal = useCallback(() => {
    const w = currentWindow()
    setWin(w)
    setMarkets(FALLBACK_HOLDERS.map((h) => buildMarket(h, w.windowId, w.opensAt, w.closesAt)))
    setPositions(myPositions(w.windowId, predictor))
    setBinaryPositions(myBinaryPositions(w.windowId, predictor))
    setMagnitudePositions(myMagnitudePositions(w.windowId, predictor))
  }, [predictor])

  const loadServer = useCallback(async (): Promise<boolean> => {
    const m = await getMarkets()
    if (!m || !m.holders?.length) return false
    setWin({ windowId: m.windowId, opensAt: m.opensAt, closesAt: m.closesAt })
    setMarkets(m.holders)
    setPositions(predictor ? await getMarketPositions(predictor) : [])
    setBinaryPositions(predictor ? await getBinaryPositions(predictor) : [])
    setMagnitudePositions(predictor ? await getMagnitudePositions(predictor) : [])
    return true
  }, [predictor])

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
    (wallet: string, bucket: BucketId, stake: number = DEFAULT_STAKE) => {
      if (!predictor) return
      if (liveRef.current) {
        void betBucket(wallet, predictor, bucket, stake).then((res) => {
          if (res.ok) void refresh()
        })
      } else {
        const res = placeBet(win.windowId, wallet, bucket, stake, predictor)
        if (res.ok) loadLocal()
      }
    },
    [predictor, win.windowId, refresh, loadLocal],
  )

  const placeBinary = useCallback(
    (wallet: string, side: BinarySide, stake: number = DEFAULT_STAKE) => {
      if (!predictor) return
      if (liveRef.current) {
        void betBinary(wallet, predictor, side, stake).then((res) => {
          if (res.ok) void refresh()
        })
      } else {
        const res = placeBinaryBet(win.windowId, wallet, side, stake, predictor)
        if (res.ok) loadLocal()
      }
    },
    [predictor, win.windowId, refresh, loadLocal],
  )

  const placeMagnitude = useCallback(
    (wallet: string, band: MagnitudeBand, stake: number = DEFAULT_STAKE) => {
      if (!predictor) return
      if (liveRef.current) {
        void betMagnitude(wallet, predictor, band, stake).then((res) => {
          if (res.ok) void refresh()
        })
      } else {
        const res = placeMagnitudeBet(win.windowId, wallet, band, stake, predictor)
        if (res.ok) loadLocal()
      }
    },
    [predictor, win.windowId, refresh, loadLocal],
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
    place,
    placeBinary,
    placeMagnitude,
    defaultStake: DEFAULT_STAKE,
  }
}
