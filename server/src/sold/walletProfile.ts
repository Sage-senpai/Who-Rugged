/* Persisted, cross-market wallet behavioral profile.

   walletAnalytics.ts's scoreWallet() is intentionally stateless: it recomputes
   a score from whatever slice of activity was just fetched (capped at ~20
   recent signatures, see SolanaOracle.fetchRecentActivity). That's fine for a
   single market's live odds, but it means the system never actually
   accumulates intelligence about a wallet across visits/markets/windows —
   every lookup starts from zero.

   This module is the fix: a small, durable record per (chain, wallet) that
   every lookup merges its freshly-fetched activity into, deduped by
   transaction signature so re-fetching the same recent window doesn't
   double-count. Callers persist it via Directory's walletProfileTouch (see
   index.ts) — Directory is already the one global, cross-request Durable
   Object in this codebase, so this piggybacks on it rather than adding a new
   DO class + binding for one small KV namespace. */
import type { ActivityEvent } from './SolanaOracle'

export interface WalletProfile {
  wallet: string
  chain: string
  firstSeen: number
  lastUpdated: number
  totals: Record<ActivityEvent['kind'], number>
  /** Count of classified (non-'unknown') events ever merged in — the spec's
      "sample size" / evidence quantity, independent of any single fetch's cap. */
  sampleSize: number
  /** Bounded dedup set so merging the same recent window repeatedly doesn't
      inflate totals. Oldest signatures drop off past MAX_TRACKED_SIGNATURES —
      acceptable since the totals themselves (not this list) are the running
      lifetime counters. */
  recentSignatures: string[]
}

const MAX_TRACKED_SIGNATURES = 500
/** Mirrors walletAnalytics.ts's FULL_CONFIDENCE_SAMPLE so a profile-derived
    confidence reads on the same scale as the existing per-market score. */
const FULL_CONFIDENCE_SAMPLE = 12

const emptyTotals = (): Record<ActivityEvent['kind'], number> => ({
  buy: 0, sell: 0, transfer: 0, burn: 0, bridge: 0, unknown: 0,
})

export function emptyProfile(chain: string, wallet: string): WalletProfile {
  const now = Date.now()
  return { wallet, chain, firstSeen: now, lastUpdated: now, totals: emptyTotals(), sampleSize: 0, recentSignatures: [] }
}

/** Merges new activity into an existing profile, in place, and returns it.
 *  Insufficient/no new events is a no-op (lastUpdated only moves forward on
 *  an actual merge, so "last updated" means "last time new evidence arrived",
 *  not "last time anyone asked"). */
export function mergeActivity(profile: WalletProfile, events: ActivityEvent[]): WalletProfile {
  const seen = new Set(profile.recentSignatures)
  let added = false
  for (const e of events) {
    if (seen.has(e.signature)) continue
    seen.add(e.signature)
    profile.totals[e.kind] += 1
    if (e.kind !== 'unknown') profile.sampleSize += 1
    added = true
  }
  if (added) {
    profile.recentSignatures = [...seen].slice(-MAX_TRACKED_SIGNATURES)
    profile.lastUpdated = Date.now()
  }
  return profile
}

export interface WalletBehavioralFeatures {
  wallet: string
  chain: string
  sampleSize: number
  /** 0-1, same FULL_CONFIDENCE_SAMPLE shrinkage convention as walletAnalytics.ts.
      This is "do we have enough evidence", not "how sure are we of a direction" —
      matches the PDF's cold-start rule: insufficient history -> neutral baseline,
      never a fabricated read. */
  confidence: number
  buySellRatio: number | null
  sellPropensity: number
  walletAgeMs: number
}

export function deriveFeatures(profile: WalletProfile): WalletBehavioralFeatures {
  const { buy, sell } = profile.totals
  const total = profile.sampleSize
  return {
    wallet: profile.wallet,
    chain: profile.chain,
    sampleSize: total,
    confidence: Math.max(0, Math.min(1, total / FULL_CONFIDENCE_SAMPLE)),
    buySellRatio: sell > 0 ? buy / sell : null,
    sellPropensity: total > 0 ? sell / total : 0,
    walletAgeMs: Date.now() - profile.firstSeen,
  }
}
