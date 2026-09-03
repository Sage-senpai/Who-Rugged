export type ArenaScene = 'scan' | 'holder' | 'marketType' | 'predict' | 'review' | 'locked'

export type MarketKind = 'binary' | 'magnitude'

export type ArenaStatus = 'live' | 'locked'

export interface ArenaDef {
  id: string
  name: string
  ticker: string
  /** Solana mint address for this arena's token, or null when not yet wired. */
  mint: string | null
  /** Total token supply, for % of supply math. Null when not yet wired. */
  totalSupply: number | null
  status: ArenaStatus
}
