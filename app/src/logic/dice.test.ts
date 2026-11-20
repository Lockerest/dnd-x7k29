import { describe, expect, it } from 'vitest'
import { mod } from './stats'
import { diceLog, freshRolls, libNotation, manualBonus, replayable, rollLine, skinConfig, skinOf, swatchOf, trayLabel } from './dice'

describe('dice styles', () => {
  it('finds a style, falling back to Ivory; the 3D settings use custom colours when there is no set', () => {
    expect(skinOf('lava')[1]).toBe('Lava')
    expect(skinOf('nope')[0]).toBe('classic')
    expect(skinOf(undefined)[0]).toBe('classic')
    expect(swatchOf('gold')).toBe('#d4a017')
    expect(skinConfig('classic')).toEqual({ theme_colorset: 'white', theme_material: 'plastic', theme_customColorset: null })
    expect(skinConfig('red')).toMatchObject({ theme_colorset: 'white', theme_customColorset: { name: 'red' } })
  })
})

describe('the log', () => {
  it('labels dice by size, smallest first', () => {
    expect(trayLabel([20, 6, 6, 4])).toBe('d4 + 2d6 + d20')
    expect(trayLabel([])).toBe('')
  })

  it('reads a roll: dice, bonus and total (only when it adds something); old one-die rolls too', () => {
    expect(rollLine({ n: 'Lyra', ds: [{ d: 20, r: 13 }], m: 4, sk: 'lava' })).toEqual({ secret: false, swatch: '#f43c04', who: 'Lyra', what: 'd20', dice: '13', extra: ' +4', total: 17 })
    expect(rollLine({ n: 'Lyra', ds: [{ d: 6, r: 2 }, { d: 6, r: 5 }] })).toMatchObject({ what: '2d6', dice: '2, 5', extra: '', total: 7 })
    expect(rollLine({ n: 'GM', ds: [{ d: 8, r: 3 }], m: -1, s: 1 })).toMatchObject({ secret: true, swatch: '#e9e2d0', extra: ' -1', total: 2 })
    expect(rollLine({ ds: [{ d: 8, r: 3 }] })).toMatchObject({ who: '', total: null })
    expect(rollLine({ n: 'Old', d: 20, r: 7 })).toEqual({ secret: false, swatch: null, who: 'Old', what: 'd20', dice: '7', extra: '', total: null })
    expect(rollLine({ d: 20, r: 7, m: 2 })).toMatchObject({ who: '', extra: ' +2', total: 9 })
  })

  it('the last 12 rolls and lines, newest first, without effects; the GM adds their secret rolls', () => {
    const rolls = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`k${i}`, { ev: `line ${i}`, ts: i }]))
    expect(diceLog(rolls, [], false).map((r) => r.ev)).toEqual(['line 13', 'line 12', 'line 11', 'line 10', 'line 9', 'line 8', 'line 7', 'line 6', 'line 5', 'line 4', 'line 3', 'line 2'])
    const mixed = { a: { ev: 'a', ts: 1 }, b: { fx: {}, ts: 2 }, c: { wave: {}, ts: 3 }, d: { boss: {}, ts: 4 }, e: null, f: { ev: 'f' } }
    expect(diceLog(mixed, [{ n: 'GM', ds: [], ts: 5 }], true)).toEqual([{ n: 'GM', ds: [], ts: 5, s: 1 }, { ev: 'a', ts: 1 }, { ev: 'f' }])
    expect(diceLog(mixed, [{ n: 'GM', ds: [], ts: 5 }], false)).toEqual([{ ev: 'a', ts: 1 }, { ev: 'f' }])
  })
})

describe('replaying rolls from other devices', () => {
  it('the first look only remembers; later looks return up to five new entries', () => {
    const seen = new Set<string>()
    expect(freshRolls({ a: { ev: 'x' } }, seen, false)).toEqual([])
    const many = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`n${i}`, { ev: String(i) }]))
    expect(freshRolls({ a: { ev: 'x' }, ...many, z: null }, seen, true).map((e) => e.ev)).toEqual(['4', '5', '6', '7'])
    expect(freshRolls({ a: { ev: 'x' }, ...many }, seen, true)).toEqual([])
  })

  it("only someone else's dice, not secret, under a minute old", () => {
    const e = { ds: [{ d: 6, r: 1 }], by: 'b', ts: 1000 }
    expect(replayable(e, 'a', 61000)).toBe(true)
    expect(replayable(e, 'a', 61001)).toBe(false)
    expect(replayable(e, 'b', 1000)).toBe(false)
    expect(replayable({ ...e, s: 1 }, 'a', 1000)).toBe(false)
    expect(replayable({ ev: 'x', by: 'b', ts: 1000 }, 'a', 1000)).toBe(false)
    expect(replayable({ ds: [] }, 'a', 60000)).toBe(true)
  })
})

describe('the 3D notation', () => {
  it('forces each result; a d100 is tens and units; my d4s roll free, others are left out', () => {
    expect(libNotation([6, 20, 6], [{ d: 6, r: 2 }, { d: 20, r: 17 }, { d: 6, r: 5 }], false)).toBe('2d6+1d20@2,5,17')
    expect(libNotation([100, 100], [{ d: 100, r: 47 }, { d: 100, r: 100 }], false)).toBe('2d100+2d10@40,100,7,10')
    expect(libNotation([100], [{ d: 100, r: 5 }], false)).toBe('1d100+1d10@100,5')
    expect(libNotation([4, 8], [{ d: 4, r: 3 }, { d: 8, r: 8 }], false)).toBe('1d8+1d4@8')
    expect(libNotation([4], [{ d: 4, r: 3 }], false)).toBe('1d4')
    expect(libNotation([4], [{ d: 4, r: 3 }], true)).toBeNull()
  })
})

describe('manual rolls', () => {
  it("the bonus box plus a player's stat (never the GM's)", () => {
    expect(manualBonus(2, 'dex', { dex: 16 }, false, mod)).toBe(5)
    expect(manualBonus(2, 'dex', { dex: 16 }, true, mod)).toBe(2)
    expect(manualBonus(Number.NaN, '', { dex: 16 }, false, mod)).toBe(0)
    expect(manualBonus(1, 'dex', undefined, false, mod)).toBe(1)
  })
})
