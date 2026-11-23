import { describe, expect, it } from 'vitest'
import { BOSS_STATS, bossStatsPatch } from './bossStats'

describe('boss stat presets', () => {
  it('every preset is a full-HP sheet with sane numbers', () => {
    for (const [k, s] of Object.entries(BOSS_STATS)) {
      expect(s.max, k).toBeGreaterThan(0)
      expect(s.ac, k).toBeGreaterThanOrEqual(12)
      expect(s.sz, k).toBeGreaterThanOrEqual(1)
      expect(bossStatsPatch(s), k).toMatchObject({ hp: s.max, max: s.max, name: s.name })
    }
  })
})
