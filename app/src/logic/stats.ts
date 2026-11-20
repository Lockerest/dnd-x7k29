// Small number helpers shared by every rule.
import type { Character, Stat } from './types'

const STATS: Stat[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Keeps v between 0 and max. */
export const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))

/** 5E ability modifier. A missing score counts as 10. */
export const mod = (score?: number) => Math.floor(((score || 10) - 10) / 2)

/** 5E proficiency bonus for the character's level (level 1 if missing). */
export const proficiency = (c: Pick<Character, 'level'>) => 2 + Math.floor(((c.level || 1) - 1) / 4)

/** "level" gives the level, a stat name gives its modifier, anything else 0. */
export const bonusOf = (c: Character, bonus: string) =>
  bonus === 'level' ? c.level || 1 : (STATS as string[]).includes(bonus) ? mod(c[bonus as Stat]) : 0
