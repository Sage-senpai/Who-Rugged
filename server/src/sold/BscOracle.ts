/* Reads BEP-20 top holders via Bitquery's GraphQL API (EVM.Holders dataset).
   BSC has no Solana-style native "largest accounts" RPC call, so unlike
   SolanaOracle this needs a real third-party data provider. Switched from
   Moralis to Bitquery 2026-09-19 — Moralis's self-serve signup no longer
   offers a free tier (paid plans only, $149/mo+), Bitquery's does. Env-
   gated: with no BITQUERY_API_KEY configured this returns [], never
   fabricated data, same rule as every other oracle in this codebase. */
import type { HolderBalance } from './SolanaOracle'

const ENDPOINT = 'https://streaming.bitquery.io/graphql'

const HOLDERS_QUERY = `
  query ($contract: String!, $limit: Int!) {
    EVM(network: bsc, dataset: combined) {
      Holders(
        where: { Currency: { SmartContract: { is: $contract } } }
        orderBy: { descending: Balance_Amount }
        limit: $limit
      ) {
        Holder { Address }
        Balance { Amount }
      }
    }
  }
`

export class BscOracle {
  constructor(private readonly bitqueryApiKey: string | undefined) {}

  /** Top holders for a BEP-20 contract, ranked by balance, real chain data. */
  async fetchTopHolders(contract: string, limit = 11): Promise<HolderBalance[]> {
    if (!this.bitqueryApiKey) return []
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.bitqueryApiKey}` },
        body: JSON.stringify({ query: HOLDERS_QUERY, variables: { contract, limit } }),
      })
      if (!res.ok) {
        console.error(`bitquery holders http ${res.status} for ${contract}`)
        return []
      }
      type Row = { Holder: { Address: string }; Balance: { Amount: string } }
      const data = (await res.json()) as { data?: { EVM?: { Holders?: Row[] } }; errors?: { message: string }[] }
      if (data.errors?.length) {
        console.error(`bitquery holders error for ${contract}: ${data.errors.map((e) => e.message).join('; ')}`)
        return []
      }
      return (data.data?.EVM?.Holders ?? [])
        .map((r) => ({ wallet: r.Holder.Address, balance: parseFloat(r.Balance.Amount), live: true }))
        .filter((h) => h.balance > 0)
    } catch (e) {
      console.error(`bitquery holders threw for ${contract}: ${e instanceof Error ? e.message : e}`)
      return []
    }
  }
}
