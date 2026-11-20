// Loudness normalisation and boss theme matching (pure parts of the sound system).
import { tightSlug } from './text'

/**
 * Gain that brings a sound to the target loudness: quiet sounds are boosted
 * (at most 5x), loud sounds are never turned down, and the peak stays below
 * clipping. Every third sample is measured, like the live page.
 */
export function loudnessGain(channels: ArrayLike<number>[]): number {
  let peak = 0
  let sq = 0
  let n = 0
  for (const a of channels) {
    for (let i = 0; i < a.length; i += 3) {
      const v = Math.abs(a[i]!)
      if (v > peak) peak = v
      sq += v * v
      n++
    }
  }
  const rms = Math.sqrt(sq / Math.max(1, n))
  return peak > 0 && rms > 0 ? Math.max(1, Math.min(5, 0.16 / rms, 0.95 / peak)) : 1
}

/**
 * Which loaded theme a boss plays: the sheet's own theme if it is loaded,
 * otherwise the first loaded theme whose key and the boss name contain each other.
 */
export function themeKeyFor(name: unknown, selected: string | undefined, loaded: string[]): string | null {
  if (selected && loaded.includes(selected)) return selected
  const n = tightSlug(name)
  if (n.length < 3) return null
  return loaded.find((k) => k.length >= 3 && (n.includes(k) || k.includes(n))) ?? null
}
