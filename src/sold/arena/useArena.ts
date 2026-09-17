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

function commitErrorMessage(code?: string): string {
  switch (code) {
    case 'window-closed': return "This prediction window has closed — no more bets can land here."
    case 'holder-locked': return "This holder's outcome is already known — betting closed the moment it was detected."
    case 'market-not-open': return 'This market is not open yet.'
    case 'not-connected': return 'Connect your wallet to place a bet.'
    case 'bad-stake': return 'Enter a valid stake.'
    case 'unknown-wallet': return "This holder isn't tracked in the current window."
    case 'not-configured': return "Can't reach the market right now — check your connection and try again."
    default: return "Your bet didn't go through — try again."
  }
}

export function useArena(arenaId: string | undefined) {
  const arena = arenaId ? arenaById(arenaId) : undefined
  const isLive = arena?.status === 'live'
  const { address } = useSolana()
  const markets = useMarkets(isLive ? address : null, arena?.id)

  const [scene, setScene] = useState<ArenaScene>('scan')
  const [holder, setHolder] = useState<HolderMarket | null>(null)
  const [marketKind, setMarketKind] = useState<MarketKind | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [stake, setStake] = useState(DEFAULT_STAKE)
  const [committed, setCommitted] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)

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
    setCommitError(null)
    setScene('review')
  }, [])

  const back = useCallback(() => {
    setCommitError(null)
    setScene((s) => {
      if (s === 'holder') return 'scan'
      if (s === 'marketType') return 'holder'
      if (s === 'predict') return 'marketType'
      if (s === 'review') return 'predict'
      return s
    })
  }, [])

  const commit = useCallback(async () => {
    if (!holder || !outcome) return
    setCommitting(true)
    setCommitError(null)
    const res = outcome.kind === 'binary'
      ? await markets.placeBinary(holder.wallet, outcome.side, stake)
      : await markets.placeMagnitude(holder.wallet, outcome.band, stake)
    setCommitting(false)
    if (!res.ok) {
      setCommitError(commitErrorMessage(res.error))
      return
    }
    setCommitted(true)
    setScene('locked')
  }, [holder, outcome, stake, markets])

  const reset = useCallback(() => {
    setHolder(null)
    setMarketKind(null)
    setOutcome(null)
    setCommitted(false)
    setCommitError(null)
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
      committing,
      commitError,
      markets,
      selectHolder,
      openMarketTypePicker,
      selectMarketType,
      selectOutcome,
      back,
      commit,
      reset,
    }),
    [arena, isLive, scene, holder, marketKind, outcome, stake, committed, committing, commitError, markets,
      selectHolder, openMarketTypePicker, selectMarketType, selectOutcome, back, commit, reset],
  )
}
