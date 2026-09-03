/* Magnitude bands for a single holder's "how much of their position will they rug?"
   market. Five mutually exclusive, collectively exhaustive bands over the real
   (before-after)/before balance-drop ratio. Odds are pure parimutuel. */

export type MagnitudeBand = 'b0_10' | 'b10_25' | 'b25_50' | 'b50_75' | 'b75_100'

export interface MagnitudeOutcome {
  id: MagnitudeBand
  label: string
  short: string
  /** Inclusive-exclusive band bounds as a fraction of position size sold. */
  loPct: number
  hiPct: number
  color: string
}

export const MAGNITUDE_BANDS: MagnitudeOutcome[] = [
  { id: 'b0_10', label: 'Rugs 0-10% of position', short: '0-10%', loPct: 0, hiPct: 10, color: '#39ff14' },
  { id: 'b10_25', label: 'Rugs 10-25% of position', short: '10-25%', loPct: 10, hiPct: 25, color: '#8ad64f' },
  { id: 'b25_50', label: 'Rugs 25-50% of position', short: '25-50%', loPct: 25, hiPct: 50, color: '#ffd700' },
  { id: 'b50_75', label: 'Rugs 50-75% of position', short: '50-75%', loPct: 50, hiPct: 75, color: '#ff8a3d' },
  { id: 'b75_100', label: 'Rugs 75-100% of position', short: '75-100%', loPct: 75, hiPct: 100, color: '#ff4560' },
]

export const MAGNITUDE_IDS = MAGNITUDE_BANDS.map((b) => b.id)
export const magnitudeById = (id: MagnitudeBand): MagnitudeOutcome => MAGNITUDE_BANDS.find((b) => b.id === id)!

export type MagnitudePools = Record<MagnitudeBand, number>

export const emptyMagnitudePools = (): MagnitudePools => ({
  b0_10: 0, b10_25: 0, b25_50: 0, b50_75: 0, b75_100: 0,
})

export const magnitudePoolTotal = (pools: MagnitudePools): number =>
  MAGNITUDE_IDS.reduce((s, id) => s + (pools[id] || 0), 0)

/** Implied probability per band = its share of the pool. Uniform when empty. */
export function impliedMagnitudeProbs(pools: MagnitudePools): MagnitudePools {
  const total = magnitudePoolTotal(pools)
  const out = emptyMagnitudePools()
  for (const id of MAGNITUDE_IDS) out[id] = total > 0 ? (pools[id] || 0) / total : 1 / MAGNITUDE_BANDS.length
  return out
}

/** Parimutuel payout for staking `stake` on `band`, if that band wins. */
export function potentialMagnitudePayout(pools: MagnitudePools, band: MagnitudeBand, stake: number): number {
  const winnersPool = pools[band] || 0
  if (winnersPool <= 0) return stake
  const losersPool = magnitudePoolTotal(pools) - winnersPool
  return stake + (stake / winnersPool) * losersPool
}

export function magnitudePayoutMultiple(pools: MagnitudePools, band: MagnitudeBand, stake: number): number {
  if (stake <= 0) return 1
  return potentialMagnitudePayout(pools, band, stake) / stake
}

/** Quote a bet before placing it: what the odds/payout become once `stake` lands. */
export function quoteMagnitude(pools: MagnitudePools, band: MagnitudeBand, stake: number) {
  const after: MagnitudePools = { ...pools, [band]: (pools[band] || 0) + stake }
  return {
    impliedBefore: impliedMagnitudeProbs(pools)[band],
    impliedAfter: impliedMagnitudeProbs(after)[band],
    payout: potentialMagnitudePayout(after, band, stake),
    multiple: magnitudePayoutMultiple(after, band, stake),
  }
}
