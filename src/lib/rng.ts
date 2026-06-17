/* Small randomness helpers. Kept in one place so the future 0G engine can
   swap the source (seeded TEE assignment) without touching call sites. */

export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const shuffle = <T>(arr: readonly T[]): T[] =>
  arr
    .map((v) => [Math.random(), v] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)

export const hex = (n: number): string =>
  Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** A fake but plausible 0x attestation string. Real reads carry a TEE receipt. */
export const attestation = (): string => '0x' + hex(40)

export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
