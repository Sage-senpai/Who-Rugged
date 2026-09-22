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
import { sideForProbability, type ReadDraft } from '../dmp/dmp'
import { saveRead } from '../dmp/readStore'

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
  // Set only when the player came through the Read screen; the classic
  // marketType/predict path leaves it null so Review looks exactly as before.
  const [read, setRead] = useState<ReadDraft | null>(null)

  const selectHolder = useCallback((h: HolderMarket) => {
    setHolder(h)
    setMarketKind(null)
    setOutcome(null)
    setRead(null)
    setCommitted(false)
    setScene('holder')
  }, [])

  const openThesis = useCallback(() => setScene('thesis'), [])

  const openMarketTypePicker = useCallback(() => setScene('marketType'), [])

  const selectMarketType = useCallback((kind: MarketKind) => {
    setMarketKind(kind)
    setOutcome(null)
    setRead(null)
    setScene('predict')
  }, [])

  // The Read screen resolves to the same (binary side, stake) the classic
  // screens produce, then joins the existing Review & Commit unchanged.
  const submitRead = useCallback((draft: ReadDraft) => {
    const side = sideForProbability(draft.probYes * 100)
    if (!side) return
    setRead(draft)
    setMarketKind('binary')
    setOutcome({ kind: 'binary', side })
    setStake(draft.stake)
    setCommitError(null)
    setScene('review')
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
      if (s === 'thesis') return 'holder'
      if (s === 'marketType') return 'thesis'
      if (s === 'predict') return 'marketType'
      if (s === 'review') return read ? 'thesis' : 'predict'
      return s
    })
  }, [read])

  const commit = useCallback(async () => {
    if (!holder || !outcome) return
    setCommitting(true)
    setCommitError(null)
    const res = outcome.kind === 'binary'
      ? await markets.placeBinary(holder.wallet, outcome.side, stake, read?.probYes)
      : await markets.placeMagnitude(holder.wallet, outcome.band, stake)
    setCommitting(false)
    if (!res.ok) {
      setCommitError(commitErrorMessage(res.error))
      return
    }
    if (read && outcome.kind === 'binary' && arena) {
      saveRead({
        ...read,
        arenaId: arena.id,
        windowId: markets.windowId,
        wallet: holder.wallet,
        side: outcome.side,
        committedAt: Date.now(),
      })
    }
    setCommitted(true)
    setScene('locked')
  }, [holder, outcome, stake, markets, read, arena])

  const reset = useCallback(() => {
    setHolder(null)
    setMarketKind(null)
    setOutcome(null)
    setRead(null)
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
      read,
      markets,
      selectHolder,
      openThesis,
      openMarketTypePicker,
      selectMarketType,
      selectOutcome,
      submitRead,
      back,
      commit,
      reset,
    }),
    [arena, isLive, scene, holder, marketKind, outcome, stake, committed, committing, commitError, read, markets,
      selectHolder, openThesis, openMarketTypePicker, selectMarketType, selectOutcome, submitRead, back, commit, reset],
  )
}
