import { describe, expect, it } from 'vitest'
import { parseDice } from './text'
import {
  abilityExtra,
  actionMenu,
  areaAttack,
  attackFor,
  canPrompt,
  damageDice,
  damageTotal,
  fxEvent,
  harmlessSkill,
  hitChanges,
  parryable,
  payForAction,
  pushResult,
  readied,
  saveResult,
  skillAttack,
  throwLanding,
  type U,
} from './attack'
import type { Board } from './board'
import { grid } from './table'
import type { Sheet } from './sheet'
import type { Enemy } from './types'

const board: Board = {
  a: { n: 'Cleave', v: 'any', l: 1, c: 2, k: 'atk', d: '2d8', r: 1 },
  b: { n: 'Long Shot', v: 'any', l: 1, c: 3, k: 'atk', d: '1d8', r: 6, a: 1 },
  u: { n: 'Smoke', v: 'any', l: 1, c: 1, k: 'util' },
}
const hero = (o: Partial<Sheet> = {}): U => ({
  e: false,
  id: 'a',
  key: 'c:a',
  o: { name: 'Lyra', cls: 'fighter', level: 1, hp: 30, maxHp: 30, st: 50, maxSt: 100, str: 14, mx: 2, my: 2, ...o } as Sheet & Enemy,
})
const monster = (o: Partial<Enemy> = {}, id = 'w'): U => ({ e: true, id, key: `e:${id}`, o: { name: 'Wolf', hp: 20, max: 20, mx: 3, my: 2, ...o } as Sheet & Enemy })
const ctx = (o: object = {}) => ({ dm: false, myTurn: true, board, hideGolden: false, enemies: {}, ...o })

describe('attack numbers', () => {
  it('light, heavy and ability attacks; non-attacks have none', () => {
    expect(attackFor(hero(), 'l', undefined, board, false)).toMatchObject({ label: 'Light attack', dmg: '1d6', tb: 4, db: 2 })
    expect(attackFor(hero(), 'h', undefined, board, false)).toMatchObject({ label: 'Heavy attack', cost: 1 })
    // Dodge Roll and Parry come first on a fighter's list.
    expect(attackFor(hero(), 'ab', 2, board, false)).toEqual({ label: 'Cleave', rng: 1, dmg: '2d8', tb: 4, db: 2, cost: 2, cs: 20, po: 2, auto: 0 })
    expect(attackFor(hero(), 'ab', 3, board, false)).toMatchObject({ label: 'Long Shot', auto: 1, rng: 6 })
    expect(attackFor(hero(), 'ab', 4, board, false)).toBeNull()
    expect(attackFor(hero(), 'ab', 9, board, false)).toBeNull()
  })

  it('parry works on plain attacks, not area or elemental ones', () => {
    expect(parryable({ label: 'Light attack', rng: 1, dmg: '', tb: 0, db: 0, cost: 0, po: 1 })).toBe(true)
    expect(parryable({ label: 'Fireball', rng: 6, dmg: '', tb: 0, db: 0, cost: 0, po: 1 })).toBe(false)
    expect(parryable({ ...areaAttack({}), label: 'Swipe' })).toBe(false)
  })
})

describe('the action menu', () => {
  it("a hero's menu on a monster next to them", () => {
    const m = actionMenu(hero({ st: 15 }), monster(), ctx())
    expect(m.title).toBe('Lyra → Wolf')
    expect(m.buttons.map((b) => [b.k, b.label, b.disabled, b.warn])).toEqual([
      ['l', 'Light attack', false, false],
      ['h', 'Heavy attack · 10 St', false, false],
      ['ab', 'Cleave · 20 St', false, true],
      ['ab', 'Long Shot · 30 St · range 6', false, true],
      ['push', 'Push (10 St)', false, false],
    ])
    expect(m.buttons[2]!.i).toBe(2)
    expect(m.notes).toEqual([])
  })

  it('counter, mount, pick up and throw; out of reach and out of turn notes', () => {
    const big = monster({ sz: 2, mx: 6, my: 2 })
    const m = actionMenu(hero({ ctr: true, cls: 'archer' }), big, ctx({ myTurn: false, enemies: { c: { name: 'Imp', hd: 'c:a' }, w: big.o } }))
    expect(m.buttons.map((b) => [b.k, b.disabled, !!b.primary])).toEqual([
      ['l', true, false],
      ['h', true, false],
      ['ab', true, false],
      ['ab', true, false],
      ['ctr', false, true],
      ['mount', true, false],
      ['throw', true, false],
    ])
    expect(m.buttons.find((b) => b.k === 'throw')!.label).toBe('Throw Imp · 20 St')
    expect(m.notes).toEqual([
      'It is not your turn: you can only use reactions (Dodge, Parry) or a counter-attack.',
      'Melee, mount, push and pick up need you next to the target. Ranged attacks show their range.',
    ])
    const stunned = actionMenu(hero(), monster({ stun: true }), ctx({ dm: true, myTurn: false }))
    expect(stunned.buttons.find((b) => b.k === 'pick')).toMatchObject({ disabled: false, label: 'Pick up (20 St)' })
    const holding = actionMenu(hero(), monster(), ctx({ enemies: { w: { name: 'Wolf', hd: 'c:a' } } }))
    expect(holding.buttons.some((b) => b.k === 'throw')).toBe(false) // you cannot throw the one you aim at
    expect(actionMenu(hero({ ctr: true, cls: 'nobody', mx: 0 }), monster(), ctx()).buttons.find((b) => b.k === 'ctr')!.disabled).toBe(true)
    // Mounting needs you next to it, able to act and not already riding; throwing needs the target within 5.
    const near = monster({ sz: 2 })
    expect(actionMenu(hero(), near, ctx()).buttons.find((b) => b.k === 'mount')!.disabled).toBe(false)
    expect(actionMenu(hero({ exh: true }), near, ctx()).buttons.find((b) => b.k === 'mount')!.disabled).toBe(true)
    expect(actionMenu(hero({ mt: 'climb' }), near, ctx()).buttons.find((b) => b.k === 'mount')!.disabled).toBe(true)
    expect(actionMenu(hero(), near, ctx({ enemies: { c: { name: 'Imp', hd: 'c:a' } } })).buttons.find((b) => b.k === 'throw')!.disabled).toBe(false)
  })

  it("a monster's menu: area attack, its skills, a special attack; it cannot hit its rider", () => {
    const sk = { s1: { n: 'Bite', d: '1d8', r: 1, t: 's' as const }, s2: { n: 'Roar', d: '2d6', r: 0, t: 'a' as const }, s3: { n: 'Spit', d: '1d4', r: 0, t: 's' as const } }
    const m = actionMenu(monster({ sk }), hero({ mx: 5 }), ctx({ dm: true }))
    expect(m.buttons.map((b) => [b.k, b.i, b.label, b.disabled])).toEqual([
      ['l', undefined, 'Light attack', true],
      ['h', undefined, 'Heavy attack', true],
      ['aoe', undefined, 'Area attack (everyone nearby)', false],
      ['sk', 's1', 'Bite · range 1', true],
      ['sk', 's2', 'Roar (area)', false],
      ['sk', 's3', 'Spit · range 1', true],
      ['sp', undefined, 'Special attack…', false],
      ['push', undefined, 'Push (10 St)', true],
    ])
    const rider = actionMenu(monster(), hero({ mt: 'climb', mon: 'w', mx: 3 }), ctx({ dm: true }))
    expect(rider.buttons[0]!.disabled).toBe(true)
    expect(rider.notes[0]).toBe('This target is riding it: it can only hit them with an area attack.')
  })

  it('a worn-out hero cannot act', () => {
    for (const o of [{ exh: true }, { stn: true }, { used: 2 }, { hp: 0 }]) expect(actionMenu(hero(o), monster(), ctx()).buttons[0]!.disabled).toBe(true)
  })
})

describe('paying for an action', () => {
  it('monsters are free; heroes need their turn and actions left', () => {
    expect(payForAction(monster(), 2, 'x', undefined, false, false)).toEqual({ status: 1 })
    expect(payForAction(hero(), 2, 'x', undefined, false, false)).toEqual({ status: 0 })
    for (const o of [{ exh: true }, { stn: true }, { hp: 0 }, { used: 2 }]) expect(payForAction(hero(o), 2, 'x', undefined, true, true).status).toBe(0)
  })
  it('pays stamina (with the extra change), or exhausts the hero', () => {
    expect(payForAction(hero(), 2, 'Push', { ctr: false }, false, true)).toEqual({ status: 1, patch: { used: 1, st: 30, ctr: false }, msg: 'Push (-20 St)' })
    expect(payForAction(hero({ used: 1 }), 0, 'Light', undefined, true, false)).toEqual({ status: 1, patch: { used: 2, st: 50 }, msg: 'Light' })
    expect(payForAction(hero({ st: 5 }), 2, 'Push', { ctr: false }, true, false)).toEqual({
      status: 2,
      patch: { used: 1, st: 0, exh: true, mt: '', mon: null },
      msg: 'Push (-20 St) - out of stamina: EXHAUSTED',
    })
  })
  it('ability extras: charged ones stop charging, Golden ones cost HP', () => {
    expect(abilityExtra(hero().o, 10, true)).toEqual({ ua: true, chg: null })
    expect(abilityExtra(hero().o, 10, false)).toMatchObject({ hp: 27 })
    expect(abilityExtra(hero().o, undefined, false)).toEqual({ ua: true })
  })
})

describe('saves, dice and damage', () => {
  it('a save at or above the total avoids it, up to 2 below halves it', () => {
    expect([12, 10, 9, 8, 7].map((s) => saveResult(s, 10))).toEqual(['full', 'full', 'half', 'half', 'none'])
  })
  it('dice double on a critical; damage is at least 1, x10, times the factor', () => {
    expect(damageDice('2d6+1d4', false, parseDice)).toEqual([6, 6, 4])
    expect(damageDice('1d8', true, parseDice)).toEqual([8, 8])
    expect(damageTotal([3, 4], 2, 10, 1)).toBe(90)
    expect(damageTotal([1], -5, 10, 0.5)).toBe(5)
  })
  it('readied reactions and who gets the prompt', () => {
    const inf = { label: 'Bite', rng: 1, dmg: '1d4', tb: 0, db: 0, cost: 0, po: 1 }
    expect(readied({ ddg: true, pry: true, cls: 'fighter' }, inf)).toBe('dodge')
    expect(readied({ pry: true, cls: 'fighter' }, inf)).toBe('parry')
    expect(readied({ pry: true, cls: 'mage' }, inf)).toBeNull()
    expect(readied({ pry: true, cls: 'fighter' }, { ...inf, label: 'Fire Bite' })).toBeNull()
    expect(canPrompt(monster(), hero(), inf)).toBe(true)
    expect(canPrompt(hero(), hero(), inf)).toBe(false)
    expect(canPrompt(monster(), { ...hero(), id: 'gm' }, inf)).toBe(false)
    for (const o of [{ hp: 0 }, { exh: true }, { stn: true }, { chg: 'X' }]) expect(canPrompt(monster(), hero(o), inf)).toBe(false)
    expect(canPrompt(monster(), hero(), { ...inf, area: true })).toBe(false)
  })
})

describe('hits', () => {
  it('on a monster: HP, the moment and size of the hit, and phase gates', () => {
    const r = hitChanges(hero(), monster({ hp: 20, max: 20 }), 30, false, {}, 99)
    expect(r).toEqual({ patch: { hp: 0, ht: 99, hv: 30 }, msg: undefined, gate: false, full: false, hp: 0, knock: undefined, line: 'Lyra hits Wolf for 30. Wolf is slain!' })
    const gated = hitChanges(hero(), monster({ hp: 20, max: 20, pg: 50, nx: 'p2' }), 15, false, { p2: { name: 'P2' } }, 1)
    expect(gated).toMatchObject({ gate: 'swap', hp: 10, line: 'Lyra hits Wolf for 15' })
    expect(hitChanges(hero(), monster({ hp: 20, max: 20, pg: 50, nx: 'gone' }), 15, false, {}, 1).gate).toBe('event')
  })
  it('on a hero: fatigue, and monsters knock exhausted heroes down', () => {
    const r = hitChanges(monster(), hero({ hp: 30, maxHp: 30, exh: true, lh: 2 }), 30, false, {}, 5)
    expect(r.patch).toMatchObject({ hp: 0, ht: 5, hv: 30, fa: 30, ft: 10 })
    expect(r.msg).toBe('Wolf hits for 30 (fatigue 10%)')
    expect(r.knock).toEqual([{ lh: 0, pr: true }, 'Knocked prone!'])
    expect(r.line).toBe('Wolf hits Lyra for 30. Lyra falls!')
    expect(hitChanges(monster(), hero({ exh: true }), 1, true, {}, 5).knock).toEqual([{ lh: 0, pr: true }, 'Knocked prone!'])
    const small = hitChanges(hero(), hero({ hp: 30 }), 1, false, {}, 5)
    expect(small.msg).toBe('Lyra hits for 1')
    expect(small.knock).toBeUndefined()
    expect(hitChanges(hero(), monster({ hp: undefined }), 3, false, {}, 1).hp).toBe(0)
    expect(hitChanges(hero(), hero({ hp: undefined }), 3, false, {}, 1).hp).toBe(0)
  })
  it('the shared effect', () => {
    expect(fxEvent(hero(), monster(), { label: 'Fireball', rng: 6 }, 'hit', 40, true)).toEqual({
      a: 'c:a',
      t: 'e:w',
      k: 'fire',
      o: 'hit',
      d: 40,
      c: true,
      an: 'Lyra',
      tn: 'Wolf',
      l: 'Fireball',
      ha: false,
    })
  })
})

describe('push and throw', () => {
  const g = grid({ m: { w: 500, h: 400, cols: 10, walls: ['5,2'], ew: ['v,7,5'] } }, 'm')
  const none = () => false
  it('pushes one square away; walls stun; others block', () => {
    expect(pushResult(hero({ mx: 2, my: 2 }), monster({ mx: 3, my: 3 }), g, none)).toEqual({ kind: 'moved', x: 4, y: 4 })
    expect(pushResult(hero({ mx: 3, my: 2 }), monster({ mx: 4, my: 2 }), g, none)).toEqual({ kind: 'wall' })
    expect(pushResult(hero({ mx: 5, my: 5 }), monster({ mx: 6, my: 5 }), g, none)).toEqual({ kind: 'wall' }) // a wall edge
    expect(pushResult(hero({ mx: 8, my: 0 }), monster({ mx: 9, my: 0 }), g, none)).toEqual({ kind: 'wall' }) // off the map
    expect(pushResult(hero({ mx: 2, my: 2 }), monster({ mx: 3, my: 3 }), g, () => true)).toEqual({ kind: 'blocked' })
    expect(pushResult(hero({ mx: 2, my: 2 }), monster({ mx: 3, my: 3 }), null, none)).toEqual({ kind: 'wall' })
    expect(pushResult(monster({ mx: 0, my: 0, sz: 2 }), hero({ mx: 2, my: 2 }), g, none)).toEqual({ kind: 'moved', x: 3, y: 3 })
  })
  it('a thrown monster lands on the nearest free square around the target', () => {
    expect(throwLanding(monster({ mx: 4, my: 4 }), g, none)).toEqual([3, 3])
    expect(throwLanding(monster({ mx: 0, my: 0, sz: 2 }), g, (x, y) => x === 0 && y === 2)).toEqual([1, 2])
    expect(throwLanding(monster({ mx: 4, my: 4 }), g, () => true)).toBeNull()
    expect(throwLanding(monster({ mx: 9, my: 7 }), null, none)).toEqual([8, 6])
  })
})

describe('monster skills', () => {
  it('skills as attacks, harmless skills, and the area attack', () => {
    expect(skillAttack({ ab: 6 }, { n: 'Bite', d: '', r: 1, t: 's' }, 1, false)).toEqual({ label: 'Bite', rng: 1, dmg: '1d8', tb: 6, db: 0, cost: 0, po: 0, auto: false, heavy: true })
    expect(skillAttack({}, { n: 'Bite', d: '2d4', r: 1, t: 's' }, 1, true).tb).toBe(4)
    expect(['0', ' - ', 'None', ''].map((d) => harmlessSkill({ n: 'x', d, r: 1, t: 's' }))).toEqual([true, true, true, false])
    expect(harmlessSkill({ n: 'x', r: 1, t: 's' } as never)).toBe(false)
    expect(areaAttack({ dm: '1d6' })).toMatchObject({ dmg: '1d6+1d6', area: true, auto: true, rng: 99 })
    expect(areaAttack({}).dmg).toBe('1d8+1d8')
  })
})
