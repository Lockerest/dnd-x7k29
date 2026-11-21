import { describe, expect, it } from 'vitest'
import { VOCATION_ROWS } from '../data/vocationBoard'
import {
  attuneChange,
  availableAbilities,
  boardFieldValue,
  editorOrder,
  equipChange,
  equipRow,
  glyphOf,
  keyByName,
  NEW_ABILITY,
  NOT_HERE,
  NOT_HERE_ATTUNE,
  referenceRows,
  usedSlots,
  vocationBoard,
} from './abilityBoard'
import type { Board } from './board'
import { guildsOf } from './geometry'

describe('the 9-class board', () => {
  const b = vocationBoard()
  it('keeps the old classes level 1 abilities and adds every row', () => {
    expect(b.fighter_power_strike).toMatchObject({ n: 'Power Strike', l: 1 })
    expect(b.warrior_power_strike).toBeUndefined()
    expect(Object.keys(b).length).toBeGreaterThan(VOCATION_ROWS.length)
    const [v, n] = VOCATION_ROWS[0]!
    expect(b[`${v}_${n.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`]).toMatchObject({ n, v })
  })
  it('Golden versions cost 1.5x (rounded to halves), need their base, and charged abilities are marked', () => {
    const g = Object.entries(b).find(([, e]) => e.gb)!
    const base = b[g[1].gb!]!
    expect(g[1]).toMatchObject({ n: `${base.n} (Golden)`, c: Math.ceil(Number(base.c) * 3) / 2, ic: '✨' })
    expect(g[1].t).toMatch(new RegExp(`^Golden form of ${base.n}\\. Needs ${base.n} equipped\\. .* Costs \\d+% of your max HP \\(never below 1\\)\\.$`))
    const charged = Object.values(b)
      .filter((e) => e.ch)
      .map((e) => e.n)
    expect(charged).toEqual(expect.arrayContaining(['Oathbreaker', 'Oathbreaker (Golden)', 'Meteor Fall', 'Cataclysm']))
    const nonAttack = Object.values(b).find((e) => e.gb && e.k !== 'atk')!
    expect(nonAttack.d).toBe('')
  })
})

describe('icons', () => {
  const b: Board = {
    a: { n: 'Fireball', v: 'mage', k: 'atk' },
    g: { n: 'Fireball (Golden)', v: 'mage', gb: 'a' },
    x: { n: 'Zzz', v: 'bard', k: 'heal' },
    y: { n: 'Zzz2', v: 'warrior2', k: 'atk' },
    z: { n: 'Zzz3', k: 'util' },
    o: { n: 'Orphan (Golden)', v: 'mage', gb: 'gone' },
  }
  it('picks a shape by name (Golden ones use their base name), else by kind, and a class colour', () => {
    expect(glyphOf(b, 'a')).toEqual({ glyph: 'flame', color: '#5b83e0', golden: false })
    expect(glyphOf(b, 'g')).toEqual({ glyph: 'flame', color: '#5b83e0', golden: true })
    expect(glyphOf(b, 'x')).toEqual({ glyph: 'heal', color: '#c9b27a', golden: false })
    expect(glyphOf(b, 'y')).toEqual({ glyph: 'slash', color: '#c8483b', golden: false })
    expect(glyphOf(b, 'z')).toEqual({ glyph: 'star', color: '#c9b27a', golden: false })
    expect(glyphOf(b, 'o').golden).toBe(true)
  })
  it('finds keys by name; the last one with a name wins', () => {
    expect(keyByName({ a: { n: 'X' }, b: { n: 'X' }, c: { n: '' }, d: null as unknown as Board[string] })).toEqual({ X: 'b' })
  })
})

const board: Board = {
  b1: { n: 'Base', v: 'fighter', l: 1, c: 2, k: 'atk', d: '2d6', r: 1, t: 'Hit.' },
  b2: { n: 'Second', v: 'fighter', l: 2, c: 1, k: 'heal', d: '1d4' },
  b3: { n: 'Third', v: 'any', l: 1, c: 3, k: 'check' },
  b4: { n: 'High', v: 'fighter', l: 5, c: 4, k: 'atk', a: 1 },
  g1: { n: 'Base (Golden)', v: 'fighter', l: 1, c: 3, gb: 'b1', hc: 10 },
  m1: { n: 'Mage', v: 'mage', l: 1 },
}
const hero = (o: object = {}) => ({ cls: 'fighter', level: 2, ...o })

describe('equipping', () => {
  it('slots used: attuned Golden abilities with their base equipped are free', () => {
    expect(usedSlots(hero(), new Set(['b1', 'g1']), board)).toBe(2)
    expect(usedSlots(hero({ at: { g1: 1 }, atn: 1 }), new Set(['b1', 'g1']), board)).toBe(1)
    expect(usedSlots(hero({ at: { g1: 1 }, atn: 1 }), new Set(['g1']), board)).toBe(1)
  })

  it('what a player may pick from', () => {
    expect(availableAbilities(hero(), board, false, false)).toEqual(['b1', 'b3', 'g1', 'b2'])
    expect(availableAbilities(hero(), board, true, true)).toEqual(['b1', 'b3', 'b2', 'b4'])
    expect(availableAbilities({ cls: 'mage' }, board, false, false)).toEqual(['b3', 'm1'])
  })

  it('equips and unequips (a Golden version goes with its base)', () => {
    const c = hero({ eq: { _: true, b1: true } })
    expect(equipChange(c, board, 'b2', true, true, false, false)).toEqual({ patch: { eq: { _: true, b1: true, b2: true } }, msg: 'Equipped Second' })
    expect(equipChange(hero({ eq: { b1: true, g1: true } }), board, 'b1', false, true, false, false)).toEqual({ patch: { eq: { _: true } }, msg: 'Unequipped Base' })
    expect(equipChange(c, board, 'gone', false, false, true, false)).toEqual({ patch: { eq: { _: true, b1: true } }, msg: 'Unequipped an ability' })
  })

  it('refuses: too high a level, away from a rest spot, Golden without its base, no free slot', () => {
    expect(equipChange(hero(), board, 'b4', true, true, true, false)).toBeNull()
    expect(equipChange(hero(), board, 'b2', true, false, false, false)).toEqual({ error: NOT_HERE })
    expect(equipChange(hero({ eq: {} }), board, 'g1', true, true, false, false)).toEqual({ error: 'Equip Base first.' })
    expect(equipChange(hero({ level: 1, eq: { b1: true, b3: true, x: 1, y: 1 } }), { ...board, x: { n: 'x' }, y: { n: 'y' } }, 'g1', true, true, false, false)).toBeNull()
    expect(equipChange(hero(), board, 'b2', true, false, true, false)).not.toBeNull() // the GM may anywhere
  })

  it('attunes an equipped Golden ability, within the attunement count', () => {
    const c = hero({ eq: { b1: true, g1: true }, atn: 1 })
    expect(attuneChange(c, board, 'g1', true, false, false)).toEqual({ patch: { at: { g1: 1 } }, msg: 'Attuned to Base (Golden)' })
    expect(attuneChange({ ...c, at: { x: 1 } }, board, 'g1', true, false, false)).toEqual({ patch: { at: { x: 1, g1: 1 } }, msg: 'Attuned to Base (Golden)' })
    expect(attuneChange(c, board, 'b1', true, false, false)).toBeNull()
    expect(attuneChange(c, board, 'gone', true, false, false)).toBeNull()
    expect(attuneChange(c, board, 'g1', false, false, false)).toEqual({ error: NOT_HERE_ATTUNE })
    expect(attuneChange({ ...c, atn: 0 }, board, 'g1', true, true, false)).toBeNull()
    expect(attuneChange({ ...c, at: { g1: 1 }, atn: 2 }, board, 'g1', true, true, false)).toBeNull()
    expect(attuneChange(hero({ eq: { b1: true }, atn: 1 }), board, 'g1', true, true, false)).toBeNull()
  })

  it("a row on a player's board", () => {
    const eq = new Set(['b1', 'g1'])
    const c = hero({ eq: { b1: true, g1: true }, atn: 1 })
    expect(equipRow(c, board, 'b1', eq, true)).toEqual({ on: true, text: 'Hit. · Damage 2d6, range 1', attune: null, canToggle: true })
    expect(equipRow(c, board, 'g1', eq, true)).toMatchObject({ on: true, attune: 'button' })
    expect(equipRow(c, board, 'g1', eq, false)).toMatchObject({ attune: null, canToggle: false })
    expect(equipRow({ ...c, at: { g1: 1 } }, board, 'g1', eq, true)).toMatchObject({ attune: 'attuned' })
    expect(equipRow(c, board, 'b2', eq, true)).toEqual({ on: false, text: ' · Heals 1d4', attune: null, canToggle: true })
    expect(equipRow(c, board, 'b3', eq, true).text).toBe(' · d20 check')
    expect(equipRow(c, board, 'b4', eq, true)).toEqual({ on: false, text: ' · Damage , range 1, auto-hit · unlocks at level 5', attune: null, canToggle: false })
    expect(equipRow(hero(), board, 'g1', new Set(), true)).toMatchObject({ text: ' · needs Base equipped', canToggle: false })
    expect(equipRow(hero(), board, 'm1', new Set(), true).text).toBe('')
    // No free slot: only already-equipped or attuned ones can change.
    const full = new Set(['b1', 'b2', 'b3', 'x'])
    expect(equipRow(hero({ level: 1 }), { ...board, x: { n: 'x' } }, 'g1', full, true).canToggle).toBe(false)
  })
})

describe("the GM's editor", () => {
  it('lists by vocation then level', () => {
    expect(editorOrder({ a: { n: 'a', v: 'mage', l: 2 }, b: { n: 'b', v: 'mage' }, c: { n: 'c', v: 'any', l: 3 }, d: { n: 'd' } })).toEqual(['d', 'c', 'b', 'a'])
  })
  it('saves numbers as numbers, check boxes as 1 or 0, and unique trimmed names', () => {
    expect(boardFieldValue(board, 'b1', 'c', '3')).toBe(3)
    expect(boardFieldValue(board, 'b1', 'hc', 'x')).toBe(0)
    expect(boardFieldValue(board, 'b1', 'a', true)).toBe(1)
    expect(boardFieldValue(board, 'b1', 'ch', false)).toBe(0)
    expect(boardFieldValue(board, 'b1', 'd', ' 3d6 ')).toBe(' 3d6 ')
    expect(boardFieldValue(board, 'b1', 'n', '  ')).toBe('Ability')
    expect(boardFieldValue(board, 'b1', 'n', ' Second ')).toBe('Second 2')
    expect(boardFieldValue(board, 'b1', 'n', 'Base')).toBe('Base')
    expect(boardFieldValue(board, 'b1', 'n', 'y'.repeat(40))).toBe('y'.repeat(30))
  })
  it('new abilities start as a 2d6 attack', () => {
    expect(NEW_ABILITY).toEqual({ n: 'New ability', c: 2, l: 1, v: 'any', k: 'atk', d: '2d6', r: 1, a: 0, b: '', t: '' })
  })
})

describe('the reference table', () => {
  const b: Board = {
    ...board,
    c1: { n: 'Charge', v: 'fighter', l: 1, c: 5, k: 'atk', d: '4d6', t: '4d6 boom.', ch: 1 },
    c2: { n: 'Charge Up', v: 'fighter', l: 1, c: 5, k: 'util', t: 'Charge it.', ch: 1, hc: 5 },
    g2: { n: 'Charge (Golden)', v: 'fighter', l: 1, c: 7, d: '6d6', gb: 'c1' },
    g3: { n: 'Third (Golden)', v: 'any', gb: 'b3', c: 4, hc: 15 },
  }
  it('base abilities up to a level, by level then cost, with damage, charge, HP cost and Golden notes', () => {
    expect(referenceRows(b, 'fighter', 2, false)).toEqual([
      { key: 'b1', level: 1, name: 'Base', cost: 2, effect: '2d6 damage. Hit.', golden: { name: 'Base (Golden)', dice: '', cost: 3, hc: 10 } },
      { key: 'b3', level: 1, name: 'Third', cost: 3, effect: '', golden: { name: 'Third (Golden)', dice: '', cost: 4, hc: 15 } },
      { key: 'c1', level: 1, name: 'Charge', cost: 5, effect: '4d6 boom. Takes a round to charge.', golden: { name: 'Charge (Golden)', dice: '6d6', cost: 7, hc: 10 } },
      { key: 'c2', level: 1, name: 'Charge Up', cost: 5, effect: 'Charge it. Costs 5% max HP.', golden: null },
      { key: 'b2', level: 2, name: 'Second', cost: 1, effect: '', golden: null },
    ])
    expect(referenceRows(b, 'fighter', 1, true).map((r) => r.golden)).toEqual([null, null, null, null])
    expect(referenceRows(b, 'mage', 1, false).map((r) => r.key)).toEqual(['m1', 'b3'])
    expect(referenceRows({ x: { n: 'X', v: 'any', k: 'atk' } }, 'mage', 1, false)[0]).toMatchObject({ level: 1, cost: 0, effect: '' })
  })
})

it('guilds on the map', () => {
  expect(guildsOf({ gd: { a: '1,1' } })).toEqual(['1,1'])
  expect(guildsOf({})).toEqual([])
  expect(guildsOf(null)).toEqual([])
})

describe('missing fields count as level 1, cost 0, no text', () => {
  const bare: Board = { a: { n: 'Bare', v: 'any' }, b: { n: 'Bolt', v: 'any', k: 'atk', d: '1d6' }, c: { n: 'Z', l: 2 }, h: { n: 'Mend', k: 'heal' }, w: { n: 'Wind', v: 'x', ch: 1 } }
  it('everywhere the board reads them', () => {
    expect(availableAbilities({ cls: 'mage' }, bare, false, false)).toEqual(['a', 'b'])
    expect(equipChange({ cls: 'mage' }, bare, 'a', true, true, false, false)).toMatchObject({ msg: 'Equipped Bare' })
    expect(equipRow({ cls: 'mage' }, bare, 'a', new Set(), true)).toEqual({ on: false, text: '', attune: null, canToggle: true })
    expect(equipRow({ cls: 'mage' }, bare, 'c', new Set(), true)).toMatchObject({ text: ' · unlocks at level 2', canToggle: false })
    expect(editorOrder(bare)).toEqual(['h', 'c', 'a', 'b', 'w'])
    expect(equipRow({}, bare, 'h', new Set(), true).text).toBe(' · Heals ')
    expect(referenceRows(bare, 'x', 1, false)[2]!.effect).toBe(' Takes a round to charge.')
    expect(referenceRows(bare, 'mage', 1, false)).toEqual([
      { key: 'a', level: 1, name: 'Bare', cost: 0, effect: '', golden: null },
      { key: 'b', level: 1, name: 'Bolt', cost: 0, effect: '1d6 damage. ', golden: null },
    ])
  })
})
