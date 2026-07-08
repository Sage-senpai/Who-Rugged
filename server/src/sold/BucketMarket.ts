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
import type {
  BucketId,
  BucketPools,
  BucketHolderMarket,
  BucketPosition,
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
}

export class BucketMarket extends DurableObject<BucketEnv> {
  private async state(): Promise<MarketState | null> {
    return (await this.ctx.storage.get<MarketState>('market')) ?? null
  }
  private async positions(): Promise<BucketPosition[]> {
    return (await this.ctx.storage.get<BucketPosition[]>('positions')) ?? []
  }
  private sampleIntervalMs(): number {
    const min = parseFloat(this.env.SOLD_SAMPLE_INTERVAL_MIN ?? String(SAMPLE_INTERVAL_MIN_DEFAULT))
    return Math.max(1, min) * 60_000
  }

  /** Idempotently open the market for this window and schedule sampling. */
  async ensureOpen(windowId: string, holders: OpenHolder[], opensAt: number, closesAt: number): Promise<MarketState> {
    const existing = await this.state()
    if (existing) return existing
    const state: MarketState = {
      windowId,
      opensAt,
      closesAt,
      status: 'open',
      holders: holders.map((h) => ({
        wallet: h.wallet,
        handle: h.handle,
        avatarSeed: h.avatarSeed,
        balanceAtSnapshot: h.balanceAtSnapshot,
        balanceNow: null,
        pools: seedPools(h.wallet),
        bettors: 6 + (hashStr(h.wallet) % 40),
        opensAt,
        closesAt,
        resolvedBucket: undefined,
      })),
    }
    await this.ctx.storage.put('market', state)
    await this.ctx.storage.put('positions', [] as BucketPosition[])
    await this.ctx.storage.setAlarm(Math.min(opensAt + this.sampleIntervalMs(), closesAt))
    return state
  }

  /** Market view with each holder enriched by its real (backed) pool. */
  async getMarket(): Promise<(MarketState & { holders: BucketHolderMarket[] }) | null> {
    const state = await this.state()
    if (!state) return null
    const positions = await this.positions()
    return {
      ...state,
      holders: state.holders.map((h) => ({ ...h, realPools: realPoolsFor(positions, h.wallet) })),
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

  async getLeaderboard(): Promise<PredictorScore[]> {
    return (await this.ctx.storage.get<PredictorScore[]>('scores')) ?? []
  }

  /** Sample balances; lock any holder whose balance has dropped past threshold. */
  private async sample(state: MarketState, elapsedHours: number): Promise<void> {
    const oracle = new SolanaOracle(this.env.ALCHEMY_API_KEY, this.env.ANSEM_MINT ?? ANSEM_MINT_DEFAULT)
    const threshold = parseFloat(this.env.SOLD_SELL_THRESHOLD ?? String(SELL_THRESHOLD_DEFAULT))
    const pending = state.holders.filter((h) => h.resolvedBucket == null)
    if (pending.length === 0) return
    const balances = await oracle.fetchCurrentBalances(pending.map((h) => h.wallet))
    for (const h of pending) {
      const bal = balances.find((b) => b.wallet === h.wallet)
      if (!bal) continue
      h.balanceNow = bal.balance
      const before = h.balanceAtSnapshot
      if (before > 0 && (before - bal.balance) / before > threshold) {
        // locks the holder: bet() now rejects, killing the front-run window
        h.resolvedBucket = bucketForElapsed(elapsedHours)
      }
    }
  }

  /** Settle every holder parimutuel from REAL stakes only, then score. */
  private async settle(state: MarketState): Promise<void> {
    for (const h of state.holders) if (h.resolvedBucket == null) h.resolvedBucket = 'holds'

    const positions = await this.positions()
    const scoreMap: Record<string, PredictorScore> = {}
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
