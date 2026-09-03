/* Reads $ANSEM balances from Solana via Alchemy's Solana RPC.
   All calls are server-side only — the API key never reaches the browser.
   Falls back to public RPC if Alchemy fails, then to knownBalance from registry. */
import { lookupHolder, TRACKED_WALLETS } from './holderRegistry'
import type { TrackedHolder } from './types'


export interface HolderBalance {
  wallet: string
  balance: number
  /** true when balance was read live; false when falling back to registry snapshot */
  live: boolean
}

export class SolanaOracle {
  private readonly rpc: string

  constructor(
    apiKey: string | undefined,
    private readonly mint: string | undefined,
  ) {
    this.rpc = apiKey
      ? `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`
      : 'https://api.mainnet-beta.solana.com'
  }

  private async rpcCall<T>(id: string, method: string, params: unknown[]): Promise<T | null> {
    const endpoints = [this.rpc]
    if (this.rpc !== 'https://api.mainnet-beta.solana.com') {
      endpoints.push('https://api.mainnet-beta.solana.com')
    }
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        })
        if (!res.ok) continue
        const data = (await res.json()) as { result?: T; error?: { code: number; message: string } }
        if (data.error) continue
        if (data.result !== undefined) return data.result
      } catch {
        // try next endpoint
      }
    }
    return null
  }

  /** Returns current $ANSEM ui_amount balance for each wallet.
   *  Falls back to knownBalance from registry when live RPC returns 0 or fails. */
  async fetchCurrentBalances(wallets: string[]): Promise<HolderBalance[]> {
    if (!this.mint) {
      return wallets.map((w) => {
        const meta = lookupHolder(w)
        return { wallet: w, balance: meta.knownBalance, live: false }
      })
    }

    const results = await Promise.all(
      wallets.map(async (wallet) => {
        type AccountsResult = {
          value: {
            account: {
              data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } }
            }
          }[]
        }
        const result = await this.rpcCall<AccountsResult>(
          wallet,
          'getTokenAccountsByOwner',
          [wallet, { mint: this.mint }, { encoding: 'jsonParsed' }],
        )
        const liveBalance = result?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount
        if (liveBalance !== undefined && liveBalance !== null && liveBalance > 0) {
          return { wallet, balance: liveBalance, live: true }
        }
        const meta = lookupHolder(wallet)
        return { wallet, balance: meta.knownBalance, live: false }
      }),
    )
    return results
  }

  /** Returns tracked holders with their current balances as TrackedHolder records. */
  async fetchTopHolders(): Promise<TrackedHolder[]> {
    const wallets = TRACKED_WALLETS
    const balances = await this.fetchCurrentBalances(wallets)
    return balances.map(({ wallet, balance }) => {
      const meta = lookupHolder(wallet)
      return {
        wallet,
        handle: meta.handle,
        avatarSeed: meta.avatarSeed,
        balanceAtSnapshot: balance,
        balanceNow: null,
      }
    })
  }

  /** Best-effort recent SPL-transfer activity for one wallet on this mint.
   *  Reads real transaction history via getSignaturesForAddress + getParsedTransaction,
   *  classifying each by the wallet's token-balance delta: inflow = 'buy', outflow =
   *  'sell', no owner delta found = 'unknown'. This is NOT DEX-swap-aware — it can't
   *  distinguish a market buy from a plain incoming transfer — so callers must present
   *  it as a best-effort read, never as certain intent. Never fabricates rows: returns
   *  [] (not fake data) when the mint isn't configured or nothing comes back. */
  async fetchRecentActivity(wallet: string, limit = 10): Promise<ActivityEvent[]> {
    if (!this.mint) return []
    const cappedLimit = Math.max(1, Math.min(20, limit))
    type SigInfo = { signature: string; blockTime: number | null }
    const sigs = await this.rpcCall<SigInfo[]>(wallet, 'getSignaturesForAddress', [
      wallet,
      { limit: cappedLimit },
    ])
    if (!sigs?.length) return []

    type TokenBalance = { owner?: string; mint: string; uiTokenAmount: { uiAmount: number | null } }
    type ParsedTx = {
      blockTime: number | null
      meta: { preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] } | null
    }

    const events = await Promise.all(
      sigs.map(async (s): Promise<ActivityEvent | null> => {
        const tx = await this.rpcCall<ParsedTx>(s.signature, 'getTransaction', [
          s.signature,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
        ])
        if (!tx?.meta) return null
        const pre = tx.meta.preTokenBalances?.find((b) => b.mint === this.mint && b.owner === wallet)
        const post = tx.meta.postTokenBalances?.find((b) => b.mint === this.mint && b.owner === wallet)
        const before = pre?.uiTokenAmount.uiAmount ?? 0
        const after = post?.uiTokenAmount.uiAmount ?? 0
        const delta = after - before
        if (!pre && !post) return null // this tx didn't touch the wallet's balance for this mint
        return {
          signature: s.signature,
          at: (tx.blockTime ?? s.blockTime ?? 0) * 1000,
          kind: delta > 0 ? 'buy' : delta < 0 ? 'sell' : 'unknown',
          amount: Math.abs(delta),
        }
      }),
    )
    return events.filter((e): e is ActivityEvent => e !== null)
  }
}

export interface ActivityEvent {
  signature: string
  at: number
  kind: 'buy' | 'sell' | 'unknown'
  amount: number
}
