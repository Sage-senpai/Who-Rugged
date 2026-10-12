/* Client for Panta's public API (docs.panta.market) — binary YES/NO USDC
   prediction markets on Solana. Non-custodial: Panta quotes a price and
   returns an unsigned transaction/instruction list; the caller's wallet
   signs it, the caller broadcasts on its own RPC, then reports the
   signature back to Panta. This client never sees or holds a user's
   private key — only the platform's own PANTA_API_KEY, used server-side.

   This is the integration point identified in docs/MULTICHAIN_EXPANSION.md
   for offloading the binary-market dimension to a vetted third party: our
   wallet-intelligence layer (classification, persisted profile, Brier
   scoring) still supplies the market's question and the model signal;
   Panta supplies the bonding-curve pricing, on-chain settlement, and
   payout. The magnitude and time-bucket markets are unaffected — Panta
   only does binary YES/NO, same as every other third-party vendor
   researched (World, DFlow, Agg).

   Every method returns a tagged result rather than swallowing errors to
   null/[] (the pattern SolanaOracle/BscOracle/ZashClient use for read-only
   oracles): this API is financial and write-heavy, and a caller building a
   real transaction needs to know WHY a quote/build/register failed
   (stale quote, insufficient create permission, tx mismatch, ...), not
   just that it did. */

const BASE = 'https://live-api.panta.market/api/v1'

export interface PantaError {
  code: string
  message: string
  field?: string
  fields?: Record<string, string[]>
}

export type PantaResult<T> = { ok: true; data: T } | { ok: false; status: number; error: PantaError }

export class PantaClient {
  constructor(private readonly apiKey: string | undefined) {}

  private async call<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
  ): Promise<PantaResult<T>> {
    if (!this.apiKey) {
      return { ok: false, status: 0, error: { code: 'NO_API_KEY', message: 'PANTA_API_KEY is not configured' } }
    }
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'X-Api-Key': this.apiKey,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = (await res.json().catch(() => null)) as unknown
      if (!res.ok) {
        const err = (json as PantaError) ?? { code: 'UNKNOWN_ERROR', message: `http ${res.status}` }
        console.error(`panta ${method} ${path} -> ${res.status} ${err.code}: ${err.message}`)
        return { ok: false, status: res.status, error: err }
      }
      return { ok: true, data: json as T }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`panta ${method} ${path} threw: ${message}`)
      return { ok: false, status: 0, error: { code: 'NETWORK_ERROR', message } }
    }
  }

  // ── account ──────────────────────────────────────────────────────────

  /** GET /whoami/ — confirms the configured key is live and returns the
   *  bound account (canCreateMarkets, etc). Call this once at startup or
   *  on a health-check route, not per request. */
  whoami(): Promise<PantaResult<PantaAccount>> {
    return this.call('GET', '/whoami/')
  }

  metrics(): Promise<PantaResult<PantaMetrics>> {
    return this.call('GET', '/account/metrics/')
  }

  // ── markets catalog ──────────────────────────────────────────────────

  listMarkets(params?: { category?: string; phase?: string; createdBy?: string; page?: number }): Promise<PantaResult<PantaMarketPage>> {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.phase) q.set('phase', params.phase)
    if (params?.createdBy) q.set('createdBy', params.createdBy)
    if (params?.page) q.set('page', String(params.page))
    const qs = q.toString()
    return this.call('GET', `/markets/${qs ? `?${qs}` : ''}`)
  }

  getMarket(marketId: string): Promise<PantaResult<PantaMarket>> {
    return this.call('GET', `/markets/${encodeURIComponent(marketId)}/`)
  }

  // ── create a market ──────────────────────────────────────────────────

  /** Step 1/3 of create: validates params, reserves a createId (~5 min),
   *  returns the USDC fee to pay. */
  quoteCreateMarket(params: CreateMarketQuoteParams): Promise<PantaResult<CreateMarketQuote>> {
    return this.call('POST', '/markets/create/quote/', params)
  }

  /** Step 2/3: returns a base64 unsigned VersionedTransaction for the
   *  quoted create. The caller's wallet signs it, the caller broadcasts. */
  buildCreateMarket(createId: string): Promise<PantaResult<CreateMarketBuild>> {
    return this.call('POST', '/markets/create/build/', { createId })
  }

  /** Step 3/3: after broadcast, verifies the on-chain create against the
   *  quote and writes catalog/oracle metadata. Idempotent on same
   *  (createId, signature). */
  registerMarket(createId: string, signature: string): Promise<PantaResult<PantaMarket>> {
    return this.call('POST', '/markets/register/', { createId, signature })
  }

  // ── primary buy (bonding curve) ──────────────────────────────────────

  /** Step 1/4: simulate a YES/NO fill + fee, open a short-lived quote
   *  session (~90s). `amount` is a decimal string, e.g. "20.00" USDC. */
  quotePrimaryBuy(params: PrimaryBuyQuoteParams): Promise<PantaResult<PrimaryBuyQuote>> {
    return this.call('POST', '/primary/quote/', params)
  }

  /** Step 2/4: constructs unsigned instructions from a live quote (~120s
   *  order TTL). Compile a versioned transaction from instructions +
   *  recentBlockhash, then have the wallet sign it — this does NOT return
   *  a ready-to-sign transaction the way create/build does. */
  buildPrimaryBuy(quoteId: string): Promise<PantaResult<PrimaryBuyBuild>> {
    return this.call('POST', '/primary/build/', { quoteId })
  }

  /** Step 3/4: registers the broadcast signature for async confirmation.
   *  Does not block on finalization. */
  submitPrimaryBuy(orderId: string, signature: string): Promise<PantaResult<PrimaryBuyStatus>> {
    return this.call('POST', '/primary/submit/', { orderId, signature })
  }

  /** Step 4/4 (optional): poll current order status. */
  verifyPrimaryBuy(orderId: string): Promise<PantaResult<PrimaryBuyStatus>> {
    return this.call('GET', `/primary/verify/?orderId=${encodeURIComponent(orderId)}`)
  }

  // ── positions & claims ───────────────────────────────────────────────

  /** Share holdings for a wallet across every market it's touched. Returns
   *  share counts, not USD — see PantaPosition doc comment for pricing. */
  getPositions(wallet: string): Promise<PantaResult<PantaPosition[]>> {
    return this.call('GET', `/positions/?wallet=${encodeURIComponent(wallet)}`)
  }

  /** Unsigned claim_win_usdc instructions for a resolved market, when the
   *  wallet holds winning shares (position must have claimable: true). */
  buildWinClaim(wallet: string, marketId: string): Promise<PantaResult<ClaimBuild>> {
    return this.call('POST', '/claim/build/', { wallet, marketId })
  }

  /** Unsigned claim_creator_fees_usdc instructions for a graduated market's
   *  creator. Do NOT report this one via reportTrade — it's excluded. */
  buildCreatorFeeClaim(wallet: string, marketId: string): Promise<PantaResult<ClaimBuild>> {
    return this.call('POST', '/claim/creator-fees/', { wallet, marketId })
  }

  // ── trade attribution ────────────────────────────────────────────────

  /** Verifies an on-chain primary buy or win claim and upserts attribution
   *  keyed by signature, for volume credit. Idempotent on same signature. */
  reportTrade(signature: string, kind: 'buy' | 'claim', userId?: string): Promise<PantaResult<{ status: string }>> {
    return this.call('POST', '/trades/', { signature, kind, ...(userId ? { userId } : {}) })
  }

  tradeStatus(signature: string): Promise<PantaResult<{ status: string }>> {
    return this.call('GET', `/trades/status/?signature=${encodeURIComponent(signature)}`)
  }
}

// ── response shapes, per docs.panta.market ────────────────────────────

export interface PantaAccount {
  userId: string
  email: string
  name: string
  status: string
  canCreateMarkets: boolean
  createdAt: string
  apiKeyId: string
}

export interface PantaMetrics {
  volumeUsdcBase: string
  createCount: number
  tradeCount: number
}

export interface PantaMarket {
  marketId: string
  eventPda: string
  question: string
  category: string
  imageUrl: string
  phase: string
  yesPrice?: number
  noPrice?: number
  createdBy: string
  startTime: string
}

export interface PantaMarketPage {
  markets: PantaMarket[]
  page: number
  hasMore: boolean
}

export interface CreateMarketQuoteParams {
  question: string
  rule: string
  startTime: string
  category: string
  imageUrl: string
  region?: string
  oracle?: string
  eventInProgress?: boolean
}

export interface CreateMarketQuote {
  createId: string
  /** USDC base units as an integer string (6 decimals), e.g. "50000000" = 50 USDC. */
  paymentUsdc: string
  expectedEventPda: string
}

export interface CreateMarketBuild {
  /** base64-encoded unsigned VersionedTransaction. */
  transaction: string
}

export interface PrimaryBuyQuoteParams {
  marketId: string
  side: 'yes' | 'no'
  /** Decimal string, e.g. "20.00" USDC — NOT base units (unlike create). */
  amount: string
  userId?: string
}

export interface PrimaryBuyQuote {
  quoteId: string
  estimatedShares: string
  estimatedFeeUsdc: string
  maxSlippageBps: number
}

export interface PrimaryBuyBuild {
  orderId: string
  /** Instruction list, not a pre-compiled transaction — compile with recentBlockhash. */
  instructions: unknown[]
  recentBlockhash: string
}

export interface PrimaryBuyStatus {
  orderId: string
  status: 'pending' | 'confirmed' | 'failed'
  signature?: string
}

/** Share counts only, not USD. To show worth: for each distinct marketId,
 *  fetch getMarket() for yesPrice/noPrice, then shares × matching side
 *  price while open; after resolution, win ≈ shares × 1 USDC, lose ≈ 0. */
export interface PantaPosition {
  marketId: string
  side: 'yes' | 'no'
  shares: string
  phase: string
  claimable: boolean
}

export interface ClaimBuild {
  instructions: unknown[]
  recentBlockhash: string
}
