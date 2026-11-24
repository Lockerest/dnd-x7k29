import { describe, expect, it } from 'vitest'
import { BOSS_STATS, bossStatsPatch, STAT_GROUPS, statPreset } from './bossStats'

describe('boss stat presets', () => {
  it('every preset is a full-HP sheet with sane numbers', () => {
    for (const g of STAT_GROUPS)
      for (const [k, s] of Object.entries(g.items)) {
        expect(s.max, k).toBeGreaterThan(0)
        expect(s.ac, k).toBeGreaterThanOrEqual(11)
        expect(s.sz, k).toBeGreaterThanOrEqual(1)
        expect(bossStatsPatch(s), k).toMatchObject({ hp: s.max, max: s.max, name: s.name })
      }
  })
  it('bosses come first, then the regions; a menu value finds its preset', () => {
    expect(STAT_GROUPS[0]!.items).toBe(BOSS_STATS)
    expect(statPreset('Frozen North (Calden, level 1-3)|Necrolyte')).toMatchObject({ name: 'Necrolyte', rk: 'n' })
    expect(statPreset('Bosses|The Jailer (Calden, level 2)')).toMatchObject({ name: 'The Jailer' })
    expect(statPreset('Nowhere|Necrolyte')).toBeUndefined()
  })
})
