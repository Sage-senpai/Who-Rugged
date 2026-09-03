/* Server-side domain types for WHO SOLD? — mirrors src/sold/soldTypes.ts in the frontend. */

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
  pointsDelta: number
}

export interface RegisteredHolder {
  wallet: string
  handle: string
  balanceAtReg: number
  registeredAt: number
  registeredBy: string
}

export interface BatchWindow {
  batchId: string
  label: string
  wallets: string[]
  walletBalances: Record<string, number>
  threshold: number
  opensAt: number
  closesAt: number
  status: WindowStatus
  result?: BatchResult
}

export interface BatchResult {
  sellersCount: number
  total: number
  pct: number
  exceeded: boolean
}

export interface BatchPrediction {
  batchId: string
  predictor: string
  vote: 'yes' | 'no'
  stake: number
  placedAt: number
}

// ── time-bucket markets (Polymarket-style, per-holder) ──────────────────────
// Mirrors src/sold/market/buckets.ts on the frontend.
export type BucketId = 'lt1h' | 'h1_3' | 'h3_6' | 'h6_12' | 'holds'
export type BucketPools = Record<BucketId, number>

// ── binary market — "will they sell within the window?" ─────────────────────
// Mirrors src/sold/market/binary.ts on the frontend.
export type BinarySide = 'yes' | 'no'
export type BinaryPools = Record<BinarySide, number>

export interface BinaryPosition {
  wallet: string
  side: BinarySide
  stake: number
  predictor: string
  placedAt: number
}

// ── magnitude market — "how much of their position will they rug?" ──────────
// Mirrors src/sold/market/magnitude.ts on the frontend.
export type MagnitudeBand = 'b0_10' | 'b10_25' | 'b25_50' | 'b50_75' | 'b75_100'
export type MagnitudePools = Record<MagnitudeBand, number>

export interface MagnitudePosition {
  wallet: string
  band: MagnitudeBand
  stake: number
  predictor: string
  placedAt: number
}

export interface BucketHolderMarket {
  wallet: string
  handle: string
  avatarSeed: string
  balanceAtSnapshot: number
  balanceNow: number | null
  /** Displayed pool per outcome — seed liquidity + real bets (drives odds). */
  pools: BucketPools
  /** Real staked points per outcome (backed liquidity; drives payouts). */
  realPools?: BucketPools
  /** Displayed pool per side for the binary (yes/no sell) market. */
  binaryPools?: BinaryPools
  realBinaryPools?: BinaryPools
  /** Displayed pool per band for the rug-by-% magnitude market. */
  magnitudePools?: MagnitudePools
  realMagnitudePools?: MagnitudePools
  bettors: number
  opensAt: number
  closesAt: number
  /** Set once the oracle sampling has resolved the holder's outcome. */
  resolvedBucket?: BucketId | null
  /** Derived from resolvedBucket — never independently written. */
  resolvedBinary?: BinarySide | null
  /** Real (before-after)/before balance-drop ratio, refreshed every sample() pass. */
  dropRatio?: number | null
  /** Derived from dropRatio via bandForRatio() — never independently written. */
  resolvedMagnitudeBand?: MagnitudeBand | null
}

export interface BucketPosition {
  wallet: string
  bucket: BucketId
  stake: number
  predictor: string
  placedAt: number
}
