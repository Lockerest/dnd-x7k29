import { describe, expect, it } from 'vitest'
import { ACCESSORIES, gearBonus, idList, weaponTier, worn } from '../data/gear'
import { giveChange, takeChange, wearChange } from './gear'
import { saveBonus } from '../state/attackActions'
import { attackInfo } from './combat'
import { drinkFlask, type Sheet } from './sheet'

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', hp: 100, maxHp: 140, st: 50, maxSt: 100, rg: 20, ac: 14, fl: 2, maxFl: 3, ...o }) as Sheet

describe('signature weapons', () => {
  it('tiers 1 to 4, tier 1 when unset or out of range', () => {
    expect(weaponTier({})).toMatchObject({ t: 1, light: '1d6', heavy: '1d10' })
    expect(weaponTier({ wt: 2 })).toMatchObject({ light: '1d8', heavy: '2d6' })
    expect(weaponTier({ wt: '4' })).toMatchObject({ light: '1d12', heavy: '2d10' })
    expect(weaponTier({ wt: 9 }).t).toBe(4)
    expect(weaponTier({ wt: -3 }).t).toBe(1)
  })
})

describe('accessories', () => {
  it('reads the bag and the worn slots, ignoring unknown ids', () => {
    expect(idList('ring_parry,zz,am_hearth')).toEqual(['ring_parry', 'am_hearth'])
    expect(idList(undefined)).toEqual([])
    expect(worn({ a1: 'ring_parry', a2: 'zz' })).toEqual(['ring_parry'])
    expect(gearBonus({ a1: 'ring_parry', a2: 'ring_dodge' }, 'pry')).toBe(1)
    expect(gearBonus({ a1: 'ring_ember' }, 'pry')).toBe(0)
    expect(Object.values(ACCESSORIES).every((a) => a.n && a.text && (a.kind === 'ring' || a.kind === 'amulet'))).toBe(true)
  })

  it('wearing applies the sheet effects, taking off takes them back', () => {
    const c = hero({ ao: 'ring_blood,ring_lung,ring_breath,ring_iron,am_hearth,ring_parry' })
    expect(wearChange(c, 'a1', 'ring_blood')).toEqual([{ a1: 'ring_blood', maxHp: 160, hp: 120 }, 'Put on Bloodstone Band'])
    expect(wearChange(c, 'a1', 'ring_lung')![0]).toEqual({ a1: 'ring_lung', maxSt: 120, st: 70 })
    expect(wearChange(c, 'a1', 'ring_breath')![0]).toEqual({ a1: 'ring_breath', rg: 25 })
    expect(wearChange(c, 'a1', 'ring_iron')![0]).toEqual({ a1: 'ring_iron', ac: 15 })
    expect(wearChange(c, 'a2', 'am_hearth')![0]).toEqual({ a2: 'am_hearth', maxFl: 4, fl: 3 })
    expect(wearChange(c, 'a2', 'ring_parry')![0]).toEqual({ a2: 'ring_parry' })
    // Swapping one for another moves only by the difference; taking off reverses.
    const on = hero({ ao: c.ao, a1: 'ring_blood', maxHp: 160, hp: 160 })
    expect(wearChange(on, 'a1', null)).toEqual([{ a1: null, maxHp: 140, hp: 140 }, 'Took off Bloodstone Band'])
    expect(wearChange(hero({ ao: c.ao, a1: 'ring_lung', maxSt: 120, st: 120 }), 'a1', 'ring_blood')![0]).toEqual({ a1: 'ring_blood', maxHp: 160, hp: 120, maxSt: 100, st: 100 })
    // Missing numbers count from defaults.
    expect(wearChange({ name: 'X', ao: 'ring_iron,ring_breath,ring_lung,am_hearth' } as Sheet, 'a1', 'ring_iron')![0]).toEqual({ a1: 'ring_iron', ac: 11 })
    expect(wearChange({ name: 'X', ao: 'ring_breath' } as Sheet, 'a1', 'ring_breath')![0]).toEqual({ a1: 'ring_breath', rg: 5 })
    expect(wearChange({ name: 'X', ao: 'ring_lung' } as Sheet, 'a1', 'ring_lung')![0]).toEqual({ a1: 'ring_lung', maxSt: 20, st: 20 })
    expect(wearChange({ name: 'X', ao: 'am_hearth' } as Sheet, 'a1', 'am_hearth')![0]).toEqual({ a1: 'am_hearth', maxFl: 1, fl: 1 })
  })

  it('rings and amulets in the rolls: parry and dodge bonus, flasks, and the weapon tier in basic attacks', () => {
    expect(saveBonus({ str: 14, dex: 16, a1: 'ring_parry', a2: 'ring_dodge' }, 'parry')).toBe(3)
    expect(saveBonus({ str: 14, dex: 16, a1: 'ring_parry', a2: 'ring_dodge' }, 'dodge')).toBe(4)
    expect(drinkFlask(hero({ hp: 10, maxHp: 140, fl: 1 }))![0]).toEqual({ fl: 0, hp: 66 })
    expect(drinkFlask(hero({ hp: 10, maxHp: 140, fl: 1, a2: 'am_pilgrim' }))![0]).toEqual({ fl: 0, hp: 80 })
    const u = (wt?: number) => ({ e: false, id: 'a', o: { name: 'A', cls: 'fighter', str: 16, level: 1, wt } }) as never
    expect([attackInfo(u(), 'l').dmg, attackInfo(u(), 'h').dmg]).toEqual(['1d6', '1d10'])
    expect([attackInfo(u(4), 'l').dmg, attackInfo(u(4), 'h').dmg]).toEqual(['1d12', '2d10'])
    // An accessory with no sheet effect (GM-applied) just goes in the slot.
    expect(wearChange(hero({ ao: 'ring_ember' }), 'a1', 'ring_ember')).toEqual([{ a1: 'ring_ember' }, 'Put on Ember-Eater Ring'])
  })

  it('only what is in the bag, never the same one twice, nothing when unchanged', () => {
    const c = hero({ ao: 'ring_parry', a1: 'ring_parry' })
    expect(wearChange(c, 'a1', 'ring_parry')).toBeNull()
    expect(wearChange(c, 'a2', 'ring_parry')).toBeNull()
    expect(wearChange(c, 'a2', 'ring_dodge')).toBeNull()
    expect(wearChange(c, 'a2', null)).toBeNull()
  })

  it('the GM gives and takes back (taking off first)', () => {
    expect(giveChange(hero(), 'ring_parry')).toEqual([{ ao: 'ring_parry' }, 'Received Duelist’s Signet'])
    expect(giveChange(hero({ ao: 'ring_parry' }), 'am_hearth')![0]).toEqual({ ao: 'ring_parry,am_hearth' })
    expect(giveChange(hero({ ao: 'ring_parry' }), 'ring_parry')).toBeNull()
    expect(giveChange(hero(), 'zz')).toBeNull()
    const c = hero({ ao: 'ring_blood,ring_parry', a2: 'ring_blood', maxHp: 160, hp: 160 })
    expect(takeChange(c, 'ring_blood')).toEqual([{ a2: null, maxHp: 140, hp: 140, ao: 'ring_parry' }, 'Gave back Bloodstone Band'])
    expect(takeChange(hero({ ao: 'ring_parry', a1: 'ring_parry' }), 'ring_parry')![0]).toEqual({ a1: null, ao: null })
    expect(takeChange(hero({ ao: 'ring_parry' }), 'ring_parry')![0]).toEqual({ ao: null })
    expect(takeChange(hero(), 'ring_parry')).toBeNull()
  })
})
