/* Time-bucket outcomes for a single holder's "when do they sell?" market.
   Mutually exclusive and collectively exhaustive: a holder resolves to exactly
   one bucket. Odds are pure parimutuel — implied probability is a bucket's share
   of the total pool, with no house edge and no built-in bias. */

export type BucketId = 'lt1h' | 'h1_3' | 'h3_6' | 'h6_12' | 'holds'

export interface Bucket {
  id: BucketId
  /** Full label for the row. */
  label: string
  /** Compact label for chips/legends. */
  short: string
  /** Inclusive-exclusive hour bounds from window open; `hiH: null` = never sold. */
  loH: number
  hiH: number | null
  /** Accent hue — red (fast dump) → green (diamond hands). */
  color: string
}

export const BUCKETS: Bucket[] = [
  { id: 'lt1h', label: 'Sells within 1 hour', short: '<1h', loH: 0, hiH: 1, color: '#ff4560' },
  { id: 'h1_3', label: 'Sells in 1–3 hours', short: '1–3h', loH: 1, hiH: 3, color: '#ff8a3d' },
  { id: 'h3_6', label: 'Sells in 3–6 hours', short: '3–6h', loH: 3, hiH: 6, color: '#ffd700' },
  { id: 'h6_12', label: 'Sells in 6–12 hours', short: '6–12h', loH: 6, hiH: 12, color: '#8ad64f' },
  { id: 'holds', label: 'Holds past 12 hours', short: 'HODL', loH: 12, hiH: null, color: '#39ff14' },
]

export const BUCKET_IDS = BUCKETS.map((b) => b.id)
export const bucketById = (id: BucketId): Bucket => BUCKETS.find((b) => b.id === id)!

export type Pools = Record<BucketId, number>

export const emptyPools = (): Pools => ({ lt1h: 0, h1_3: 0, h3_6: 0, h6_12: 0, holds: 0 })

export const poolTotal = (pools: Pools): number =>
  BUCKET_IDS.reduce((s, id) => s + (pools[id] || 0), 0)

/** Implied probability per bucket = its share of the pool. Uniform when empty. */
export function impliedProbs(pools: Pools): Pools {
  const total = poolTotal(pools)
  const out = emptyPools()
  for (const id of BUCKET_IDS) out[id] = total > 0 ? (pools[id] || 0) / total : 1 / BUCKETS.length
  return out
}

/**
 * Parimutuel payout for staking `stake` on `bucket`, if that bucket wins.
 * Winners get their stake back plus a proportional cut of the losing pools.
 * Uses the post-bet pools (your stake is already included in `pools`).
 */
export function potentialPayout(pools: Pools, bucket: BucketId, stake: number): number {
  const winnersPool = pools[bucket] || 0
  if (winnersPool <= 0) return stake
  const losersPool = poolTotal(pools) - winnersPool
  return stake + (stake / winnersPool) * losersPool
}

/** Payout as a multiple of stake, e.g. 3.2 → "3.2×". Based on post-bet pools. */
export function payoutMultiple(pools: Pools, bucket: BucketId, stake: number): number {
  if (stake <= 0) return 1
  return potentialPayout(pools, bucket, stake) / stake
}

/** Quote a bet before placing it: what the odds/payout become once `stake` lands. */
export function quote(pools: Pools, bucket: BucketId, stake: number) {
  const after: Pools = { ...pools, [bucket]: (pools[bucket] || 0) + stake }
  return {
    impliedBefore: impliedProbs(pools)[bucket],
    impliedAfter: impliedProbs(after)[bucket],
    payout: potentialPayout(after, bucket, stake),
    multiple: payoutMultiple(after, bucket, stake),
  }
}
