import { describe, expect, it } from 'vitest'
import type { MapData } from './geometry'
import type { Sheet } from './sheet'
import {
  alliesDown,
  cellAt,
  doorCheck,
  doorsNear,
  enemyHidden,
  enemyReach,
  fogHidden,
  fogPath,
  grid,
  heroReach,
  liveMapId,
  nextRound,
  occupant,
  onMap,
  placeEnemy,
  shownMapId,
  spoilerValue,
  walk,
  type Maps,
} from './table'

const M: MapData = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const maps: Maps = { m: M, n: { w: 100, h: 100 } }

describe('which map', () => {
  it('the live map, the first one, or the GM pick', () => {
    expect(liveMapId(maps, 'n')).toBe('n')
    expect(liveMapId(maps, 'gone')).toBe('m')
    expect(liveMapId({}, null)).toBeNull()
    expect(shownMapId(maps, 'm', true, 'n')).toBe('n')
    expect(shownMapId(maps, 'm', false, 'n')).toBe('m')
    expect(shownMapId(maps, 'm', true, 'gone')).toBe('m')
    expect(onMap({}, 'm')).toBe(true)
    expect(onMap({ mp: 'm' }, 'm')).toBe(true)
    expect(onMap({ mp: 'n' }, 'm')).toBe(false)
  })
  it('a grid needs a map', () => {
    expect(grid(maps, 'm')).toMatchObject({ id: 'm', cols: 10, rows: 8, cs: 50 })
    expect(grid(maps, null)).toBeNull()
    expect(grid(maps, 'gone')).toBeNull()
  })
  it('a tap point becomes a square', () => {
    const g = grid(maps, 'm')!
    expect(cellAt(g, 0.05, 0.05)).toEqual([0, 0])
    expect(cellAt(g, 0.99, 0.99)).toEqual([9, 7])
    expect(cellAt(g, -0.01, 0.5)).toBeNull()
    expect(cellAt(g, 0.5, -0.1)).toBeNull()
    expect(cellAt(g, 1, 0.5)).toBeNull()
    expect(cellAt(grid({ m: { ...M, h: 420 } }, 'm')!, 0.5, 0.99)).toBeNull() // the part below the last full row
  })
})

describe('fog', () => {
  const g = grid({ m: { ...M, fog: 1, fg: '1', walls: ['3,0'] } }, 'm')!
  it('revealed squares, and what heroes on this map see (walls block)', () => {
    expect(fogHidden(grid(maps, 'm')!, [], 5, 5)).toBe(false) // no fog
    expect(fogHidden(g, [], 0, 0)).toBe(false) // revealed
    expect(fogHidden(g, [], 1, 0)).toBe(true)
    const hero = { mx: 1, my: 0 }
    expect(fogHidden(g, [hero], 2, 0)).toBe(false)
    expect(fogHidden(g, [hero], 4, 0)).toBe(true) // behind the wall
    expect(fogHidden(g, [hero], 1, 5)).toBe(true) // too far
    expect(fogHidden(g, [{ mx: null }, { mx: 1, my: 0, mp: 'n' }], 2, 0)).toBe(true)
  })
  it('a monster is hidden only when all its squares are', () => {
    expect(enemyHidden(null, [], { mx: 0, my: 0 })).toBe(false)
    expect(enemyHidden(g, [], { mx: 1, my: 1 })).toBe(true)
    expect(enemyHidden(g, [], { mx: 0, my: 0, sz: 2 })).toBe(false)
  })
  it('the fog path covers hidden squares', () => {
    const small = grid({ m: { w: 100, h: 100, cols: 2, fog: 1, fg: '1001' } }, 'm')!
    expect(fogPath(small, [])).toBe('M50 0h50v50h-50zM0 50h50v50h-50z')
  })
})

describe('reach and moving', () => {
  const g = grid({ m: { ...M, walls: ['2,1'], ew: ['v,1,3'] } }, 'm')!
  const hero = (o: Partial<Sheet> = {}) => ({ name: 'Lyra', mx: 1, my: 1, st: 50, maxSt: 100, hp: 10, ...o }) as Sheet & { spd?: number }
  it('heroes: speed, exhausted 2, stunned 0, less what they moved in combat; walls and corners block', () => {
    const r = heroReach(hero({ spd: 2 }), g, false)
    expect(r['1,1']).toBe(0)
    expect(r['2,1']).toBeUndefined() // wall
    expect(r['2,2']).toBe(2) // not 1: the diagonal can't cut the wall's corner
    expect(r['2,0']).toBe(2)
    expect(r['3,1']).toBeUndefined() // three steps away
    expect(heroReach(hero({ mx: 1, my: 3, spd: 1 }), g, false)['0,3']).toBeUndefined() // the wall edge between columns 0 and 1 on row 3
    expect(Object.keys(heroReach(hero({ exh: true }), g, false)).length).toBeLessThan(Object.keys(heroReach(hero(), g, false)).length)
    expect(heroReach(hero({ stn: true }), g, false)).toEqual({ '1,1': 0 })
    expect(heroReach(hero({ mvd: 6 }), g, true)).toEqual({ '1,1': 0 })
    expect(heroReach(hero({ spd: 1 } as Partial<Sheet>), g, true)['1,2']).toBe(1) // nothing moved yet this round
    expect(Object.keys(heroReach(hero({ mvd: 6 }), g, false)).length).toBeGreaterThan(1)
    expect(heroReach(hero({ mx: 0, my: 0, spd: 1 }), grid(maps, 'm')!, false)).toEqual({ '0,0': 0, '0,1': 1, '1,0': 1, '1,1': 1 })
  })
  it('monsters: speed + bonus, their whole size must fit', () => {
    const r = enemyReach({ mx: 0, my: 0, sz: 2, spd: 1, bon: 1 }, g)
    expect(r['0,0']).toBe(0)
    expect(r['1,0']).toBeUndefined() // would cover the wall at 2,1
    expect(r['0,2']).toBe(2)
    expect(r['8,0']).toBeUndefined()
    expect(Object.keys(enemyReach({ mx: 7, my: 5 }, grid(maps, 'm')!)).length).toBeGreaterThan(10)
  })
  it('walking: free out of combat or exhausted; in combat stamina per square, exhausting if short', () => {
    expect(walk(hero(), 3, 4, 1, false)).toEqual([{ mx: 4, my: 1 }, 'Moved 3 squares'])
    expect(walk(hero({ mvd: 1 }), 3, 4, 1, true)).toEqual([{ mx: 4, my: 1, mvd: 4, st: 20 }, 'Moved 3 squares (-30 St)'])
    expect(walk(hero({ st: 20 }), 3, 4, 1, true)).toEqual([{ mx: 4, my: 1, mvd: 3, st: 0, exh: true, mt: '', mon: null }, 'Moved 3 squares (-20 St) - out of stamina: EXHAUSTED'])
    expect(walk(hero({ exh: true }), 2, 4, 1, true)).toEqual([{ mx: 4, my: 1, mvd: 2 }, 'Moved 2 squares'])
  })
  it('the GM places a monster inside the map', () => {
    expect(placeEnemy({ sz: 3 }, grid(maps, 'm')!, 9, 7)).toEqual({ mx: 7, my: 5, mp: 'm' })
    expect(placeEnemy({}, grid(maps, 'm')!, 2, 3)).toEqual({ mx: 2, my: 3, mp: 'm' })
  })
})

describe('who stands where', () => {
  const chars = {
    a: { name: 'A', hp: 5, mx: 1, my: 1 },
    b: { name: 'B', hp: 0, mx: 2, my: 2 },
    c: { name: 'C', hp: 5, mx: 3, my: 3, ap: false },
    d: { name: 'D', hp: 5, mx: 4, my: 4, mt: 'climb', mon: 'w' },
    e: { name: 'E', hp: 5, mx: 5, my: 5, mp: 'n' },
  } as Record<string, Sheet>
  const enemies = { w: { hp: 5, mx: 6, my: 6, sz: 2 }, x: { hp: 5, mx: 1, my: 4, hd: 'c:a' }, y: { hp: 0, mx: 0, my: 6 }, z: { hp: 3 } }
  it('living, approved heroes not riding; then monsters by size', () => {
    expect(occupant(chars, enemies, 'm', 1, 1)).toBe('c:a')
    for (const [x, y] of [
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
      [1, 4],
      [0, 6],
      [0, 0],
    ])
      expect(occupant(chars, enemies, 'm', x!, y!)).toBeNull()
    expect(occupant(chars, enemies, 'm', 7, 7)).toBe('e:w')
    expect(occupant(chars, enemies, 'm', 8, 7)).toBeNull()
    expect(occupant(chars, { w: { hp: 5, mx: 6, my: 6, mp: 'n' } }, 'm', 6, 6)).toBeNull()
  })
})

describe('rounds, doors, allies, hidden words', () => {
  it('next round for approved heroes, and recovery for staggered monsters', () => {
    const r = nextRound({ a: { name: 'A', st: 10, maxSt: 100, rg: 20 }, b: { ap: 'no', st: 0, maxSt: 10, rg: 1 } } as Record<string, Sheet>, { w: { sg: true, pm: 9 }, x: {} })
    expect(r.heroes).toEqual([['a', expect.objectContaining({ st: 30, used: 0 }), 'New round']])
    expect(r.monsters).toEqual([['w', { stun: false, sg: false, rec: false, po: 9 }]])
  })
  it('doors within reach, at most 3', () => {
    const m: MapData = { dr: { a: { p: [1.5, 1.5] }, b: { p: [3, 3] }, c: { c: '1,1' }, d: { p: [2, 1] }, e: { p: [1, 2] }, f: { p: [2, 2] } } }
    expect(doorsNear(m, { mx: 1, my: 1 }).map(([k]) => k)).toEqual(['a', 'd', 'e'])
    expect(doorsNear(m, { mx: null })).toEqual([])
    expect(doorsNear(null, { mx: 1, my: 1 })).toEqual([])
    expect(doorsNear({}, { mx: 1, my: 1 })).toEqual([])
  })
  it('using a door in combat costs a player an action on their turn', () => {
    const c = { used: 1 } as Sheet
    expect(doorCheck(c, false, false, false)).toEqual({ patch: null })
    expect(doorCheck(c, true, true, false)).toEqual({ patch: null })
    expect(doorCheck(c, false, true, false)).toEqual({ error: 'It is not your turn.' })
    expect(doorCheck(c, false, true, true)).toEqual({ patch: { used: 2 } })
    expect(doorCheck({} as Sheet, false, true, true)).toEqual({ patch: { used: 1 } })
    for (const o of [{ exh: true }, { stn: true }, { used: 2 }]) expect(doorCheck(o as Sheet, false, true, true)).toEqual({ error: 'You have no action left to use the door.' })
  })
  it('allies who are exhausted or prone', () => {
    expect(alliesDown({ me: { exh: true }, a: { exh: true }, b: { pr: true }, c: {}, d: { exh: true, ap: false } } as Record<string, Sheet>, 'me')).toEqual(['a', 'b'])
  })
  it('hidden words are saved unique, trimmed and lower case', () => {
    expect(spoilerValue([' Golden', 'golden ', 'Altar', ''])).toBe('golden,altar')
    expect(spoilerValue([])).toBe('-')
  })
})
