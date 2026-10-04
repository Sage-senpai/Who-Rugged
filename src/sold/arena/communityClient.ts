/* Client for the worker's community-table registry (server: /sold/community).
   Anyone can open a table for a Solana meme coin by pasting its mint. The
   worker verifies it on-chain and enforces the caps; this file only talks to
   it and keeps the local arena lookup in step. With no VITE_SOLD_URL there is
   no worker, so listing is reported as offline instead of faked. */
import { SOLD_URL } from '../soldClient'
import { MINT_RE, registerCommunityArena } from './arenas'

export interface CommunityTable {
  id: string
  mint: string
  symbol: string
  name: string
  createdAt: number
  lastActive: number
}
export interface CommunityList { tables: CommunityTable[]; cap: number; ttlDays: number }
export type ListError = 'bad-mint' | 'not-a-token' | 'too-few-holders' | 'full' | 'rate-limited' | 'unreachable' | 'offline'
export type ListResult = { ok: true; table: CommunityTable; created: boolean } | { ok: false; error: ListError }

export const communityConfigured = !!SOLD_URL
export const EMPTY_COMMUNITY: CommunityList = { tables: [], cap: 8, ttlDays: 7 }

export const LIST_ERRORS: Record<ListError, string> = {
  'bad-mint': "That doesn't look like a Solana token address. It should be 32 to 44 letters and numbers.",
  'not-a-token': "That address isn't a token mint. Paste the token's mint address, not a wallet.",
  'too-few-holders': 'This token has fewer than 3 holders, so there is nothing to read yet.',
  full: 'All community tables are taken. One frees up when an idle table closes.',
  'rate-limited': "You've opened a few tables already. Try again in about an hour.",
  unreachable: "Couldn't reach the Solana network just now. Try again in a moment.",
  offline: 'Community tables need the live server, which is not connected here.',
}

export async function fetchCommunity(): Promise<CommunityList> {
  if (!SOLD_URL) return EMPTY_COMMUNITY
  try {
    const res = await fetch(`${SOLD_URL}/sold/community`)
    if (!res.ok) return EMPTY_COMMUNITY
    const data = (await res.json()) as Partial<CommunityList>
    const tables = (data.tables ?? []).filter((t) => t && typeof t.id === 'string' && MINT_RE.test(t.mint))
    tables.forEach(registerCommunityArena)
    return { tables, cap: data.cap ?? 8, ttlDays: data.ttlDays ?? 7 }
  } catch {
    return EMPTY_COMMUNITY
  }
}

export async function listCoin(rawMint: string): Promise<ListResult> {
  const mint = rawMint.trim()
  if (!MINT_RE.test(mint)) return { ok: false, error: 'bad-mint' }
  if (!SOLD_URL) return { ok: false, error: 'offline' }
  try {
    const res = await fetch(`${SOLD_URL}/sold/community/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mint }),
    })
    const data = (await res.json().catch(() => null)) as
      | { ok: true; table: CommunityTable; created: boolean }
      | { ok: false; error?: ListError }
      | null
    if (data && data.ok) {
      registerCommunityArena(data.table)
      return { ok: true, table: data.table, created: data.created }
    }
    const error = data && !data.ok && data.error && data.error in LIST_ERRORS ? data.error : 'unreachable'
    return { ok: false, error }
  } catch {
    return { ok: false, error: 'unreachable' }
  }
}
