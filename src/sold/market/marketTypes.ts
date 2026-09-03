import type { BucketId, Pools } from './buckets'
import type { BinarySide, BinaryPools } from './binary'
import type { MagnitudeBand, MagnitudePools } from './magnitude'

/** A single holder's time-bucket market. */
export interface HolderMarket {
  wallet: string
  handle: string
  avatarSeed: string
  balanceAtSnapshot: number
  balanceNow: number | null
  /** Displayed pool per outcome (seed liquidity + real bets) — drives odds. */
  pools: Pools
  /** Real staked points per outcome (backed liquidity) — drives payouts. */
  realPools?: Pools
  /** Displayed pool per side for the binary (will-they-sell) market. */
  binaryPools?: BinaryPools
  realBinaryPools?: BinaryPools
  /** Displayed pool per band for the rug-by-% magnitude market. */
  magnitudePools?: MagnitudePools
  realMagnitudePools?: MagnitudePools
  /** Number of distinct positions in the market. */
  bettors: number
  opensAt: number
  closesAt: number
  /** Set once the oracle has resolved which bucket the holder landed in. */
  resolvedBucket?: BucketId | null
  /** Derived from resolvedBucket server-side. */
  resolvedBinary?: BinarySide | null
  /** Real (before-after)/before balance-drop ratio, refreshed as the oracle samples. */
  dropRatio?: number | null
  /** Derived from dropRatio server-side. */
  resolvedMagnitudeBand?: MagnitudeBand | null
}

/** A predictor's stake on one holder → one bucket. */
export interface MarketPosition {
  wallet: string
  bucket: BucketId
  stake: number
  predictor: string
  placedAt: number
}

/** A predictor's stake on one holder → yes/no they sell within the window. */
export interface BinaryMarketPosition {
  wallet: string
  side: BinarySide
  stake: number
  predictor: string
  placedAt: number
}

/** A predictor's stake on one holder → a rug-magnitude band. */
export interface MagnitudeMarketPosition {
  wallet: string
  band: MagnitudeBand
  stake: number
  predictor: string
  placedAt: number
}

export interface PlaceResult {
  ok: boolean
  error?: string
}
