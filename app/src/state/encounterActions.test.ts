import { describe, expect, it } from 'vitest'
import type { Encounter } from '../logic/encounters'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore, emptyTables, type Tables } from './store'

const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const wolf = (o: Partial<Enemy> = {}): Enemy => ({ name: 'Wolf', hp: 3, max: 10, mx: 2, my: 1, mp: 'm', ...o })
const ENC: Encounter = {
  n: 'Pass',
  rg: 'Frozen North',
  mp: 'm',
  ax: 2,
  ay: 1,
  m: { w: { s: { name: 'Wolf', hp: 10, iv: 1 }, dx: 0, dy: 0 }, k: { s: { name: 'King', nx: 'k2' }, dx: 1, dy: 0 }, k2: { s: { name: 'King II' }, dx: null, dy: null } },
}

function setup(t: Partial<Tables>, tree: Record<string, unknown> = {}, role: 'gm' | 'player' = 'gm') {
  const f = fakeDb(tree)
  let n = 0
  const s = createGameStore(
    () => f.db,
    () => 5,
    () => (n++ % 10) / 10 + 0.05,
  )
  s.getState().connect({ pin: 'p', role, me: role === 'gm' ? 'gm' : 'a' })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  const notes: string[] = []
  s.setState({ notice: (x) => void notes.push(x) })
  return { s, f, notes }
}
const paths = (f: ReturnType<typeof fakeDb>, m: string) => f.writes.filter((w) => w[0] === m).map((w) => w[1])

describe('encounters', () => {
  it('loads only for the GM, empty as {}', async () => {
    const gm = setup({}, { encounters: { n1: ENC } })
    await gm.s.getState().loadEncounters()
    expect(gm.s.getState().encounters).toEqual({ n1: ENC })
    const none = setup({})
    await none.s.getState().loadEncounters()
    expect(none.s.getState().encounters).toEqual({})
    const pl = setup({}, { encounters: { n1: ENC } }, 'player')
    await pl.s.getState().loadEncounters()
    expect(pl.s.getState().encounters).toBeNull()
  })

  it('saves live enemies with their pictures', async () => {
    const { s, f } = setup({ enemies: { a: wolf({ iv: 2, pv: 3 }), b: wolf({ ba: 1, mx: 4 }) } }, { icons: { a: { data: 'I' } }, bossart: { b: {} } })
    expect(await s.getState().saveEncounter('n1', 'Pass', 'Sky City', ['a', 'b'])).toBe(true)
    expect(s.getState().encounters!.n1).toMatchObject({ n: 'Pass', rg: 'Sky City' })
    expect(paths(f, 'PUT')).toEqual(['encounters/n1', 'encpics/n1/a/icons'])
    expect(await s.getState().saveEncounter('n2', ' ', 'Sky City', ['a'])).toBe(false)
    const pl = setup({ enemies: { a: wolf() } }, {}, 'player')
    expect(await pl.s.getState().saveEncounter('n1', 'Pass', 'Sky City', ['a'])).toBe(false)
  })

  it('renames, moves and deletes (GM, known ones only)', async () => {
    const { s, f } = setup({})
    s.setState({ encounters: { n1: ENC } })
    await s.getState().editEncounter('n1', { n: '  New  ', rg: 'The Void' })
    await s.getState().editEncounter('n1', { n: ' ' })
    await s.getState().editEncounter('zz', { n: 'X' })
    expect(s.getState().encounters!.n1).toMatchObject({ n: 'New', rg: 'The Void' })
    expect(f.writes.filter((w) => w[0] === 'PATCH')).toEqual([
      ['PATCH', 'encounters/n1', { n: 'New', rg: 'The Void' }],
      ['PATCH', 'encounters/n1', {}],
    ])
    await s.getState().deleteEncounter('n1')
    expect(s.getState().encounters).toEqual({})
    expect(paths(f, 'DELETE')).toEqual(['encounters/n1', 'encpics/n1'])
    const pl = setup({}, {}, 'player')
    pl.s.setState({ encounters: { n1: ENC } })
    await pl.s.getState().editEncounter('n1', { n: 'X' })
    await pl.s.getState().deleteEncounter('n1')
    expect(pl.f.writes).toEqual([])
  })

  it('deploys onto the map on screen with pictures, then clears', async () => {
    const { s, f } = setup({ enemies: { old: wolf() } }, { encpics: { n1: { w: { icons: 'I' } } } })
    s.setState({ encounters: { n1: ENC } })
    const tag = (await s.getState().deployEncounter('n1'))!
    expect(tag).toMatch(/^n1~/)
    const made = Object.entries(s.getState().tables.enemies).filter(([, e]) => e.ei === tag)
    expect(made).toHaveLength(3)
    const wolfId = made.find(([, e]) => e.name === 'Wolf')![0]
    expect(f.writes).toContainEqual(['PUT', `icons/${wolfId}`, { data: 'I' }])
    const king = made.find(([, e]) => e.name === 'King')![1]
    expect(made.map(([id]) => id)).toContain(king.nx)
    await s.getState().clearDeploy(tag)
    expect(Object.keys(s.getState().tables.enemies)).toEqual(['old'])
  })

  it('deploy needs the GM, a known encounter and a map; clear needs the GM', async () => {
    const nomap = setup({ maps: {} })
    nomap.s.setState({ encounters: { n1: ENC } })
    expect(await nomap.s.getState().deployEncounter('n1')).toBeNull()
    expect(nomap.notes).toEqual(['Open a map first: the encounter is placed on the map on screen.'])
    expect(await nomap.s.getState().deployEncounter('zz')).toBeNull()
    const nopics = setup({})
    nopics.s.setState({ encounters: { n1: ENC } })
    expect(await nopics.s.getState().deployEncounter('n1')).toMatch(/^n1~/)
    const pl = setup({ enemies: { a: wolf({ ei: 't' }) } }, {}, 'player')
    pl.s.setState({ encounters: { n1: ENC } })
    expect(await pl.s.getState().deployEncounter('n1')).toBeNull()
    await pl.s.getState().clearDeploy('t')
    expect(Object.keys(pl.s.getState().tables.enemies)).toEqual(['a'])
  })
})
