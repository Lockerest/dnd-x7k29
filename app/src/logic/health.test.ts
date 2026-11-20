import { describe, expect, it } from 'vitest'
import { effectiveMaxHp, fatigueFromDamage, hpCost, scaleCharacter, scaleEnemy } from './health'

describe('effectiveMaxHp', () => {
  it('base', () => expect(effectiveMaxHp(100, 0, 0)).toBe(100))
  it('deaths', () => expect([1, 2, 3, 5].map((d) => effectiveMaxHp(100, d, 0))).toEqual([90, 80, 70, 70]))
  it('fatigue', () => expect([1, 4, 10, 15].map((f) => effectiveMaxHp(100, 0, f))).toEqual([99, 96, 90, 90]))
  it('both, floor 5', () => {
    expect(effectiveMaxHp(100, 3, 10)).toBe(60)
    expect(effectiveMaxHp(4, 3, 10)).toBe(5)
  })
  it('missing values', () => expect(effectiveMaxHp(140)).toBe(140))
})

describe('fatigueFromDamage', () => {
  it('below a step only tallies', () => expect(fatigueFromDamage({ maxHp: 100 }, 5, 95)).toEqual({ fa: 5 }))
  it('steps', () => expect(fatigueFromDamage({ maxHp: 100 }, 25, 75)).toEqual({ fa: 25, ft: 2, bmh: 100, maxHp: 98, hp: 75 }))
  it('cuts HP to the new max', () => expect(fatigueFromDamage({ maxHp: 100, fa: 9 }, 1, 99)).toEqual({ fa: 10, ft: 1, bmh: 100, maxHp: 99, hp: 99 }))
  it('caps at 10', () => expect(fatigueFromDamage({ maxHp: 100 }, 500, 0)).toMatchObject({ ft: 10, maxHp: 90 }))
  it('uses the base max HP', () => expect(fatigueFromDamage({ maxHp: 98, bmh: 100, fa: 25, ft: 2 }, 5, 60)).toMatchObject({ ft: 3, bmh: 100, maxHp: 97 }))
  it('stacks with deaths', () => expect(fatigueFromDamage({ maxHp: 90, bmh: 100, dth: 1 }, 10, 50)).toMatchObject({ ft: 1, maxHp: 89 }))
  it('a sheet without max HP never steps (division by zero gives Infinity, capped at 10)', () =>
    expect(fatigueFromDamage({}, 5, 0)).toMatchObject({ ft: 10, maxHp: 5, hp: 0 }))
})

describe('hpCost', () => {
  it('no cost', () => {
    expect(hpCost({ hp: 50, maxHp: 100 }, undefined)).toEqual({})
    expect(hpCost({ hp: 50, maxHp: 100 }, 0)).toEqual({})
  })
  it('takes a % of base and counts it as fatigue', () => expect(hpCost({ hp: 50, maxHp: 100 }, 10)).toEqual({ hp: 40, fa: 10, ft: 1, bmh: 100, maxHp: 99 }))
  it('never takes the last point', () => {
    expect(hpCost({ hp: 20, maxHp: 100 }, 50)).toMatchObject({ hp: 1 })
    expect(hpCost({ hp: 1, maxHp: 100 }, 10)).toEqual({})
  })
  it('uses bmh when present, and tolerates a missing max', () => {
    expect(hpCost({ hp: 50, maxHp: 90, bmh: 100 }, 10)).toMatchObject({ hp: 40 })
    expect(hpCost({ hp: 50 }, 10)).toEqual({})
  })
})

describe('x10 scale', () => {
  it('scales an old character once', () => {
    expect(scaleCharacter({ hp: 12, maxHp: 14, st: 10, maxSt: 10, rg: 2, name: 'Old' })).toEqual({ x10: true, hp: 120, maxHp: 140, st: 100, maxSt: 100, rg: 20 })
    expect(scaleCharacter({ hp: 120, x10: true })).toBeNull()
    expect(scaleCharacter(null)).toBeNull()
  })
  it('scales an old enemy once', () => {
    expect(scaleEnemy({ hp: 5, max: 5, pm: 3, name: 'Wolf' })).toEqual({ x10: true, hp: 50, max: 50, pm: 30 })
    expect(scaleEnemy({ hp: 50, x10: true })).toBeNull()
    expect(scaleEnemy(undefined)).toBeNull()
  })
})
