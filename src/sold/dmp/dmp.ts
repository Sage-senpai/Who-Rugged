/* DMP math: the three signals (model, market, player) and how the final
   odds are derived from the first two. Pure functions, no I/O.

   Payouts are NOT touched here. They stay pure parimutuel on real stakes
   (quoteBinary), so the book is still zero-sum and fully backed. What this
   module produces is the displayed "final odds": the model's estimate of the
   wallet blended with the crowd's real stakes. */
import { emptyBinaryPools, quoteBinary, type BinaryPools, type BinarySide } from '../market/binary'

/** Mirrors the server's SOLD_SELL_THRESHOLD default (10% of the observed
    balance). This is the sell size that resolves the market YES. */
export const QUALIFYING_SELL_PCT = 10

/** How much real stake it takes for the crowd to outweigh a fully confident
    model. The model counts as a virtual stake of confidence * DEPTH_K on its
    own probability, so a thin pool leans on the model and a deep pool leans on
    the crowd. Tune against resolved markets. */
export const DEPTH_K = 500

export const STAKE_PRESETS = [10, 25, 50, 100]

/** YES share of the real (backed) pool, or null when nobody has staked. */
export function marketProbability(pools: BinaryPools): number | null {
  const total = pools.yes + pools.no
  return total > 0 ? pools.yes / total : null
}

export interface BlendedOdds {
  /** Final P(YES) after blending model and pools. */
  pFinal: number
  /** Share of the final number carried by the model (0 to 1). */
  modelShare: number
  poolShare: number
  /** True when there is no model confidence and no stakes: nothing to blend,
      so the shares above are meaningless and the UI should say so. */
  weightless: boolean
}

/** final = (M * P_model + YES_pool) / (M + total_pool), with M = confidence * K.
    Bayesian prior (the wallet model) updated by evidence (real stakes). */
export function blendedOdds(pModel: number, confidence: number, pools: BinaryPools): BlendedOdds {
  const total = pools.yes + pools.no
  const m = Math.max(0, Math.min(1, confidence)) * DEPTH_K
  if (m + total <= 0) return { pFinal: pModel, modelShare: 0, poolShare: 0, weightless: true }
  return {
    pFinal: (m * pModel + pools.yes) / (m + total),
    modelShare: m / (m + total),
    poolShare: total / (m + total),
    weightless: false,
  }
}

/** The binary engine needs a side. Above 50 is YES, below is NO, exactly 50 is
    no position at all. */
export function sideForProbability(probYes: number): BinarySide | null {
  if (probYes > 50) return 'yes'
  if (probYes < 50) return 'no'
  return null
}

/** Parimutuel multiple for `stake` on `side` against the real pool only. */
export function payoutMultiple(pools: BinaryPools | undefined, side: BinarySide, stake: number): number {
  return quoteBinary(pools ?? emptyBinaryPools(), side, stake).multiple
}

export const pct = (p: number): string => `${Math.round(p * 100)}%`

/** What the player locked in on the Read screen, carried into Review & Commit
    and stored once the bet actually lands. */
export interface ReadDraft {
  probYes: number
  /** The estimate the player made before opening the model. */
  initialProbYes: number
  stake: number
  modelP: number
  modelConfidence: number
  modelSeen: boolean
  /** Null when nobody had staked yet. */
  marketP: number | null
  blendedP: number
}
