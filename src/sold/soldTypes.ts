/* Domain types for WHO SOLD? — the $ANSEM holder prediction game. */

export interface TrackedHolder {
  wallet: string
  handle: string
  balanceAtSnapshot: number
  balanceNow: number | null
  avatarSeed: string
}

export type WindowStatus = 'open' | 'resolving' | 'settled'

export interface PredictionWindow {
  windowId: string
  opensAt: number
  closesAt: number
  status: WindowStatus
  holders: TrackedHolder[]
}

export interface Prediction {
  windowId: string
  wallet: string
  predictor: string
  vote: 'yes' | 'no'
  stake: number
  placedAt: number
}

export interface Resolution {
  wallet: string
  windowId: string
  sold: boolean
  balanceBefore: number
  balanceAfter: number
  confirmedAt: number
}

export interface PredictorScore {
  predictor: string
  correct: number
  total: number
  /** Net $GG delta: parimutuel for batches, 2× stake for individual. */
  pointsDelta: number
}

export interface RegisteredHolder {
  wallet: string
  handle: string
  balanceAtReg: number
  registeredAt: number
  registeredBy: string
}

export interface BatchResult {
  sellersCount: number
  total: number
  pct: number
  exceeded: boolean
}

export interface BatchOdds {
  yesPct: number
  yesPool: number
  noPool: number
}

export interface BatchWindow {
  batchId: string
  label: string
  wallets: string[]
  threshold: number
  opensAt: number
  closesAt: number
  status: WindowStatus
  result?: BatchResult
  odds: BatchOdds
}
