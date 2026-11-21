import { describe, expect, it } from 'vitest'
import { autoTurn } from './autoTurn'
import type { Sheet } from './sheet'
import { grid, type Maps } from './table'
import type { Enemy } from './types'

const maps: Maps = { m: { name: 'Crypt', w: 500, h: 400, cols: 10, walls: ['4,1'] } }
const g = grid(maps, 'm')!
const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', hp: 10, mx: 1, my: 1, ...o })
const wolf = (o: Partial<Enemy> = {}): Enemy => ({ name: 'Wolf', hp: 10, mx: 2, my: 1, ...o })

describe('the computer plays a monster', () => {
  it('stunned, or nobody to attack (dead, off the map, riding, unapproved, elsewhere)', () => {
    expect(autoTurn('w', { a: hero() }, { w: wolf({ stun: true }) }, g, () => 0.9)).toEqual({ kind: 'stunned' })
    const nobody = { a: hero({ hp: 0 }), b: hero({ mx: null }), c: hero({ mt: 'climb' }), d: hero({ ap: 'no' }), e: hero({ mp: 'n' }) }
    expect(autoTurn('w', nobody, { w: wolf() }, g, () => 0.9)).toEqual({ kind: 'nobody' })
    expect(autoTurn('w', { a: hero() }, { w: wolf({ mp: 'n' }) }, g, () => 0.9)).toEqual({ kind: 'nobody' })
  })

  it('next to the nearest hero it attacks: a skill half the time, else heavy 30 %, else light', () => {
    const chars = { a: hero(), b: hero({ name: 'Bram', mx: 8, my: 6 }) }
    const sk = { s1: { n: 'Bite', d: '1d6', r: 1, t: 's' as const }, s2: { n: 'Far', d: '1d6', r: 0, t: 'a' as const } }
    expect(autoTurn('w', chars, { w: wolf({ sk }) }, g, () => 0.1)).toEqual({ kind: 'act', target: 'c:a', targetName: 'Lyra', move: null, attack: { k: 'sk', i: 's1' } })
    const seq = [0.6, 0.2]
    expect((autoTurn('w', chars, { w: wolf({ sk }) }, g, () => seq.shift()!) as { attack: unknown }).attack).toEqual({ k: 'h' })
    expect((autoTurn('w', chars, { w: wolf() }, g, () => 0.5) as { attack: unknown }).attack).toEqual({ k: 'l' })
    // The nearer hero, whichever comes first; a single-target skill with no range reaches 1.
    expect(autoTurn('w', { b: hero({ name: 'Bram', mx: 9, my: 7 }), a: hero() }, { w: wolf({ sk: { s: { n: 'Snap', d: '1', r: 0, t: 's' } } }) }, g, () => 0.1)).toMatchObject({ target: 'c:a', attack: { k: 'sk', i: 's' } })
    // Ties go to the first hero.
    expect(autoTurn('w', { a: hero({ mx: 3, my: 1 }), b: hero({ name: 'Bram' }) }, { w: wolf() }, g, () => 0.9)).toMatchObject({ target: 'c:a' })
  })

  it('out of reach it walks closest (not onto others), and attacks if it got there', () => {
    const r = autoTurn('w', { a: hero({ mx: 8, my: 6 }) }, { w: wolf({ mx: 1, my: 1, spd: 9 }), o: wolf({ name: 'Ogre', mx: 7, my: 5 }) }, g, () => 0.9)
    expect(r).toMatchObject({ kind: 'act', target: 'c:a', attack: { k: 'l' } })
    expect((r as { move: object }).move).not.toEqual({ mx: 7, my: 5 })
    const slow = autoTurn('w', { a: hero({ mx: 9, my: 7 }) }, { w: wolf({ mx: 0, my: 0, spd: 1 }) }, g, () => 0.9)
    expect(slow).toMatchObject({ kind: 'act', target: 'c:a', targetName: 'Lyra', attack: null })
    expect((slow as { move: { mx: number } }).move.mx).toBe(1) // one step closer
    // Nowhere to go: it stays and does nothing.
    const walled = grid({ m: { ...maps.m, walls: ['1,0', '0,1', '1,1'] } }, 'm')!
    const boxed = autoTurn('w', { a: hero({ mx: 9, my: 7 }) }, { w: wolf({ mx: 0, my: 0 }) }, walled, () => 0.9)
    expect(boxed).toMatchObject({ move: null, attack: null })
  })

  it('a monster with reach keeps its distance; area skills reach anyone close enough', () => {
    const r = autoTurn('w', { a: hero({ mx: 8, my: 1 }) }, { w: wolf({ mx: 0, my: 6, er: 3, spd: 9 }) }, g, () => 0.9)
    const m = (r as { move: { mx: number; my: number } }).move
    expect(Math.max(Math.abs(m.mx - 8), Math.abs(m.my - 1))).toBe(3)
    const sk = { s: { n: 'Roar', d: '1d6', r: 3, t: 'a' as const } }
    expect((autoTurn('w', { a: hero(), b: hero({ mx: 5, my: 1 }) }, { w: wolf({ sk }) }, g, () => 0.1) as { attack: unknown }).attack).toEqual({ k: 'sk', i: 's' })
  })
})
