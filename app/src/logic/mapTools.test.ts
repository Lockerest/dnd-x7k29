import { describe, expect, it } from 'vitest'
import {
  colsPatch,
  deletePin,
  edgesFromSegments,
  newMapEntry,
  newMapId,
  newPin,
  paintFog,
  paintWalls,
  parentOf,
  parseDungeondraft,
  pinNear,
  pinTargets,
  placeDoor,
  renamePin,
  revealAll,
  rowsOf,
  toggleDoorNear,
  toggleSpot,
  travelPlan,
  type MapEntry,
} from './mapTools'

const M = (o: Partial<MapEntry> = {}): MapEntry => ({ name: 'Crypt', w: 500, h: 400, cols: 10, ...o })

describe('drawing tools', () => {
  it('altars, bonfires and guilds toggle on a square', () => {
    expect(toggleSpot(M({ al: { a: '1,1' } }), 'al', 2, 3)).toEqual({ al: ['1,1', '2,3'] })
    expect(toggleSpot(M({ al: ['1,1', '2,3'] }), 'al', 1, 1)).toEqual({ al: ['2,3'] })
    expect(toggleSpot(M(), 'gd', 0, 0)).toEqual({ gd: ['0,0'] })
  })

  it('placing a door replaces a wall; tapping it again removes it', () => {
    const p = placeDoor(M({ walls: ['1,1', '2,2'] }), 1, 1, () => 0.123456)
    expect(p).toEqual({ dr: { d4fzy: { c: '1,1', p: [1.5, 1.5], o: 0 } }, walls: ['2,2'] })
    expect(placeDoor(M({ dr: p.dr }), 1, 1, () => 0.5)).toEqual({ dr: {}, walls: [] })
  })

  it('the Doors tool opens or closes the nearest door within reach', () => {
    const dr = { a: { p: [1.5, 1.5], o: 0 }, b: { p: [2.5, 1.5], o: 1 } }
    expect(toggleDoorNear(M({ dr }), 2, 1)).toEqual({ dr: { ...dr, b: { p: [2.5, 1.5], o: 0 } } })
    expect(toggleDoorNear(M({ dr }), 1, 1)!.dr!.a!.o).toBe(1)
    expect(toggleDoorNear(M({ dr }), 9, 9)).toBeNull()
    expect(toggleDoorNear(M(), 1, 1)).toBeNull()
  })

  it('pins: the nearest within 1.2 squares; add, rename (24 letters), delete; other maps to link', () => {
    const pn = { p1: { x: 1.5, y: 1.5, to: 'n', l: 'Down' }, p2: { x: 2.2, y: 1.5, to: 'n', l: 'Up' } }
    expect(pinNear(M({ pn }), 1, 1)).toBe('p1')
    expect(pinNear(M({ pn }), 2, 1)).toBe('p2')
    expect(pinNear(M({ pn }), 8, 8)).toBeNull()
    expect(pinNear(M(), 1, 1)).toBeNull()
    expect(newPin(M(), 3.5, 2.5, 'n', 'A very long label for this pin', 36)).toEqual({ pn: { p10: { x: 3.5, y: 2.5, to: 'n', l: 'A very long label for th' } } })
    expect(renamePin(M({ pn }), 'p1', 'Stairs')).toEqual({ pn: { ...pn, p1: { ...pn.p1, l: 'Stairs' } } })
    expect(deletePin(M({ pn }), 'p1')).toEqual({ pn: { p2: pn.p2 } })
    expect(pinTargets({ m: M(), n: M(), o: M() }, 'n')).toEqual(['m', 'o'])
  })

  it('squares across stay between 5 and 200 and restart the fog; reveal all fills every square', () => {
    expect(colsPatch('3')).toEqual({ cols: 5, fg: '' })
    expect(colsPatch('999')).toEqual({ cols: 200, fg: '' })
    expect(colsPatch('x')).toEqual({ cols: 24, fg: '' })
    expect(rowsOf(M())).toBe(8)
    expect(rowsOf({ w: 240, h: 100 })).toBe(10)
    expect(revealAll(M())).toEqual({ fog: true, fg: '1'.repeat(80) })
    expect(revealAll({ w: 240, h: 100 }).fg).toHaveLength(240)
  })

  it('painting fog and walls (a wall drag adds from an empty square, removes from a wall)', () => {
    expect(paintFog(M({ fg: '1' }), [[1, 0]], true).slice(0, 3)).toBe('110')
    expect(paintFog(M({ fg: '111' }), [[0, 0]], false).slice(0, 3)).toBe('011')
    expect(paintFog({ w: 240, h: 100 }, [], true)).toHaveLength(240)
    expect(paintWalls(M({ walls: ['1,1'] }), [[2, 2], [1, 1]])).toEqual(['1,1', '2,2'])
    expect(paintWalls(M({ walls: ['1,1', '2,2'] }), [[1, 1], [3, 3], [2, 2]])).toEqual([])
    expect(paintWalls(M({ walls: { a: '1,1' } }), [])).toEqual(['1,1'])
  })
})

describe('maps', () => {
  it('a new map keeps the file name without its extension (30 letters), 24 squares, grid on', () => {
    expect(newMapEntry('Crypt.final.png', 800, 600, 5)).toEqual({ name: 'Crypt.final', cols: 24, grid: true, w: 800, h: 600, iv: 5 })
    expect(newMapEntry('A'.repeat(40), 1, 1, 1, { cols: 30 })).toMatchObject({ name: 'A'.repeat(30), cols: 30 })
    expect(newMapId(36)).toBe('m10')
  })

  it('the overview: the map with a pin leading here', () => {
    const maps = { a: M({ pn: { x: { x: 1, y: 2, to: 'b', l: 'Cave' } } }), b: M(), c: M({ pn: { y: { x: 1, y: 1, to: 'c', l: 'Self' } } }) }
    expect(parentOf(maps, 'b')).toEqual({ map: 'a', pin: { x: 1, y: 2, to: 'b', l: 'Cave' } })
    expect(parentOf(maps, 'c')).toBeNull()
    expect(parentOf(maps, 'a')).toBeNull()
  })
})

describe('party travel', () => {
  it('pins unplaced units to the old map, lands the living heroes round the entry, lifts the fog', () => {
    const maps = { m: M(), n: M({ en: [2.5, 2.5], walls: ['3,2'], fog: true }) }
    const chars = { a: { name: 'A', hp: 5, mx: 0, my: 0 }, b: { name: 'B', hp: 5, mp: 'm', mx: 1, my: 1 }, c: { name: 'C', hp: 0, mp: 'n', mx: 9, my: 7 }, d: { name: 'D', hp: 0, mp: 'm', mx: 5, my: 5 } }
    const enemies = { w: { name: 'Wolf' }, o: { name: 'Ogre', mp: 'n' } }
    const r = travelPlan(maps, chars, enemies, ['a', 'b', 'c', 'd'], 'm', 'n')
    expect(r.pin).toEqual({ chars: { a: { mp: 'm' } }, enemies: { w: { mp: 'm' } } })
    expect(r.fg![5 * 10 + 5]).toBe('0') // D lies on the old map: no sight here
    expect(r.moves).toEqual({ a: { mp: 'n', mx: 2, my: 2, mt: '', mon: null }, b: { mp: 'n', mx: 1, my: 1, mt: '', mon: null } })
    // The dead hero already on the map sees too.
    expect(r.fg![7 * 10 + 9]).toBe('1')
    expect(r.fg![0]).toBe('1')
    expect(r.fg).toHaveLength(80)
  })

  it('no entry: the middle; no fog: nothing to lift; more heroes than free squares share the first; a walled-in entry', () => {
    const maps = { m: M(), n: M({ w: 100, h: 100, cols: 5, walls: [] }) }
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`h${i}`, { hp: 1 }]))
    const r = travelPlan(maps, many, {}, Object.keys(many), 'm', 'n')
    expect(r.fg).toBeNull()
    expect(r.moves.h0).toMatchObject({ mx: 2, my: 2 })
    expect(r.moves.h29).toMatchObject({ mx: 2, my: 2 })
    const walls = Array.from({ length: 25 }, (_, i) => `${i % 5},${Math.floor(i / 5)}`)
    const boxed = travelPlan({ m: M(), n: M({ w: 100, h: 100, cols: 5, walls, en: [1.5, 1.5] }) }, { a: { hp: 1 } }, {}, ['a'], 'm', 'n')
    expect(boxed.moves.a).toMatchObject({ mx: 1, my: 1 })
    const noCols = travelPlan({ m: M(), n: { w: 240, h: 240 } }, { a: { hp: 1 } }, {}, ['a'], 'm', 'n')
    expect(noCols.moves.a).toMatchObject({ mx: 12, my: 12 })
  })
})

describe('Dungeondraft exports', () => {
  const img = 'iVBORw0KGgo'
  it('reads squares, walls (in squares or pixels) and doors; the picture type from its first bytes', () => {
    const j = {
      resolution: { map_size: { x: 4, y: 3 }, pixels_per_grid: 100, map_origin: { x: 0, y: 0 } },
      image: img,
      line_of_sight: [[{ x: 0, y: 1 }, { x: 2, y: 1 }]],
      objects_line_of_sight: [[{ x: 3, y: 0 }, { x: 3, y: 2 }]],
      portals: [{ bounds: [{ x: 2, y: 1 }, { x: 3, y: 1 }], closed: false }, { bounds: [{ x: 1, y: 1 }] }, {}],
    }
    const q = parseDungeondraft(j)!
    expect([q.cols, q.rows]).toEqual([4, 3])
    expect(q.ew.sort()).toEqual(['h,0,1', 'h,1,1', 'v,3,0', 'v,3,1'])
    expect(q.dr).toEqual({ d0: { a: [2, 1], b: [3, 1], p: [2.5, 1], e: ['h,2,1'], o: 1 } })
    expect(q.src).toBe(`data:image/png;base64,${img}`)
    const px = parseDungeondraft({ ...j, line_of_sight: [[{ x: 0, y: 100 }, { x: 200, y: 100 }]], objects_line_of_sight: undefined, portals: [{ bounds: [{ x: 0, y: 0 }, { x: 0, y: 100 }] }] })!
    expect(px.ew.sort()).toEqual(['h,0,1', 'h,1,1'])
    expect(px.dr.d0!.o).toBe(0)
    expect(parseDungeondraft({ ...j, image: '/9jabc' })!.src).toBe('data:image/jpeg;base64,/9jabc')
    expect(parseDungeondraft({ ...j, image: 'UklGabc' })!.src).toBe('data:image/webp;base64,UklGabc')
    expect(parseDungeondraft({ ...j, image: 'data:image/png;base64,x' })!.src).toBe('data:image/png;base64,x')
    expect(parseDungeondraft({ resolution: { map_size: { x: 2, y: 2 } }, image: img })).toMatchObject({ cols: 2, ew: [], dr: {} })
  })

  it('unusable files: no picture, no size, zero squares, nothing', () => {
    expect(parseDungeondraft(null)).toBeNull()
    expect(parseDungeondraft({ image: img })).toBeNull()
    expect(parseDungeondraft({ resolution: {}, image: img })).toBeNull()
    expect(parseDungeondraft({ resolution: { map_size: { x: 4, y: 3 } } })).toBeNull()
    expect(parseDungeondraft({ resolution: { map_size: { x: 0, y: 3 } }, image: img })).toBeNull()
  })

  it('walls: tiny pieces are skipped, short ones cover one square, diagonals step from square to square, off-map edges are dropped', () => {
    const s = new Set<string>()
    edgesFromSegments([[0, 0, 0.01, 0]], s, 4, 4)
    expect([...s]).toEqual([])
    edgesFromSegments([[1.1, 2, 1.3, 2]], s, 4, 4)
    edgesFromSegments([[3, 1.1, 3, 1.3]], s, 4, 4)
    expect([...s].sort()).toEqual(['h,1,2', 'v,3,1'])
    const d = new Set<string>()
    edgesFromSegments([[0.5, 0.5, 2.5, 2.5]], d, 4, 4)
    expect([...d].sort()).toEqual(['h,0,1', 'h,1,1', 'h,1,2', 'h,2,2', 'v,1,0', 'v,1,1', 'v,2,1', 'v,2,2'])
    const back = new Set<string>()
    edgesFromSegments([[2.5, 0.5, 0.5, 2.5]], back, 4, 4)
    expect(back.size).toBeGreaterThan(0)
    const off = new Set<string>()
    edgesFromSegments([[-2, -1, 9, -1], [-1, -2, -1, 9], [0.5, 0.5, 0.5, 9.5]], off, 4, 4)
    expect([...off].every((k) => !k.includes('-'))).toBe(true)
  })
})
