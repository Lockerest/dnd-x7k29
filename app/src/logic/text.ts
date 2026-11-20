// Dice notation, name slugs and short summaries.

/** "2d6+1d8" -> [6, 6, 8]. Flat bonuses are ignored; at most 12 dice per term. */
export function parseDice(s: unknown): number[] {
  const out: number[] = []
  String(s || '')
    .split('+')
    .forEach((part) => {
      const m = /(\d*)d(\d+)/.exec(part)
      if (m) for (let i = 0; i < Math.min(Number(m[1]) || 1, 12); i++) out.push(Number(m[2]))
    })
  return out
}

/** Board keys: "Warden's Cut" -> "warden_s_cut". */
export const slug = (n: unknown) =>
  String(n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/** Ability sound and icon keys: like slug, and "(Golden)" versions share the base sound. */
export const abilitySlug = (n: unknown) =>
  String(n || '')
    .replace(/ \(Golden\)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/** Theme matching keys: "The Nameless King" -> "thenamelessking". */
export const tightSlug = (n: unknown) =>
  String(n || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** First sentence (20 to 110 characters) of an ability text, or a trimmed cut. */
export function shortText(t: unknown): string {
  const s = String(t || '').trim()
  const m = s.match(/^.{20,110}?[.;](\s|$)/)
  return m ? m[0].trim() : s.length > 110 ? s.slice(0, 107) + '...' : s
}
