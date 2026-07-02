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
}
