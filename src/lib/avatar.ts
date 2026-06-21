/* Self-hosted suspect sprites.
   The blueprint hit the DiceBear public API (api.dicebear.com), which the
   spec flags for self-hosting in production. We generate the same pixel-art
   style locally with @dicebear/core, so faces are deterministic per handle,
   render offline, and add no network round trip. Design is CC0 1.0. */
import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'
import type { Mood } from './types'

const cache = new Map<string, string>()

/* Mood overrides the mouth so the same face can read calm, nervous, smug, or
   rattled. Eyes stay seed-derived so identity holds across moods. "calm" keeps
   the resting face (no override). */
const MOOD_MOUTH: Partial<Record<Mood, ('sad04' | 'sad09' | 'happy11')[]>> = {
  nervous: ['sad04'],
  rattled: ['sad09'],
  smug: ['happy11'],
}

/** Returns a data-URI SVG sprite, deterministic from the seed (the handle)
 *  and the mood. Cached per seed+mood. */
export function spriteFor(seed: string, mood: Mood = 'calm'): string {
  const key = `${seed}|${mood}`
  const cached = cache.get(key)
  if (cached) return cached

  const mouth = MOOD_MOUTH[mood]
  const svg = createAvatar(pixelArt, {
    seed,
    backgroundColor: ['16294a'],
    radius: 0,
    scale: 92,
    ...(mouth ? { mouth } : {}),
  }).toString()

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(key, uri)
  return uri
}

/* The player's own avatar, with a chosen skin applied on top of the seed.
   Kept separate from spriteFor so suspects never inherit player cosmetics. */
export function playerSprite(
  seed: string,
  skin: { id: string; bg: string; glasses?: boolean; hat?: boolean },
): string {
  const key = `player|${seed}|${skin.id}`
  const cached = cache.get(key)
  if (cached) return cached

  const svg = createAvatar(pixelArt, {
    seed,
    backgroundColor: [skin.bg],
    radius: 0,
    scale: 90,
    ...(skin.glasses ? { glassesProbability: 100 } : {}),
    ...(skin.hat ? { hatProbability: 100 } : {}),
  }).toString()

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(key, uri)
  return uri
}

/** Single-character fallback glyph if a sprite ever fails to render. */
export function initialFor(handle: string): string {
  const m = handle.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase()
  return m || '?'
}
