/* Player identity. The wallet address is the canonical, unique ID that other
   players can add you by. A username is an optional display name mapped to the
   address, stored locally for now. A global, collision-checked username
   registry arrives with the multiplayer backend (Durable Objects). */

const key = (addr: string) => `who-rugged:username:${addr.toLowerCase()}`

export function getUsername(addr: string): string {
  try {
    return localStorage.getItem(key(addr)) ?? ''
  } catch {
    return ''
  }
}

export function setUsername(addr: string, name: string): void {
  try {
    const clean = name.trim().slice(0, 20)
    if (clean) localStorage.setItem(key(addr), clean)
    else localStorage.removeItem(key(addr))
  } catch {
    /* non-fatal */
  }
}

/** 0x1234…abcd */
export function shortAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

export function displayName(addr: string, username: string): string {
  return username || shortAddress(addr)
}
