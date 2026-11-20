// Max HP after deaths and fatigue (effMax), fatigue from damage (fatPatch) and
// the HP cost of desperate abilities (hcPatch).
import { expect, test } from '../harness.ts'

test.describe('effMax(): max HP after deaths and fatigue', () => {
  test('is the base with no deaths or fatigue', async ({ legacy }) => {
    expect(await legacy.run('effMax(100,0,0)')).toBe(100)
  })
  test('loses 10% per death, up to three deaths', async ({ legacy }) => {
    expect(await legacy.run('[1,2,3,5].map(d=>effMax(100,d,0))')).toEqual([90, 80, 70, 70])
  })
  test('loses 1% per fatigue level, up to ten', async ({ legacy }) => {
    expect(await legacy.run('[1,4,10,15].map(f=>effMax(100,0,f))')).toEqual([99, 96, 90, 90])
  })
  test('stacks both and never drops below 5', async ({ legacy }) => {
    expect(await legacy.run('effMax(100,3,10)')).toBe(60)
    expect(await legacy.run('effMax(4,3,10)')).toBe(5)
  })
  test('treats missing values as zero', async ({ legacy }) => {
    expect(await legacy.run('effMax(140)')).toBe(140)
  })
})

test.describe('fatPatch(): fatigue from damage taken', () => {
  test('only adds to the damage tally below the next 10% step', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:100},5,95)')).toEqual({ fa: 5 })
  })
  test('each 10% of base HP taken adds a fatigue level and lowers max HP', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:100},25,75)')).toEqual({ fa: 25, ft: 2, bmh: 100, maxHp: 98, hp: 75 })
  })
  test('current HP is cut down to the new max', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:100,fa:9},1,99)')).toEqual({ fa: 10, ft: 1, bmh: 100, maxHp: 99, hp: 99 })
    expect(await legacy.run('fatPatch({maxHp:100,fa:19},1,100)')).toMatchObject({ ft: 2, maxHp: 98, hp: 98 })
  })
  test('fatigue caps at 10 levels', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:100},500,0)')).toMatchObject({ ft: 10, maxHp: 90 })
  })
  test('keeps using the original base HP once max HP has dropped', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:98,bmh:100,fa:25,ft:2},5,60)')).toMatchObject({ ft: 3, bmh: 100, maxHp: 97 })
  })
  test('stacks with deaths', async ({ legacy }) => {
    expect(await legacy.run('fatPatch({maxHp:90,bmh:100,dth:1},10,50)')).toMatchObject({ ft: 1, maxHp: 89 })
  })
})

test.describe('hcPatch(): HP cost of an ability', () => {
  test('does nothing for abilities without an HP cost', async ({ legacy }) => {
    expect(await legacy.run('hcPatch({hp:50,maxHp:100},"Nothing")')).toEqual({})
  })
  test('takes a % of base HP and counts it as fatigue damage', async ({ legacy }) => {
    expect(await legacy.run('(HC["Blood Pact"]=10,hcPatch({hp:50,maxHp:100},"Blood Pact"))')).toEqual({
      hp: 40,
      fa: 10,
      ft: 1,
      bmh: 100,
      maxHp: 99,
    })
  })
  test('can never take the last hit point', async ({ legacy }) => {
    expect(await legacy.run('(HC["Blood Pact"]=50,hcPatch({hp:20,maxHp:100},"Blood Pact"))')).toMatchObject({ hp: 1 })
    expect(await legacy.run('(HC["Blood Pact"]=10,hcPatch({hp:1,maxHp:100},"Blood Pact"))')).toEqual({})
  })
})

test.describe('migrate(): old sheets move to the x10 scale once', () => {
  test('multiplies HP, stamina and poise by SC and marks the sheet', async ({ legacy }) => {
    await legacy.run('chars={c1:{name:"Old",hp:12,maxHp:14,st:10,maxSt:10,rg:2}};enemies={e1:{name:"Old wolf",hp:5,max:5,pm:3}};migrate()')
    expect(await legacy.run('[chars.c1.hp,chars.c1.maxHp,chars.c1.st,chars.c1.rg,chars.c1.x10]')).toEqual([120, 140, 100, 20, true])
    expect(await legacy.run('[enemies.e1.hp,enemies.e1.max,enemies.e1.pm,enemies.e1.x10]')).toEqual([50, 50, 30, true])
  })
  test('never scales a sheet twice', async ({ legacy }) => {
    await legacy.run('chars={c1:{name:"New",hp:120,maxHp:140,x10:true}};migrate();migrate()')
    expect(await legacy.run('chars.c1.hp')).toBe(120)
  })
})
