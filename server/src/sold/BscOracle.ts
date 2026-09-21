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
    EVM(network: bsc, dataset: realtime) {
      Holders(
        where: { Currency: { SmartContract: { is: $contract } } }
        orderBy: { descending: Balance_Amount }
        limit: { count: $limit }
      ) {
        Holder { Address }
        Balance { Amount }
      }
    }
  }
`

const BSC_RPC = ['https://bsc-dataseed.bnbchain.org', 'https://bsc-rpc.publicnode.com']

export class BscOracle {
  constructor(private readonly bitqueryApiKey: string | undefined) {}

  private async ethCall(to: string, data: string): Promise<string | null> {
    for (const rpc of BSC_RPC) {
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
        })
        if (!res.ok) continue
        const body = (await res.json()) as { result?: string; error?: unknown }
        if (typeof body.result === 'string' && body.result.length > 2) return body.result
      } catch (e) {
        console.error(`bsc eth_call threw via ${rpc}: ${e instanceof Error ? e.message : e}`)
      }
    }
    return null
  }

  /** Live BEP-20 balance per wallet, or null when the read failed. Keyless
      (public BSC RPC). A failed read stays unknown instead of reading as 0,
      which would look like the wallet sold everything. */
  async fetchBalances(contract: string, wallets: string[]): Promise<Map<string, number | null>> {
    const out = new Map<string, number | null>()
    const decimalsHex = await this.ethCall(contract, '0x313ce567')
    if (!decimalsHex) {
      wallets.forEach((w) => out.set(w, null))
      return out
    }
    const decimals = Number(BigInt(decimalsHex))
    if (!(decimals >= 0 && decimals <= 36)) {
      // Not a real ERC-20 (a precompile or unrelated contract answers with garbage).
      wallets.forEach((w) => out.set(w, null))
      return out
    }
    const scale = 10 ** decimals
    await Promise.all(
      wallets.map(async (w) => {
        const data = '0x70a08231' + w.toLowerCase().replace(/^0x/, '').padStart(64, '0')
        const raw = await this.ethCall(contract, data)
        out.set(w, raw ? Number(BigInt(raw)) / scale : null)
      }),
    )
    return out
  }

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
