/* Player avatar skins. A skin is a set of cosmetic overrides applied on top of
   the address-seeded face, so identity holds while the look changes. Some are
   free, some unlock with rank, reusing the same ladder as the role unlocks
   (Undercover Cop at 1200, Two Thieves at 1400). Selection persists locally;
   ownership will move on-chain with cosmetics later. */

export interface Skin {
  id: string
  name: string
  blurb: string
  /** ELO required to unlock. 0 = free. */
  rank: number
  /** background hex, no leading # */
  bg: string
  glasses?: boolean
  hat?: boolean
}

export const SKINS: Skin[] = [
  { id: 'precinct', name: 'Precinct', blurb: 'Standard issue navy.', rank: 0, bg: '16294a' },
  { id: 'loot', name: 'Loot', blurb: 'Gold-room glow.', rank: 0, bg: '3a2e0f' },
  { id: 'siren', name: 'Siren', blurb: 'Alarm red wash.', rank: 0, bg: '3a1622' },
  { id: 'verified', name: 'Verified', blurb: 'Lime-lit and clean.', rank: 0, bg: '20300f' },
  { id: 'undercover', name: 'Undercover', blurb: 'Shades on, off the books.', rank: 1200, bg: '0c1626', glasses: true },
  { id: 'kingpin', name: 'Kingpin', blurb: 'Hat on. You run the table.', rank: 1400, bg: '1d3358', hat: true },
]

const DEFAULT_ID = 'precinct'
const KEY = 'who-rugged:skin'

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}

export function isUnlocked(skin: Skin, elo: number): boolean {
  return elo >= skin.rank
}

/** The selected skin, falling back to default if it is missing or now locked. */
export function getSkin(elo: number): Skin {
  let id = DEFAULT_ID
  try {
    id = localStorage.getItem(KEY) ?? DEFAULT_ID
  } catch {
    /* default */
  }
  const skin = skinById(id)
  return isUnlocked(skin, elo) ? skin : SKINS[0]
}

export function setSkin(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* non-fatal */
  }
}
