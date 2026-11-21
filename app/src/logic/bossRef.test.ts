import { describe, expect, it } from 'vitest'
import { bossSections } from './bossRef'

describe('the Boss abilities list', () => {
  it('groups skill sets by boss, phase by phase', () => {
    const out = bossSections({
      'Ogre: phase 1': [
        { name: 'Club', dice: '2d8', range: 1, target: 's', text: 'Smash.' },
        { name: 'Roar', dice: '0', range: 3, target: 'a' },
      ],
      'Ogre: phase 2': [{ name: "Ogre's Fury", dice: '4d6', range: 2, target: 'a' }],
      Lonely: [{ name: 'Bite', dice: '1d4', range: 1, target: 's' }],
    })
    expect(out.map((b) => [b.boss, b.phases.map((p) => p.label)])).toEqual([
      ['Ogre', ['phase 1', 'phase 2']],
      ['Lonely', ['']],
    ])
    expect(out[0]!.phases[0]!.rows).toEqual([
      { name: 'Club', dice: '2d8', range: 1, target: 's', text: 'Smash.', slug: 'club', damage: '2d8', reach: '1 square, one target' },
      { name: 'Roar', dice: '0', range: 3, target: 'a', slug: 'roar', damage: '—', reach: '3 squares, area' },
    ])
    expect(out[0]!.phases[1]!.rows[0]!.slug).toBe('ogre_s_fury')
  })
})
