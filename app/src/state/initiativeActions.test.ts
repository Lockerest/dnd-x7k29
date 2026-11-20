import { describe, expect, it } from 'vitest'
import type { Initiative } from '../logic/initiative'
import type { Sheet } from '../logic/sheet'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import { createGameStore, emptyTables, type Tables } from './store'

function setup(t: Partial<Tables>, role: 'gm' | 'player' = 'gm', me = 'gm') {
  const f = fakeDb()
  const s = createGameStore(() => f.db, () => 5, () => 0.5, () => {})
  s.getState().connect({ pin: 'p', role, me })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: { w: 500, h: 400 } }, cur: 'm', ...t })
  return { s, f }
}
const chars: Record<string, Sheet> = { a: { name: 'Lyra', hp: 10, maxHp: 10, st: 10, maxSt: 100, rg: 15, dex: 14 }, b: { name: 'Bram', hp: 10, maxHp: 10, st: 50, maxSt: 100, rg: 15 } }
const enemies: Record<string, Enemy> = { w: { name: 'Wolf', hp: 5, mx: 1, my: 1, ib: 2 }, o: { name: 'Ogre', hp: 5, mx: 2, my: 2, sg: true, pm: 9 } }
const evs = (f: ReturnType<typeof fakeDb>) => f.writes.flatMap((w) => ((w[2] as { ev?: string })?.ev ? [(w[2] as { ev: string }).ev] : []))
const rolling = (v: (number | null)[]): Initiative => ({ ph: 'roll', t: 0, r: 1, l: ['c:a', 'c:b', 'e:w', 'e:o'].map((k, i) => ({ k, v: v[i] ?? null })) })

describe('initiative actions', () => {
  it('starts initiative (combat pauses) and rolls the monsters that have not rolled', async () => {
    const { s, f } = setup({ chars, enemies, combat: true })
    await s.getState().startInitiative()
    expect(f.writes.slice(0, 2)).toEqual([
      ['PUT', 'init', rolling([])],
      ['PUT', 'combat', false],
    ])
    expect(evs(f)).toEqual(['Initiative! Everyone roll to see who goes first.'])
    s.getState().applySnapshot({ ...s.getState().tables, ini: rolling([null, null, 3, null]) })
    await s.getState().rollMonsters()
    expect(f.writes.slice(3)).toEqual([['PATCH', 'init/l/3', { v: 11 }]])
  })

  it('the GM rolls a monster, a player rolls their own hero with shared dice; others are ignored', async () => {
    const gm = setup({ chars, enemies, ini: rolling([]) })
    await gm.s.getState().rollInitiative(2)
    expect(gm.f.writes[0]).toEqual(['PATCH', 'init/l/2', { v: 13 }])
    expect(evs(gm.f)).toEqual(['Wolf rolls initiative'])
    await gm.s.getState().rollInitiative(0) // the GM does not roll for heroes
    await gm.s.getState().rollInitiative(9)
    expect(gm.f.writes).toHaveLength(2)

    const pl = setup({ chars, enemies, ini: rolling([]) }, 'player', 'a')
    await pl.s.getState().rollInitiative(0)
    expect(pl.f.writes.map((w) => w[1])).toEqual(['rolls', 'init/l/0', 'rolls'])
    expect(pl.f.writes[1]![2]).toEqual({ v: 13 })
    expect(evs(pl.f)).toEqual(['Lyra rolls initiative: 13'])
    for (const i of [1, 2, 0]) await pl.s.getState().rollInitiative(i) // not mine, a monster, already rolled
    expect(pl.f.writes).toHaveLength(3)
    const none = setup({ chars })
    await none.s.getState().rollInitiative(0)
    await none.s.getState().rollMonsters()
    expect(none.f.writes).toEqual([])
  })

  it('a player without a session cannot roll', async () => {
    const { s, f } = setup({ chars, enemies, ini: rolling([]) }, 'player', 'a')
    const t = s.getState().tables
    s.getState().disconnect()
    s.getState().applySnapshot(t)
    await s.getState().rollInitiative(0)
    expect(f.writes).toEqual([])
  })

  it('begins combat once everyone has rolled', async () => {
    const { s, f } = setup({ chars, enemies, ini: rolling([5, null, 9, 2]) })
    await s.getState().beginCombat()
    expect(f.writes).toEqual([])
    s.getState().applySnapshot({ ...s.getState().tables, ini: rolling([5, 7, 9, 2]) })
    await s.getState().beginCombat()
    expect(f.writes[0]![2]).toMatchObject({ ph: 'go', l: [{ k: 'e:w' }, { k: 'c:b' }, { k: 'c:a' }, { k: 'e:o' }] })
    expect(f.writes[1]).toEqual(['PUT', 'combat', true])
    expect(evs(f)).toEqual(['Combat begins! Wolf goes first.'])
    expect(s.getState().tables.combat).toBe(true)
    await s.getState().beginCombat() // already going
    expect(f.writes).toHaveLength(3)
    const empty = setup({ chars, enemies, ini: { ph: 'roll', t: 0, r: 1, l: [{ k: 'e:gone', v: null }] } })
    await empty.s.getState().beginCombat()
    expect(evs(empty.f)).toEqual(['Combat begins! '])
  })

  const going = (t: number): Initiative => ({ ph: 'go', t, r: 1, l: [{ k: 'c:a', v: 9 }, { k: 'e:w', v: 5 }, { k: 'c:b', v: 1 }] })

  it("passes turns; a new round gives everyone their start of turn and staggered monsters recover", async () => {
    const { s, f } = setup({ chars, enemies, ini: going(0) })
    await s.getState().passTurn()
    expect(f.writes).toEqual([
      ['PUT', 'init', going(1)],
      ['POST', 'rolls', { ev: "It's Wolf's turn", ts: 5 }],
    ])
    s.getState().applySnapshot({ ...s.getState().tables, ini: going(2) })
    await s.getState().passTurn()
    expect(f.writes.slice(2).map((w) => w[1])).toEqual(['chars/a', 'chars/b', 'enemies/o', 'init', 'rolls'])
    expect(evs(f).at(-1)).toBe("Round 2. It's Lyra's turn")
  })

  it("a player ends only their own turn, and not the round's last; nothing outside combat", async () => {
    const mine = setup({ chars, enemies, ini: going(0) }, 'player', 'a')
    await mine.s.getState().passTurn()
    expect(mine.f.writes.map((w) => w[1])).toEqual(['init', 'rolls'])
    const notMine = setup({ chars, enemies, ini: going(1) }, 'player', 'a')
    await notMine.s.getState().passTurn()
    const last = setup({ chars, enemies, ini: going(2) }, 'player', 'b')
    await last.s.getState().passTurn()
    const none = setup({ chars, enemies })
    await none.s.getState().passTurn()
    const gone = setup({ chars: { a: chars.a! }, enemies: {}, ini: { ph: 'go', t: 0, r: 1, l: [{ k: 'c:a', v: 1 }, { k: 'e:x', v: 1 }] } })

    await gone.s.getState().passTurn()
    expect([...notMine.f.writes, ...last.f.writes, ...none.f.writes]).toEqual([])
    expect(evs(gone.f)).toEqual(["Round 2. It's Lyra's turn"])
  })

  it('no line when nobody is left in the order; a player without a session cannot pass', async () => {
    const { s, f } = setup({ chars, enemies, ini: { ph: 'go', t: 0, r: 1, l: [{ k: 'e:gone', v: 1 }] } })
    await s.getState().passTurn()
    expect(f.writes.map((w) => w[1])).toEqual(['chars/a', 'chars/b', 'enemies/o', 'init']) // a new round, but no one's turn to announce
    const pl = setup({ chars, enemies, ini: going(0) }, 'player', 'a')
    const t = pl.s.getState().tables
    pl.s.getState().disconnect()
    pl.s.getState().applySnapshot(t)
    await pl.s.getState().passTurn()
    expect(pl.f.writes).toEqual([])
  })

  it('ends combat', async () => {
    const { s, f } = setup({ chars, enemies, ini: going(1), combat: true })
    await s.getState().endCombat()
    expect(f.writes).toEqual([
      ['DELETE', 'init', null],
      ['PUT', 'combat', false],
      ['POST', 'rolls', { ev: 'Combat ends', ts: 5 }],
    ])
    expect(s.getState().tables).toMatchObject({ ini: null, combat: false })
  })
})
