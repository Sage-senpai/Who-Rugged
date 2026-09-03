/* Binary outcome for a single holder's "will they sell within the window?" market.
   Two mutually exclusive, collectively exhaustive sides. Odds are pure parimutuel —
   implied probability is a side's share of the total pool, no house edge, no bias. */

export type BinarySide = 'yes' | 'no'

export interface BinaryOutcome {
  id: BinarySide
  label: string
  short: string
  color: string
}

export const BINARY_SIDES: BinaryOutcome[] = [
  { id: 'yes', label: 'They sell within the window', short: 'YES', color: '#ff4560' },
  { id: 'no', label: "They don't sell within the window", short: 'NO', color: '#39ff14' },
]

export const BINARY_IDS = BINARY_SIDES.map((s) => s.id)
export const binaryById = (id: BinarySide): BinaryOutcome => BINARY_SIDES.find((s) => s.id === id)!

export type BinaryPools = Record<BinarySide, number>

export const emptyBinaryPools = (): BinaryPools => ({ yes: 0, no: 0 })

export const binaryPoolTotal = (pools: BinaryPools): number =>
  BINARY_IDS.reduce((s, id) => s + (pools[id] || 0), 0)

/** Implied probability per side = its share of the pool. Uniform (50/50) when empty. */
export function impliedBinaryProbs(pools: BinaryPools): BinaryPools {
  const total = binaryPoolTotal(pools)
  const out = emptyBinaryPools()
  for (const id of BINARY_IDS) out[id] = total > 0 ? (pools[id] || 0) / total : 1 / BINARY_IDS.length
  return out
}

/** Parimutuel payout for staking `stake` on `side`, if that side wins. */
export function potentialBinaryPayout(pools: BinaryPools, side: BinarySide, stake: number): number {
  const winnersPool = pools[side] || 0
  if (winnersPool <= 0) return stake
  const losersPool = binaryPoolTotal(pools) - winnersPool
  return stake + (stake / winnersPool) * losersPool
}

export function binaryPayoutMultiple(pools: BinaryPools, side: BinarySide, stake: number): number {
  if (stake <= 0) return 1
  return potentialBinaryPayout(pools, side, stake) / stake
}

/** Quote a bet before placing it: what the odds/payout become once `stake` lands. */
export function quoteBinary(pools: BinaryPools, side: BinarySide, stake: number) {
  const after: BinaryPools = { ...pools, [side]: (pools[side] || 0) + stake }
  return {
    impliedBefore: impliedBinaryProbs(pools)[side],
    impliedAfter: impliedBinaryProbs(after)[side],
    payout: potentialBinaryPayout(after, side, stake),
    multiple: binaryPayoutMultiple(after, side, stake),
  }
}
