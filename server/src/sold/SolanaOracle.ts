/* Reads $ANSEM balances from Solana via Alchemy's Solana RPC.
   All calls are server-side only — the API key never reaches the browser. */
import { lookupHolder, TRACKED_WALLETS } from './holderRegistry'
import type { TrackedHolder } from './types'


export interface HolderBalance {
  wallet: string
  balance: number
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
    try {
      const res = await fetch(this.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { result?: T; error?: unknown }
      return data.result ?? null
    } catch {
      return null
    }
  }

  /** Returns current $ANSEM ui_amount balance for each wallet. */
  async fetchCurrentBalances(wallets: string[]): Promise<HolderBalance[]> {
    if (!this.mint) return wallets.map((w) => ({ wallet: w, balance: 0 }))

    const results = await Promise.all(
      wallets.map(async (wallet) => {
        type AccountsResult = { value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }[] }
        const result = await this.rpcCall<AccountsResult>(
          wallet,
          'getTokenAccountsByOwner',
          [wallet, { mint: this.mint }, { encoding: 'jsonParsed' }],
        )
        const balance = result?.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0
        return { wallet, balance }
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
