import { describe, expect, it } from 'vitest'
import type { MapEntry } from '../logic/mapTools'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore, emptyTables, type Tables } from './store'

const M = (o: Partial<MapEntry> = {}): MapEntry => ({ name: 'Crypt', w: 500, h: 400, cols: 10, ...o })

function setup(t: Partial<Tables> = {}, role: 'gm' | 'player' = 'gm') {
  const f = fakeDb()
  const s = createGameStore(() => f.db, () => 36, () => 0.5)
  s.getState().connect({ pin: 'p', role, me: role === 'gm' ? 'gm' : 'a' })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: M(), n: M({ name: 'Cave' }) }, cur: 'm', ...t })
  return { s, f }
}
const map = (s: ReturnType<typeof setup>['s'], id = 'm') => s.getState().tables.maps[id] as MapEntry

describe('changing the map on screen', () => {
  it('saves the whole map; players and missing maps change nothing', async () => {
    const { s, f } = setup()
    await s.getState().setMap({ grid: false })
    expect(f.writes).toEqual([['PUT', 'maps/m', { ...M(), grid: false }]])
    s.getState().setGmMap('n')
    await s.getState().setMap({ fog: true })
    expect(f.writes[1]).toEqual(['PUT', 'maps/n', { ...M({ name: 'Cave' }), fog: true }])
    const pl = setup({}, 'player')
    await pl.s.getState().setMap({ grid: false })
    const none = setup({ maps: {} })
    await none.s.getState().setMap({ grid: false })
    await none.s.getState().renameMap('X')
    await none.s.getState().deleteMap()
    expect(await none.s.getState().toolTap(1, 1)).toBeNull()
    await none.s.getState().paint([[1, 1]])
    await none.s.getState().addPin(1, 1, 'n', 'x')
    expect([...pl.f.writes, ...none.f.writes]).toEqual([])
  })

  it('the tools: altar, bonfire, guild, entry, place door, doors; move does nothing', async () => {
    const { s, f } = setup()
    const tap = async (tool: Parameters<ReturnType<typeof s.getState>['setTool']>[0], x = 1, y = 2) => {
      s.getState().setTool(tool)
      return s.getState().toolTap(x, y)
    }
    await tap('al')
    await tap('bf')
    await tap('gd')
    await tap('en')
    await tap('nd')
    expect(map(s)).toMatchObject({ al: ['1,2'], bf: ['1,2'], gd: ['1,2'], en: [1.5, 2.5], dr: { di: { c: '1,2', p: [1.5, 2.5], o: 0 } }, walls: [] })
    await tap('dr')
    expect(map(s).dr!.di!.o).toBe(1)
    await tap('dr', 9, 7) // no door near
    await tap('move')
    expect(f.writes).toHaveLength(6)
    expect(s.getState().tool).toBe('move')
  })

  it('pins: a tap on a pin or on empty ground asks the screen; add, rename, delete', async () => {
    const { s, f } = setup()
    s.getState().setTool('pin')
    expect(await s.getState().toolTap(2, 3)).toEqual({ newPin: { x: 2.5, y: 3.5 } })
    await s.getState().addPin(2.5, 3.5, 'n', 'Stairs down')
    expect(map(s).pn).toEqual({ p10: { x: 2.5, y: 3.5, to: 'n', l: 'Stairs down' } })
    expect(await s.getState().toolTap(2, 3)).toEqual({ pin: 'p10' })
    await s.getState().renamePin('p10', 'Stairs')
    expect(map(s).pn!.p10!.l).toBe('Stairs')
    await s.getState().renamePin('gone', 'x')
    await s.getState().deletePin('gone')
    await s.getState().deletePin('p10')
    expect(map(s).pn).toEqual({})
    expect(f.writes).toHaveLength(3)
  })

  it('painting walls and fog; other tools paint nothing', async () => {
    const { s } = setup()
    s.getState().setTool('wall')
    await s.getState().paint([
      [1, 1],
      [2, 1],
    ])
    expect(map(s).walls).toEqual(['1,1', '2,1'])
    s.getState().setTool('rev')
    await s.getState().paint([[0, 0]])
    expect(map(s).fg!.slice(0, 2)).toBe('10')
    s.getState().setTool('hid')
    await s.getState().paint([[0, 0]])
    expect(map(s).fg!.slice(0, 2)).toBe('00')
    s.getState().setTool('al')
    await s.getState().paint([[5, 5]])
    expect(map(s).al).toBeUndefined()
  })

  it('rename (30 letters), squares across, an empty name changes nothing', async () => {
    const { s, f } = setup()
    await s.getState().renameMap('A'.repeat(40))
    expect(map(s).name).toBe('A'.repeat(30))
    await s.getState().renameMap('')
    await s.getState().setCols('12')
    expect(map(s)).toMatchObject({ cols: 12, fg: '' })
    expect(f.writes).toHaveLength(2)
  })
})

describe('maps', () => {
  it('a new map: picture first, then the map; the first one goes live', async () => {
    const { s, f } = setup({ maps: {}, cur: null })
    await s.getState().addMap('data:x', 640, 480, 'Sewers.png', { cols: 12 })
    expect(f.writes).toEqual([
      ['PUT', 'mapimg/m10', { data: 'data:x' }],
      ['PUT', 'cur', 'm10'],
      ['PUT', 'maps/m10', { name: 'Sewers', cols: 12, grid: true, w: 640, h: 480, iv: 36 }],
    ])
    expect(s.getState().gmMap).toBe('m10')
    expect(s.getState().tables.cur).toBe('m10')
    const more = setup()
    await more.s.getState().addMap('data:y', 1, 1, '')
    expect(more.f.writes.map((w) => w[1])).toEqual(['mapimg/m10', 'maps/m10'])
    expect(more.s.getState().tables.maps.m10).toMatchObject({ name: 'Map' })
    const pl = setup({}, 'player')
    await pl.s.getState().addMap('data:z', 1, 1, 'x')
    expect(pl.f.writes).toEqual([])
  })

  it('deleting: the map and its picture; when it was live, the next map goes live (or none)', async () => {
    const { s, f } = setup()
    await s.getState().deleteMap()
    expect(f.writes).toEqual([
      ['PUT', 'cur', 'n'],
      ['DELETE', 'maps/m', null],
      ['DELETE', 'mapimg/m', null],
    ])
    expect(Object.keys(s.getState().tables.maps)).toEqual(['n'])
    await s.getState().deleteMap()
    expect(s.getState().tables.cur).toBeNull()
    const other = setup()
    other.s.getState().setGmMap('n')
    await other.s.getState().deleteMap()
    expect(other.f.writes.map((w) => w[1])).toEqual(['maps/n', 'mapimg/n'])
    expect(other.s.getState().gmMap).toBeNull()
    const pl = setup({}, 'player')
    await pl.s.getState().deleteMap()
    expect(pl.f.writes).toEqual([])
  })

  it('party travel: unplaced units stay behind, heroes land at the entry, the fog lifts, the map goes live', async () => {
    const { s, f } = setup({
      maps: { m: M(), n: M({ name: 'Cave', en: [3.5, 3.5], fog: true }) },
      chars: { a: { name: 'Lyra', hp: 5, mx: 0, my: 0 }, b: { name: 'Bram', hp: 0, mp: 'm' } },
      enemies: { w: { name: 'Wolf' }, o: { name: 'Ogre', mp: 'n' } },
    })
    await s.getState().travel('n')
    expect(f.writes.map((w) => `${w[0]} ${w[1]}`)).toEqual(['PATCH chars/a', 'PATCH enemies/w', 'PATCH chars/a', 'PUT maps/n/fg', 'PUT cur', 'POST rolls'])
    expect(s.getState().tables.chars.a).toMatchObject({ mp: 'n', mx: 3, my: 3 })
    expect(s.getState().tables.enemies.w).toMatchObject({ mp: 'm' })
    expect((s.getState().tables.maps.n as MapEntry).fg![33]).toBe('1')
    expect(s.getState().tables.cur).toBe('n')
    expect(s.getState().gmMap).toBe('n')
    expect(f.writes.at(-1)![2]).toMatchObject({ ev: 'The party travels to Cave' })
    // To the live map, to a missing one, or as a player: nothing.
    f.writes.length = 0
    await s.getState().travel('n')
    await s.getState().travel('zz')
    const pl = setup({}, 'player')
    await pl.s.getState().travel('n')
    expect([...f.writes, ...pl.f.writes]).toEqual([])
    // Without fog nothing to lift.
    const plain = setup({ chars: { a: { name: 'Lyra', hp: 5, mp: 'm' } } })
    await plain.s.getState().travel('n')
    expect(plain.f.writes.map((w) => w[1])).toEqual(['chars/a', 'cur', 'rolls'])
  })

  it('altar, bonfire and guild icons; back to the defaults', async () => {
    const { s, f } = setup()
    await s.getState().setMarkerIcon('al', 'data:png')
    await s.getState().setMarkerIcon(null)
    expect(f.writes).toEqual([
      ['PUT', 'mkicons/al', { data: 'data:png' }],
      ['PATCH', 'meta', { mki: 36 }],
      ['DELETE', 'mkicons', null],
      ['PATCH', 'meta', { mki: 36 }],
    ])
    const pl = setup({}, 'player')
    await pl.s.getState().setMarkerIcon('al', 'x')
    expect(pl.f.writes).toEqual([])
  })
})
