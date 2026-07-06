/* HTTP client for the WHO SOLD? Worker routes.
   Env-gated: with no VITE_SOLD_URL configured these are silent no-ops. */
import type { PredictionWindow, Prediction, PredictorScore, RegisteredHolder, BatchWindow } from './soldTypes'
import type { HolderMarket, MarketPosition } from './market/marketTypes'
import type { BucketId } from './market/buckets'

const RAW = import.meta.env.VITE_SOLD_URL as string | undefined
export const SOLD_URL = RAW ? RAW.replace(/\/$/, '') : undefined
export const soldConfigured = !!SOLD_URL

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

export interface ServerMarkets {
  windowId: string
  opensAt: number
  closesAt: number
  status: 'open' | 'resolving' | 'settled'
  holders: HolderMarket[]
}

export const getMarkets = () => get<ServerMarkets | null>('/sold/markets', null)

export const betBucket = (wallet: string, predictor: string, bucket: BucketId, stake: number) =>
  post<{ ok: boolean; error?: string }>(
    '/sold/market/bet',
    { wallet, predictor, bucket, stake },
    { ok: false, error: 'not-configured' },
  )

export const getMarketPositions = (predictor: string) =>
  get<MarketPosition[]>(`/sold/market/positions?predictor=${encodeURIComponent(predictor)}`, [])

export const getMarketLeaderboard = () =>
  get<PredictorScore[]>('/sold/market/leaderboard', [])

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
