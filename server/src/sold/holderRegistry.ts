/* $ANSEM holder registry — sourced from Solscan export, July 1 2026.
   Mint: 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
   Total supply: 1,000,000,000 tokens (pump.fun standard).
   knownBalance = snapshot from CSV export, used as oracle fallback.
   Named wallets confirmed from Solscan tags + on-chain identity. */

export interface HolderMeta {
  handle: string
  avatarSeed: string
  /** Token balance at Solscan export (July 1 2026). Oracle fallback when live read fails. */
  knownBalance: number
}

export const HOLDER_REGISTRY: Record<string, HolderMeta> = {
  // ── #1  58.66% — CONFIRMED: Ansem's main wallet ──────────────────────────
  GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52: {
    handle: 'blknoiz06',
    avatarSeed: 'blknoiz06',
    knownBalance: 586_600_000,
  },

  // ── #2  1.06% — Active Whale Transfer tag ─────────────────────────────────
  CLM6E4zpTviEC77nWKogpVLQoXx9tgoQCYJ8NibxKg1Q: {
    handle: 'Whale_CLM6E4',
    avatarSeed: 'CLM6E4',
    knownBalance: 10_600_000,
  },

  // ── #3  0.95% — cryptowhizz.sol (named wallet on Solscan) ────────────────
  Ac9Y9QLBw5evBnV5X7647kHfqEcqmA2wgbuN6Sb1zSZM: {
    handle: 'cryptowhizz',
    avatarSeed: 'cryptowhizz',
    knownBalance: 9_500_000,
  },

  // ── #4  SKIP — FnzKY6... is the Pump.fun AMM liquidity pool, not a person

  // ── #5  0.52% — anon whale ────────────────────────────────────────────────
  '8wLPuPpZgbxnhTMiMG3suqsQgYQ1oy1s8nVYJjaT33m4': {
    handle: 'Whale_8wLPuP',
    avatarSeed: '8wLPuP',
    knownBalance: 5_200_000,
  },

  // ── #6  0.38% — anon whale ────────────────────────────────────────────────
  HDixbrzwwLXczhDBk1JVrurPQsuLE8FUKnW2pucSXN3o: {
    handle: 'Whale_HDixbr',
    avatarSeed: 'HDixbr',
    knownBalance: 3_800_000,
  },

  // ── #7  0.37% — Active Whale Transfer tag ─────────────────────────────────
  GkdYWRjFzZW3oxbRaPJ43C5385E4GtfgW3vwfK2ZAtac: {
    handle: 'Whale_GkdYWR',
    avatarSeed: 'GkdYWR',
    knownBalance: 3_700_000,
  },

  // ── #8  0.33% — nockchain.sol (named wallet on Solscan) ──────────────────
  HCgo8gvk99Wk13XWbbAoyxyEx2DgzidzVDma4ny32uYC: {
    handle: 'nockchain',
    avatarSeed: 'nockchain',
    knownBalance: 3_300_000,
  },

  // ── #9  0.33% — anon whale ────────────────────────────────────────────────
  '6HcrxubcevZQs1fcPTVnywzw7N2XWqsyAPxqnmg78UMg': {
    handle: 'Whale_6Hcrxu',
    avatarSeed: '6Hcrxu',
    knownBalance: 3_300_000,
  },

  // ── #10 0.32% — anon whale ────────────────────────────────────────────────
  F5hkYsi8JxjyA2JHN5CA7MbnnhWubkXB2ZQB7Gkaxqs6: {
    handle: 'Whale_F5hkYs',
    avatarSeed: 'F5hkYs',
    knownBalance: 3_200_000,
  },

  // ── #11 0.31% — anon whale ────────────────────────────────────────────────
  H3qrSThjpPjKvkqMUYqLTVucb5H7nhCUQAn9U3ekBxj1: {
    handle: 'Whale_H3qrST',
    avatarSeed: 'H3qrST',
    knownBalance: 3_100_000,
  },

  // ── BONUS — 261x early trader (famous on Lookonchain, $2.3k → $614k) ──────
  CxCTVjvgK3bWcgavMKo8PushR8ycw1atrWiSTruZrdtT: {
    handle: 'CxCTVj_261x',
    avatarSeed: 'CxCTVj',
    knownBalance: 400_000,
  },
}

export function lookupHolder(wallet: string): HolderMeta {
  return HOLDER_REGISTRY[wallet] ?? {
    handle: `Whale_${wallet.slice(0, 6)}`,
    avatarSeed: wallet,
    knownBalance: 0,
  }
}

export const TRACKED_WALLETS = Object.keys(HOLDER_REGISTRY)
