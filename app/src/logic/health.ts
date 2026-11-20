// Max HP after deaths and fatigue, fatigue from damage, abilities that cost HP,
// and the one-time move of old sheets to the x10 scale.
import { SC } from '../data/rules'
import type { Character, Enemy } from './types'

/** Max HP: -10% per death (max 3), -1% per fatigue level (max 10), never below 5. */
export const effectiveMaxHp = (base: number, deaths?: number, fatigue?: number) =>
  Math.max(5, Math.round(base * (1 - 0.1 * Math.min(3, deaths || 0) - 0.01 * Math.min(10, fatigue || 0))))

export type FatiguePatch = { fa: number; ft?: number; bmh?: number; maxHp?: number; hp?: number }

/** Each 10% of base max HP taken adds a fatigue level, which lowers max HP. */
export function fatigueFromDamage(c: Character, dmg: number, newHp: number): FatiguePatch {
  const base = c.bmh || c.maxHp || 0
  const fa = (c.fa || 0) + dmg
  const ft = Math.min(10, Math.floor(fa / (base * 0.1)))
  if (ft === (c.ft || 0)) return { fa }
  const maxHp = effectiveMaxHp(base, c.dth || 0, ft)
  return { fa, ft, bmh: base, maxHp, hp: Math.min(newHp, maxHp) }
}

/** HP cost of an ability (pct of base max HP). It can never take the last hit point. */
export function hpCost(c: Character & { hp: number }, pct: number | undefined): Partial<FatiguePatch> {
  if (!pct) return {}
  const base = c.bmh || c.maxHp || 0
  const loss = Math.min(c.hp - 1, Math.round((base * pct) / 100))
  if (loss <= 0) return {}
  const hp = c.hp - loss
  return { hp, ...fatigueFromDamage(c, loss, hp) }
}

const CHAR_FIELDS = ['hp', 'maxHp', 'st', 'maxSt', 'rg', 'bmh'] as const
const ENEMY_FIELDS = ['hp', 'max', 'pm', 'po', 'hv'] as const

function scale(sheet: Record<string, unknown>, fields: readonly string[]) {
  const p: Record<string, unknown> = { x10: true }
  for (const f of fields) if (typeof sheet[f] === 'number') p[f] = (sheet[f] as number) * SC
  return p
}

/** Changes that move an old character sheet to the x10 scale (null if it already is). */
export const scaleCharacter = (c: Character | null | undefined) => (!c || c.x10 ? null : scale(c, CHAR_FIELDS))

/** Changes that move an old enemy sheet to the x10 scale (null if it already is). */
export const scaleEnemy = (e: Enemy | null | undefined) => (!e || e.x10 ? null : scale(e, ENEMY_FIELDS))
