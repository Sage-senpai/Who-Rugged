/* One saved music volume for the whole app (0 to 1), shared by the chiptune
   player and the jazz engine. Persisted so it survives a reload; falls back to
   a sensible default when storage is blocked. */
const KEY = 'wr.volume'
const DEFAULT = 0.5

function read(): number {
  try {
    const raw = localStorage.getItem(KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT
  } catch {
    return DEFAULT
  }
}

let level = read()
const subs = new Set<(v: number) => void>()

export const volume = {
  get(): number {
    return level
  },
  set(v: number): void {
    level = Math.min(1, Math.max(0, Math.round(v * 100) / 100))
    try { localStorage.setItem(KEY, String(level)) } catch { /* private mode: lasts for this visit */ }
    subs.forEach((f) => f(level))
  },
  subscribe(f: (v: number) => void): () => void {
    subs.add(f)
    return () => { subs.delete(f) }
  },
}
