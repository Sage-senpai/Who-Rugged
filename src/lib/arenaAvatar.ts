/* Self-hosted holder avatars for the Arena flow. Mirrors src/lib/avatar.ts's
   pattern (deterministic, cached, no network round trip) but with a circular,
   abstract style suited to anonymous tracked wallets rather than the suspect
   game's pixel-art faces. */
import { createAvatar } from '@dicebear/core'
import { thumbs } from '@dicebear/collection'

const cache = new Map<string, string>()

/** Returns a data-URI SVG avatar, deterministic from the wallet/handle seed. */
export function arenaAvatarFor(seed: string): string {
  const cached = cache.get(seed)
  if (cached) return cached

  const svg = createAvatar(thumbs, {
    seed,
    radius: 50,
    scale: 90,
    backgroundColor: ['16294a', '1a2f52', '0e1626'],
  }).toString()

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(seed, uri)
  return uri
}
