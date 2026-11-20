import { describe, expect, it } from 'vitest'
import { bonusOf, clamp, mod, proficiency } from './stats'

describe('clamp', () => {
  it.each([
    [150, 100, 100],
    [-5, 100, 0],
    [40, 100, 40],
    [0, 0, 0],
  ])('clamp(%i, %i) = %i', (v, m, out) => expect(clamp(v, m)).toBe(out))
})

describe('mod', () => {
  it.each([
    [10, 0],
    [11, 0],
    [8, -1],
    [15, 2],
    [20, 5],
    [1, -5],
    [undefined, 0],
    [0, 0],
  ])('mod(%s) = %i', (s, out) => expect(mod(s)).toBe(out))
})

describe('proficiency', () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [13, 5],
    [17, 6],
    [20, 6],
  ])('level %i gives +%i', (level, out) => expect(proficiency({ level })).toBe(out))
  it('defaults to level 1', () => expect(proficiency({})).toBe(2))
})

describe('bonusOf', () => {
  it('reads the level (1 when missing)', () => {
    expect(bonusOf({ level: 7 }, 'level')).toBe(7)
    expect(bonusOf({}, 'level')).toBe(1)
  })
  it('reads an ability modifier', () => expect(bonusOf({ int: 16 }, 'int')).toBe(3))
  it('is 0 for anything else', () => expect(bonusOf({ level: 9 }, 'luck')).toBe(0))
})
