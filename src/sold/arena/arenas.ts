import type { ArenaDef } from './arenaTypes'

/* Exactly one arena is real right now — the tracked $ANSEM holder market that
   already has a live backend (holderRegistry.ts, BucketMarket.ts). The other
   entries are shown locked in the UI, never with fabricated live numbers —
   they exist so the grid reads as extensible, not as a promise of live data
   that doesn't back it. Add a new live arena only once its own tracked-wallet
   registry + oracle mint are wired server-side. */
export const ARENAS: ArenaDef[] = [
  {
    id: 'ansem',
    name: 'ANSEM',
    ticker: '$ANSEM',
    mint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    totalSupply: 1_000_000_000,
    status: 'live',
  },
  { id: 'doge', name: 'Dogecoin', ticker: '$DOGE', mint: null, totalSupply: null, status: 'locked' },
  { id: 'pepe', name: 'Pepe Coin', ticker: '$PEPE', mint: null, totalSupply: null, status: 'locked' },
  { id: 'wif', name: 'dogwifhat', ticker: '$WIF', mint: null, totalSupply: null, status: 'locked' },
]

export const LIVE_ARENA = ARENAS.find((a) => a.status === 'live')!

export const arenaById = (id: string): ArenaDef | undefined => ARENAS.find((a) => a.id === id)
