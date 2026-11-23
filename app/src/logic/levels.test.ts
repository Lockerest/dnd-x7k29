import { describe, expect, it } from 'vitest'
import { growth, levelChange } from './levels'

describe('level growth', () => {
  it('+10% base HP and +5% base stamina per level; +2 attack stat at levels 2, 4 and 8', () => {
    expect(growth('fighter', 1)).toEqual({ hp: 0, st: 0, stat: 0 })
    expect(growth('fighter', 2)).toEqual({ hp: 14, st: 5, stat: 2 })
    expect(growth('fighter', 10)).toEqual({ hp: 126, st: 45, stat: 6 })
    expect(growth('mage', 5)).toEqual({ hp: 36, st: 28, stat: 4 })
    // Unknown class counts as a fighter; levels stay between 1 and 10.
    expect(growth('nope', 99)).toEqual(growth('fighter', 10))
    expect(growth(undefined, 0)).toEqual(growth('fighter', 1))
  })

  it('a new level moves max and current HP and stamina and the attack stat', () => {
    const c = { cls: 'fighter', level: 1, hp: 100, maxHp: 140, st: 60, maxSt: 100, str: 16 }
    expect(levelChange(c, 2)).toEqual({ level: 2, maxHp: 154, hp: 114, maxSt: 105, st: 65, str: 18 })
    // Level 3 is not a stat level: no stat change.
    expect(levelChange({ ...c, level: 2 }, 3)).toEqual({ level: 3, maxHp: 154, hp: 114, maxSt: 105, st: 65 })
    // Going down takes it back; a missing stat counts as 10.
    expect(levelChange({ cls: 'mage', level: 2, hp: 5, maxHp: 99, st: 2, maxSt: 147 }, 1)).toEqual({ level: 1, maxHp: 90, hp: 1, maxSt: 140, st: 0, int: 8 })
  })

  it('keeps the revival curse share, the fallen stay at 0, bad input is level 1', () => {
    // Cursed: base 140, max 112 (80%).
    expect(levelChange({ cls: 'fighter', level: 1, hp: 112, maxHp: 112, bmh: 140, st: 100, maxSt: 100 }, 3)).toMatchObject({ bmh: 168, maxHp: 134, hp: 134 })
    expect(levelChange({ cls: 'fighter', level: 1, hp: 0, maxHp: 140, st: 0, maxSt: 100 }, 2)).toMatchObject({ hp: 0, st: 5 })
    expect(levelChange({ cls: 'fighter', hp: 10 }, NaN)).toEqual({ level: 1, maxHp: 1, hp: 1, maxSt: 0, st: 0 })
    expect(growth('fighter', -3)).toEqual(growth('fighter', 1))
    expect(levelChange({ cls: 'fighter', level: 2, maxHp: 154 }, -2)).toMatchObject({ level: 1, hp: 0, str: 8 })
    // An unknown class grows like a fighter, on STR.
    expect(levelChange({ cls: 'nope', level: 1, hp: 1, maxHp: 140, st: 0, maxSt: 100 }, 2)).toMatchObject({ str: 12 })
  })
})
