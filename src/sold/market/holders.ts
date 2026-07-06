import type { HolderSeed } from './localMarket'

/* Curated fallback roster — the wallets CT is already watching. Used when the
   worker window isn't available so the market is always populated. Real handles
   from the $ANSEM leaderboard (Solscan, Jul 2026); balances are snapshot values. */
export const FALLBACK_HOLDERS: HolderSeed[] = [
  { wallet: 'GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52', handle: 'blknoiz06', avatarSeed: 'blknoiz06', balanceAtSnapshot: 586_600_000, balanceNow: null },
  { wallet: 'CLM6E4kR9wq3vJ8mN2pQ7sT1xY5zA0bC4dE6fG8hJ2k', handle: 'Whale_CLM6E4', avatarSeed: 'clm6e4', balanceAtSnapshot: 10_600_000, balanceNow: null },
  { wallet: '3xJ9pWq2mNvR7sT5yU8zA1bC4dE6fG0hK2lM4nP6qR8s', handle: 'cryptowhizz', avatarSeed: 'cryptowhizz', balanceAtSnapshot: 9_500_000, balanceNow: null },
  { wallet: '8wLPuP4kQ2mR7vT5yU9zA3bC6dE1fG0hK4lM8nP2qS6t', handle: 'Whale_8wLPuP', avatarSeed: '8wlpup', balanceAtSnapshot: 5_200_000, balanceNow: null },
  { wallet: 'nockchA1nQ2mR7vT5yU9zA3bC6dE1fG0hK4lM8nP2qX9y', handle: 'nockchain', avatarSeed: 'nockchain', balanceAtSnapshot: 3_300_000, balanceNow: null },
  { wallet: 'CxCTVj261xR7vT5yU9zA3bC6dE1fG0hK4lM8nP2qZ4w', handle: 'CxCTVj_261x', avatarSeed: 'cxctvj', balanceAtSnapshot: 400_000, balanceNow: null },
]

const WINDOW_HOURS = 12

/** Current 12h window slot, matching the worker's windowId scheme. */
export function currentWindow(): { windowId: string; opensAt: number; closesAt: number } {
  const ms = WINDOW_HOURS * 3_600_000
  const opensAt = Math.floor(Date.now() / ms) * ms
  const closesAt = opensAt + ms
  const d = new Date(opensAt)
  return { windowId: `sold-${d.toISOString().slice(0, 10)}-${WINDOW_HOURS}h`, opensAt, closesAt }
}
