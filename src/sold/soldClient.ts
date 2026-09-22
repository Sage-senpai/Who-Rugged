/* HTTP client for the WHO SOLD? Worker routes.
   Env-gated: with no VITE_SOLD_URL configured these are silent no-ops. */
import type { PredictionWindow, Prediction, PredictorScore, RegisteredHolder, BatchWindow } from './soldTypes'
import type { HolderMarket, MarketPosition, BinaryMarketPosition, MagnitudeMarketPosition } from './market/marketTypes'
import type { BucketId } from './market/buckets'
import type { BinarySide } from './market/binary'
import type { MagnitudeBand } from './market/magnitude'

const RAW = import.meta.env.VITE_SOLD_URL as string | undefined
export const SOLD_URL = RAW ? RAW.replace(/\/$/, '') : undefined
export const soldConfigured = !!SOLD_URL

/** Appends ?arena=<id> (or &arena=<id> if the path already has a query
 *  string) when an arena other than the default is selected. Server
 *  defaults to 'ansem' when the param is absent, so omitting it for the
 *  default arena is just an optimization, not required for correctness. */
function withArena(path: string, arena?: string): string {
  if (!arena || arena === 'ansem') return path
  return `${path}${path.includes('?') ? '&' : '?'}arena=${encodeURIComponent(arena)}`
}

async function get<T>(path: string, fallback: T): Promise<T> {
  if (!SOLD_URL) return fallback
  try {
    const res = await fetch(`${SOLD_URL}${path}`)
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

async function post<T>(path: string, body: object, fallback: T): Promise<T> {
  if (!SOLD_URL) return fallback
  try {
    const res = await fetch(`${SOLD_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      try { return (await res.json()) as T } catch { return fallback }
    }
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

// ── individual window ──────────────────────────────────────────────────────────

export const getCurrentWindow = () =>
  get<PredictionWindow | null>('/sold/window/current', null)

export const getMyPredictions = (predictor: string) =>
  get<Prediction[]>(`/sold/predictions?predictor=${encodeURIComponent(predictor)}`, [])

export const getLeaderboard = () =>
  get<PredictorScore[]>('/sold/leaderboard', [])

export const placePrediction = (
  windowId: string,
  wallet: string,
  predictor: string,
  vote: 'yes' | 'no',
  stake: number,
) =>
  post<{ ok: boolean; error?: string }>(
    '/sold/predict',
    { windowId, wallet, predictor, vote, stake },
    { ok: false, error: 'not-configured' },
  )

// ── time-bucket markets ─────────────────────────────────────────────────────────

/** Mirrors server/src/sold/walletAnalytics.ts's ArenaAnalytics. Only present
 *  for Solana-sourced arenas — see BucketMarket.maybeRefreshAnalytics. */
export interface ArenaAnalytics {
  computedAt: number
  topPYes: number | null
  topWallet: string | null
  topHandle: string | null
  scored: number
  total: number
}

export interface ServerMarkets {
  windowId: string
  opensAt: number
  closesAt: number
  status: 'open' | 'resolving' | 'settled'
  holders: HolderMarket[]
  analytics?: ArenaAnalytics
}

export const getMarkets = (arena?: string) => get<ServerMarkets | null>(withArena('/sold/markets', arena), null)

export const betBucket = (wallet: string, predictor: string, bucket: BucketId, stake: number, arena?: string) =>
  post<{ ok: boolean; error?: string }>(
    withArena('/sold/market/bet', arena),
    { wallet, predictor, bucket, stake },
    { ok: false, error: 'not-configured' },
  )

export const betBinary = (
  wallet: string, predictor: string, side: BinarySide, stake: number, arena?: string, probabilityYes?: number,
) =>
  post<{ ok: boolean; error?: string }>(
    withArena('/sold/market/bet-binary', arena),
    { wallet, predictor, side, stake, probabilityYes },
    { ok: false, error: 'not-configured' },
  )

export const betMagnitude = (wallet: string, predictor: string, band: MagnitudeBand, stake: number, arena?: string) =>
  post<{ ok: boolean; error?: string }>(
    withArena('/sold/market/bet-magnitude', arena),
    { wallet, predictor, band, stake },
    { ok: false, error: 'not-configured' },
  )

export const getMarketPositions = (predictor: string, arena?: string) =>
  get<MarketPosition[]>(withArena(`/sold/market/positions?predictor=${encodeURIComponent(predictor)}`, arena), [])

export const getBinaryPositions = (predictor: string, arena?: string) =>
  get<BinaryMarketPosition[]>(withArena(`/sold/market/positions-binary?predictor=${encodeURIComponent(predictor)}`, arena), [])

export const getMagnitudePositions = (predictor: string, arena?: string) =>
  get<MagnitudeMarketPosition[]>(withArena(`/sold/market/positions-magnitude?predictor=${encodeURIComponent(predictor)}`, arena), [])

export const getMarketLeaderboard = (arena?: string) =>
  get<PredictorScore[]>(withArena('/sold/market/leaderboard', arena), [])

// ── on-chain activity + price (best-effort real data; never fabricated) ────────

export interface ActivityEvent {
  signature: string
  at: number
  kind: 'buy' | 'sell' | 'unknown'
  amount: number
}

export const getActivity = (wallet: string, limit = 10, arena?: string) =>
  get<ActivityEvent[]>(withArena(`/sold/activity?wallet=${encodeURIComponent(wallet)}&limit=${limit}`, arena), [])

export const getTokenPrice = (arena?: string) =>
  get<{ mint: string; usd: number | null; asOf: number } | null>(withArena('/sold/price', arena), null)

// ── registration ───────────────────────────────────────────────────────────────

export const checkBalance = (wallet: string) =>
  get<{ wallet: string; balance: number; minRequired: number; eligible: boolean } | null>(
    `/sold/balance?wallet=${encodeURIComponent(wallet)}`,
    null,
  )

export const registerWallet = (wallet: string, handle: string, registeredBy: string) =>
  post<{ ok: boolean; error?: string; balance?: number; handle?: string; alreadyRegistered?: boolean }>(
    '/sold/register',
    { wallet, handle, registeredBy },
    { ok: false, error: 'not-configured' },
  )

export const getRegisteredHolders = () =>
  get<RegisteredHolder[]>('/sold/registered', [])

// ── batch windows ──────────────────────────────────────────────────────────────

export const getBatch = (batchId: string) =>
  get<BatchWindow | null>(`/sold/batch/${encodeURIComponent(batchId)}`, null)

export const placeBatchPrediction = (
  batchId: string,
  predictor: string,
  vote: 'yes' | 'no',
  stake: number,
) =>
  post<{ ok: boolean; error?: string }>(
    `/sold/batch/${encodeURIComponent(batchId)}/predict`,
    { predictor, vote, stake },
    { ok: false, error: 'not-configured' },
  )
