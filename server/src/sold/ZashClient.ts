/* Reads Zash's own public project + holder data — the "meta-layer" arena
   type: WHO RUGGED? runs prediction markets on tokens Zash itself launches.
   Zash's REST API is fully public and unauthenticated ("no API keys, no
   sign-up" per zash.xyz/developers, 100 req/min/IP), so this needs no
   credential at all. If that ever changes, this is the one place to add
   one. */
import type { HolderBalance } from './SolanaOracle'

const BASE = 'https://zash.xyz/api/v1'

export interface ZashProject {
  id: string
  name: string
  ticker: string
  chain: string
  status: string
  tokenAddress: string | null
  currentPrice: number | null
}

export class ZashClient {
  /** All currently live/tradeable Zash projects — used to discover which
   *  arenas to offer, not to build any single arena's holder list. */
  async fetchLiveProjects(): Promise<ZashProject[]> {
    try {
      const res = await fetch(`${BASE}/projects?limit=50`)
      if (!res.ok) return []
      type Raw = { id: string; name: string; ticker: string; chain: string; status: string; tokenAddress?: string; currentPrice?: number }
      const data = (await res.json()) as { projects?: Raw[] }
      return (data.projects ?? []).map((p) => ({
        id: p.id, name: p.name, ticker: p.ticker, chain: p.chain, status: p.status,
        tokenAddress: p.tokenAddress ?? null, currentPrice: p.currentPrice ?? null,
      }))
    } catch (e) {
      console.error(`zash projects threw: ${e instanceof Error ? e.message : e}`)
      return []
    }
  }

  /** Real top holders for one Zash project, straight from their own
   *  pre-computed holder list (role-classified: team/LP/community) — no
   *  RPC or third-party provider needed for this arena type. */
  async fetchTopHolders(projectId: string, limit = 11): Promise<HolderBalance[]> {
    try {
      const res = await fetch(`${BASE}/projects/${projectId}/holders`)
      if (!res.ok) {
        console.error(`zash holders http ${res.status} for ${projectId}`)
        return []
      }
      type ZashHolder = { account: string; tokens: number }
      const rows = (await res.json()) as ZashHolder[]
      return rows.slice(0, limit).map((h) => ({ wallet: h.account, balance: h.tokens, live: true }))
    } catch (e) {
      console.error(`zash holders threw for ${projectId}: ${e instanceof Error ? e.message : e}`)
      return []
    }
  }

  /** Current USD price straight from Zash's own project record — free,
   *  already fetched as part of holder discovery, no separate price feed
   *  needed for this arena type. */
  async fetchPrice(projectId: string): Promise<number | null> {
    try {
      const res = await fetch(`${BASE}/projects/${projectId}`)
      if (!res.ok) return null
      const data = (await res.json()) as { currentPrice?: number }
      return data.currentPrice ?? null
    } catch {
      return null
    }
  }
}
