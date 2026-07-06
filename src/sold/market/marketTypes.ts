import type { BucketId, Pools } from './buckets'

/** A single holder's time-bucket market. */
export interface HolderMarket {
  wallet: string
  handle: string
  avatarSeed: string
  balanceAtSnapshot: number
  balanceNow: number | null
  /** Total staked per outcome (seed liquidity + real bets). */
  pools: Pools
  /** Number of distinct positions in the market. */
  bettors: number
  opensAt: number
  closesAt: number
  /** Set once the oracle has resolved which bucket the holder landed in. */
  resolvedBucket?: BucketId | null
}

/** A predictor's stake on one holder → one bucket. */
export interface MarketPosition {
  wallet: string
  bucket: BucketId
  stake: number
  predictor: string
  placedAt: number
}

export interface PlaceResult {
  ok: boolean
  error?: string
}
