import { describe, expect, it } from 'vitest'
import { freshCinematics } from './cinematic'
import { enemyFieldChange, enemyPills, hpStep, linksTo, NEW_SKILL, newEnemy, randomKey, rankOf, skillFieldValue, type NewEnemyForm } from './enemies'

describe('enemyFieldChange', () => {
  const e = { name: 'Wolf', hp: 80, max: 100 }
  it('text fields keep their limits; an empty name keeps the old one', () => {
    expect(enemyFieldChange(e, 'name', 'x'.repeat(50))).toEqual({ name: 'x'.repeat(40) })
    expect(enemyFieldChange(e, 'name', '')).toEqual({ name: 'Wolf' })
    expect(enemyFieldChange(e, 'type', '')).toEqual({ type: '' })
    expect(enemyFieldChange(e, 'pl', 'y'.repeat(40))).toEqual({ pl: 'y'.repeat(30) })
    expect(enemyFieldChange(e, 'gt', 'z'.repeat(1000))).toEqual({ gt: 'z'.repeat(900) })
    expect(enemyFieldChange(e, 'dm', '2d6+2d6+2d6+2d6+2d6')).toEqual({ dm: '2d6+2d6+2d6+2d6+2d6'.slice(0, 20) })
  })
  it('choices are saved as picked', () => {
    expect(enemyFieldChange(e, 'nx', 'e2')).toEqual({ nx: 'e2' })
    expect(enemyFieldChange(e, 'th', '')).toEqual({ th: '' })
    expect(enemyFieldChange(e, 'rk', 'm')).toEqual({ rk: 'm' })
  })
  it('check boxes are 1 or 0', () => {
    expect(enemyFieldChange(e, 'sw', true)).toEqual({ sw: 1 })
    expect(enemyFieldChange(e, 'gv', false)).toEqual({ gv: 0 })
  })
  it('max HP is at least 1 and cuts HP down', () => {
    expect(enemyFieldChange(e, 'max', '50')).toEqual({ max: 50, hp: 50 })
    expect(enemyFieldChange(e, 'max', '200')).toEqual({ max: 200, hp: 80 })
    expect(enemyFieldChange(e, 'max', '0')).toEqual({ max: 1, hp: 1 })
    expect(enemyFieldChange({}, 'max', 'abc')).toEqual({ max: 1, hp: 0 })
  })
  it('size is 1 to 8', () => {
    expect([enemyFieldChange(e, 'sz', '0'), enemyFieldChange(e, 'sz', '12'), enemyFieldChange(e, 'sz', '3')]).toEqual([{ sz: 1 }, { sz: 8 }, { sz: 3 }])
  })
  it('other numbers default to 0', () => {
    expect(enemyFieldChange(e, 'pg', '75')).toEqual({ pg: 75 })
    expect(enemyFieldChange(e, 'ac', '')).toEqual({ ac: 0 })
    expect(enemyFieldChange(e, 'ab', '-2')).toEqual({ ab: -2 })
  })
})

describe('other enemy helpers', () => {
  it('HP buttons stay between 0 and max', () => {
    expect(hpStep({ hp: 80, max: 100 }, 50)).toEqual({ hp: 100 })
    expect(hpStep({ hp: 30, max: 100 }, -50)).toEqual({ hp: 0 })
    expect(hpStep({}, 10)).toEqual({ hp: 0 })
  })
  it('rank defaults by size', () => {
    expect([rankOf({}), rankOf({ sz: 4 }), rankOf({ sz: 4, rk: 'm' })]).toEqual(['n', 'u', 'm'])
  })
  const form = (f: Partial<NewEnemyForm>): NewEnemyForm => ({ name: '', type: '', size: '1', hp: '', speed: '', poise: '', ac: '', attack: '', damage: '', ...f })
  it('a new enemy needs a name and gets defaults', () => {
    expect(newEnemy(form({ name: '  ' }))).toBeNull()
    expect(newEnemy(form({ name: 'Imp', size: '' }))!.sz).toBe(1)
    expect(newEnemy(form({ name: ' Wolf ' }))).toEqual({ name: 'Wolf', type: 'Monster', x10: true, hp: 100, max: 100, sz: 1, spd: 6, bon: 0, pm: 0, po: 0, ac: 12, ab: 4, dm: '1d8', er: 1, ib: 0 })
    expect(newEnemy(form({ name: 'Troll', type: ' Giant ', size: '3', hp: '400', speed: '5', poise: '30', ac: '15', attack: '0', damage: ' 3d10 ' }))).toEqual({
      name: 'Troll',
      type: 'Giant',
      x10: true,
      hp: 400,
      max: 400,
      sz: 3,
      spd: 5,
      bon: 0,
      pm: 30,
      po: 30,
      ac: 15,
      ab: 0,
      dm: '3d10',
      er: 1,
      ib: 0,
    })
  })
  it('finds next-phase links to a sheet', () => expect(linksTo({ a: { nx: 'b' }, b: { nx: 'b' }, c: { nx: 'x' } }, 'b')).toEqual(['a']))
  it('status labels', () => {
    expect(enemyPills('w', { hp: 0, stun: true, sg: true }, { c: { mon: 'w', mt: 'climb' } })).toEqual(['Slain', 'Staggered', "Has a rider: can't hit them except with an area attack"])
    expect(enemyPills('w', { hp: 5, stun: true }, { c: { mon: 'w', mt: '' } })).toEqual(['Stunned'])
    expect(enemyPills('w', { hp: 5 }, {})).toEqual([])
  })
  it('skill fields', () => {
    expect([skillFieldValue('a', true), skillFieldValue('a', false), skillFieldValue('r', '0'), skillFieldValue('r', '4'), skillFieldValue('n', 'Bite')]).toEqual([1, 0, 1, 4, 'Bite'])
    expect(NEW_SKILL).toEqual({ n: 'New skill', d: '2d6', r: 1, t: 's', a: 0 })
  })
  it('random keys', () => {
    expect(randomKey('e', 6, () => 0.123456789)).toMatch(/^e[a-z0-9]{6}$/)
    expect(randomKey('s', 4)).toMatch(/^s[a-z0-9]{1,4}$/)
  })
})

describe('freshCinematics', () => {
  const cin = { t: 'x', n: 'A', k: 'e:a' }
  it('the first read only remembers', () => {
    const seen = new Set<string>()
    expect(freshCinematics({ a: { cin, ts: 1000 } }, seen, false, 'gm', 1000)).toEqual([])
    expect(seen.has('a')).toBe(true)
  })
  it('new entries from other devices within 20 s, the last 5, never twice', () => {
    const seen = new Set(['old'])
    const rolls = { old: { cin, ts: 1 }, a: { cin, ts: 990, by: 'p1' }, b: { cin, ts: 990, by: 'me' }, c: { cin, ts: -30000 }, d: { ev: 'x' } as never, e: null }
    expect(freshCinematics(rolls, seen, true, 'me', 1000)).toEqual([cin])
    expect(freshCinematics(rolls, seen, true, 'me', 1000)).toEqual([])
    const many = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`k${i}`, { cin: { ...cin, n: String(i) }, ts: 1000 }]))
    expect(freshCinematics(many, new Set(), true, 'me', 1000).map((c) => c.n)).toEqual(['3', '4', '5', '6', '7'])
    expect(freshCinematics({ z: { cin } }, new Set(), true, 'me', 1000)).toEqual([cin]) // no time: counts as 0, fresh within 20 s of 1000
  })
})
