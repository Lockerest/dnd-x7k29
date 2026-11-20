// Seeded random inputs, so a parity failure can always be reproduced.
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1))
  const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)]!
  const maybe = <T>(v: T, p = 0.5): T | undefined => (next() < p ? v : undefined)
  const str = (alphabet: string, lo: number, hi: number) => Array.from({ length: int(lo, hi) }, () => alphabet[int(0, alphabet.length - 1)]).join('')
  return { next, int, pick, maybe, str }
}

/** Drops undefined fields, like JSON does when values cross into the page. */
export const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export const CASES = 300
