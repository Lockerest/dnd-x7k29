import { describe, expect, it } from 'vitest'
import { buildNextPhase, chainEnd, chainRoot, damageEnemy, enemyListOrder, nextPhasePatch, waitingPhases } from './phases'
import type { Enemy } from './types'

describe('damageEnemy', () => {
  it('plain damage, never below 0', () => {
    expect(damageEnemy({ hp: 1000, max: 1000 }, 300, false)).toEqual({ hp: 700, gate: false, full: false })
    expect(damageEnemy({ hp: 100, max: 1000 }, 500, false)).toEqual({ hp: 0, gate: false, full: false })
    expect(damageEnemy({}, 5, false)).toEqual({ hp: 0, gate: false, full: false })
  })
  it('event gate stops at the gate', () => expect(damageEnemy({ hp: 600, max: 1000, pg: 50 }, 2000, false)).toEqual({ hp: 500, gate: 'event', full: false }))
  it('only when crossing', () => {
    expect(damageEnemy({ hp: 400, max: 1000, pg: 50 }, 100, false).gate).toBe(false)
    expect(damageEnemy({ hp: 500, max: 1000, pg: 50 }, 100, false).gate).toBe(false)
    expect(damageEnemy({ hp: 501, max: 1000, pg: 50 }, 1, false)).toEqual({ hp: 500, gate: 'event', full: false })
  })
  it('rounds the gate up', () => expect(damageEnemy({ hp: 333, max: 333, pg: 10 }, 9999, false).hp).toBe(34))
  it('swap gate when the next sheet exists', () => {
    expect(damageEnemy({ hp: 1000, max: 1000, pg: 75, nx: 'b' }, 600, true)).toEqual({ hp: 750, gate: 'swap', full: false })
    expect(damageEnemy({ hp: 1000, max: 1000, pg: 75, nx: 'b' }, 600, false).gate).toBe('event')
  })
  it('swap at 0 HP', () => {
    expect(damageEnemy({ hp: 100, max: 1000, sw: 1, nx: 'b' }, 5000, true)).toEqual({ hp: 1, gate: 'swap', full: true })
    expect(damageEnemy({ hp: 100, max: 1000, sw: 1 }, 5000, true).hp).toBe(0)
    expect(damageEnemy({ hp: 100, max: 1000, sw: 1, nx: 'b' }, 5000, false).hp).toBe(0)
    expect(damageEnemy({ hp: 100, max: 1000, sw: 1, nx: 'b' }, 50, true)).toEqual({ hp: 50, gate: false, full: false })
  })
  it('a gate and swap-at-0 on one sheet: the gate catches the first big hit', () =>
    expect(damageEnemy({ hp: 1000, max: 1000, pg: 50, sw: 1, nx: 'b' }, 5000, true)).toEqual({ hp: 500, gate: 'swap', full: false }))
  it('a gate on a sheet without HP numbers never triggers', () => expect(damageEnemy({ pg: 50 }, 10, false)).toEqual({ hp: 0, gate: false, full: false }))
  it('a 0% gate is ignored', () => expect(damageEnemy({ hp: 10, max: 10, pg: 0, nx: 'b' }, 50, true).gate).toBe(false))
})

describe('nextPhasePatch', () => {
  const cur: Enemy = { mx: 4, my: 5, mp: 'm' }
  it('takes the map spot and resets state', () =>
    expect(nextPhasePatch(cur, { max: 2000, pm: 40 }, 750)).toEqual({ mx: 4, my: 5, mp: 'm', hp: 750, po: 40, stun: false, sg: false, hd: null, bi: false }))
  it('full HP when hp is null, and keeps HP within 1..max', () => {
    expect(nextPhasePatch(cur, { max: 700 }, null).hp).toBe(700)
    expect(nextPhasePatch(cur, { max: 50 }, 999).hp).toBe(50)
    expect(nextPhasePatch(cur, { max: 50 }, 0).hp).toBe(1)
    expect(nextPhasePatch(cur, {}, null)).toMatchObject({ hp: 0, po: 0 })
  })
})

const chain = (): Record<string, Enemy> => ({
  a: { name: 'Kernunos', hp: 1000, max: 1000, nx: 'b', pg: 50 },
  b: { name: 'Kernunos (phase 2)', hp: 900, max: 900, nx: 'c', pg: 10 },
  c: { name: 'Kernunos (phase 3)', hp: 800, max: 800, pm: 20, po: 0, mx: 1, my: 1, mp: 'm', th: 'rotarena', sk: { s: { n: 'Rot Claw', d: '2d10', r: 1, t: 's' } } },
  w: { name: 'Wolf', hp: 10, max: 10 },
})

describe('chainEnd and chainRoot', () => {
  it('follows nx links', () => {
    expect(chainEnd(chain(), 'a')).toEqual({ id: 'c', depth: 2 })
    expect(chainEnd(chain(), 'b')).toEqual({ id: 'c', depth: 1 })
    expect(chainEnd(chain(), 'w')).toEqual({ id: 'w', depth: 0 })
  })
  it('ignores links to deleted sheets', () => expect(chainEnd({ a: { nx: 'gone' } }, 'a')).toEqual({ id: 'a', depth: 0 }))
  it('stops after 9 links (loops)', () => expect(chainEnd({ a: { nx: 'b' }, b: { nx: 'a' } }, 'a').depth).toBe(9))
  it('finds phase 1', () => {
    expect(chainRoot(chain(), 'c')).toBe('a')
    expect(chainRoot(chain(), 'w')).toBe('w')
    expect(chainRoot({}, 'x')).toBe('x')
  })
})

describe('buildNextPhase', () => {
  it('copies the last sheet unplaced at full HP with the next theme', () => {
    const r = buildNextPhase({ a: { name: 'Aethelric', hp: 300, max: 1000, pm: 20, po: 0, mx: 1, my: 1, mp: 'm', gr: 1, sk: { s1: { n: "Warden's Cut", d: '2d8', r: 1, t: 's' } } } }, 'a', () => true)!
    expect(r.lastId).toBe('a')
    expect(r.lastPatch).toEqual({ pg: 50 })
    expect(r.themeSet).toBe(true)
    expect(r.sheet).toEqual({ name: 'Aethelric (phase 2)', hp: 1000, max: 1000, pm: 20, po: 20, th: 'firstdefier', sk: { s1: { n: "Warden's Cut", d: '2d8', r: 1, t: 's' } } })
  })
  it('adds to the end of the chain, keeps its gate and names the phase', () => {
    const all = chain()
    const r = buildNextPhase(all, 'a', () => true)!
    expect(r.lastId).toBe('c')
    expect(r.sheet.name).toBe('Kernunos (phase 4)')
    expect(r.sheet.th).toBeUndefined() // Kernunos has no 4th theme
    expect(all.c!.mx).toBe(1) // the original is not changed
  })
  it('keeps an existing gate on the last sheet', () => expect(buildNextPhase({ a: { name: 'A', pg: 30 } }, 'a', () => true)!.lastPatch).toEqual({ pg: 30 }))
  it('only sets a theme that is available', () => {
    const r = buildNextPhase({ a: { name: "Odi'ram", max: 10 } }, 'a', (k) => k !== 'emberrage')!
    expect(r.sheet.th).toBeUndefined()
    expect(r.themeSet).toBe(false)
  })
  it('unknown bosses and unnamed sheets', () => {
    expect(buildNextPhase({ a: { name: 'Wolf' } }, 'a', () => true)!.sheet.name).toBe('Wolf (phase 2)')
    expect(buildNextPhase({ a: {} }, 'a', () => true)!.sheet.name).toBe('Boss (phase 2)')
  })
  it('null for a missing sheet', () => expect(buildNextPhase({}, 'x', () => true)).toBeNull())
})

describe('enemyListOrder', () => {
  it('lists each boss with its phases under it', () => {
    const all = chain()
    expect(enemyListOrder(all, ['c', 'w', 'b', 'a'])).toEqual([
      ['w', 0],
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })
  it('hidden sheets are skipped, and a chain whose phase 1 is hidden starts at 0', () =>
    expect(enemyListOrder(chain(), ['b', 'c'])).toEqual([
      ['b', 0],
      ['c', 1],
    ]))
  it('loops still list every sheet once', () =>
    expect(enemyListOrder({ a: { nx: 'b' }, b: { nx: 'a' } }, ['a', 'b'])).toEqual([
      ['a', 0],
      ['b', 1],
    ]))
})

describe('waiting phase sheets', () => {
  it('folds every sheet in a chain but the one being fought', () => {
    const all = {
      a: { name: 'Aethelric', hp: 50, nx: 'b' },
      b: { name: 'Golden', hp: 100, nx: 'c' },
      c: { name: 'Third', hp: 100 },
      w: { name: 'Wolf', hp: 0 },
      k: { name: 'King', hp: 0, nx: 'f' },
      f: { name: 'On foot', hp: 30 },
      x: { name: 'Lost', hp: 5, nx: 'gone' },
      d: { name: 'Done', nx: 'e' },
      e: { name: 'Done 2', hp: 0 },
      l: { name: 'Loop', hp: 0, nx: 'm' },
      m: { name: 'Loop 2', hp: 0, nx: 'l' },
    } as Record<string, Enemy>
    expect([...waitingPhases(all)].sort()).toEqual(['b', 'c', 'd', 'k'])
  })
})
