/* WHO SOLD? time-bucket market — one Durable Object per 12h window.

   Each tracked holder gets a 5-outcome market: <1h / 1–3h / 3–6h / 6–12h /
   HODL. Odds are pure parimutuel (an outcome's share of its pool), no house
   edge, no built-in bias — seed liquidity is derived from the wallet hash alone,
   the same seed the frontend uses, so odds are identical before anyone bets.

   Anti-manipulation:
   - Front-running the oracle: a holder's sell is public on-chain the instant it
     happens, so we sample balances on a short interval (default 3 min) and LOCK
     a holder's market the moment a drop is detected. Once locked, no more bets
     land on that holder, so nobody can bet a known outcome. The window a sell is
     observable-but-still-open shrinks from hours to one sample interval.
   - Solvency: seed liquidity is display-only. Settlement redistributes ONLY real
     staked points — winners split the losers' real stakes — so payouts are fully
     backed and the book is zero-sum by construction. Seed never pays out.

   Fully additive: its own DO class + own alarm, so it never touches the existing
   PredictionPool / batch settlement. */
import { DurableObject } from 'cloudflare:workers'
import { SolanaOracle } from './SolanaOracle'
import { BscOracle } from './BscOracle'
import { ZashClient } from './ZashClient'
import { scoreWallet, summarizeArena, type ArenaAnalytics } from './walletAnalytics'
import type {
  ArenaSource,
  BucketId,
  BucketPools,
  BucketHolderMarket,
  BucketPosition,
  BinarySide,
  BinaryPools,
  BinaryPosition,
  MagnitudeBand,
  MagnitudePools,
  MagnitudePosition,
  PredictorScore,
} from './types'

export interface BucketEnv {
  ALCHEMY_API_KEY?: string
  ANSEM_MINT?: string
  SOLD_SELL_THRESHOLD?: string
  /** How often to sample balances, in minutes (default 3). Lower = smaller
      front-run window, more oracle reads. */
  SOLD_SAMPLE_INTERVAL_MIN?: string
}

const ANSEM_MINT_DEFAULT = '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump'
const SELL_THRESHOLD_DEFAULT = 0.1
const SAMPLE_INTERVAL_MIN_DEFAULT = 3
const HOUR = 3_600_000

const BUCKET_IDS: BucketId[] = ['lt1h', 'h1_3', 'h3_6', 'h6_12', 'holds']
const emptyPools = (): BucketPools => ({ lt1h: 0, h1_3: 0, h3_6: 0, h6_12: 0, holds: 0 })

const BINARY_SIDES: BinarySide[] = ['yes', 'no']
const emptyBinaryPools = (): BinaryPools => ({ yes: 0, no: 0 })

const MAGNITUDE_BANDS: MagnitudeBand[] = ['b0_10', 'b10_25', 'b25_50', 'b50_75', 'b75_100']
const emptyMagnitudePools = (): MagnitudePools => ({ b0_10: 0, b10_25: 0, b25_50: 0, b50_75: 0, b75_100: 0 })

/** Which magnitude band a real (before-after)/before drop ratio falls into. */
function bandForRatio(ratio: number): MagnitudeBand {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  if (pct <= 10) return 'b0_10'
  if (pct <= 25) return 'b10_25'
  if (pct <= 50) return 'b25_50'
  if (pct <= 75) return 'b50_75'
  return 'b75_100'
}

/** Which timed bucket a sell first detected at `elapsedHours` since open belongs to. */
function bucketForElapsed(elapsedHours: number): BucketId {
  if (elapsedHours <= 1) return 'lt1h'
  if (elapsedHours <= 3) return 'h1_3'
  if (elapsedHours <= 6) return 'h3_6'
  return 'h6_12'
}

/** Sum of real staked points per outcome for one holder (the backed pool). */
function realPoolsFor(positions: BucketPosition[], wallet: string): BucketPools {
  const pools = emptyPools()
  for (const p of positions) if (p.wallet === wallet) pools[p.bucket] += p.stake
  return pools
}

function realBinaryPoolsFor(positions: BinaryPosition[], wallet: string): BinaryPools {
  const pools = emptyBinaryPools()
  for (const p of positions) if (p.wallet === wallet) pools[p.side] += p.stake
  return pools
}

function realMagnitudePoolsFor(positions: MagnitudePosition[], wallet: string): MagnitudePools {
  const pools = emptyMagnitudePools()
  for (const p of positions) if (p.wallet === wallet) pools[p.band] += p.stake
  return pools
}

// ── deterministic seed liquidity (must match src/sold/market/localMarket.ts) ──
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
function seedPools(wallet: string): BucketPools {
  const rng = mulberry32(hashStr(wallet))
  const weights = BUCKET_IDS.map(() => 0.3 + rng() * rng())
  const sum = weights.reduce((s, w) => s + w, 0)
  const liquidity = 1800 + Math.floor(rng() * 4200)
  const pools = emptyPools()
  BUCKET_IDS.forEach((id, i) => {
    pools[id] = Math.round((weights[i] / sum) * liquidity)
  })
  return pools
}

// Salted per dimension (':binary' / ':magnitude') so a wallet's odds don't look
// identical-shaped across markets — must mirror the same salt in
// src/sold/market/localMarket.ts so local-preview odds match live mode.
function seedBinaryPools(wallet: string): BinaryPools {
  const rng = mulberry32(hashStr(wallet + ':binary'))
  const weights = BINARY_SIDES.map(() => 0.3 + rng() * rng())
  const sum = weights.reduce((s, w) => s + w, 0)
  const liquidity = 1800 + Math.floor(rng() * 4200)
  const pools = emptyBinaryPools()
  BINARY_SIDES.forEach((id, i) => {
    pools[id] = Math.round((weights[i] / sum) * liquidity)
  })
  return pools
}

function seedMagnitudePools(wallet: string): MagnitudePools {
  const rng = mulberry32(hashStr(wallet + ':magnitude'))
  const weights = MAGNITUDE_BANDS.map(() => 0.3 + rng() * rng())
  const sum = weights.reduce((s, w) => s + w, 0)
  const liquidity = 1800 + Math.floor(rng() * 4200)
  const pools = emptyMagnitudePools()
  MAGNITUDE_BANDS.forEach((id, i) => {
    pools[id] = Math.round((weights[i] / sum) * liquidity)
  })
  return pools
}

export interface OpenHolder {
  wallet: string
  handle: string
  avatarSeed: string
  balanceAtSnapshot: number
}

interface MarketState {
  windowId: string
  opensAt: number
  closesAt: number
  status: 'open' | 'resolving' | 'settled'
  holders: BucketHolderMarket[]
  /** Balance source for non-ANSEM arenas. Absent = the original ANSEM path. */
  source?: ArenaSource
  /** Cached "i" icon signal (server/src/sold/walletAnalytics.ts). Only
      computed for Solana-sourced arenas — see computeAnalytics(). */
  analytics?: ArenaAnalytics
}

export class BucketMarket extends DurableObject<BucketEnv> {
  private async state(): Promise<MarketState | null> {
    return (await this.ctx.storage.get<MarketState>('market')) ?? null
  }
  private async positions(): Promise<BucketPosition[]> {
    return (await this.ctx.storage.get<BucketPosition[]>('positions')) ?? []
  }
  private async binaryPositions(): Promise<BinaryPosition[]> {
    return (await this.ctx.storage.get<BinaryPosition[]>('binaryPositions')) ?? []
  }
  private async magnitudePositions(): Promise<MagnitudePosition[]> {
    return (await this.ctx.storage.get<MagnitudePosition[]>('magnitudePositions')) ?? []
  }
  private sampleIntervalMs(): number {
    const min = parseFloat(this.env.SOLD_SAMPLE_INTERVAL_MIN ?? String(SAMPLE_INTERVAL_MIN_DEFAULT))
    return Math.max(1, min) * 60_000
  }

  /** Idempotently open the market for this window and schedule sampling. */
  async ensureOpen(
    windowId: string,
    holders: OpenHolder[],
    opensAt: number,
    closesAt: number,
    source?: ArenaSource,
  ): Promise<MarketState> {
    const existing = await this.state()
    if (existing) return existing
    const state: MarketState = {
      windowId,
      opensAt,
      closesAt,
      status: 'open',
      source,
      holders: holders.map((h) => ({
        wallet: h.wallet,
        handle: h.handle,
        avatarSeed: h.avatarSeed,
        balanceAtSnapshot: h.balanceAtSnapshot,
        balanceNow: null,
        pools: seedPools(h.wallet),
        binaryPools: seedBinaryPools(h.wallet),
        magnitudePools: seedMagnitudePools(h.wallet),
        bettors: 6 + (hashStr(h.wallet) % 40),
        opensAt,
        closesAt,
        resolvedBucket: undefined,
        dropRatio: null,
      })),
    }
    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('positions', [] as BucketPosition[])
    await this.ctx.storage.put('binaryPositions', [] as BinaryPosition[])
    await this.ctx.storage.put('magnitudePositions', [] as MagnitudePosition[])
    await this.ctx.storage.setAlarm(Math.min(opensAt + this.sampleIntervalMs(), closesAt))
    return state
  }

  /** Market view with each holder enriched by its real (backed) pools + derived cross-dimension outcomes. */
  async getMarket(): Promise<(MarketState & { holders: BucketHolderMarket[] }) | null> {
    const state = await this.state()
    if (!state) return null
    const positions = await this.positions()
    const binaryPositions = await this.binaryPositions()
    const magnitudePositions = await this.magnitudePositions()
    return {
      ...state,
      holders: state.holders.map((h) => ({
        ...h,
        realPools: realPoolsFor(positions, h.wallet),
        realBinaryPools: realBinaryPoolsFor(binaryPositions, h.wallet),
        realMagnitudePools: realMagnitudePoolsFor(magnitudePositions, h.wallet),
        resolvedBinary: h.resolvedBucket == null ? null : h.resolvedBucket === 'holds' ? 'no' : 'yes',
        resolvedMagnitudeBand: h.resolvedBucket == null || h.dropRatio == null ? null : bandForRatio(h.dropRatio),
      })),
    }
  }

  async bet(predictor: string, wallet: string, bucket: BucketId, stake: number): Promise<{ ok: boolean; error?: string }> {
    if (!predictor) return { ok: false, error: 'not-connected' }
    if (!BUCKET_IDS.includes(bucket)) return { ok: false, error: 'bad-bucket' }
    if (!(stake > 0)) return { ok: false, error: 'bad-stake' }
    const state = await this.state()
    if (!state || state.status !== 'open') return { ok: false, error: 'market-not-open' }
    const holder = state.holders.find((h) => h.wallet === wallet)
    if (!holder) return { ok: false, error: 'unknown-wallet' }
    // Front-run guard: once a sell is detected the outcome is known — no more bets.
    if (holder.resolvedBucket != null) return { ok: false, error: 'holder-locked' }
    if (Date.now() >= state.closesAt) return { ok: false, error: 'window-closed' }

    const positions = await this.positions()
    // one position per predictor per holder — replace on re-bet, backing out the old stake
    const prevIdx = positions.findIndex((p) => p.predictor === predictor && p.wallet === wallet)
    if (prevIdx >= 0) {
      const prev = positions[prevIdx]
      holder.pools[prev.bucket] = Math.max(0, holder.pools[prev.bucket] - prev.stake)
      positions.splice(prevIdx, 1)
    } else {
      holder.bettors += 1
    }
    holder.pools[bucket] += stake
    positions.push({ wallet, bucket, stake, predictor, placedAt: Date.now() })

    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('positions', positions)
    return { ok: true }
  }

  async getPositions(predictor?: string): Promise<BucketPosition[]> {
    const positions = await this.positions()
    return predictor ? positions.filter((p) => p.predictor === predictor) : positions
  }

  async betBinary(
    predictor: string,
    wallet: string,
    side: BinarySide,
    stake: number,
    probabilityYes?: number,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!predictor) return { ok: false, error: 'not-connected' }
    if (!BINARY_SIDES.includes(side)) return { ok: false, error: 'bad-side' }
    if (!(stake > 0)) return { ok: false, error: 'bad-stake' }
    if (probabilityYes != null && !(probabilityYes >= 0 && probabilityYes <= 1)) {
      return { ok: false, error: 'bad-probability' }
    }
    const state = await this.state()
    if (!state || state.status !== 'open') return { ok: false, error: 'market-not-open' }
    const holder = state.holders.find((h) => h.wallet === wallet)
    if (!holder) return { ok: false, error: 'unknown-wallet' }
    if (holder.resolvedBucket != null) return { ok: false, error: 'holder-locked' }
    if (Date.now() >= state.closesAt) return { ok: false, error: 'window-closed' }
    if (!holder.binaryPools) holder.binaryPools = seedBinaryPools(wallet)

    const positions = await this.binaryPositions()
    const prevIdx = positions.findIndex((p) => p.predictor === predictor && p.wallet === wallet)
    if (prevIdx >= 0) {
      const prev = positions[prevIdx]
      holder.binaryPools[prev.side] = Math.max(0, holder.binaryPools[prev.side] - prev.stake)
      positions.splice(prevIdx, 1)
    }
    holder.binaryPools[side] += stake
    positions.push({ wallet, side, stake, predictor, placedAt: Date.now(), probabilityYes })

    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('binaryPositions', positions)
    return { ok: true }
  }

  async betMagnitude(predictor: string, wallet: string, band: MagnitudeBand, stake: number): Promise<{ ok: boolean; error?: string }> {
    if (!predictor) return { ok: false, error: 'not-connected' }
    if (!MAGNITUDE_BANDS.includes(band)) return { ok: false, error: 'bad-band' }
    if (!(stake > 0)) return { ok: false, error: 'bad-stake' }
    const state = await this.state()
    if (!state || state.status !== 'open') return { ok: false, error: 'market-not-open' }
    const holder = state.holders.find((h) => h.wallet === wallet)
    if (!holder) return { ok: false, error: 'unknown-wallet' }
    if (holder.resolvedBucket != null) return { ok: false, error: 'holder-locked' }
    if (Date.now() >= state.closesAt) return { ok: false, error: 'window-closed' }
    if (!holder.magnitudePools) holder.magnitudePools = seedMagnitudePools(wallet)

    const positions = await this.magnitudePositions()
    const prevIdx = positions.findIndex((p) => p.predictor === predictor && p.wallet === wallet)
    if (prevIdx >= 0) {
      const prev = positions[prevIdx]
      holder.magnitudePools[prev.band] = Math.max(0, holder.magnitudePools[prev.band] - prev.stake)
      positions.splice(prevIdx, 1)
    }
    holder.magnitudePools[band] += stake
    positions.push({ wallet, band, stake, predictor, placedAt: Date.now() })

    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('magnitudePositions', positions)
    return { ok: true }
  }

  async getBinaryPositions(predictor?: string): Promise<BinaryPosition[]> {
    const positions = await this.binaryPositions()
    return predictor ? positions.filter((p) => p.predictor === predictor) : positions
  }

  async getMagnitudePositions(predictor?: string): Promise<MagnitudePosition[]> {
    const positions = await this.magnitudePositions()
    return predictor ? positions.filter((p) => p.predictor === predictor) : positions
  }

  async getLeaderboard(): Promise<PredictorScore[]> {
    return (await this.ctx.storage.get<PredictorScore[]>('scores')) ?? []
  }

  /** Sample balances; lock any holder whose balance has dropped past threshold. */
  private async liveBalances(state: MarketState, wallets: string[]): Promise<Map<string, number | null>> {
    const src = state.source
    if (!src) {
      // Original ANSEM path, unchanged (curated registry with snapshot fallback).
      const oracle = new SolanaOracle(this.env.ALCHEMY_API_KEY, this.env.ANSEM_MINT ?? ANSEM_MINT_DEFAULT)
      const rows = await oracle.fetchCurrentBalances(wallets)
      return new Map(rows.map((r) => [r.wallet, r.balance]))
    }
    if (src.kind === 'solana') return new SolanaOracle(this.env.ALCHEMY_API_KEY, src.mint).fetchLiveBalances(wallets)
    if (src.kind === 'bsc') return new BscOracle(undefined).fetchBalances(src.contract, wallets)
    return new ZashClient().fetchBalances(src.projectId, wallets)
  }

  /** How often to recompute the "i" icon signal. Wallet-history reads are
      heavy (a getSignaturesForAddress + up to N getParsedTransaction calls
      per wallet), so this is far coarser than the balance sample interval —
      that one's cheap (one RPC call per wallet), this one isn't. */
  private static readonly ANALYTICS_REFRESH_MS = 20 * 60_000

  /** Only Solana arenas can be scored right now — SolanaOracle is the only
      oracle with a transfer-history read; BscOracle/ZashClient have none.
      Honest gap, not a bug: those arenas simply carry no `analytics` field,
      and the frontend says so rather than showing a fabricated number. */
  private async maybeRefreshAnalytics(state: MarketState): Promise<void> {
    const src = state.source
    if (src && src.kind !== 'solana') return
    if (Date.now() - (state.analytics?.computedAt ?? 0) < BucketMarket.ANALYTICS_REFRESH_MS) return

    const mint = src?.kind === 'solana' ? src.mint : (this.env.ANSEM_MINT ?? ANSEM_MINT_DEFAULT)
    const oracle = new SolanaOracle(this.env.ALCHEMY_API_KEY, mint)
    const pending = state.holders.filter((h) => h.resolvedBucket == null)
    const scores = await Promise.all(
      pending.map(async (h) => {
        const activity = await oracle.fetchRecentActivity(h.wallet, 10)
        return { ...scoreWallet(h.wallet, activity, h.balanceAtSnapshot, h.balanceNow, state.opensAt, state.closesAt), handle: h.handle }
      }),
    )
    state.analytics = summarizeArena(scores)
  }

  private async sample(state: MarketState, elapsedHours: number): Promise<void> {
    const threshold = parseFloat(this.env.SOLD_SELL_THRESHOLD ?? String(SELL_THRESHOLD_DEFAULT))
    const pending = state.holders.filter((h) => h.resolvedBucket == null)
    if (pending.length === 0) return
    const balances = await this.liveBalances(state, pending.map((h) => h.wallet))
    for (const h of pending) {
      const now = balances.get(h.wallet)
      // Unknown (failed read) is skipped, never treated as a zero balance.
      if (now == null) continue
      h.balanceNow = now
      const before = h.balanceAtSnapshot
      h.dropRatio = before > 0 ? Math.max(0, (before - now) / before) : 0
      if (before > 0 && (before - now) / before > threshold) {
        // locks the holder: bet() now rejects, killing the front-run window
        h.resolvedBucket = bucketForElapsed(elapsedHours)
      }
    }
  }

  /** Settle every holder parimutuel from REAL stakes only, then score. */
  private async settle(state: MarketState): Promise<void> {
    for (const h of state.holders) if (h.resolvedBucket == null) h.resolvedBucket = 'holds'

    const positions = await this.positions()
    const binaryPositions = await this.binaryPositions()
    const magnitudePositions = await this.magnitudePositions()
    const scoreMap: Record<string, PredictorScore> = {}

    const settleDimension = <T extends { wallet: string; stake: number; predictor: string }>(
      pos: T[],
      outcomeOf: (p: T) => boolean,
      winnerPoolOf: (wallet: string) => number,
      loserPoolOf: (wallet: string) => number,
    ) => {
      for (const p of pos) {
        const sc = (scoreMap[p.predictor] ??= { predictor: p.predictor, correct: 0, total: 0, pointsDelta: 0 })
        sc.total++
        const winnerPool = winnerPoolOf(p.wallet)
        const loserPool = loserPoolOf(p.wallet)
        if (outcomeOf(p)) {
          sc.correct++
          if (winnerPool > 0) sc.pointsDelta += Math.round((p.stake / winnerPool) * loserPool)
        } else {
          sc.pointsDelta -= winnerPool > 0 ? p.stake : 0
        }
      }
    }

    for (const h of state.holders) {
      const winning = h.resolvedBucket as BucketId
      const hp = positions.filter((p) => p.wallet === h.wallet)
      const realWinner = hp.filter((p) => p.bucket === winning).reduce((s, p) => s + p.stake, 0)
      const realTotal = hp.reduce((s, p) => s + p.stake, 0)
      const realLoser = realTotal - realWinner
      for (const p of hp) {
        const sc = (scoreMap[p.predictor] ??= { predictor: p.predictor, correct: 0, total: 0, pointsDelta: 0 })
        sc.total++
        if (p.bucket === winning) {
          sc.correct++
          // winners split the losers' real stakes; seed liquidity never pays
          if (realWinner > 0) sc.pointsDelta += Math.round((p.stake / realWinner) * realLoser)
        } else {
          // no winning counterparty → void that holder, refund the losers (delta 0)
          sc.pointsDelta -= realWinner > 0 ? p.stake : 0
        }
      }
    }

    // binary — resolvedBinary is a pure function of resolvedBucket, no new timing logic needed
    for (const h of state.holders) {
      const resolvedBinary: BinarySide = h.resolvedBucket === 'holds' ? 'no' : 'yes'
      const hp = binaryPositions.filter((p) => p.wallet === h.wallet)
      const realWinner = hp.filter((p) => p.side === resolvedBinary).reduce((s, p) => s + p.stake, 0)
      const realTotal = hp.reduce((s, p) => s + p.stake, 0)
      const realLoser = realTotal - realWinner
      settleDimension(hp, (p) => p.side === resolvedBinary, () => realWinner, () => realLoser)
    }

    // magnitude — resolvedMagnitudeBand derived from the same real oracle-read dropRatio
    for (const h of state.holders) {
      const resolvedBand = bandForRatio(h.dropRatio ?? 0)
      const hp = magnitudePositions.filter((p) => p.wallet === h.wallet)
      const realWinner = hp.filter((p) => p.band === resolvedBand).reduce((s, p) => s + p.stake, 0)
      const realTotal = hp.reduce((s, p) => s + p.stake, 0)
      const realLoser = realTotal - realWinner
      settleDimension(hp, (p) => p.band === resolvedBand, () => realWinner, () => realLoser)
    }

    state.status = 'settled'
    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('scores', Object.values(scoreMap))
  }

  async alarm(): Promise<void> {
    const state = await this.state()
    if (!state || state.status === 'settled') return

    const now = Date.now()
    const elapsedHours = (now - state.opensAt) / HOUR
    await this.sample(state, elapsedHours)
    await this.maybeRefreshAnalytics(state)

    const stillPending = state.holders.some((h) => h.resolvedBucket == null)
    if (now >= state.closesAt || !stillPending) {
      state.status = 'resolving'
      await this.ctx.storage.put('market', state)
      await this.settle(state)
    } else {
      await this.ctx.storage.put('market', state)
      await this.ctx.storage.setAlarm(Math.min(now + this.sampleIntervalMs(), state.closesAt))
    }
  }

  /** Dev-only: sample + settle immediately, regardless of schedule. */
  async resolveManual(): Promise<MarketState | null> {
    const state = await this.state()
    if (!state) return null
    const elapsedHours = Math.max(1, (Date.now() - state.opensAt) / HOUR)
    await this.sample(state, elapsedHours)
    await this.settle(state)
    return this.getMarket()
  }
}
