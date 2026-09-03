/* Arena flow orchestration — scene state machine, mirrors src/court/useCourt.ts's
   phase-machine pattern. Wraps useMarkets() rather than re-polling; this hook owns
   only which scene/holder/market-type/outcome/stake the player has picked. */
import { useCallback, useMemo, useState } from 'react'
import { useSolana } from '../../wallet/SolanaContext'
import { useMarkets } from '../market/useMarkets'
import { DEFAULT_STAKE } from '../market/localMarket'
import type { HolderMarket } from '../market/marketTypes'
import type { BinarySide } from '../market/binary'
import type { MagnitudeBand } from '../market/magnitude'
import { arenaById } from './arenas'
import type { ArenaScene, MarketKind } from './arenaTypes'

export type Outcome = { kind: 'binary'; side: BinarySide } | { kind: 'magnitude'; band: MagnitudeBand }

export function useArena(arenaId: string | undefined) {
  const arena = arenaId ? arenaById(arenaId) : undefined
  const isLive = arena?.status === 'live'
  const { address } = useSolana()
  const markets = useMarkets(isLive ? address : null)

  const [scene, setScene] = useState<ArenaScene>('scan')
  const [holder, setHolder] = useState<HolderMarket | null>(null)
  const [marketKind, setMarketKind] = useState<MarketKind | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [stake, setStake] = useState(DEFAULT_STAKE)
  const [committed, setCommitted] = useState(false)

  const selectHolder = useCallback((h: HolderMarket) => {
    setHolder(h)
    setMarketKind(null)
    setOutcome(null)
    setCommitted(false)
    setScene('holder')
  }, [])

  const openMarketTypePicker = useCallback(() => setScene('marketType'), [])

  const selectMarketType = useCallback((kind: MarketKind) => {
    setMarketKind(kind)
    setOutcome(null)
    setScene('predict')
  }, [])

  const selectOutcome = useCallback((o: Outcome, s: number) => {
    setOutcome(o)
    setStake(s)
    setScene('review')
  }, [])

  const back = useCallback(() => {
    setScene((s) => {
      if (s === 'holder') return 'scan'
      if (s === 'marketType') return 'holder'
      if (s === 'predict') return 'marketType'
      if (s === 'review') return 'predict'
      return s
    })
  }, [])

  const commit = useCallback(() => {
    if (!holder || !outcome) return
    if (outcome.kind === 'binary') markets.placeBinary(holder.wallet, outcome.side, stake)
    else markets.placeMagnitude(holder.wallet, outcome.band, stake)
    setCommitted(true)
    setScene('locked')
  }, [holder, outcome, stake, markets])

  const reset = useCallback(() => {
    setHolder(null)
    setMarketKind(null)
    setOutcome(null)
    setCommitted(false)
    setScene('scan')
  }, [])

  return useMemo(
    () => ({
      arena,
      isLive,
      scene,
      holder,
      marketKind,
      outcome,
      stake,
      committed,
      markets,
      selectHolder,
      openMarketTypePicker,
      selectMarketType,
      selectOutcome,
      back,
      commit,
      reset,
    }),
    [arena, isLive, scene, holder, marketKind, outcome, stake, committed, markets,
      selectHolder, openMarketTypePicker, selectMarketType, selectOutcome, back, commit, reset],
  )
}
