// Dice: labels, the shared dice log, which new rolls to replay, and the 3D
// library's roll notation. Same rules as the live page.
import { SKINS, type Skin } from '../data/dice'

export type Die = { d: number; r: number }

/** A roll as stored in the shared "rolls" list. Old rolls had one die (d, r). */
export type RollEntry = {
  n?: string
  ds?: Die[]
  d?: number
  r?: number
  m?: number
  ts?: number
  sk?: string
  by?: string
  /** Shown only to the GM: a secret roll. */
  s?: number
  /** A line of text instead of a roll. */
  ev?: string
  fx?: unknown
  wave?: unknown
  boss?: unknown
  cin?: unknown
}

export const skinOf = (id: string | undefined): Skin => SKINS.find((x) => x[0] === id) ?? SKINS[0]!
export const swatchOf = (id: string | undefined) => skinOf(id)[2]

/** The 3D library's settings for a style. */
export const skinConfig = (id: string | undefined) => {
  const k = skinOf(id)
  return { theme_colorset: k[3] || 'white', theme_material: k[4], theme_customColorset: k[5] || null }
}

/** "2d6 + d8": dice counted by size, in the order first seen. */
export function trayLabel(a: number[]): string {
  const c = new Map<number, number>()
  for (const x of a) c.set(x, (c.get(x) ?? 0) + 1)
  // Object keys in the live page: whole numbers come out in ascending order.
  return [...c.keys()]
    .sort((x, y) => x - y)
    .map((k) => `${c.get(k)! > 1 ? c.get(k) : ''}d${k}`)
    .join(' + ')
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

/** One roll in the log, as parts: who, what, the dice, and the total when it adds anything. */
export function rollLine(r: RollEntry): { secret: boolean; swatch: string | null; who: string; what: string; dice: string; extra: string; total: number | null } {
  const secret = !!r.s
  if (r.ds) {
    const rs = r.ds.map((x) => x.r)
    const sum = rs.reduce((a, b) => a + b, 0)
    return {
      secret,
      swatch: swatchOf(r.sk),
      who: String(r.n ?? ''),
      what: trayLabel(r.ds.map((x) => x.d)),
      dice: rs.join(', '),
      extra: r.m ? ` ${signed(r.m)}` : '',
      total: rs.length > 1 || r.m ? sum + (r.m || 0) : null,
    }
  }
  return { secret, swatch: null, who: String(r.n ?? ''), what: `d${r.d}`, dice: String(r.r), extra: r.m ? ` ${signed(r.m)}` : '', total: r.m ? (r.r as number) + r.m : null }
}

/** The log: the last 12 rolls and lines (the GM also sees their secret rolls), newest first. */
export function diceLog(rolls: Record<string, RollEntry | null>, secret: RollEntry[], dm: boolean): RollEntry[] {
  return Object.values(rolls)
    .filter((r): r is RollEntry => !!r && !r.fx && !r.wave && !r.boss)
    .concat(dm ? secret.map((s) => ({ ...s, s: 1 })) : [])
    .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
    .slice(-12)
    .reverse()
}

/**
 * New entries in the shared list since the last look (the first look only remembers
 * what is there). At most the last five are returned, oldest first.
 */
export function freshRolls(rolls: Record<string, RollEntry | null>, seen: Set<string>, seeded: boolean): RollEntry[] {
  const keys = Object.keys(rolls)
  if (!seeded) {
    keys.forEach((k) => seen.add(k))
    return []
  }
  const fresh = keys.filter((k) => !seen.has(k))
  fresh.forEach((k) => seen.add(k))
  return fresh
    .slice(-5)
    .map((k) => rolls[k])
    .filter((e): e is RollEntry => !!e)
}

/** Another player's roll to show here: dice, not mine, not secret, under a minute old. */
export const replayable = (e: RollEntry, me: string, now: number) => !!e.ds && e.by !== me && !e.s && now - (e.ts ?? 0) <= 60000

/**
 * The 3D library's notation with the results forced ("2d6+1d20@3,4,17").
 * A d100 is a tens die and a d10. A d4 cannot be forced: my own d4s land where
 * they land (and their result is read back); someone else's are left out.
 */
export function libNotation(ds: number[], res: Die[], remote: boolean): string | null {
  const types: string[] = []
  const vals: Record<string, (number | null)[]> = {}
  const add = (t: string, v: number | null) => {
    if (!vals[t]) {
      vals[t] = []
      types.push(t)
    }
    vals[t].push(v)
  }
  ds.forEach((d, i) => {
    const r = res[i]!.r
    if (d === 4) {
      if (!remote) add('d4', null)
      return
    }
    if (d === 100) {
      const td = Math.floor(r / 10) % 10
      const od = r % 10
      add('d100', td === 0 ? 100 : td * 10)
      add('d10', od === 0 ? 10 : od)
      return
    }
    add(`d${d}`, r)
  })
  if (!types.length) return null
  types.sort((a, b) => Number(a === 'd4') - Number(b === 'd4'))
  const forced: number[] = []
  types.forEach((t) => {
    if (t !== 'd4') vals[t]!.forEach((v) => forced.push(v as number))
  })
  return types.map((t) => `${vals[t]!.length}${t}`).join('+') + (forced.length ? `@${forced.join(',')}` : '')
}

/** The bonus a manual roll adds: the bonus box, plus a player's chosen stat. */
export function manualBonus(bonus: number, stat: string, sheet: Record<string, unknown> | undefined, dm: boolean, mod: (s?: number) => number): number {
  return (Number(bonus) || 0) + (!dm && stat && sheet ? mod(sheet[stat] as number | undefined) : 0)
}
