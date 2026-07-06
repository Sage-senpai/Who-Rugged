/* Client-side parimutuel market engine.

   The worker resolves markets against the live Solana oracle, but the odds and
   bet flow are pure bookkeeping, so we run them locally too: this makes the
   market fully interactive with or without the backend, and is the source of
   truth for the demo. Seed liquidity simulates an existing crowd (deterministic
   per wallet, so odds are stable across reloads); real bets are layered on top
   and persisted. Nothing here encodes our opinion — seed spread is derived from
   the wallet hash alone, the same way a fresh order book would look. */
import { BUCKET_IDS, emptyPools, type BucketId, type Pools } from './buckets'
import type { HolderMarket, MarketPosition, PlaceResult } from './marketTypes'

const STORE_KEY = 'who-sold:market:v1'
const DEFAULT_STAKE = 50

interface Store {
  windowId: string
  /** Extra liquidity added by real bets, per wallet. */
  contributions: Record<string, Pools>
  /** Every position placed this window. */
  positions: MarketPosition[]
}

// ── deterministic PRNG (mulberry32 over a string hash) ──────────────────────
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic seed liquidity for a wallet — a plausible, varied order book. */
export function seedPools(wallet: string): Pools {
  const rng = mulberry32(hashStr(wallet))
  const weights = BUCKET_IDS.map(() => 0.3 + rng() * rng()) // skewed, never zero
  const sum = weights.reduce((s, w) => s + w, 0)
  const liquidity = 1800 + Math.floor(rng() * 4200) // 1.8k–6k seed pool
  const pools = emptyPools()
  BUCKET_IDS.forEach((id, i) => {
    pools[id] = Math.round((weights[i] / sum) * liquidity)
  })
  return pools
}

// ── persistence ─────────────────────────────────────────────────────────────
function readStore(windowId: string): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Store
      if (s.windowId === windowId) return s
    }
  } catch { /* fall through to fresh */ }
  return { windowId, contributions: {}, positions: [] }
}
function writeStore(s: Store): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch { /* non-fatal */ }
}

// ── public API ────────────────────────────────────────────────────────────────
export interface HolderSeed {
  wallet: string
  handle: string
  avatarSeed: string
  balanceAtSnapshot: number
  balanceNow: number | null
}

export function buildMarket(
  holder: HolderSeed,
  windowId: string,
  opensAt: number,
  closesAt: number,
): HolderMarket {
  const store = readStore(windowId)
  const seed = seedPools(holder.wallet)
  const mine = store.contributions[holder.wallet] ?? emptyPools()
  const pools = emptyPools()
  for (const id of BUCKET_IDS) pools[id] = seed[id] + mine[id]
  const bettors = store.positions.filter((p) => p.wallet === holder.wallet).length
  return {
    wallet: holder.wallet,
    handle: holder.handle,
    avatarSeed: holder.avatarSeed,
    balanceAtSnapshot: holder.balanceAtSnapshot,
    balanceNow: holder.balanceNow,
    pools,
    // seed a believable crowd size alongside real bettors
    bettors: bettors + 6 + (hashStr(holder.wallet) % 40),
    opensAt,
    closesAt,
  }
}

export function placeBet(
  windowId: string,
  wallet: string,
  bucket: BucketId,
  stake: number,
  predictor: string,
): PlaceResult {
  if (!predictor) return { ok: false, error: 'not-connected' }
  if (stake <= 0) return { ok: false, error: 'bad-stake' }
  const store = readStore(windowId)
  const contrib = (store.contributions[wallet] ??= emptyPools())
  // one position per predictor per holder — replace on re-bet
  const prev = store.positions.find((p) => p.wallet === wallet && p.predictor === predictor)
  if (prev) contrib[prev.bucket] = Math.max(0, contrib[prev.bucket] - prev.stake)
  contrib[bucket] += stake
  store.positions = store.positions.filter((p) => !(p.wallet === wallet && p.predictor === predictor))
  store.positions.push({ wallet, bucket, stake, predictor, placedAt: Date.now() })
  writeStore(store)
  return { ok: true }
}

export function myPositions(windowId: string, predictor: string | null): MarketPosition[] {
  if (!predictor) return []
  return readStore(windowId).positions.filter((p) => p.predictor === predictor)
}

export function myPositionFor(
  windowId: string,
  predictor: string | null,
  wallet: string,
): MarketPosition | undefined {
  if (!predictor) return undefined
  return readStore(windowId).positions.find((p) => p.predictor === predictor && p.wallet === wallet)
}

export { DEFAULT_STAKE }
