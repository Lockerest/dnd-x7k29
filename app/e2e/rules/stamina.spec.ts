// Stamina, exhaustion, climbing and ability costs (turn, spend, cst).
// SC = 10: every table value is multiplied by ten on the sheet.
import { expect, test } from '../harness.ts'

type TurnResult = [Record<string, unknown>, string]

test.describe('turn(): start of a character turn', () => {
  test('regains stamina and resets the per-turn flags', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('turn({st:30,rg:20,maxSt:100,used:2,mvd:3,pr:true,lh:1})')
    expect(msg).toBe('New round')
    expect(p).toMatchObject({ st: 50, used: 0, mvd: 0, exh: false, pr: false, lh: 0, stn: false, ddg: false, pry: false, ctr: false })
  })

  test('never regains past the maximum', async ({ legacy }) => {
    const [p] = await legacy.run<TurnResult>('turn({st:90,rg:20,maxSt:100})')
    expect(p.st).toBe(100)
  })

  test('climbing drains 4 x SC stamina per turn', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('turn({st:30,rg:20,maxSt:100,mt:"climb"})')
    expect(p.st).toBe(10)
    expect(msg).toBe('Climbing (-40 St)')
  })

  test('running out while climbing makes you fall off and become exhausted', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('turn({st:10,rg:20,maxSt:100,mt:"climb",mon:"e1"})')
    expect(p).toMatchObject({ st: 0, mt: '', mon: null, exh: true })
    expect(msg).toBe('Drained while climbing: fell off, exhausted!')
  })

  test('exhaustion counts down, two rounds by default', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('turn({st:0,rg:20,maxSt:100,exh:true})')
    expect(p).toMatchObject({ exh: true, exn: 1 })
    expect(msg).toBe('Still exhausted (1 round left)')
  })

  test('uses plural rounds when more than one is left', async ({ legacy }) => {
    const [, msg] = await legacy.run<TurnResult>('turn({st:0,rg:20,maxSt:100,exh:true,exn:4})')
    expect(msg).toBe('Still exhausted (3 rounds left)')
  })

  test('the last exhausted round clears exhaustion', async ({ legacy }) => {
    const [p] = await legacy.run<TurnResult>('turn({st:0,rg:20,maxSt:100,exh:true,exn:1})')
    expect(p).toMatchObject({ exh: false, exn: 0 })
  })

  test('a stunned or exhausted character loses a charged attack', async ({ legacy }) => {
    const [stunned] = await legacy.run<TurnResult>('turn({st:0,rg:20,maxSt:100,stn:true,chg:"Ember Burst"})')
    const [fresh] = await legacy.run<TurnResult>('turn({st:0,rg:20,maxSt:100,chg:"Ember Burst"})')
    expect(stunned.chg).toBeNull()
    expect('chg' in fresh).toBe(false)
  })
})

test.describe('cst(): ability cost in stamina', () => {
  test('is the table cost x SC', async ({ legacy }) => {
    expect(await legacy.run('cst({},2)')).toBe(20)
    expect(await legacy.run('cst({},0)')).toBe(0)
  })
  test('rises 15% per death, capped at three deaths', async ({ legacy }) => {
    expect(await legacy.run('cst({dth:1},2)')).toBe(23)
    expect(await legacy.run('cst({dth:2},2)')).toBe(26)
    expect(await legacy.run('cst({dth:3},2)')).toBe(29)
    expect(await legacy.run('cst({dth:9},2)')).toBe(29)
  })
})

test.describe('spend(): paying for an action', () => {
  test('takes the stamina and labels the cost', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('spend({st:50},2,"Power Strike")')
    expect(p).toEqual({ st: 30 })
    expect(msg).toBe('Power Strike (-20 St)')
  })
  test('free actions do not mention a cost', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('spend({st:50},0,"Brace")')
    expect(p).toEqual({ st: 50 })
    expect(msg).toBe('Brace')
  })
  test('spending exactly everything is allowed and not exhausting', async ({ legacy }) => {
    const [p] = await legacy.run<TurnResult>('spend({st:20},2,"Power Strike")')
    expect(p).toEqual({ st: 0 })
  })
  test('overspending empties stamina and exhausts', async ({ legacy }) => {
    const [p, msg] = await legacy.run<TurnResult>('spend({st:10,mt:"climb",mon:"e1"},2,"Power Strike")')
    expect(p).toEqual({ st: 0, exh: true, mt: '', mon: null })
    expect(msg).toBe('Power Strike (-20 St) - out of stamina: EXHAUSTED')
  })
})

test.describe('small helpers', () => {
  test('clamp keeps values between 0 and the max', async ({ legacy }) => {
    expect(await legacy.run('[clamp(150,100),clamp(-5,100),clamp(40,100)]')).toEqual([100, 0, 40])
  })
  test('mod is the 5E ability modifier (missing scores count as 10)', async ({ legacy }) => {
    expect(await legacy.run('[mod(10),mod(8),mod(15),mod(20),mod(1),mod(undefined)]')).toEqual([0, -1, 2, 5, -5, 0])
  })
  test('prof is the 5E proficiency bonus by level', async ({ legacy }) => {
    expect(await legacy.run('[1,4,5,8,9,13,17,20].map(l=>prof({level:l}))')).toEqual([2, 2, 3, 3, 4, 5, 6, 6])
    expect(await legacy.run('prof({})')).toBe(2)
  })
  test('bonusOf reads the level or an ability modifier', async ({ legacy }) => {
    expect(await legacy.run('[bonusOf({level:7},"level"),bonusOf({int:16},"int"),bonusOf({},"luck")]')).toEqual([7, 3, 0])
  })
})
