// Wearing, giving and taking away accessories. A worn accessory's sheet effects
// (max HP, max stamina, regen, AC, flasks) are applied as differences, like levels,
// so the GM's own changes to a sheet are kept.
import { ACCESSORIES, idList, worn, type GearFx } from '../data/gear'
import { maxHpShift } from './levels'
import type { Change, Sheet } from './sheet'
import { clamp } from './stats'

const fxOf = (id: unknown): GearFx => (typeof id === 'string' ? (ACCESSORIES[id]?.fx ?? {}) : {})

/** The sheet changes for putting `id` in a slot (null: take it off). Null when nothing changes or it isn't allowed. */
export function wearChange(c: Sheet, slot: 'a1' | 'a2', id: string | null): Change | null {
  const old = worn({ [slot]: c[slot] })[0] ?? null
  if (old === id) return null
  if (id && (!idList(c.ao).includes(id) || worn(c).includes(id))) return null
  const a = fxOf(old)
  const b = fxOf(id)
  const d = (k: keyof GearFx) => (b[k] ?? 0) - (a[k] ?? 0)
  const p: Record<string, unknown> = { [slot]: id }
  if (d('hp')) Object.assign(p, maxHpShift(c as Parameters<typeof maxHpShift>[0], d('hp')))
  if (d('st')) {
    const ms = Math.max(0, ((c.maxSt as number) ?? 0) + d('st'))
    p.maxSt = ms
    p.st = clamp(((c.st as number) ?? 0) + d('st'), ms)
  }
  if (d('rg')) p.rg = Math.max(0, ((c.rg as number) ?? 0) + d('rg'))
  if (d('ac')) p.ac = ((c.ac as number) ?? 10) + d('ac')
  if (d('fl')) {
    const mf = Math.max(0, ((c.maxFl as number) ?? 0) + d('fl'))
    p.maxFl = mf
    p.fl = clamp(((c.fl as number) ?? 0) + d('fl'), mf)
  }
  const msg = id ? `Put on ${ACCESSORIES[id]!.n}` : `Took off ${ACCESSORIES[old!]!.n}`
  return [p, msg]
}

/** The GM gives an accessory (kept in the hero's bag, ao). Null if they already have it. */
export function giveChange(c: Sheet, id: string): Change | null {
  const have = idList(c.ao)
  if (!(id in ACCESSORIES) || have.includes(id)) return null
  return [{ ao: [...have, id].join(',') }, `Received ${ACCESSORIES[id]!.n}`]
}

/** The GM takes an accessory back (taking it off first if worn). */
export function takeChange(c: Sheet, id: string): Change | null {
  const have = idList(c.ao)
  if (!have.includes(id)) return null
  const slot = c.a1 === id ? 'a1' : c.a2 === id ? 'a2' : null
  const off = slot ? wearChange(c, slot, null)![0] : {}
  const left = have.filter((x) => x !== id)
  return [{ ...off, ao: left.length ? left.join(',') : null }, `Gave back ${ACCESSORIES[id]!.n}`]
}
