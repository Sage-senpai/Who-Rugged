/* Community tables: player-listed Solana meme-coin arenas ("sol-<mint>").
   Pure helpers live here (no Worker/DO imports) so they are unit-testable. */

// Guardrails. The cap bounds how many arenas the worker will sample/oracle at
// once (each live table costs RPC calls every window); the TTL frees slots from
// abandoned tables; the per-IP limit stops one client from squatting the cap.
export const COMMUNITY_CAP = 8
export const COMMUNITY_TTL_DAYS = 7
export const COMMUNITY_TTL_MS = COMMUNITY_TTL_DAYS * 86_400_000
export const COMMUNITY_RATE_MAX = 3
export const COMMUNITY_RATE_WINDOW_MS = 3_600_000
export const COMMUNITY_TOUCH_THROTTLE_MS = 600_000
export const COMMUNITY_MIN_HOLDERS = 3

export interface CommunityEntry {
  mint: string
  id: string
  symbol: string
  name: string
  createdAt: number
  lastActive: number
}

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const isMint = (s: unknown): s is string => typeof s === 'string' && MINT_RE.test(s)

export const communityId = (mint: string): string => `sol-${mint}`

/** 'sol-<mint>' -> mint, or null when the id is not a well-formed community id. */
export function communityIdToMint(id: string): string | null {
  if (!id.startsWith('sol-')) return null
  const mint = id.slice(4)
  return isMint(mint) ? mint : null
}

/** Strip everything but printable ASCII and unicode letters/digits (so no
    control chars, bidi overrides, combining-mark stacks or emoji), drop
    angle brackets, collapse whitespace. */
export function sanitizeLabel(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[^\x20-\x7E\p{L}\p{N}]/gu, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim()
}

export const sanitizeSymbol = (raw: unknown): string => sanitizeLabel(raw, 12).toUpperCase()
export const sanitizeName = (raw: unknown): string => sanitizeLabel(raw, 32)

export function fallbackMeta(mint: string): { symbol: string; name: string } {
  const head = mint.slice(0, 4)
  return { symbol: head.toUpperCase(), name: `Token ${head}` }
}

/** Pick pairs[0].baseToken from a DexScreener response if its address matches the mint. */
export function pickBaseToken(data: unknown, mint: string): { symbol: string; name: string } | null {
  const pairs = (data as { pairs?: unknown } | null)?.pairs
  if (!Array.isArray(pairs) || pairs.length === 0) return null
  const base = (pairs[0] as { baseToken?: { address?: unknown; symbol?: unknown; name?: unknown } } | null)?.baseToken
  if (!base || base.address !== mint) return null
  const symbol = sanitizeSymbol(base.symbol)
  const name = sanitizeName(base.name)
  if (!symbol && !name) return null
  return { symbol, name }
}

/** Best-effort token labels; never throws, never returns raw upstream strings. */
export async function fetchTokenMeta(mint: string): Promise<{ symbol: string; name: string }> {
  const fb = fallbackMeta(mint)
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 2500)
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: ctl.signal })
    if (!res.ok) return fb
    const picked = pickBaseToken(await res.json(), mint)
    return { symbol: picked?.symbol || fb.symbol, name: picked?.name || fb.name }
  } catch {
    return fb
  } finally {
    clearTimeout(timer)
  }
}
