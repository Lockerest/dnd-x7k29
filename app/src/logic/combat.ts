// Attack effects, attack numbers, grid distance and poise.
import { EFFECT_KEYWORDS } from '../data/effects'
import { CLASS_STAT, WEAPON_REACH } from '../data/rules'
import { abilityCost } from './stamina'
import { mod, proficiency } from './stats'
import type { AttackInfo, Character, EffectKind, Enemy, Unit } from './types'

/** The hit effect and sound for an attack: a keyword in its name, else arrow (ranged), heavy or slash. */
export function effectKind(label: unknown, heavy: boolean, range: number): EffectKind {
  const l = String(label || '')
  for (const [re, kind] of EFFECT_KEYWORDS) if (re.test(l)) return kind
  if (range > 1) return 'arrow'
  return heavy ? 'heavy' : 'slash'
}

/** The element of an attack name (fire, ice, bolt, poison), never bash or arrow. */
export function elementOf(label: unknown): EffectKind | null {
  const l = String(label || '')
  for (const [re, kind] of EFFECT_KEYWORDS) if (kind !== 'bash' && kind !== 'arrow' && re.test(l)) return kind
  return null
}

/** Heavy hit reactions: fighters by default, unless the sheet says otherwise. */
export const isHeavy = (o: { ha?: unknown; cls?: unknown } | null | undefined) => (o && o.ha != null ? !!o.ha : !!(o && o.cls === 'fighter'))

const classStat = (c: Character) => mod(c[CLASS_STAT[c.cls as keyof typeof CLASS_STAT] || 'str'])

/** Light ("l") or heavy ("h") attack numbers for an enemy or a character. */
export function attackInfo(u: Unit, kind: 'l' | 'h'): AttackInfo {
  if (u.e) {
    const e = u.o as Enemy
    const d = e.dm || '1d8'
    const rng = e.er || 1
    const tb = e.ab ?? 4
    return kind === 'h'
      ? { label: 'Heavy attack', rng, dmg: `${d}+${d}`, tb, db: 0, cost: 0, po: 3, heavy: true }
      : { label: 'Light attack', rng, dmg: d, tb, db: 0, cost: 0, po: 1 }
  }
  const c = u.o as Character
  const tb = proficiency(c) + classStat(c)
  const db = classStat(c)
  const rng = WEAPON_REACH[c.cls as keyof typeof WEAPON_REACH] || 1
  return kind === 'l'
    ? { label: 'Light attack', rng, dmg: '1d6', tb, db, cost: 0, cs: 0, po: 1 }
    : { label: 'Heavy attack', rng, dmg: '1d10', tb, db, cost: 1, cs: abilityCost(c, 1), po: 3, heavy: true }
}

export type Placed = { e: boolean; o: { mx?: number | null; my?: number | null; sz?: number } }
const sizeOf = (u: Placed) => (u.e ? u.o.sz || 1 : 1)

/** Squares between two units' nearest edges (minimum 1). Enemies can be larger than 1x1. */
export function gap(a: Placed, t: Placed): number {
  const za = sizeOf(a)
  const zt = sizeOf(t)
  const ax = a.o.mx ?? 0
  const ay = a.o.my ?? 0
  const tx = t.o.mx ?? 0
  const ty = t.o.my ?? 0
  return Math.max(1, tx - (ax + za - 1), ax - (tx + zt - 1), ty - (ay + za - 1), ay - (ty + zt - 1))
}

/** True when the two units touch (including diagonally). */
export function adjacent(a: Placed, t: Placed): boolean {
  const za = sizeOf(a)
  const zt = sizeOf(t)
  const ax = a.o.mx ?? 0
  const ay = a.o.my ?? 0
  const tx = t.o.mx ?? 0
  const ty = t.o.my ?? 0
  const gx = Math.max(tx - (ax + za - 1), ax - (tx + zt - 1))
  const gy = Math.max(ty - (ay + za - 1), ay - (ty + zt - 1))
  return gx <= 1 && gy <= 1
}

/** Poise damage: returns the sheet change, or null when nothing happens. 0 poise staggers. */
export function poiseHit(e: Enemy, dmg: number): { po: number; stun?: true; sg?: true } | null {
  if (!(e.pm! > 0) || e.stun) return null
  const po = Math.max(0, (e.po ?? e.pm!) - dmg)
  return po === 0 ? { po: 0, stun: true, sg: true } : { po }
}

/** Next-round recovery for an enemy: clears stagger and refills poise (null if nothing to clear). */
export function recover(e: Enemy): Partial<Enemy> | null {
  if (!e.sg && !e.rec) return null
  return { stun: false, sg: false, rec: false, ...(e.sg ? { po: e.pm || 0 } : {}) }
}
