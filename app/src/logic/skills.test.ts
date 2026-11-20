import { describe, expect, it } from 'vitest'
import { addSkillSet, isUtilitySkill, skillAttack, skillReach } from './skills'

describe('isUtilitySkill', () => {
  it.each([
    ['0', true],
    ['-', true],
    ['none', true],
    [' NONE ', true],
    ['2d6', false],
    ['', false],
    [undefined, false],
    [0, false],
  ])('%s -> %s', (d, out) => expect(isUtilitySkill(d)).toBe(out))
})

describe('addSkillSet', () => {
  const preset = [
    { name: 'Silk Snare', dice: '2d6', range: 3, target: 's' as const },
    { name: 'Venom Mist', dice: '0', range: 2, target: 'a' as const },
  ]
  it('adds, keeps existing rows and skips names already there (any spelling)', () => {
    const out = addSkillSet({ old: { n: 'New skill', d: '2d6', r: 1, t: 's' }, dup: { n: 'silk-snare', d: '9d9', r: 1, t: 's' } }, preset, (i) => `k${i}`)
    expect(out).toEqual({
      old: { n: 'New skill', d: '2d6', r: 1, t: 's' },
      dup: { n: 'silk-snare', d: '9d9', r: 1, t: 's' },
      k1: { n: 'Venom Mist', d: '0', r: 2, t: 'a', a: 0 },
    })
  })
  it('works without existing skills and does not change the input', () => {
    const before = { a: { n: 'X', d: '1d4', r: 1, t: 's' as const } }
    expect(Object.keys(addSkillSet(undefined, preset, (i) => `k${i}`))).toEqual(['k0', 'k1'])
    addSkillSet(before, preset, (i) => `k${i}`)
    expect(Object.keys(before)).toEqual(['a'])
  })
})

describe('skillAttack and skillReach', () => {
  it('attack numbers', () =>
    expect(skillAttack({ n: 'Chain Pull', d: '2d8', r: 3, t: 's' }, 5, 3, false)).toEqual({ label: 'Chain Pull', rng: 3, dmg: '2d8', tb: 5, db: 0, cost: 0, po: 0, auto: false, heavy: true }))
  it('missing dice default to 1d8', () => expect(skillAttack({ n: 'X', d: '', r: 1, t: 's' }, 4, 1, true).dmg).toBe('1d8'))
  it('reach', () => {
    expect(skillReach({ r: 3, t: 's' })).toBe(3)
    expect(skillReach({ r: 0, t: 's' })).toBe(1)
    expect(skillReach({ r: 0, t: 'a' })).toBe(2)
    expect(skillReach({ r: 4, t: 'a' })).toBe(4)
  })
})
