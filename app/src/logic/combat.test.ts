import { describe, expect, it } from 'vitest'
import { adjacent, attackInfo, effectKind, elementOf, gap, isHeavy, poiseHit, recover } from './combat'

describe('effectKind', () => {
  it.each([
    ['Shield Bash', false, 1, 'bash'],
    ['Ember Burst', false, 4, 'fire'],
    ['Firebolt', false, 6, 'fire'],
    ['Frostbite Cleave', true, 2, 'ice'],
    ['Chain Lightning', false, 3, 'bolt'],
    ['Piercing Shot', false, 6, 'arrow'],
    ['Venom Spit', false, 2, 'poison'],
    ['THUNDER SLAM', false, 1, 'bash'],
    ['Heavy attack', true, 1, 'heavy'],
    ['Light attack', false, 1, 'slash'],
    ['Light attack', false, 3, 'arrow'],
    [undefined, false, 1, 'slash'],
  ] as const)('%s (heavy %s, range %i) -> %s', (l, h, r, k) => expect(effectKind(l, h, r)).toBe(k))
})

describe('elementOf', () => {
  it('only elements', () => {
    expect(['Ember Burst', 'Frost Arrow', 'Shield Bash', 'Triple Volley', '', 'Venom', 'Spark'].map(elementOf)).toEqual(['fire', 'ice', null, null, null, 'poison', 'bolt'])
    expect(elementOf(undefined)).toBeNull()
  })
})

describe('isHeavy', () => {
  it('fighters by default, sheet override wins', () => {
    expect([isHeavy({ cls: 'fighter' }), isHeavy({ cls: 'mage' }), isHeavy({ cls: 'fighter', ha: false }), isHeavy({ ha: 1 }), isHeavy(null)]).toEqual([true, false, false, true, false])
  })
})

describe('attackInfo', () => {
  it('enemy attacks', () => {
    const o = { dm: '2d6', er: 2, ab: 5 }
    expect(attackInfo({ e: true, o }, 'l')).toEqual({ label: 'Light attack', rng: 2, dmg: '2d6', tb: 5, db: 0, cost: 0, po: 1 })
    expect(attackInfo({ e: true, o }, 'h')).toEqual({ label: 'Heavy attack', rng: 2, dmg: '2d6+2d6', tb: 5, db: 0, cost: 0, po: 3, heavy: true })
  })
  it('enemy defaults', () => expect(attackInfo({ e: true, o: {} }, 'l')).toMatchObject({ dmg: '1d8', rng: 1, tb: 4 }))
  it('enemy attack bonus 0 is kept', () => expect(attackInfo({ e: true, o: { ab: 0 } }, 'l').tb).toBe(0))
  it('player attacks use proficiency, class stat and reach', () => {
    const c = { cls: 'archer', level: 5, dex: 16 }
    expect(attackInfo({ e: false, o: c }, 'l')).toEqual({ label: 'Light attack', rng: 8, dmg: '1d6', tb: 6, db: 3, cost: 0, cs: 0, po: 1 })
    expect(attackInfo({ e: false, o: c }, 'h')).toEqual({ label: 'Heavy attack', rng: 8, dmg: '1d10', tb: 6, db: 3, cost: 1, cs: 10, po: 3, heavy: true })
  })
  it('unknown classes use STR and reach 1', () => expect(attackInfo({ e: false, o: { cls: 'bard', str: 14 } }, 'l')).toMatchObject({ rng: 1, tb: 4, db: 2 }))
})

describe('gap and adjacent', () => {
  const A = { e: false, o: { mx: 0, my: 0 } }
  it('edges', () => {
    expect(gap(A, { e: false, o: { mx: 3, my: 0 } })).toBe(3)
    expect(gap(A, { e: false, o: { mx: 1, my: 1 } })).toBe(1)
    expect(gap(A, { e: false, o: { mx: 0, my: 0 } })).toBe(1)
    expect(gap(A, { e: false, o: { mx: 0, my: -4 } })).toBe(4)
  })
  it('large enemies', () => {
    expect(gap(A, { e: true, o: { mx: 3, my: 0, sz: 2 } })).toBe(3)
    expect(gap(A, { e: true, o: { mx: -2, my: -2, sz: 3 } })).toBe(1)
    expect(gap({ e: true, o: { mx: 0, my: 0, sz: 3 } }, { e: false, o: { mx: 5, my: 1 } })).toBe(3)
  })
  it('enemies without a size are 1x1', () => expect(gap(A, { e: true, o: { mx: 3, my: 0 } })).toBe(3))
  it('an unplaced target counts as square 0', () => {
    expect(gap({ e: false, o: { mx: 2, my: 0 } }, { e: false, o: {} })).toBe(2)
    expect(adjacent({ e: false, o: { mx: 1, my: 1 } }, { e: false, o: {} })).toBe(true)
  })
  it('characters are always 1x1', () => expect(gap(A, { e: false, o: { mx: 3, my: 0, sz: 3 } })).toBe(3))
  it('unplaced units count as square 0', () => expect(gap({ e: false, o: {} }, { e: false, o: { mx: 2, my: null } })).toBe(2))
  it('adjacent', () => {
    expect(adjacent(A, { e: false, o: { mx: 1, my: 1 } })).toBe(true)
    expect(adjacent(A, { e: false, o: { mx: 2, my: 0 } })).toBe(false)
    expect(adjacent(A, { e: true, o: { mx: -3, my: 0, sz: 3 } })).toBe(true)
    expect(adjacent({ e: false, o: {} }, { e: false, o: { mx: 0, my: 2 } })).toBe(false)
  })
})

describe('poise', () => {
  it('hits lower poise, starting from max', () => {
    expect(poiseHit({ pm: 30 }, 10)).toEqual({ po: 20 })
    expect(poiseHit({ pm: 30, po: 20 }, 25)).toEqual({ po: 0, stun: true, sg: true })
  })
  it('no effect when staggered or without poise', () => {
    expect(poiseHit({ pm: 30, stun: true }, 10)).toBeNull()
    expect(poiseHit({ pm: 0 }, 10)).toBeNull()
    expect(poiseHit({}, 10)).toBeNull()
  })
  it('recovery refills poise after a stagger', () => {
    expect(recover({ sg: true, pm: 30 })).toEqual({ stun: false, sg: false, rec: false, po: 30 })
    expect(recover({ sg: true })).toEqual({ stun: false, sg: false, rec: false, po: 0 })
    expect(recover({ rec: true })).toEqual({ stun: false, sg: false, rec: false })
    expect(recover({})).toBeNull()
  })
})
