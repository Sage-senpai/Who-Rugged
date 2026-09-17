import type { ArenaDef } from './arenaTypes'

/* Three arenas are real: $ANSEM (curated wallet registry, holderRegistry.ts)
   plus $BONK and $WIF, whose top holders are read straight off-chain via
   SolanaOracle.fetchTopHoldersByMint — no curated wallet list needed for
   those two, so adding another live arena is now just a mint address away
   (server/src/index.ts's ARENA_MINTS). Locked entries are shown but never
   given fabricated live numbers, so the grid reads as extensible without
   promising data that doesn't back it.

   Mints and supply confirmed independently (Solscan, Coinbase Assets, Solana
   Explorer, CoinGecko) 2026-09-17 — re-verify before trusting long-term,
   supply figures drift and meme-coin mints do occasionally relaunch. */
export const ARENAS: ArenaDef[] = [
  {
    id: 'ansem',
    name: 'ANSEM',
    ticker: '$ANSEM',
    mint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    totalSupply: 1_000_000_000,
    status: 'live',
  },
  // BONK and WIF are wired end-to-end (see server/src/index.ts ARENA_MINTS,
  // SolanaOracle.fetchTopHoldersByMint) but held at 'locked' until the
  // ALCHEMY_API_KEY secret is fixed — it's currently rejected with 401 on
  // every RPC method, so there is no top-holder data to show. Flip to 'live'
  // once a fresh key is confirmed working (test: does /sold/markets?arena=bonk
  // return holders?).
  {
    id: 'bonk',
    name: 'Bonk',
    ticker: '$BONK',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    totalSupply: 87_995_282_867_000,
    status: 'locked',
  },
  {
    id: 'wif',
    name: 'dogwifhat',
    ticker: '$WIF',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    totalSupply: 998_840_593,
    status: 'locked',
  },
  { id: 'doge', name: 'Dogecoin', ticker: '$DOGE', mint: null, totalSupply: null, status: 'locked' },
  { id: 'pepe', name: 'Pepe Coin', ticker: '$PEPE', mint: null, totalSupply: null, status: 'locked' },
]

export const LIVE_ARENAS = ARENAS.filter((a) => a.status === 'live')

export const arenaById = (id: string): ArenaDef | undefined => ARENAS.find((a) => a.id === id)
