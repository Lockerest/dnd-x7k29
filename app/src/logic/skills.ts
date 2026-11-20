// Boss skills: utility skills, skill-set presets and enemy skill attacks.
import type { SkillRow } from '../data/skillSets'
import { tightSlug } from './text'
import type { AttackInfo, EnemySkill } from './types'

/** "0", "-" or "none" (any case, spaces ignored) means scene and sound only, no damage. */
export const isUtilitySkill = (d: unknown) => ['0', '-', 'none'].includes(String(d || '').trim().toLowerCase())

/**
 * Loads a preset into an enemy's skills: adds the preset skills, keeps the
 * existing ones (including "New skill" rows) and skips names already there.
 * newKey makes the storage key for each added skill.
 */
export function addSkillSet(
  existing: Record<string, EnemySkill> | undefined,
  preset: SkillRow[],
  newKey: (index: number) => string,
): Record<string, EnemySkill> {
  const sk = { ...(existing || {}) }
  const have = new Set(Object.values(sk).map((q) => tightSlug(q.n)))
  preset.forEach(({ name, dice, range, target }, ix) => {
    if (have.has(tightSlug(name))) return
    sk[newKey(ix)] = { n: name, d: dice, r: range, t: target, a: 0 }
  })
  return sk
}

/** Attack numbers for an enemy skill (heavy, no stamina, no poise damage). */
export const skillAttack = (sk: EnemySkill, tb: number, rng: number, auto: boolean): AttackInfo & { auto: boolean } => ({
  label: sk.n,
  rng,
  dmg: sk.d || '1d8',
  tb,
  db: 0,
  cost: 0,
  po: 0,
  auto,
  heavy: true,
})

/** Reach of a skill: its range, at least 1 (area skills reach at least 2). */
export const skillReach = (sk: Pick<EnemySkill, 'r' | 't'>) => (sk.t === 'a' ? Math.max(1, Number(sk.r) || 2) : Number(sk.r) || 1)
