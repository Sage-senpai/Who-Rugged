/* HTTP client for the WHO SOLD? Worker routes.
   Env-gated: with no VITE_SOLD_URL configured these are silent no-ops. */
import type { PredictionWindow, Prediction, PredictorScore } from './soldTypes'

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
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

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
