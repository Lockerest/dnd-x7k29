// The Game Master's enemy panel: the same edits, limits and defaults as the live page.
import { SC } from '../data/rules'
import type { Enemy, EnemySkill } from './types'
import { clamp } from './stats'

/** Enemy ranks shown in the editor. A 4x4 or larger enemy counts as Unique unless set. */
export const RANKS = { n: 'Normal', l: 'Large', m: 'Mini-boss', u: 'Unique' } as const
export type Rank = keyof typeof RANKS
export const rankOf = (e: Enemy): Rank => (e.rk as Rank) || ((e.sz || 1) >= 4 ? 'u' : 'n')

/** Text fields and their maximum lengths. */
export const TEXT_LIMITS: Record<string, number> = { dm: 20, bt: 40, name: 40, type: 40, nt: 400, gt: 900, pl: 30 }

/**
 * The change one editor field makes. value is the input's text, or true/false for
 * check boxes. A blank name keeps the old name; numbers that don't parse become 0.
 */
export function enemyFieldChange(e: Enemy, field: string, value: string | boolean): Record<string, unknown> {
  if (field === 'rk' || field === 'th' || field === 'nx') return { [field]: String(value) }
  if (field === 'sw' || field === 'gv') return { [field]: value ? 1 : 0 }
  const v = String(value)
  if (TEXT_LIMITS[field]) return { [field]: v.slice(0, TEXT_LIMITS[field]) || (field === 'name' ? e.name : '') }
  if (field === 'max') {
    const max = Math.max(1, Number(v) || 1)
    return { max, hp: Math.min(e.hp ?? 0, max) }
  }
  if (field === 'sz') return { sz: Math.max(1, Math.min(8, Number(v) || 1)) }
  return { [field]: Number(v) || 0 }
}

/** The "+10 / -50" HP buttons: HP stays between 0 and max. */
export const hpStep = (e: Enemy, n: number) => ({ hp: clamp((e.hp ?? 0) + n, e.max ?? 0) })

export type NewEnemyForm = { name: string; type: string; size: string; hp: string; speed: string; poise: string; ac: string; attack: string; damage: string }

/** "Add enemy": a fresh sheet on the x10 scale, or null without a name. */
export function newEnemy(f: NewEnemyForm): Enemy | null {
  const name = f.name.trim()
  if (!name) return null
  const hp = Number(f.hp) || 10 * SC
  const poise = Number(f.poise) || 0
  return {
    name,
    type: f.type.trim() || 'Monster',
    x10: true,
    hp,
    max: hp,
    sz: Number(f.size) || 1,
    spd: Number(f.speed) || 6,
    bon: 0,
    pm: poise,
    po: poise,
    ac: Number(f.ac) || 12,
    ab: f.attack === '' ? 4 : Number(f.attack),
    dm: (f.damage.trim() || '1d8').slice(0, 20),
    er: 1,
    ib: 0,
  }
}

/** Sheets whose "next phase" points at id (they lose that link when id is removed). */
export const linksTo = (all: Record<string, Enemy>, id: string) => Object.keys(all).filter((k) => k !== id && all[k]?.nx === id)

/** Short status labels under an enemy's name. */
export function enemyPills(id: string, e: Enemy, chars: Record<string, { mon?: string | null; mt?: string }>): string[] {
  const x: string[] = []
  if ((e.hp ?? 0) <= 0) x.push('Slain')
  if (e.stun) x.push(e.sg ? 'Staggered' : 'Stunned')
  if (Object.values(chars).some((c) => c.mon === id && c.mt === 'climb')) x.push("Has a rider: can't hit them except with an area attack")
  return x
}

/** "+ Add skill" makes this row; rename it or load a skill set. */
export const NEW_SKILL: EnemySkill = { n: 'New skill', d: '2d6', r: 1, t: 's', a: 0 }

/** The value a skill field saves: check boxes 1/0, range at least 1 (0 or text become 1), text as typed. */
export function skillFieldValue(field: string, value: string | boolean): string | number {
  if (typeof value === 'boolean') return value ? 1 : 0
  return field === 'r' ? Number(value) || 1 : value
}

/** A random key like the live page's (prefix + 4 to 6 letters/digits). */
export const randomKey = (prefix: string, len: number, rand: () => number = Math.random) => prefix + rand().toString(36).slice(2, 2 + len)
