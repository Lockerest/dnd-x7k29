import { describe, expect, it } from 'vitest'
import { allRolled, beginCombat, canEndTurn, heroInitiativeBonus, monsterInitiative, nextTurn, startInitiative, turnLine, unitOf, type Initiative } from './initiative'
import type { Sheet } from './sheet'
import type { Enemy } from './types'

const chars: Record<string, Sheet> = { a: { name: 'Lyra', hp: 10 }, b: { name: 'Bram', hp: 0 }, c: { name: 'Cid', hp: 5, ap: false }, d: { name: 'Dee', hp: 5, mp: 'n' } }
const enemies: Record<string, Enemy> = { w: { name: 'Wolf', hp: 5, mx: 1, my: 1 }, x: { name: 'Off', hp: 5 }, y: { name: 'Held', hp: 5, mx: 1, my: 1, hd: 'c:a' }, z: { name: 'Dead', hp: 0, mx: 2, my: 2 }, v: { name: 'Far', hp: 5, mx: 1, my: 1, mp: 'n' } }

describe('initiative', () => {
  it('finds units', () => {
    expect(unitOf(chars, enemies, 'c:a')).toEqual({ e: false, id: 'a', o: chars.a, key: 'c:a' })
    expect(unitOf(chars, enemies, 'e:w')).toMatchObject({ e: true, id: 'w' })
    expect(unitOf(chars, enemies, 'e:gone')).toBeNull()
    expect(unitOf(chars, enemies, null)).toBeNull()
  })

  it('starts with living heroes and placed, free, living monsters on the live map', () => {
    expect(startInitiative(chars, enemies, 'm')).toEqual({ ph: 'roll', t: 0, r: 1, l: [{ k: 'c:a', v: null }, { k: 'e:w', v: null }] })
    expect(startInitiative(chars, enemies, 'n').l.map((u) => u.k)).toEqual(['c:a', 'c:d', 'e:w', 'e:v'])
  })

  it('rolls: monsters d20 + bonus, heroes add their DEX modifier', () => {
    expect(monsterInitiative({ ib: 3 }, () => 0.99)).toBe(23)
    expect(monsterInitiative({}, () => 0)).toBe(1)
    expect(heroInitiativeBonus({ dex: 16 })).toBe(3)
    expect(heroInitiativeBonus({})).toBe(0)
  })

  const ini: Initiative = { ph: 'roll', t: 0, r: 1, l: [{ k: 'c:a', v: 4 }, { k: 'e:w', v: 9 }, { k: 'e:gone', v: null }, { k: 'c:d', v: 4 }] }
  it('everyone still here has rolled; begin sorts highest first, drops the gone, and breaks ties randomly', () => {
    expect(allRolled(ini, chars, enemies)).toBe(true)
    expect(allRolled({ ...ini, l: [...ini.l, { k: 'c:b', v: null }] }, chars, enemies)).toBe(false)
    expect(beginCombat(ini, chars, enemies, () => 0.1).l.map((u) => u.k)).toEqual(['e:w', 'c:d', 'c:a'])
    expect(beginCombat(ini, chars, enemies, () => 0.9)).toEqual({ ph: 'go', t: 0, r: 1, l: [{ k: 'e:w', v: 9 }, { k: 'c:a', v: 4 }, { k: 'c:d', v: 4 }] })
  })

  const go: Initiative = { ph: 'go', t: 0, r: 2, l: [{ k: 'c:a', v: 9 }, { k: 'c:b', v: 8 }, { k: 'e:gone', v: 7 }, { k: 'e:w', v: 6 }] }
  it('passes the turn to the next living unit, starting a new round when it wraps', () => {
    expect(nextTurn(go, chars, enemies)).toEqual({ ini: { ...go, t: 3 }, wrapped: false })
    expect(nextTurn({ ...go, t: 3 }, chars, enemies)).toEqual({ ini: { ...go, t: 0, r: 3 }, wrapped: true })
    const allDead = { ...go, l: [{ k: 'c:b', v: 1 }] }
    expect(nextTurn(allDead, chars, enemies)).toEqual({ ini: { ...allDead, t: 0, r: 3 }, wrapped: true })
    expect(turnLine(go, true, 'Lyra')).toBe("Round 2. It's Lyra's turn")
    expect(turnLine(go, false, 'Lyra')).toBe("It's Lyra's turn")
  })

  it('a hero ends their own turn, except the last of the round (the GM can always)', () => {
    expect(canEndTurn(go, 'a', false)).toBe(true)
    expect(canEndTurn(go, 'b', false)).toBe(false)
    expect(canEndTurn({ ...go, t: 3, l: [...go.l.slice(0, 3), { k: 'c:a', v: 1 }] }, 'a', false)).toBe(false)
    expect(canEndTurn({ ...go, t: 3, l: [...go.l.slice(0, 3), { k: 'c:a', v: 1 }] }, 'a', true)).toBe(true)
    expect(canEndTurn({ ...go, ph: 'roll' }, 'a', true)).toBe(false)
    expect(canEndTurn({ ...go, t: 9 }, 'a', true)).toBe(false)
    expect(canEndTurn(null, 'a', true)).toBe(false)
  })
})
