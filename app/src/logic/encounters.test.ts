import { describe, expect, it } from 'vitest'
import { byRegion, captureEncounter, deployAnchor, deployedIds, deploySheets, encounterSummary, formationSize, freshSheet, liveDeploys, type Encounter } from './encounters'
import type { Enemy } from './types'

const wolf = (o: Partial<Enemy> = {}): Enemy => ({ name: 'Wolf', hp: 3, max: 10, pm: 4, po: 1, mx: 5, my: 4, mp: 'm', stun: true, hx: 1, ...o })
const MAP = { id: 'm', cols: 20, rows: 15 }

describe('fresh sheet', () => {
  it('drops the fight: full HP and poise, no position or status', () => {
    expect(freshSheet(wolf({ ei: 't', bi: true }))).toEqual({ name: 'Wolf', hp: 10, max: 10, pm: 4, po: 4 })
    expect(freshSheet({ name: 'Rat', hp: 5 })).toEqual({ name: 'Rat', hp: 5 })
  })
})

describe('capture', () => {
  it('keeps the formation from the top-left, brings phase sheets, skips unknown ids', () => {
    const enemies = {
      a: wolf(),
      b: wolf({ mx: 7, my: 6, sz: 2 }),
      boss: wolf({ name: 'King', mx: 9, my: 3, nx: 'p2' }),
      p2: wolf({ name: 'King II', mx: null, my: null, nx: 'p3' }),
      p3: wolf({ mx: null }),
    }
    const e = captureEncounter('  Pass  ', '', enemies, ['a', 'b', 'boss', 'zz'])!
    expect(e).toMatchObject({ n: 'Pass', rg: 'Other', mp: 'm', ax: 5, ay: 3 })
    expect(Object.keys(e.m).sort()).toEqual(['a', 'b', 'boss', 'p2', 'p3'])
    expect(e.m.a).toMatchObject({ dx: 0, dy: 1 })
    expect(e.m.b).toMatchObject({ dx: 2, dy: 3 })
    expect(e.m.p2).toMatchObject({ dx: null, dy: null })
    expect(e.m.a!.s.mx).toBeUndefined()
  })

  it('needs a name and someone; all off the map starts at 0,0', () => {
    expect(captureEncounter(' ', 'Sky City', { a: wolf() }, ['a'])).toBeNull()
    expect(captureEncounter('X', 'Sky City', { a: wolf() }, [])).toBeNull()
    expect(captureEncounter('X', 'Sky City', { a: wolf({ mx: null }) }, ['a'])).toMatchObject({ rg: 'Sky City', mp: null, ax: 0, ay: 0 })
    // A loop in the phase links stops.
    expect(Object.keys(captureEncounter('X', 'Sky City', { a: wolf({ nx: 'b' }), b: wolf({ nx: 'a' }) }, ['a'])!.m)).toEqual(['a', 'b'])
  })
})

const ENC: Encounter = {
  n: 'Pass',
  rg: 'Frozen North',
  mp: 'm',
  ax: 2,
  ay: 3,
  m: {
    a: { s: { name: 'Wolf', sz: 2 }, dx: 0, dy: 0 },
    b: { s: { name: 'Wolf' }, dx: 3, dy: 1 },
    k: { s: { name: 'King', nx: 'k2' }, dx: 1, dy: 2 },
    k2: { s: { name: 'King II', nx: 'gone' }, dx: null, dy: null },
  },
}

describe('deploy', () => {
  it('formation size counts sizes; placement where built, else centred, kept inside', () => {
    expect(formationSize(ENC)).toEqual({ w: 4, h: 3 })
    expect(deployAnchor(ENC, MAP)).toEqual({ x: 2, y: 3 })
    expect(deployAnchor(ENC, { ...MAP, id: 'o' })).toEqual({ x: 8, y: 6 })
    expect(deployAnchor({ ...ENC, ax: 30, ay: 30 }, MAP)).toEqual({ x: 16, y: 12 })
    expect(deployAnchor({ ...ENC, mp: 'o', ax: undefined }, { id: 'o', cols: 2, rows: 2 })).toEqual({ x: 0, y: 0 })
  })

  it('new ids, tagged, placed with spawn points; phase links follow the new ids', () => {
    let n = 0
    const out = deploySheets(ENC, MAP, 'T', () => `e${n++}`)
    expect(out).toEqual({
      e0: { name: 'Wolf', sz: 2, ei: 'T', mx: 2, my: 3, mp: 'm', hx: 2, hy: 3, hm: 'm' },
      e1: { name: 'Wolf', ei: 'T', mx: 5, my: 4, mp: 'm', hx: 5, hy: 4, hm: 'm' },
      e2: { name: 'King', nx: 'e3', ei: 'T', mx: 3, my: 5, mp: 'm', hx: 3, hy: 5, hm: 'm' },
      e3: { name: 'King II', nx: '', ei: 'T', mx: null, my: null },
    })
    // A big member at the edge stays on the grid.
    const edge = deploySheets({ n: 'x', rg: 'x', m: { a: { s: { sz: 3 }, dx: 0, dy: 0 }, b: { s: {}, dx: 5, dy: 0 } } }, { id: 'm', cols: 4, rows: 4 }, 'T', (k) => k)
    expect(edge.a).toMatchObject({ mx: 0, my: 0 })
    expect(edge.b).toMatchObject({ mx: 3 })
  })

  it('finds what a deploy made, and what is still standing', () => {
    const live = { a: { ei: 'n1~x', hp: 4, mx: 1 }, b: { ei: 'n1~x', hp: 0, mx: 1 }, c: { ei: 'n1~x', hp: 4, mx: null }, d: { hp: 4 }, e: { ei: 'n2~y' } }
    expect(deployedIds(live, 'n1~x')).toEqual(['a', 'b', 'c'])
    expect(liveDeploys(live)).toEqual({ 'n1~x': { id: 'n1', up: 1, all: 3 }, 'n2~y': { id: 'n2', up: 0, all: 1 } })
  })
})

describe('listing', () => {
  it('groups by region in story order, then by name', () => {
    const e = (n: string, rg: string): Encounter => ({ n, rg, m: {} })
    const r = byRegion({ a: e('B', 'Sky City'), b: e('A', 'Sky City'), c: e('Z', 'Frozen North'), d: e('Q', 'Mine'), f: e('R', 'Aaa'), g: e('S', '') })
    expect(r.map(([rg, l]) => [rg, l.map(([id]) => id)])).toEqual([
      ['Frozen North', ['c']],
      ['Sky City', ['b', 'a']],
      ['Other', ['g']],
      ['Aaa', ['f']],
      ['Mine', ['d']],
    ])
  })

  it('summary counts the same names, skips phase sheets', () => {
    expect(encounterSummary(ENC)).toBe('3 enemies: 2 Wolf, King')
    expect(encounterSummary({ n: 'x', rg: 'x', m: { a: { s: {}, dx: 0, dy: 0 } } })).toBe('1 enemy: ?')
  })
})
