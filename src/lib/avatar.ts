/* Self-hosted suspect sprites.
   The blueprint hit the DiceBear public API (api.dicebear.com), which the
   spec flags for self-hosting in production. We generate the same pixel-art
   style locally with @dicebear/core, so faces are deterministic per handle,
   render offline, and add no network round trip. Design is CC0 1.0. */
import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'

const cache = new Map<string, string>()

/** Returns a data-URI SVG sprite, deterministic from the seed (the handle). */
export function spriteFor(seed: string): string {
  const cached = cache.get(seed)
  if (cached) return cached

  const svg = createAvatar(pixelArt, {
    seed,
    backgroundColor: ['16294a'],
    radius: 0,
    scale: 92,
  }).toString()

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(seed, uri)
  return uri
}

/** Single-character fallback glyph if a sprite ever fails to render. */
export function initialFor(handle: string): string {
  const m = handle.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase()
  return m || '?'
}
