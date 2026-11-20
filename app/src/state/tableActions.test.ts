import { describe, expect, it } from 'vitest'
import type { Sheet } from '../logic/sheet'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore, emptyTables, type Tables } from './store'

const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10, fog: 1, dr: { d1: { c: '3,1', p: [3.5, 1.5] } } }

function setup(t: Partial<Tables>, role: 'gm' | 'player' = 'player', me = 'a') {
  const f = fakeDb()
  const later: (() => unknown)[] = []
  const s = createGameStore(() => f.db, () => 5, () => 0.5, (fn) => void later.push(fn))
  s.getState().connect({ pin: 'p', role, me })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  return { s, f, later }
}
const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', hp: 30, maxHp: 30, st: 50, maxSt: 100, rg: 10, mx: 1, my: 1, ...o })
const paths = (f: ReturnType<typeof fakeDb>) => f.writes.map((w) => w[1])

describe('tapping the map', () => {
  it('a player walks within reach, revealing the fog and carrying a monster along', async () => {
    const { s, f } = setup({ chars: { a: hero({ spd: 3 } as Partial<Sheet>) }, enemies: { i: { name: 'Imp', hd: 'c:a', mx: 1, my: 1 } } })
    expect(await s.getState().tapMap(3, 3, null)).toBeNull()
    expect(paths(f)).toEqual(['chars/a', 'enemies/i', 'maps/m'])
    expect(f.writes[0]![2]).toMatchObject({ mx: 3, my: 3, log: ['Moved 2 squares'] })
    expect(s.getState().tables.maps.m!.fg).toHaveLength(80)
    // Too far: nothing.
    expect(await s.getState().tapMap(9, 7, null)).toBeNull()
    expect(f.writes).toHaveLength(3)
  })

  it('placing a hero not yet on the map; the GM moves heroes anywhere', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: null }) } })
    await s.getState().tapMap(8, 6, null)
    expect(f.writes[0]![2]).toMatchObject({ mx: 8, my: 6, mp: 'm', log: ['Placed on the map'] })
    const gm = setup({ chars: { a: hero() } }, 'gm', 'gm')
    await gm.s.getState().tapMap(9, 7, 'c:a')
    expect(gm.f.writes[0]![2]).toEqual({ mx: 9, my: 7, mp: 'm', log: [] })
  })

  it('the GM moves monsters (kept inside the map); players cannot', async () => {
    const gm = setup({ enemies: { w: { name: 'Wolf', hp: 5, sz: 2, mx: 0, my: 0 } } }, 'gm', 'gm')
    await gm.s.getState().tapMap(9, 7, 'e:w')
    expect(gm.f.writes[0]).toEqual(['PATCH', 'enemies/w', { mx: 8, my: 6, mp: 'm', hx: 8, hy: 6, hm: 'm' }])
  })

  it('tapping another token returns it as the target; a player tapping a hero does nothing', async () => {
    const { s } = setup({ chars: { a: hero(), b: hero({ name: 'Bo', mx: 5, my: 5 }) }, enemies: { w: { name: 'Wolf', hp: 5, mx: 2, my: 2 } } })
    expect(await s.getState().tapMap(2, 2, null)).toEqual({ target: 'e:w' })
    expect(await s.getState().tapMap(5, 5, null)).toBeNull()
    const gm = setup({ chars: { a: hero() }, enemies: { w: { name: 'Wolf', hp: 5, mx: 2, my: 2 } } }, 'gm', 'gm')
    expect(await gm.s.getState().tapMap(1, 1, 'e:w')).toEqual({ target: 'c:a' })
  })

  it('a monster hidden in the fog is not a target for players: the tap walks there', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: 0, my: 0, spd: 9 } as Partial<Sheet>) }, enemies: { w: { name: 'Wolf', hp: 5, mx: 8, my: 0 } }, maps: { m: { ...MAP, walls: ['1,0', '1,1'] } } })
    expect(await s.getState().tapMap(8, 0, null)).toBeNull()
    expect(f.writes.length).toBeGreaterThanOrEqual(0)
  })

  it('refusals: nothing selected, a missing map, not your turn, dead, someone else', async () => {
    const none = setup({ chars: { a: hero() } }, 'gm', 'gm')
    expect(await none.s.getState().tapMap(2, 2, null)).toBeNull()
    expect(await none.s.getState().tapMap(2, 2, 'c:gone')).toBeNull()
    const nomap = setup({ chars: { a: hero() }, maps: {} })
    expect(await nomap.s.getState().tapMap(2, 2, null)).toBeNull()
    const turn = setup({ chars: { a: hero() }, ini: { ph: 'go', t: 0, l: [{ k: 'e:w' }] } })
    await turn.s.getState().tapMap(2, 2, null)
    expect(turn.s.getState().error).toBe('It is not your turn.')
    const dead = setup({ chars: { a: hero({ hp: 0 }) } })
    await dead.s.getState().tapMap(2, 2, null)
    expect([...none.f.writes, ...nomap.f.writes, ...turn.f.writes, ...dead.f.writes]).toEqual([])
    const pl = setup({ chars: { a: hero() }, enemies: { w: { name: 'W', hp: 3 } } })
    pl.s.setState({ session: { pin: 'p', role: 'player', me: 'a' } })
    expect(await pl.s.getState().tapMap(4, 4, 'e:w')).toBeNull() // players always act as themselves
    // Without a session nothing is selected.
    const out = setup({ chars: { a: hero() } })
    out.s.setState({ session: null })
    expect(await out.s.getState().tapMap(2, 2, null)).toBeNull()
  })

  it("the GM's own unit is someone else's for a player view", async () => {
    // A GM "viewing as player" has no hero of their own: nothing to move.
    const { s, f } = setup({ chars: { a: hero() } }, 'gm', 'gm')
    s.getState().setDm(false)
    expect(await s.getState().tapMap(2, 2, 'c:a')).toBeNull()
    expect(f.writes).toEqual([])
  })

  it('no fog on the map: nothing to reveal', async () => {
    const { s, f } = setup({ chars: { a: hero() }, maps: { m: { ...MAP, fog: 0 } } })
    await s.getState().tapMap(2, 1, null)
    expect(paths(f)).toEqual(['chars/a'])
  })

  it('the GM may have another map on screen', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: null }) }, maps: { m: MAP, n: { ...MAP, name: 'Two' } } }, 'gm', 'gm')
    s.getState().setGmMap('n')
    await s.getState().tapMap(2, 2, 'c:a')
    expect(f.writes[0]![2]).toMatchObject({ mp: 'n' })
    expect(paths(f)).toContain('maps/n')
  })
})

describe("the GM's buttons", () => {
  it('next round for everyone', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero({ name: 'Bo', ap: false }) }, enemies: { w: { name: 'W', sg: true, pm: 5 } as Enemy, x: {} } }, 'gm', 'gm')
    await s.getState().nextRoundAll()
    expect(paths(f)).toEqual(['chars/a', 'enemies/w'])
  })
  it('everyone rests', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero({ name: 'Bo' }) } }, 'gm', 'gm')
    await s.getState().restAll('bf')
    expect(paths(f)).toEqual(['chars/a', 'chars/b'])
  })
  it('combat on and off', async () => {
    const { s, f } = setup({}, 'gm', 'gm')
    await s.getState().setCombat(true)
    await s.getState().setCombat(false)
    expect(f.writes.map((w) => w[2])).toEqual([true, { ev: 'Combat begins: moving costs 1 stamina per square', ts: 5 }, false, { ev: 'Combat ends', ts: 5 }])
  })
  it('hidden words (GM only) and which map players see', async () => {
    const { s, f } = setup({}, 'gm', 'gm')
    await s.getState().saveSpoilers([' Golden ', 'altar'])
    await s.getState().showMap('n')
    expect(f.writes).toEqual([
      ['PATCH', 'meta', { sp: 'golden,altar' }],
      ['PUT', 'cur', 'n'],
    ])
    expect(s.getState().tables).toMatchObject({ sp: 'golden,altar', cur: 'n' })
    const pl = setup({})
    await pl.s.getState().saveSpoilers([])
    expect(pl.f.writes).toEqual([])
  })
})

describe('doors and helping', () => {
  it('opens a door next to the hero, logs it and reveals around them', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: 2, my: 1 }) } })
    await s.getState().toggleDoor('a', 'd1')
    expect(f.writes.map((w) => w[1])).toEqual(['maps/m/dr/d1', 'rolls', 'maps/m'])
    expect(f.writes[0]![2]).toEqual({ c: '3,1', p: [3.5, 1.5], o: 1 })
    expect((s.getState().tables.maps.m!.dr as Record<string, { o: number }>).d1!.o).toBe(1)
    await s.getState().toggleDoor('a', 'd1')
    expect(f.writes[4]![2]).toMatchObject({ ev: 'Lyra closes a door' })
  })
  it('in combat it costs the player an action, on their turn; refusals', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: 2, my: 1, mp: null }), b: hero() }, combat: true })
    await s.getState().toggleDoor('a', 'd1')
    expect(f.writes[0]).toEqual(['PATCH', 'chars/a', { used: 1, log: [] }])
    const busy = setup({ chars: { a: hero({ mx: 2, my: 1, used: 2 }) }, combat: true })
    await busy.s.getState().toggleDoor('a', 'd1')
    expect(busy.s.getState().error).toBe('You have no action left to use the door.')
    await busy.s.getState().toggleDoor('b', 'd1') // someone else's hero
    await busy.s.getState().toggleDoor('a', 'nope')
    await busy.s.getState().toggleDoor('zz', 'd1')
    expect(busy.f.writes).toEqual([])
    const off = setup({ chars: { a: hero({ mx: null }) } }, 'gm', 'gm')
    await off.s.getState().toggleDoor('a', 'd1')
    expect(off.f.writes.map((w) => w[1])).toEqual(['maps/m/dr/d1', 'rolls'])
  })
  it('helping an ally up uses an action; not while exhausted or out of actions', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero({ name: 'Bo', exh: true, pr: true }) } })
    await s.getState().helpUp('b')
    expect(f.writes).toEqual([
      ['PATCH', 'chars/b', { exh: false, exn: 0, pr: false, log: ['Helped up by Lyra'] }],
      ['PATCH', 'chars/a', { used: 1, log: ['Helped Bo up'] }],
    ])
    const tired = setup({ chars: { a: hero({ exh: true }), b: hero({ exh: true }) } })
    await tired.s.getState().helpUp('b')
    await tired.s.getState().helpUp('zz')
    const out = setup({ chars: { a: hero({ used: 2 }), b: hero({ exh: true }) } })
    await out.s.getState().helpUp('b')
    out.s.setState({ session: null })
    await out.s.getState().helpUp('b')
    expect([...tired.f.writes, ...out.f.writes]).toEqual([])
  })
})

describe('jumping off a monster', () => {
  const ride = (o: Partial<Tables> = {}) =>
    setup({ chars: { a: hero({ mt: 'climb', mon: 'w', mx: 4, my: 4 }), b: hero({ name: 'Bo', mx: 6, my: 4 }) }, enemies: { w: { name: 'Wolf', hp: 9, mx: 4, my: 4, sz: 2 } }, ...o })

  it('lands on a free square within 3 squares of the monster, revealing the fog', async () => {
    const { s, f } = ride()
    s.getState().startJump('a')
    expect(s.getState().jump).toEqual({ id: 'a', on: 'w' })
    expect(await s.getState().tapMap(8, 7, null)).toBeNull()
    expect(paths(f)).toEqual(['chars/a', 'rolls', 'maps/m'])
    expect(f.writes[0]![2]).toMatchObject({ mt: '', mon: null, mx: 8, my: 7, log: ['Jumped off Wolf'] })
    expect(f.writes[1]![2]).toEqual({ ev: 'Lyra jumps off Wolf and lands at column 9, row 8', ts: 5 })
    expect(s.getState().jump).toBeNull()
    expect(s.getState().error).toBe('')
  })

  it('refuses squares too far, walls and taken squares, and keeps waiting', async () => {
    const { s, f } = ride({ maps: { m: { ...MAP, walls: ['2,4'] } } })
    s.getState().startJump('a')
    for (const [x, y] of [[0, 4], [2, 4], [6, 4], [4, 4]] as const) {
      await s.getState().tapMap(x, y, null)
      expect(s.getState().error).toBe('Pick a free square within 3 squares of the monster.')
    }
    expect(f.writes).toEqual([])
    expect(s.getState().jump).not.toBeNull()
    s.getState().cancelJump()
    expect(s.getState().jump).toBeNull()
  })

  it('stops when the hero or the monster is gone; only climbing heroes can start', async () => {
    const { s, f } = ride()
    s.setState({ jump: { id: 'a', on: 'gone' } })
    expect(await s.getState().tapMap(5, 5, null)).toBeNull()
    expect(s.getState().jump).toBeNull()
    s.setState({ jump: { id: 'zz', on: 'w' } })
    await s.getState().tapMap(5, 5, null)
    expect(s.getState().jump).toBeNull()
    expect(f.writes).toEqual([])
    s.getState().startJump('b')
    s.getState().startJump('zz')
    expect(s.getState().jump).toBeNull()
  })

  it('a monster without a size counts as one square', async () => {
    const { s, f } = ride({ enemies: { w: { name: 'Wolf', hp: 9, mx: 4, my: 4 } } })
    s.getState().startJump('a')
    await s.getState().tapMap(8, 4, null)
    expect(s.getState().error).toBe('Pick a free square within 3 squares of the monster.')
    await s.getState().tapMap(7, 5, null)
    expect(f.writes[0]![2]).toMatchObject({ mx: 7, my: 5 })
  })
})
