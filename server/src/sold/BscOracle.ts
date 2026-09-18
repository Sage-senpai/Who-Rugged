/* Reads BEP-20 top holders from Moralis's Token Holder API. BSC has no
   Solana-style native "largest accounts" RPC call, so unlike SolanaOracle
   this needs a real third-party data provider — Moralis's free tier covers
   it (see docs/MULTICHAIN_EXPANSION.md). Env-gated: with no MORALIS_API_KEY
   configured this returns [], never fabricated data, same rule as every
   other oracle in this codebase. */
import type { HolderBalance } from './SolanaOracle'

export class BscOracle {
  constructor(private readonly moralisApiKey: string | undefined) {}

  /** Top holders for a BEP-20 contract, ranked by balance, real chain data. */
  async fetchTopHolders(contract: string, limit = 11): Promise<HolderBalance[]> {
    if (!this.moralisApiKey) return []
    try {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/${contract}/owners?chain=bsc&order=DESC&limit=${limit}`,
        { headers: { accept: 'application/json', 'X-API-Key': this.moralisApiKey } },
      )
      if (!res.ok) {
        console.error(`moralis owners http ${res.status} for ${contract}`)
        return []
      }
      type MoralisOwner = { owner_address: string; balance_formatted: string }
      const data = (await res.json()) as { result?: MoralisOwner[] }
      return (data.result ?? [])
        .map((o) => ({ wallet: o.owner_address, balance: parseFloat(o.balance_formatted), live: true }))
        .filter((h) => h.balance > 0)
    } catch (e) {
      console.error(`moralis owners threw for ${contract}: ${e instanceof Error ? e.message : e}`)
      return []
    }
  }
}
