import { describe, expect, it } from 'vitest'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore, emptyTables, type Tables } from './store'

function setup(t: Partial<Tables> = {}, role: 'gm' | 'player' = 'gm', me = 'gm') {
  const f = fakeDb()
  const s = createGameStore(() => f.db, () => 77, () => 0.5)
  s.getState().connect({ pin: 'p', role, me })
  s.getState().applySnapshot({ ...emptyTables(), chars: { a: { name: 'Lyra' }, b: { name: 'Bram' } }, enemies: { w: { name: 'Wolf', hp: 5 } }, ...t })
  return { s, f }
}

describe('token icons', () => {
  it('a hero (the GM, or that player) or a monster (the GM): the picture, then its version stamp', async () => {
    const { s, f } = setup()
    await s.getState().setIcon('c:a', 'data:a')
    await s.getState().setIcon('e:w', 'data:w')
    expect(f.writes).toEqual([
      ['PUT', 'icons/a', { data: 'data:a' }],
      ['PATCH', 'chars/a', { iv: 77 }],
      ['PUT', 'icons/w', { data: 'data:w' }],
      ['PATCH', 'enemies/w', { iv: 77 }],
    ])
    expect((s.getState().tables.chars.a as { iv?: number }).iv).toBe(77)
    const pl = setup({}, 'player', 'a')
    await pl.s.getState().setIcon('c:a', 'data:a')
    await pl.s.getState().setIcon('c:b', 'data:b')
    await pl.s.getState().setIcon('e:w', 'data:w')
    expect(pl.f.writes.map((w) => w[1])).toEqual(['icons/a', 'chars/a'])
  })
})

describe('portraits and boss art', () => {
  it('a portrait for a hero or a monster; players only for their own hero', async () => {
    const { s, f } = setup({ enemies: { w: { name: 'Wolf' }, a: { name: 'Twin' } } })
    await s.getState().setPortrait('w', 'data:w')
    await s.getState().setPortrait('a', 'data:a') // a hero with the same id wins
    await s.getState().setPortrait('gone', 'data:g')
    expect(f.writes).toEqual([
      ['PUT', 'portraits/w', { data: 'data:w' }],
      ['PATCH', 'enemies/w', { pv: 77 }],
      ['PUT', 'portraits/a', { data: 'data:a' }],
      ['PATCH', 'chars/a', { pv: 77 }],
      ['PUT', 'portraits/gone', { data: 'data:g' }],
    ])
    const pl = setup({}, 'player', 'a')
    await pl.s.getState().setPortrait('b', 'x')
    expect(pl.f.writes).toEqual([])
  })

  it('boss art: the picture, the stamp, and a note that it was saved', async () => {
    const { s, f } = setup()
    await s.getState().setBossArt('w', 'data:art')
    expect(f.writes).toEqual([
      ['PUT', 'bossart/w', { data: 'data:art' }],
      ['PATCH', 'enemies/w', { ba: 77 }],
    ])
    expect(s.getState().error).toBe('Boss art saved.')
    const pl = setup({}, 'player', 'a')
    await pl.s.getState().setBossArt('w', 'x')
    expect(pl.f.writes).toEqual([])
  })
})

describe('skill icons', () => {
  it('set or removed by the GM, with the version stamp in meta', async () => {
    const { s, f } = setup()
    await s.getState().setSkillIcon('bite', 'data:b')
    await s.getState().setSkillIcon('bite', null)
    expect(f.writes).toEqual([
      ['PUT', 'skicons/bite', { data: 'data:b' }],
      ['PATCH', 'meta', { skiv: 77 }],
      ['DELETE', 'skicons/bite', null],
      ['PATCH', 'meta', { skiv: 77 }],
    ])
    const pl = setup({}, 'player', 'a')
    await pl.s.getState().setSkillIcon('bite', 'x')
    expect(pl.f.writes).toEqual([])
  })
})

describe('ability icons', () => {
  const board = { k: { n: 'Cleave', v: 'any', k: 'atk' } }
  it('the board gets the stamp (saved whole first when it was the default); clearing removes both', async () => {
    const { s, f } = setup()
    await s.getState().setAbilityIcon('fighter_power_strike', 'data:i')
    expect(f.writes.map((w) => `${w[0]} ${w[1]}`)).toEqual(['PUT board', 'PUT abicons/fighter_power_strike', 'PUT board/fighter_power_strike/iv'])
    expect((f.writes[0]![2] as Record<string, { iv?: number }>).fighter_power_strike!.iv).toBe(77)
    const saved = setup({ board })
    await saved.s.getState().setAbilityIcon('k', 'data:i')
    await saved.s.getState().setAbilityIcon('k', null)
    expect(saved.f.writes).toEqual([
      ['PUT', 'abicons/k', { data: 'data:i' }],
      ['PUT', 'board/k/iv', 77],
      ['DELETE', 'abicons/k', null],
      ['DELETE', 'board/k/iv', null],
    ])
    expect(saved.s.getState().tables.board).toEqual(board)
    const def = setup()
    await def.s.getState().setAbilityIcon('fighter_power_strike', null)
    expect(def.s.getState().tables.board).toBeNull()
    expect(def.f.writes.map((w) => w[1])).toEqual(['abicons/fighter_power_strike', 'board/fighter_power_strike/iv'])
    await def.s.getState().setAbilityIcon('nope', 'x')
    const pl = setup({ board }, 'player', 'a')
    await pl.s.getState().setAbilityIcon('k', 'x')
    expect([...pl.f.writes, ...def.f.writes.slice(2)]).toEqual([])
  })
})
