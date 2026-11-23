import { describe, expect, it } from 'vitest'
import { abilityCost, spend, startTurn } from './stamina'

const base = { st: 30, rg: 20, maxSt: 100 }

describe('startTurn', () => {
  it('regains stamina and resets per-turn flags', () => {
    const [p, msg] = startTurn(base)
    expect(msg).toBe('New round')
    expect(p).toEqual({ used: 0, mvd: 0, exh: false, pr: false, lh: 0, stn: false, ddg: false, pry: false, ctr: false, st: 50 })
  })
  it('no stamina back after a turn with an ability', () => {
    const [p, msg] = startTurn({ ...base, ua: true })
    expect(p.st).toBe(base.st)
    expect(p.ua).toBe(false)
    expect(msg).toBe('New round (no stamina back: used an ability last turn)')
  })
  it('never goes past max', () => expect(startTurn({ ...base, st: 90 })[0].st).toBe(100))
  it('climbing drains 40', () => {
    const [p, msg] = startTurn({ ...base, mt: 'climb' })
    expect(p.st).toBe(10)
    expect(msg).toBe('Climbing (-40 St)')
  })
  it('falling off when climbing runs out', () => {
    const [p, msg] = startTurn({ ...base, st: 10, mt: 'climb', mon: 'e1' })
    expect(p).toMatchObject({ st: 0, mt: '', mon: null, exh: true })
    expect(msg).toBe('Drained while climbing: fell off, exhausted!')
  })
  it('exactly 0 while climbing also falls', () => expect(startTurn({ ...base, st: 20, mt: 'climb' })[0].exh).toBe(true))
  it('exhaustion counts down from 2 by default', () => {
    const [p, msg] = startTurn({ ...base, exh: true })
    expect(p).toMatchObject({ exh: true, exn: 1 })
    expect(msg).toBe('Still exhausted (1 round left)')
  })
  it('plural rounds', () => expect(startTurn({ ...base, exh: true, exn: 4 })[1]).toBe('Still exhausted (3 rounds left)'))
  it('the last exhausted round clears it', () => expect(startTurn({ ...base, exh: true, exn: 1 })[0]).toMatchObject({ exh: false, exn: 0 }))
  it('stun or exhaustion cancels a charged ability', () => {
    expect(startTurn({ ...base, stn: true, chg: 'Ember Burst' })[0].chg).toBeNull()
    expect(startTurn({ ...base, exh: true, chg: 'Ember Burst' })[0].chg).toBeNull()
    expect('chg' in startTurn({ ...base, chg: 'Ember Burst' })[0]).toBe(false)
  })
})

describe('abilityCost', () => {
  it('is cost x SC', () => {
    expect(abilityCost({}, 2)).toBe(20)
    expect(abilityCost({}, 0)).toBe(0)
  })
  it('+15% per death, max 3', () => expect([0, 1, 2, 3, 9].map((dth) => abilityCost({ dth }, 2))).toEqual([20, 23, 26, 29, 29]))
})

describe('spend', () => {
  it('pays', () => expect(spend({ st: 50 }, 2, 'Power Strike')).toEqual([{ st: 30 }, 'Power Strike (-20 St)']))
  it('free actions', () => expect(spend({ st: 50 }, 0, 'Brace')).toEqual([{ st: 50 }, 'Brace']))
  it('exactly everything is fine', () => expect(spend({ st: 20 }, 2, 'X')[0]).toEqual({ st: 0 }))
  it('overspending exhausts', () => expect(spend({ st: 10 }, 2, 'Power Strike')).toEqual([{ st: 0, exh: true, mt: '', mon: null }, 'Power Strike (-20 St) - out of stamina: EXHAUSTED']))
})
