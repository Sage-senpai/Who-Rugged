import type { ArenaDef } from './arenaTypes'

/* Arenas, by how their top holders get read (server/src/index.ts's
   ARENA_SOURCES has the matching entry for anything not 'ansem'):
   - Solana native RPC: ansem (curated registry), bonk, wif
   - BSC via Bitquery: floki, babydoge, broccoli. Note: the top "holder" on
     both floki and babydoge is 0x000...dead, the standard burn address —
     real on-chain data, just never a wallet that will predictably act, so
     it's an odd first row to bet on. Worth filtering out of the ranked list
     in a follow-up pass rather than fixing silently right now.
   - Zash's own public API, no key needed (the "meta-layer" arena type —
     WHO RUGGED? runs prediction markets on tokens Zash itself launched):
     zash-arc, zash-seis. SEIS's raise hasn't started, so it may show as
     few as one holder (Zash's team-vesting wallet) — real, not broken.
   Locked entries are shown but never given fabricated live numbers, so the
   grid reads as extensible without promising data that doesn't back it.

   Mints/contracts and supply confirmed independently (Solscan/BscScan +
   CoinGecko or the project's own docs) 2026-09-18 — re-verify before
   trusting long-term, supply figures drift and meme-coin mints do
   occasionally relaunch. Zash project ids/addresses come straight from
   GET https://zash.xyz/api/v1/projects (no auth needed). */
export const ARENAS: ArenaDef[] = [
  {
    id: 'ansem',
    name: 'ANSEM',
    ticker: '$ANSEM',
    mint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    totalSupply: 1_000_000_000,
    status: 'live',
  },
  {
    id: 'bonk',
    name: 'Bonk',
    ticker: '$BONK',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    totalSupply: 87_995_282_867_000,
    status: 'live',
  },
  {
    id: 'wif',
    name: 'dogwifhat',
    ticker: '$WIF',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    totalSupply: 998_840_593,
    status: 'live',
  },
  {
    id: 'floki',
    name: 'FLOKI',
    ticker: '$FLOKI',
    mint: '0xfb5b838b6cfeedc2873ab27866079ac55363d37e',
    totalSupply: 9_640_000_000_000,
    status: 'live',
  },
  {
    id: 'babydoge',
    name: 'Baby Doge Coin',
    ticker: '$BABYDOGE',
    mint: '0xc748673057861a797275CD8A068AbB95A902e8de',
    totalSupply: 420_000_000_000_000_000,
    status: 'live',
  },
  {
    id: 'broccoli',
    name: "CZ's Dog",
    ticker: '$BROCCOLI',
    mint: '0x6d5ad1592ed9d6d1df9b93c793ab759573ed6714',
    totalSupply: 970_000_000,
    status: 'live',
  },
  {
    id: 'zash-arc',
    name: 'Arcade Pass',
    ticker: '$ARC',
    mint: '0x58685BeFAC41818881B454E22A1bb4B83980DB54',
    totalSupply: 100_000,
    status: 'live',
  },
  {
    id: 'zash-seis',
    name: 'Seismova',
    ticker: '$SEIS',
    mint: '0x02176479fF5470C6c922B2c1FfD9c9006DF3D430',
    totalSupply: 100_000,
    status: 'live',
  },
  { id: 'doge', name: 'Dogecoin', ticker: '$DOGE', mint: null, totalSupply: null, status: 'locked' },
  { id: 'pepe', name: 'Pepe Coin', ticker: '$PEPE', mint: null, totalSupply: null, status: 'locked' },
]

export const LIVE_ARENAS = ARENAS.filter((a) => a.status === 'live')

export const arenaById = (id: string): ArenaDef | undefined => ARENAS.find((a) => a.id === id)
