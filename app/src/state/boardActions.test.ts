import { describe, expect, it } from 'vitest'
import { defaultBoard, type Board } from '../logic/board'
import { fakeDb } from '../testing/fakeDb'
import { atRestSpot } from './boardActions'
import { createGameStore, emptyTables, type Tables } from './store'

const MAP = { w: 500, h: 500, cols: 10, al: { a: '0,0' }, bf: { a: '6,0' }, gd: { a: '0,6' } }

function setup(t: Partial<Tables>, role: 'gm' | 'player' = 'gm', me = 'gm') {
  const f = fakeDb()
  const s = createGameStore(() => f.db)
  s.getState().connect({ pin: 'p', role, me })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  return { s, f }
}

const board: Board = { b1: { n: 'Base', v: 'fighter', l: 1, c: 2 }, b2: { n: 'Second', v: 'fighter', l: 1 }, g1: { n: 'Base (Golden)', v: 'fighter', l: 1, gb: 'b1' } }

it('a rest spot is an altar, a bonfire or a guild next to you', () => {
  const t = { ...emptyTables(), maps: { m: MAP }, cur: 'm' }
  expect(atRestSpot(t, { mx: 1, my: 1 })).toBe(true)
  expect(atRestSpot(t, { mx: 5, my: 1 })).toBe(true)
  expect(atRestSpot(t, { mx: 1, my: 5 })).toBe(true)
  expect(atRestSpot(t, { mx: 4, my: 4 })).toBe(false)
  expect(atRestSpot(emptyTables(), { mx: 0, my: 0 })).toBe(false)
})

describe("the GM's editor", () => {
  it('a table without a saved board saves the default one whole before the first edit', async () => {
    const { s, f } = setup({})
    await s.getState().setAbilityField('fighter_power_strike', 'c', '5')
    expect(f.writes[0]).toEqual(['PUT', 'board', defaultBoard()])
    expect(f.writes[1]).toEqual(['PUT', 'board/fighter_power_strike/c', 5])
    expect((s.getState().tables.board as Board).fighter_power_strike!.c).toBe(5)
    // Saved now: the next edit saves only the field.
    await s.getState().setAbilityField('fighter_power_strike', 'n', 'Big Hit')
    expect(f.writes).toHaveLength(3)
  })

  it('only the GM edits, and only abilities that exist', async () => {
    const { s, f } = setup({ board }, 'player', 'a')
    await s.getState().setAbilityField('b1', 'c', '5')
    const gm = setup({ board })
    await gm.s.getState().setAbilityField('gone', 'c', '5')
    expect([...f.writes, ...gm.f.writes]).toEqual([])
    await gm.s.getState().setAbilityField('b2', 'n', 'Base')
    expect(gm.f.writes).toEqual([['PUT', 'board/b2/n', 'Base 2']])
  })

  it('adds, removes and replaces abilities', async () => {
    const { s, f } = setup({ board })
    await s.getState().addAbility('x1')
    await s.getState().removeAbility('b2')
    expect(Object.keys(s.getState().tables.board!)).toEqual(['b1', 'g1', 'x1'])
    await s.getState().replaceBoard({ q: { n: 'Q' } })
    expect(f.writes).toEqual([
      ['PUT', 'board/x1', expect.objectContaining({ n: 'New ability' })],
      ['DELETE', 'board/b2', null],
      ['PUT', 'board', { q: { n: 'Q' } }],
    ])
    const fresh = setup({})
    await fresh.s.getState().removeAbility('mage_firebolt')
    expect(fresh.f.writes.map((w) => w[1])).toEqual(['board', 'board/mage_firebolt'])
  })

  it('icon style and what players see are table settings', async () => {
    const { s, f } = setup({})
    await s.getState().setBoardSetting('drawnIcons', false)
    await s.getState().setBoardSetting('showAll', true)
    await s.getState().setBoardSetting('drawnIcons', true)
    await s.getState().setBoardSetting('showAll', false)
    expect(f.writes.map((w) => w[2])).toEqual([{ aic: 0 }, { abv: 1 }, { aic: 1 }, { abv: 0 }])
    expect(s.getState().tables).toMatchObject({ drawnIcons: true, showAll: false })
    const pl = setup({}, 'player', 'a')
    await pl.s.getState().setBoardSetting('showAll', true)
    expect(pl.f.writes).toEqual([])
  })
})

describe('players equipping', () => {
  const hero = (o: object = {}) => ({ name: 'Bo', cls: 'fighter', level: 1, mx: 1, my: 1, eq: { _: true, b1: true }, ...o })

  it('equips, unequips and attunes at a rest spot (with Golden abilities shown to players)', async () => {
    const { s, f } = setup({ board, chars: { a: hero({ atn: 1 }) }, sp: '-' }, 'player', 'a')
    await s.getState().equip('g1', true)
    await s.getState().attune('g1')
    await s.getState().equip('b2', true)
    expect(f.writes.map((w) => (w[2] as { log: string[] }).log.at(-1))).toEqual(['Equipped Base (Golden)', 'Attuned to Base (Golden)', 'Equipped Second'])
    expect(s.getState().tables.chars.a).toMatchObject({ eq: { _: true, b1: true, g1: true, b2: true }, at: { g1: 1 } })
  })

  it('away from a rest spot it says why; refusals save nothing', async () => {
    const { s, f } = setup({ board, chars: { a: hero({ mx: 4, my: 4, atn: 1, eq: { b1: true, g1: true } }) }, sp: '-' }, 'player', 'a')
    await s.getState().equip('b2', true)
    expect(s.getState().error).toBe('You can only change abilities next to an altar, a bonfire or at a guild.')
    await s.getState().attune('g1')
    expect(s.getState().error).toBe('You can only attune next to an altar, a bonfire or at a guild.')
    await s.getState().attune('b1')
    expect(f.writes).toEqual([])
  })

  it('without a sheet (or a session) nothing happens; the default board is used when none is saved', async () => {
    const none = setup({ board }, 'player', 'zz')
    await none.s.getState().equip('b1', true)
    none.s.getState().disconnect()
    await none.s.getState().attune('g1')
    expect(none.f.writes).toEqual([])
    const def = setup({ chars: { a: hero({ eq: undefined }) } }, 'player', 'a')
    await def.s.getState().equip('fighter_power_strike', false)
    expect(def.f.writes[0]![2]).toMatchObject({ eq: { _: true, fighter_multi_slash: true, fighter_shield_bash: true } })
  })
})
