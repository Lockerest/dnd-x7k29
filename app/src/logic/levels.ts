// Level growth: every level adds to max HP and stamina, and the stat levels
// (2, 4 and 8) raise the class's attack stat. Applied as the difference between
// the old and new level, so the GM's own changes to a sheet are kept.
import { CLASSES } from '../data/classes'
import { CLASS_STAT } from '../data/rules'
import { clamp } from './stats'
import type { ClassId } from './types'

/** Levels that raise the class's attack stat by 2 (its modifier by 1). */
export const STAT_LEVELS = [2, 4, 8]

/** Highest level. */
export const MAX_LEVEL = 10

/** What a class has gained by a level, on top of level 1: +10% base HP and +5% base stamina per level, +2 attack stat per stat level. */
export function growth(cls: string | undefined, level: number) {
  const k = CLASSES[cls as ClassId] ?? CLASSES.fighter
  const l = clamp(Math.floor(level) || 1, MAX_LEVEL) || 1
  return { hp: Math.round(k.hp * 0.1 * (l - 1)), st: Math.round(k.stamina * 0.05 * (l - 1)), stat: STAT_LEVELS.filter((s) => s <= l).length * 2 }
}

type Leveled = { cls?: string; level?: number; hp?: number; maxHp?: number; bmh?: number | null; st?: number; maxSt?: number } & Record<string, unknown>

/**
 * The sheet changes for a new level (1 to 10): max HP (keeping the revival curse's
 * share), max stamina and the attack stat move by the growth difference; current HP
 * and stamina move with them (a standing hero keeps at least 1 HP).
 */
export function levelChange(c: Leveled, level: number): Record<string, unknown> {
  const to = clamp(Math.round(level) || 1, MAX_LEVEL) || 1
  const a = growth(c.cls, c.level || 1)
  const b = growth(c.cls, to)
  const dHp = b.hp - a.hp
  const dSt = b.st - a.st
  const p: Record<string, unknown> = { level: to }
  const max = c.maxHp ?? 0
  const base = c.bmh || max
  const nb = Math.max(1, base + dHp)
  const nm = c.bmh ? Math.max(1, Math.round((nb * max) / base)) : nb
  if (c.bmh) p.bmh = nb
  p.maxHp = nm
  const hp = c.hp ?? 0
  p.hp = hp > 0 ? Math.max(1, clamp(hp + nm - max, nm)) : 0
  const ms = Math.max(0, (c.maxSt ?? 0) + dSt)
  p.maxSt = ms
  p.st = clamp((c.st ?? 0) + dSt, ms)
  const stat = CLASS_STAT[c.cls as ClassId] ?? 'str'
  if (b.stat !== a.stat) p[stat] = (Number(c[stat]) || 10) + b.stat - a.stat
  return p
}
