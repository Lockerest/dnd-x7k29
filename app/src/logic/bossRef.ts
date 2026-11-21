// The GM's Boss abilities list: every boss skill set grouped by boss, phase by phase.
import type { SkillRow } from '../data/skillSets'
import { isUtilitySkill } from './skills'
import { abilitySlug } from './text'

export type BossPhase = { label: string; rows: (SkillRow & { slug: string; damage: string; reach: string })[] }
export type BossEntry = { boss: string; phases: BossPhase[] }

/** "Aethelric: phase 2 (golden)" → boss "Aethelric", phase "phase 2 (golden)". */
export function bossSections(sets: Record<string, SkillRow[]>): BossEntry[] {
  const out: BossEntry[] = []
  for (const [key, rows] of Object.entries(sets)) {
    const i = key.indexOf(':')
    const boss = i < 0 ? key : key.slice(0, i).trim()
    const label = i < 0 ? '' : key.slice(i + 1).trim()
    let e = out.find((x) => x.boss === boss)
    if (!e) out.push((e = { boss, phases: [] }))
    e.phases.push({
      label,
      rows: rows.map((r) => ({
        ...r,
        slug: abilitySlug(r.name),
        damage: isUtilitySkill(r.dice) ? '—' : r.dice,
        reach: `${r.range} sq, ${r.target === 'a' ? 'area' : 'single'}`,
      })),
    })
  }
  return out
}
