/* Backend analytics engine: scores each pending holder's P(sell this window)
   from real wallet transfer history. This is the source for the "i" icon on
   each arena card — a cached, arena-level signal, not something computed live
   per page view (activity fetches are too slow/expensive for that: see
   BucketMarket's throttling).

   This mirrors src/sold/dmp/walletModel.ts's core scoring so the number a
   player sees on the arena card matches what they see once they open a
   specific holder's Read screen. Kept as a separate file because the
   frontend and this Worker are different builds — same pattern already used
   for the binary/magnitude/bucket types mirrored across both sides. DNA/
   trader-type fields live only in the frontend copy; this only needs the
   number. If the two ever drift, trust the frontend's copy as the source
   the player actually sees and port changes back here. */
import type { ActivityEvent } from './SolanaOracle'

export const BASE_RATE = 0.2
const FULL_CONFIDENCE_SAMPLE = 12
const DAY = 86_400_000

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const logit = (p: number) => Math.log(p / (1 - p))

export interface WalletScore {
  wallet: string
  pYes: number
  confidence: number
  sampleSize: number
}

export function scoreWallet(
  wallet: string,
  activity: ActivityEvent[],
  balanceAtSnapshot: number,
  balanceNow: number | null,
  opensAt: number,
  closesAt: number,
): WalletScore {
  const now = Date.now()
  const events = activity.filter((e) => e.kind !== 'unknown')
  const sells = events.filter((e) => e.kind === 'sell')
  const buys = events.filter((e) => e.kind === 'buy')
  const n = events.length
  const times = events.map((e) => e.at)
  const spanDays = n > 1 ? (Math.max(...times) - Math.min(...times)) / DAY : 0
  const sellRate = sells.length / Math.max(spanDays, 1)
  const lastSellAt = sells.length ? Math.max(...sells.map((e) => e.at)) : null

  const drift = balanceNow != null && balanceAtSnapshot > 0 ? (balanceNow - balanceAtSnapshot) / balanceAtSnapshot : null

  let points = 0
  if (n >= 3 && sells.length > 0) points += clamp(0.45 * sellRate, 0, 1.6)
  if (lastSellAt != null) {
    const age = now - lastSellAt
    if (age <= DAY) points += 0.8
    else if (age <= 3 * DAY) points += 0.35
  }
  if (n >= 4 && sells.length > 0 && buys.length > sells.length * 2) points -= 0.6
  if (n >= 6 && sells.length === 0) points -= 0.9
  let drawdownPoints = 0
  if (drift != null && drift < 0) drawdownPoints = clamp((-drift / 0.1) * 3, 0, 3)
  else if (drift != null && drift > 0.005) points -= 0.4

  const historyConfidence = clamp(n / FULL_CONFIDENCE_SAMPLE, 0, 1)
  const windowLength = closesAt - opensAt
  const timeLeft = windowLength > 0 ? clamp((closesAt - now) / windowLength, 0, 1) : 1
  const scale = (p: number) => clamp(1 - Math.pow(1 - p, timeLeft), 0.001, 0.999)
  const behaviorP = BASE_RATE + historyConfidence * (sigmoid(logit(BASE_RATE) + points) - BASE_RATE)
  const pYes = clamp(sigmoid(logit(scale(behaviorP)) + drawdownPoints), 0.001, 0.999)
  const confidence = clamp(historyConfidence + (drawdownPoints > 0 ? 0.35 : 0), 0, 1)

  return { wallet, pYes, confidence, sampleSize: n }
}

export interface ArenaAnalytics {
  computedAt: number
  /** Highest individual P(sell) among scored holders, or null when nobody
      had enough history to produce a real read. */
  topPYes: number | null
  topWallet: string | null
  topHandle: string | null
  scored: number
  total: number
}

export function summarizeArena(scores: (WalletScore & { handle: string })[]): ArenaAnalytics {
  const usable = scores.filter((s) => s.sampleSize > 0)
  const top = usable.length ? usable.reduce((a, b) => (b.pYes > a.pYes ? b : a)) : null
  return {
    computedAt: Date.now(),
    topPYes: top?.pYes ?? null,
    topWallet: top?.wallet ?? null,
    topHandle: top?.handle ?? null,
    scored: usable.length,
    total: scores.length,
  }
}
