/* Domain types for WHO SOLD? — the $ANSEM holder prediction game.
   Pattern mirrors src/lib/types.ts so the two products share the same conventions. */

/** A tracked $ANSEM holder with a known X handle. */
export interface TrackedHolder {
  /** Solana wallet address. */
  wallet: string
  /** X/Twitter handle, manually curated in holderRegistry. */
  handle: string
  /** $ANSEM balance (ui amount) snapshotted when the window opened. */
  balanceAtSnapshot: number
  /** Current balance after resolution. null while window is open. */
  balanceNow: number | null
  /** Seed string for DiceBear avatar generation. */
  avatarSeed: string
}

export type WindowStatus = 'open' | 'resolving' | 'settled'

/** One prediction round — a fixed time window where users bet on who sells. */
export interface PredictionWindow {
  /** Deterministic ID, e.g. "sold-2026-06-30-12h". */
  windowId: string
  opensAt: number
  closesAt: number
  status: WindowStatus
  holders: TrackedHolder[]
}

/** A single user prediction on one holder within one window. */
export interface Prediction {
  windowId: string
  /** Which holder they're predicting on. */
  wallet: string
  /** The predictor's 0G/EVM address. */
  predictor: string
  /** yes = expects the holder to sell before closesAt. */
  vote: 'yes' | 'no'
  /** $GG staked (points only until Vault.sol is live). */
  stake: number
  placedAt: number
}

/** Outcome for one holder after the window closes. */
export interface Resolution {
  wallet: string
  windowId: string
  /** True when balance dropped more than SELL_THRESHOLD. */
  sold: boolean
  balanceBefore: number
  balanceAfter: number
  confirmedAt: number
}

/** Per-predictor accuracy score for the current window. */
export interface PredictorScore {
  predictor: string
  correct: number
  total: number
  /** Net $GG delta: +2× stake on correct, -stake on wrong. */
  pointsDelta: number
}
