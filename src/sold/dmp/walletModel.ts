/* Baseline wallet-behavior model (v0). Deliberately simple and explainable:
   start from a prior for "sells 10% or more in a window", nudge it with a few
   named signals read off the wallet's recent transfers and live balance, shrink
   toward the prior when there is little history, and scale for time left.

   The weights are hand-set, not fitted. They exist so every probability comes
   with reasons a player can inspect. Calibrate against resolved markets before
   treating the numbers as more than a starting point. Nothing here invents
   data: no activity means confidence 0 and the model reports only the prior. */
import type { ActivityEvent } from '../soldClient'
import type { HolderMarket } from '../market/marketTypes'
import { QUALIFYING_SELL_PCT } from './dmp'

/** Prior P(sell >= threshold within a window) before any wallet evidence. */
export const BASE_RATE = 0.2

/** Transfers needed for full confidence. */
const FULL_CONFIDENCE_SAMPLE = 12

const DAY = 86_400_000
const HOUR = 3_600_000

export interface ModelSignal {
  id: string
  label: string
  detail: string
  effect: 'sell' | 'hold'
  strength: 'slight' | 'moderate' | 'strong'
  points: number
}

export interface WalletDna {
  traderType: string
  sellFrequency: string
  partialExits: string
  averageHold: string
  exitTrigger: string
  position: string
}

export interface WalletModel {
  pYes: number
  confidence: number
  sampleSize: number
  signals: ModelSignal[]
  dna: WalletDna
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const logit = (p: number) => Math.log(p / (1 - p))

function strengthOf(points: number): ModelSignal['strength'] {
  const a = Math.abs(points)
  return a >= 1 ? 'strong' : a >= 0.5 ? 'moderate' : 'slight'
}

function ago(ms: number): string {
  const h = Math.round(ms / HOUR)
  return h < 1 ? 'under an hour ago' : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

export function buildWalletModel(
  holder: HolderMarket,
  activity: ActivityEvent[] | null,
  totalSupply: number | null,
): WalletModel {
  const now = Date.now()
  const events = (activity ?? []).filter((e) => e.kind !== 'unknown')
  const sells = events.filter((e) => e.kind === 'sell')
  const buys = events.filter((e) => e.kind === 'buy')
  const n = events.length
  const times = events.map((e) => e.at)
  const spanDays = n > 1 ? (Math.max(...times) - Math.min(...times)) / DAY : 0
  const sellRate = sells.length / Math.max(spanDays, 1)
  const lastSellAt = sells.length ? Math.max(...sells.map((e) => e.at)) : null

  const balanceNow = holder.balanceNow
  const snapshot = holder.balanceAtSnapshot
  const drift = balanceNow != null && snapshot > 0 ? (balanceNow - snapshot) / snapshot : null

  const signals: ModelSignal[] = []
  const add = (id: string, label: string, detail: string, points: number) => {
    if (points === 0) return
    signals.push({ id, label, detail, points, effect: points > 0 ? 'sell' : 'hold', strength: strengthOf(points) })
  }

  if (n >= 3 && sells.length > 0) {
    add(
      'rate',
      'Sells often',
      `${sells.length} sells across ~${Math.max(spanDays, 1).toFixed(1)} days (${sellRate.toFixed(1)} per day)`,
      clamp(0.45 * sellRate, 0, 1.6),
    )
  }
  if (lastSellAt != null) {
    const age = now - lastSellAt
    if (age <= DAY) add('recent', 'Sold very recently', `Last sell ${ago(age)}`, 0.8)
    else if (age <= 3 * DAY) add('recent', 'Sold recently', `Last sell ${ago(age)}`, 0.35)
  }
  // Only when there are some sells: with zero sells the 'idle' signal below
  // already covers the same behavior, and counting both would double it.
  if (n >= 4 && sells.length > 0 && buys.length > sells.length * 2) {
    add('flow', 'Accumulating', `${buys.length} buys against ${sells.length} sells`, -0.6)
  }
  if (n >= 6 && sells.length === 0) {
    add('idle', 'No sells on record', `None in the last ${n} transfers`, -0.9)
  }
  if (drift != null && drift < 0) {
    const down = -drift
    add(
      'drawdown',
      'Already trimming',
      `Balance down ${(down * 100).toFixed(1)}% since the window opened (${QUALIFYING_SELL_PCT}% resolves YES)`,
      clamp((down / (QUALIFYING_SELL_PCT / 100)) * 3, 0, 3),
    )
  } else if (drift != null && drift > 0.005) {
    add('drawdown', 'Adding to position', `Balance up ${(drift * 100).toFixed(1)}% since the window opened`, -0.4)
  }

  // Two kinds of evidence, treated differently:
  //  - Behavioral signals (history) describe a full window, are noisy with few
  //    transfers, so they are shrunk toward the prior by sample size, then
  //    scaled to the time left: the question is "sells before it closes", so
  //    with no sell yet the chance falls as the clock runs (constant hazard).
  //  - The live drawdown is a direct reading of progress toward the resolving
  //    threshold (the server resolves on exactly this balance drop), so it is
  //    added afterward, not shrunk by how much history exists.
  const drawdown = signals.find((s) => s.id === 'drawdown')
  const behaviorPoints = signals.filter((s) => s.id !== 'drawdown').reduce((s, x) => s + x.points, 0)
  const historyConfidence = clamp(n / FULL_CONFIDENCE_SAMPLE, 0, 1)
  const windowLength = holder.closesAt - holder.opensAt
  const timeLeft = windowLength > 0 ? clamp((holder.closesAt - now) / windowLength, 0, 1) : 1
  const scale = (p: number) => clamp(1 - Math.pow(1 - p, timeLeft), 0.001, 0.999)
  const behaviorP = BASE_RATE + historyConfidence * (sigmoid(logit(BASE_RATE) + behaviorPoints) - BASE_RATE)
  const pYes = clamp(sigmoid(logit(scale(behaviorP)) + (drawdown?.points ?? 0)), 0.001, 0.999)
  const confidence = clamp(historyConfidence + (drawdown ? 0.35 : 0), 0, 1)

  const partial = sells.length
    ? sells.filter((e) => e.amount < 0.5 * snapshot).length / sells.length
    : null
  const traderType =
    n < 6 ? 'Not enough history'
    : sells.length === 0 ? 'Holder'
    : buys.length > sells.length * 2 ? 'Accumulator'
    : sellRate >= 1 ? 'Active trader'
    : partial != null && partial >= 0.6 ? 'Profit taker'
    : 'Occasional seller'

  const supplyPct = totalSupply ? (snapshot / totalSupply) * 100 : null
  const dna: WalletDna = {
    traderType,
    sellFrequency: n < 3 ? 'Not enough history' : sellRate < 0.2 ? 'Low' : sellRate < 1 ? 'Medium' : 'High',
    partialExits: partial != null ? `About ${Math.round(partial * 100)}% of sells` : 'No sells on record',
    averageHold: 'Needs full transfer history',
    exitTrigger: 'Needs price history',
    position: [
      supplyPct != null ? `${supplyPct.toFixed(2)}% of supply` : null,
      drift != null ? `${drift >= 0 ? '+' : ''}${(drift * 100).toFixed(1)}% this window` : null,
    ].filter(Boolean).join(', ') || 'Tracking',
  }

  return { pYes, confidence, sampleSize: n, signals, dna }
}

export function confidenceLabel(c: number): 'Low' | 'Medium' | 'High' {
  return c < 0.34 ? 'Low' : c < 0.67 ? 'Medium' : 'High'
}
