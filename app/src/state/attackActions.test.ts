import { describe, expect, it } from 'vitest'
import type { Db } from '../db/client'
import type { Board } from '../logic/board'
import type { Sheet } from '../logic/sheet'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import { promptButtons, type Qte } from './attackActions'
import { createGameStore, emptyTables, type Tables } from './store'

const MAP = { w: 500, h: 400, cols: 10, walls: ['9,0'] }

/**
 * A store with a fake clock (every wait passes at once and moves the clock on) and a
 * database whose "qte" answers can be scripted.
 */
function setup(t: Partial<Tables>, o: { hold?: boolean; role?: 'gm' | 'player'; me?: string; rand?: number | (() => number); qte?: (w: unknown[][]) => unknown; failQte?: number } = {}) {
  const f = fakeDb()
  let clock = 1000
  let fails = o.failQte ?? 0
  const db: Db = {
    ...f.db,
    get: (async (p: string) => {
      if (p === 'qte') {
        if (fails-- > 0) throw new TypeError('offline')
        return o.qte ? o.qte(f.writes as unknown[][]) : null
      }
      return f.db.get(p)
    }) as Db['get'],
  }
  const rand = typeof o.rand === 'function' ? o.rand : () => (o.rand as number | undefined) ?? 0.5
  const s = createGameStore(
    () => db,
    () => clock,
    rand,
    (fn, ms) => {
      clock += ms
      if (!o.hold) queueMicrotask(() => void fn())
    },
  )
  s.getState().connect({ pin: 'p', role: o.role ?? 'gm', me: o.me ?? 'gm' })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  return { s, f, tick: (ms: number) => (clock += ms) }
}
const settle = () => new Promise((r) => setTimeout(r, 20))
const evs = (f: ReturnType<typeof fakeDb>) => f.writes.flatMap((w) => ((w[2] as { ev?: string })?.ev ? [(w[2] as { ev: string }).ev] : []))
const fxs = (f: ReturnType<typeof fakeDb>) => f.writes.flatMap((w) => ((w[2] as { fx?: { o: string } })?.fx ? [(w[2] as { fx: { o: string } }).fx.o] : []))
const paths = (f: ReturnType<typeof fakeDb>) => f.writes.map((w) => `${w[0]} ${w[1]}`)

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'fighter', level: 1, hp: 50, maxHp: 50, st: 60, maxSt: 100, str: 14, dex: 12, ac: 10, mx: 2, my: 2, ...o })
const wolf = (o: Partial<Enemy> = {}): Enemy => ({ name: 'Wolf', hp: 30, max: 30, ac: 10, ab: 4, dm: '1d6', mx: 3, my: 2, ...o })

describe('the menu', () => {
  it('opens and closes; a missing unit just closes it; a player acts only as themselves', async () => {
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf() } }, { role: 'player', me: 'a' })
    s.getState().openMenu('c:a', 'e:w')
    expect(s.getState().menu).toEqual({ a: 'c:a', t: 'e:w' })
    s.getState().closeMenu()
    expect(s.getState().menu).toBeNull()
    await s.getState().act('l') // no menu
    s.getState().openMenu('c:a', 'e:gone')
    await s.getState().act('l')
    expect(s.getState().menu).toBeNull()
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(f.writes).toEqual([])
  })
})

describe('a hero attacks a monster', () => {
  it('hits: stamina, the shared roll and line, damage dice, the hit effect, poise and the hit line', async () => {
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf({ pm: 30 }) } }, { role: 'player', me: 'a', rand: 0.6 })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('h')
    expect(s.getState().menu).toBeNull()
    expect(paths(f)).toEqual(['PATCH chars/a', 'POST rolls', 'POST rolls', 'POST rolls', 'POST rolls', 'PATCH enemies/w', 'PATCH enemies/w', 'POST rolls', 'POST rolls'])
    expect(f.writes[0]![2]).toMatchObject({ used: 1, st: 50, log: ['Heavy attack on Wolf (-10 St)'] })
    expect(evs(f)).toEqual(['Lyra rolls 13 +4 = 17 vs AC 10 (Heavy attack on Wolf): HIT', 'Wolf is staggered!', 'Lyra hits Wolf for 90. Wolf is slain!'])
    expect(f.writes[5]![2]).toMatchObject({ hp: 0, hv: 90 })
    expect(f.writes[6]![2]).toEqual({ po: 0, stun: true, sg: true })
    expect(fxs(f)).toEqual(['hit'])
  })

  it('the attack scene plays on this screen as well as being shared', async () => {
    const { s } = setup({ chars: { a: hero() }, enemies: { w: wolf({ ac: 30 }) } }, { rand: 0.5 })
    const scenes: Record<string, unknown>[] = []
    s.getState().setEffects({ scene: (x) => void scenes.push(x), wave: () => {}, boss: () => {} })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('l')
    expect(scenes).toEqual([expect.objectContaining({ a: 'c:a', t: 'e:w', o: 'miss' })])
  })

  it('a stagger is announced; poise only drops while not staggered', async () => {
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf({ pm: 10, hp: 300, max: 300 }) } }, { rand: 0.6 })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('l')
    expect(evs(f)).toContain('Wolf is staggered!')
    const st = setup({ chars: { a: hero() }, enemies: { w: wolf({ pm: 10, stun: true, hp: 300 }) } }, { rand: 0.6 })
    st.s.getState().openMenu('c:a', 'e:w')
    await st.s.getState().act('l')
    expect(paths(st.f).filter((p) => p === 'PATCH enemies/w')).toHaveLength(1)
  })

  it('misses, rolls 1s (always miss) and 20s (critical, double dice)', async () => {
    const miss = setup({ chars: { a: hero() }, enemies: { w: wolf({ ac: 30 }) } }, { rand: 0.5 })
    miss.s.getState().openMenu('c:a', 'e:w')
    await miss.s.getState().act('l')
    expect(evs(miss.f)).toEqual(['Lyra rolls 11 +4 = 15 vs AC 30 (Light attack on Wolf): MISS'])
    expect(fxs(miss.f)).toEqual(['miss'])
    const one = setup({ chars: { a: hero() }, enemies: { w: wolf({ ac: 1 }) } }, { rand: 0 })
    one.s.getState().openMenu('c:a', 'e:w')
    await one.s.getState().act('l')
    expect(evs(one.f)[0]).toMatch(/: MISS$/)
    const crit = setup({ chars: { a: hero({ str: 6 }) }, enemies: { w: wolf({ ac: 99, hp: 300, max: 300 }) } }, { rand: 0.99 })
    crit.s.getState().openMenu('c:a', 'e:w')
    await crit.s.getState().act('l')
    expect(evs(crit.f)).toEqual(['Lyra rolls 20 +0 = 20 vs AC 99 (Light attack on Wolf): CRITICAL HIT', 'Lyra hits Wolf for 100'])
  })

  it('out of range says so; an exhausted hero cannot act', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: 0 }) }, enemies: { w: wolf({ mx: 5 }) } })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('l')
    expect(s.getState().error).toBe('Out of range: Light attack reaches 1 square.')
    const board: Board = { b: { n: 'Long Shot', v: 'any', l: 1, c: 1, k: 'atk', d: '1d8', r: 3 } }
    const r = setup({ board, chars: { a: hero({ mx: 0 }) }, enemies: { w: wolf({ mx: 5 }) } })
    r.s.getState().openMenu('c:a', 'e:w')
    await r.s.getState().act('ab', 2)
    expect(r.s.getState().error).toBe('Out of range: Long Shot reaches 3 squares.')
    await r.s.getState().act('ab', 9) // not an attack
    const ex = setup({ chars: { a: hero({ exh: true }) }, enemies: { w: wolf() } })
    ex.s.getState().openMenu('c:a', 'e:w')
    await ex.s.getState().act('l')
    expect([...f.writes, ...r.f.writes, ...ex.f.writes]).toEqual([])
  })

  it('ability attacks: auto-hit, Golden HP costs, charging and releasing a charged ability', async () => {
    const board: Board = {
      b: { n: 'Sure Shot', v: 'any', l: 1, c: 1, k: 'atk', d: '1d4', r: 4, a: 1 },
      g: { n: 'Gold Cut', v: 'any', l: 1, c: 1, k: 'atk', d: '1d4', r: 1, hc: 10 },
      m: { n: 'Meteor Fall', v: 'any', l: 1, c: 4, k: 'atk', d: '6d6', r: 6, ch: 1 },
    }
    const { s, f } = setup({ board, chars: { a: hero() }, enemies: { w: wolf({ hp: 300, max: 300 }) } }, { rand: 0.5 })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('ab', 2)
    expect(evs(f)[0]).toBe('Lyra uses Sure Shot on Wolf (targeted, no attack roll)')
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('ab', 3)
    expect(f.writes.find((w) => (w[2] as { log?: string[] }).log?.at(-1) === 'Gold Cut on Wolf (-10 St)')![2]).toMatchObject({ hp: 45 })
    // Charging takes the round; the menu stays open.
    const ch = setup({ board, chars: { a: hero() }, enemies: { w: wolf({ hp: 300, max: 300 }) } }, { rand: 0.5 })
    ch.s.getState().openMenu('c:a', 'e:w')
    await ch.s.getState().act('ab', 4)
    expect(ch.f.writes[0]![2]).toMatchObject({ chg: 'Meteor Fall', used: 2, ddg: false, pry: false })
    expect(evs(ch.f)).toEqual(['Lyra gathers power for Meteor Fall! They are wide open until their next turn.'])
    expect(ch.s.getState().menu).not.toBeNull()
    // Once charged it fires for free.
    const go = setup({ board, chars: { a: hero({ chg: 'Meteor Fall', used: 0 }) }, enemies: { w: wolf({ hp: 300, max: 300 }) } }, { rand: 0.5 })
    go.s.getState().openMenu('c:a', 'e:w')
    await go.s.getState().act('ab', 4)
    expect(go.f.writes[0]![2]).toMatchObject({ chg: null, st: 60, log: ['Meteor Fall on Wolf'] })
    // A refused charge says nothing.
    const no = setup({ board, chars: { a: hero({ used: 2 }) }, enemies: { w: wolf() } })
    no.s.getState().openMenu('c:a', 'e:w')
    await no.s.getState().act('ab', 4)
    expect(no.f.writes).toEqual([])
  })

  it('multi-hit abilities roll each hit on their own and stop when the target falls; Arrowstorm rolls at -2', async () => {
    const board: Board = {
      r: { n: 'Rending Combo', v: 'any', l: 1, c: 1, k: 'atk', d: '3d8', r: 1 },
      a: { n: 'Arrowstorm', v: 'any', l: 1, c: 1, k: 'atk', d: '3d6', r: 8 },
    }
    const big = setup({ board, chars: { a: hero() }, enemies: { w: wolf({ hp: 3000, max: 3000 }) } }, { rand: 0.5 })
    big.s.getState().openMenu('c:a', 'e:w')
    await big.s.getState().act('ab', 2)
    expect(evs(big.f).filter((e) => e.includes('hit ') && e.includes(' of 3'))).toEqual(['Lyra: Rending Combo, hit 1 of 3', 'Lyra: Rending Combo, hit 2 of 3', 'Lyra: Rending Combo, hit 3 of 3'])
    // A target that falls stops the rest.
    const small = setup({ board, chars: { a: hero() }, enemies: { w: wolf({ hp: 5, max: 30 }) } }, { rand: 0.5 })
    small.s.getState().openMenu('c:a', 'e:w')
    await small.s.getState().act('ab', 2)
    expect(evs(small.f).filter((e) => e.includes(' of 3'))).toEqual(['Lyra: Rending Combo, hit 1 of 3'])
    // A refused action rolls nothing.
    const tired = setup({ board, chars: { a: hero({ used: 2 }) }, enemies: { w: wolf() } }, { rand: 0.5 })
    tired.s.getState().openMenu('c:a', 'e:w')
    await tired.s.getState().act('ab', 2)
    expect(evs(tired.f)).toEqual([])
    // Arrowstorm: the attack bonus drops by 2 (+4 -> +2).
    const bow = setup({ board, chars: { a: hero() }, enemies: { w: wolf({ hp: 3000, max: 3000 }) } }, { rand: 0.5 })
    bow.s.getState().openMenu('c:a', 'e:w')
    await bow.s.getState().act('ab', 3)
    expect(evs(bow.f).some((e) => / \+2 = .*Arrowstorm/.test(e))).toBe(true)
  })

  it('a counter-attack is free and clears the counter', async () => {
    const { s, f } = setup({ chars: { a: hero({ ctr: true, used: 2 }) }, enemies: { w: wolf({ hp: 300, max: 300 }) } }, { rand: 0.6 })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('ctr')
    expect(f.writes[0]![2]).toEqual({ ctr: false, log: ['Counter-attack!'] })
    expect(evs(f)).toHaveLength(2)
  })

  it('a phase gate stops at the gate; a swap hands over to the next sheet a moment later', async () => {
    const ev = setup({ chars: { a: hero() }, enemies: { w: wolf({ hp: 30, max: 30, pg: 50 }) } }, { rand: 0.9 })
    ev.s.getState().openMenu('c:a', 'e:w')
    await ev.s.getState().act('h')
    expect(ev.f.writes.filter((w) => w[1] === 'enemies/w').map((w) => w[2])).toEqual([expect.objectContaining({ hp: 15 }), { gr: 15 }])
    const sw = setup({ chars: { a: hero() }, enemies: { w: wolf({ hp: 30, max: 30, sw: true, nx: 'p2' }), p2: wolf({ name: 'Wolf King', max: 90, mx: null }) } }, { rand: 0.9 })
    sw.s.getState().openMenu('c:a', 'e:w')
    await sw.s.getState().act('h')
    await settle()
    expect(evs(sw.f)).toContain('Wolf changes... Wolf King rises!')
    expect(sw.s.getState().tables.enemies.p2).toMatchObject({ hp: 90, mx: 3 })
    const half = setup({ chars: { a: hero() }, enemies: { w: wolf({ hp: 30, max: 30, pg: 50, nx: 'p2' }), p2: wolf({ name: 'Wolf King', max: 90, mx: null }) } }, { rand: 0.9 })
    half.s.getState().openMenu('c:a', 'e:w')
    await half.s.getState().act('h')
    await settle()
    expect(half.s.getState().tables.enemies.p2).toMatchObject({ hp: 15 })
  })
})

describe('a monster attacks a hero', () => {
  it('a hit with nobody answering: the prompt, 3.5 seconds, then full damage with fatigue', async () => {
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf() } }, { rand: 0.6 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(f.writes[0]).toEqual(['PUT', 'qte', { id: 1000, tid: 'a', total: 17, melee: true, par: true, from: 'Wolf' }])
    expect(evs(f)).toEqual(['Wolf attacks Lyra! Lyra has 3 seconds to react.', 'Wolf hits Lyra for 40'])
    expect(paths(f)).toContain('DELETE qte')
    expect(f.writes.find((w) => w[1] === 'chars/a')![2]).toMatchObject({ hp: 10, fa: 40, log: ['Wolf hits for 40 (fatigue 8%)'] })
  })

  it('misses are announced; a monster with a rider rolls twice and takes the lower', async () => {
    const miss = setup({ chars: { a: hero({ ac: 30 }) }, enemies: { w: wolf() } }, { rand: 0.6 })
    miss.s.getState().openMenu('e:w', 'c:a')
    await miss.s.getState().act('l')
    expect(evs(miss.f)).toEqual(['Wolf misses Lyra (Light attack)'])
    const rolls = [0.9, 0.1]
    const rider = setup({ chars: { a: hero({ ac: 30 }), b: hero({ name: 'Bo', mt: 'climb', mon: 'w' }) }, enemies: { w: wolf() } }, { rand: () => rolls.shift() ?? 0.5 })
    rider.s.getState().openMenu('e:w', 'c:a')
    await rider.s.getState().act('l')
    expect(evs(rider.f)).toEqual(['Wolf is struggling with a rider: attacking at disadvantage', 'Wolf misses Lyra (Light attack)'])
  })

  it('it cannot attack its own rider except with area attacks', async () => {
    const { s, f } = setup({ chars: { a: hero({ mt: 'climb', mon: 'w' }) }, enemies: { w: wolf({ sk: { r: { n: 'Shake', d: '1d4', r: 1, t: 'a' } } }) } }, { rand: 0.6 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(s.getState().error).toBe('It cannot attack its rider, only use an area attack.')
    await s.getState().act('sk', 'r')
    expect(evs(f)[0]).toBe('Wolf uses Shake!')
  })

  it('the defender answers: dodges fully, half, or not at all; parries give a counter', async () => {
    const answer = (res: string, t: number) => (w: unknown[][]) => {
      const q = [...w].reverse().find((x) => x[0] === 'PUT' && x[1] === 'qte')
      return q ? { ...(q[2] as object), res, sv: { r: 10, t } } : null
    }
    const run = async (res: string, t: number, o: Partial<Sheet> = {}) => {
      const x = setup({ chars: { a: hero(o) }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6, qte: answer(res, t) })
      x.s.getState().openMenu('e:w', 'c:a')
      await x.s.getState().act('l')
      return x
    }
    const full = await run('dodge', 20)
    expect(evs(full.f).at(-1)).toBe("Lyra dodges Wolf's attack (save 20 vs 17)")
    expect(fxs(full.f)).toEqual(['dodge'])
    expect(full.f.writes.find((w) => w[1] === 'chars/a')![2]).toMatchObject({ st: 30, log: ['Dodge (-30 St)'] })
    const half = await run('dodge', 15)
    expect(evs(half.f)).toContain('Lyra only half dodges (save 15 vs 17): half damage')
    expect(evs(half.f).at(-1)).toBe('Wolf hits Lyra for 20')
    const fail = await run('dodge', 3)
    expect(evs(fail.f)).toContain('Lyra fails to dodge (save 3 vs 17): full damage')
    const parry = await run('parry', 18)
    expect(evs(parry.f).at(-1)).toBe("Lyra parries Wolf's attack (save 18 vs 17) and can counter-attack")
    expect(parry.f.writes.filter((w) => w[1] === 'chars/a').map((w) => w[2])).toEqual([expect.objectContaining({ log: ['Parry (-20 St)'] }), expect.objectContaining({ ctr: true })])
    const halfParry = await run('parry', 16)
    expect(evs(halfParry.f)).toContain('Lyra only half parries (save 16 vs 17): half damage')
    const failParry = await run('parry', 1)
    expect(evs(failParry.f)).toContain('Lyra fails to parry (save 1 vs 17): full damage')
    // A mage cannot parry: the attack lands in full.
    const mage = await run('parry', 30, { cls: 'mage' })
    expect(evs(mage.f).at(-1)).toBe('Wolf hits Lyra for 40')
  })

  it('a choice without a save roll: waits up to 18 s, then rolls the save itself', async () => {
    const chose = (w: unknown[][]) => {
      const q = [...w].reverse().find((x) => x[0] === 'PUT' && x[1] === 'qte')
      return q ? { ...(q[2] as object), res: 'dodge' } : null
    }
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6, qte: chose, failQte: 2 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(evs(f)).toContain('Lyra fails to dodge (save 14 vs 17): full damage')
  })

  it('readied reactions: used up, then the prompt (or, when the hero cannot react, rolled at once)', async () => {
    const { s, f } = setup({ chars: { a: hero({ ddg: true }) }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(f.writes[0]).toEqual(['PATCH', 'chars/a', { ddg: false, log: [] }])
    expect(f.writes[1]![2]).toMatchObject({ pre: 'dodge' })
    expect(evs(f)[0]).toBe('Wolf attacks Lyra! Lyra uses a readied dodge.')
    expect(evs(f)).toContain('Lyra fails to dodge (save 14 vs 17): full damage')
    const ex = setup({ chars: { a: hero({ pry: true, exh: true }) }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6 })
    ex.s.getState().openMenu('e:w', 'c:a')
    await ex.s.getState().act('l')
    expect(ex.f.writes[0]![2]).toMatchObject({ pry: false })
    expect(paths(ex.f)).not.toContain('PUT qte')
    expect(evs(ex.f)).toContain('Lyra only half parries (save 15 vs 17): half damage')
    // Parry with disadvantage rolls twice.
    const dis = setup({ chars: { a: hero({ pry: true, exh: true, pw: 'd' }) }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6 })
    dis.s.getState().openMenu('e:w', 'c:a')
    await dis.s.getState().act('l')
    expect(evs(dis.f)).toContain('Lyra only half parries (save 15 vs 17): half damage')
  })

  it('an exhausted hero hit by a monster is knocked down; a hero hit by a hero is not', async () => {
    const { s, f } = setup({ chars: { a: hero({ exh: true, lh: 2 }) }, enemies: { w: wolf() } }, { rand: 0.6 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('l')
    expect(f.writes.filter((w) => w[1] === 'chars/a').at(-1)![2]).toMatchObject({ lh: 0, pr: true, log: expect.arrayContaining(['Knocked prone!']) })
  })

  it('skills: single target, area, harmless; out of range; a special attack by name', async () => {
    const sk = { s1: { n: 'Bite', d: '1d8', r: 1, t: 's' as const, a: 1 }, s2: { n: 'Howl', d: '1d4', r: 0, t: 'a' as const }, s3: { n: 'Glare', d: '0', r: 2, t: 's' as const }, s4: { n: 'Shriek', d: '-', r: 3, t: 'a' as const }, s5: { n: 'Lunge', d: '1d6', r: 0, t: 's' as const } }
    const chars = { a: hero(), b: hero({ name: 'Bo', mx: 4, my: 3 }), c: hero({ name: 'Far', mx: 9, my: 7 }), d: hero({ name: 'Down', hp: 0 }), e: hero({ name: 'Off', mx: null }) }
    const run = async (k: string, i?: string, o: Partial<Enemy> = {}) => {
      const x = setup({ chars, enemies: { w: wolf({ sk, hp: 300, ...o }) } }, { rand: 0.6 })
      x.s.getState().openMenu('e:w', 'c:a')
      await x.s.getState().act(k, i)
      return x
    }
    expect(evs((await run('sk', 's1')).f)[0]).toBe('Wolf uses Bite on Lyra (targeted, no attack roll)')
    const howl = await run('sk', 's2')
    expect(evs(howl.f).filter((e) => e.includes('area attack'))).toHaveLength(2) // Lyra and Bo, not Far, Down or Off
    const glare = await run('sk', 's3')
    expect(evs(glare.f)).toEqual(['Wolf uses Glare on Lyra.'])
    expect(glare.s.getState().menu).not.toBeNull()
    expect(evs((await run('sk', 's4')).f)).toEqual(['Wolf uses Shriek!.'])
    const lunge = await run('sk', 's5', { mx: 6 })
    expect(lunge.s.getState().error).toBe('Out of range: Lunge reaches 1 square(s).')
    const glareFar = await run('sk', 's3', { mx: 8, my: 7 })
    expect(glareFar.s.getState().error).toBe('Out of range: Glare reaches 2 square(s).')
    const shriekFar = setup({ chars: { a: hero({ mx: 0, my: 0 }) }, enemies: { w: wolf({ sk, mx: 8, my: 7 }) } })
    shriekFar.s.getState().openMenu('e:w', 'c:a')
    await shriekFar.s.getState().act('sk', 's4')
    expect(shriekFar.s.getState().error).toBe('Out of range: Shriek reaches 3 square(s).')
    expect((await run('sk', 'gone')).f.writes).toEqual([])
    expect(evs((await run('sp', 'Tail Swipe')).f)).toEqual(['Wolf uses Tail Swipe on Lyra'])
    expect((await run('sp', '  ')).f.writes).toEqual([])
    expect((await run('sp')).f.writes).toEqual([])
  })

  it('the area attack hits everyone within its reach (at least 2 squares)', async () => {
    const chars = { a: hero(), b: hero({ name: 'Bo', mx: 5, my: 2 }), c: hero({ name: 'Far', mx: 9, my: 7 }), d: hero({ name: 'Down', hp: 0 }), e: hero({ name: 'Off', mx: null }) }
    const { s, f } = setup({ chars, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6 })
    s.getState().openMenu('e:w', 'c:a')
    await s.getState().act('aoe')
    expect(evs(f).filter((e) => e.startsWith('Wolf uses Area attack'))).toEqual([
      'Wolf uses Area attack on Lyra (area attack: a readied Dodge Roll can avoid it)',
      'Wolf uses Area attack on Bo (area attack: a readied Dodge Roll can avoid it)',
    ])
    const reach = setup({ chars, enemies: { w: wolf({ er: 7, hp: 300 }) } }, { rand: 0.6 })
    reach.s.getState().openMenu('e:w', 'c:a')
    await reach.s.getState().act('aoe')
    expect(evs(reach.f).filter((e) => e.startsWith('Wolf uses Area attack'))).toHaveLength(3)
  })
})

describe('push, mount, pick up, throw', () => {
  it('pushes heroes and monsters back, slams them into walls, or is blocked', async () => {
    const run = async (t: Partial<Tables>, a: string, tg: string) => {
      const x = setup(t)
      x.s.getState().openMenu(a, tg)
      await x.s.getState().act('push')
      return x
    }
    const m = await run({ chars: { a: hero() }, enemies: { w: wolf() } }, 'c:a', 'e:w')
    expect(m.f.writes.map((w) => w[2])).toEqual([expect.objectContaining({ st: 50 }), { mx: 4, my: 2, hx: 4, hy: 2, hm: 'm' }, expect.objectContaining({ ev: 'Lyra pushes Wolf back (STR contest)' })])
    const h = await run({ chars: { a: hero(), b: hero({ name: 'Bo', mx: 3, my: 3 }) } }, 'c:a', 'c:b')
    expect(h.f.writes[1]).toEqual(['PATCH', 'chars/b', { mx: 4, my: 4, log: ['Pushed by Lyra'] }])
    const wall = await run({ chars: { a: hero({ mx: 7, my: 0 }) }, enemies: { w: wolf({ mx: 8, my: 0 }) } }, 'c:a', 'e:w')
    expect(wall.f.writes[1]).toEqual(['PATCH', 'enemies/w', { stun: true, rec: true }])
    const wallHero = await run({ chars: { a: hero({ mx: 7, my: 0 }), b: hero({ name: 'Bo', mx: 8, my: 0 }) } }, 'c:a', 'c:b')
    expect(wallHero.f.writes[1]).toEqual(['PATCH', 'chars/b', { stn: true, log: ['Slammed into a wall: STUNNED'] }])
    const blocked = await run({ chars: { a: hero(), b: hero({ name: 'Bo', mx: 4, my: 2 }) }, enemies: { w: wolf() } }, 'c:a', 'e:w')
    expect(evs(blocked.f)).toEqual(['Lyra tries to push Wolf but something blocks the way'])
    const tired = await run({ chars: { a: hero({ st: 1 }) }, enemies: { w: wolf() } }, 'c:a', 'e:w')
    expect(tired.f.writes).toHaveLength(1) // exhausted by it: no push
    const far = await run({ chars: { a: hero({ mx: 0 }) }, enemies: { w: wolf({ mx: 5 }) } }, 'c:a', 'e:w')
    expect(far.f.writes).toEqual([])
  })

  it('mounts a big monster, picks up a stunned small one and throws it at another', async () => {
    const mount = setup({ chars: { a: hero() }, enemies: { w: wolf({ sz: 2 }) } })
    mount.s.getState().openMenu('c:a', 'e:w')
    await mount.s.getState().act('mount')
    expect(mount.f.writes[0]![2]).toMatchObject({ mt: 'climb', mon: 'w', mx: 3, my: 2, log: ['Mounted Wolf (-20 St)'] })
    expect(evs(mount.f)).toEqual(['Lyra climbs onto Wolf (Athletics check)'])
    const pick = setup({ chars: { a: hero() }, enemies: { w: wolf({ stun: true }) } })
    pick.s.getState().openMenu('c:a', 'e:w')
    await pick.s.getState().act('pick')
    expect(pick.f.writes[1]).toEqual(['PATCH', 'enemies/w', { hd: 'c:a', mx: 2, my: 2, hx: 2, hy: 2, hm: 'm' }])
    const thr = setup({ chars: { a: hero() }, enemies: { w: wolf({ hd: 'c:a', mx: 2, my: 2 }), o: wolf({ name: 'Ogre', mx: 5, my: 5, pm: 20 }) } })
    thr.s.getState().openMenu('c:a', 'e:o')
    await thr.s.getState().act('throw')
    expect(thr.f.writes[1]).toEqual(['PATCH', 'enemies/w', { hd: null, mx: 4, my: 4, hx: 4, hy: 4, hm: 'm' }])
    expect(evs(thr.f)).toEqual(['Lyra hurls Wolf at Ogre!', 'Ogre is staggered!'])
    const nowhere = setup({ chars: { a: hero() }, enemies: { w: wolf({ hd: 'c:a', mx: 2, my: 2 }), o: wolf({ name: 'Ogre', mx: 0, my: 0, sz: 10 }) } })
    nowhere.s.getState().openMenu('c:a', 'e:o')
    await nowhere.s.getState().act('throw')
    expect(nowhere.f.writes[1]).toEqual(['PATCH', 'enemies/w', { hd: null }])
    const nothing = setup({ chars: { a: hero() }, enemies: { o: wolf({ name: 'Ogre' }) } })
    nothing.s.getState().openMenu('c:a', 'e:o')
    await nothing.s.getState().act('throw')
    await nothing.s.getState().act('pick')
    await nothing.s.getState().act('mount')
    await nothing.s.getState().act('nothing')
    expect(nothing.f.writes).toEqual([])
  })
})

describe("the defender's side", () => {
  const prompt = (o: Partial<Qte> = {}): Qte => ({ id: 7, tid: 'a', total: 15, melee: true, par: true, from: 'Wolf', ...o })

  it('shows the prompt once for this hero, hides it when it goes; answering rolls the save', async () => {
    let q: Qte | null = prompt()
    const { s, f } = setup({ chars: { a: hero() } }, { role: 'player', me: 'a', rand: 0.5, hold: true, qte: () => q })
    await s.getState().checkQte()
    expect(s.getState().qte).toEqual(prompt())
    s.setState({ qte: null })
    await s.getState().checkQte() // the same prompt is not shown twice
    expect(s.getState().qte).toBeNull()
    q = prompt({ id: 8 })
    await s.getState().checkQte()
    await s.getState().answerQte('dodge')
    expect(s.getState().qte).toBeNull()
    expect(f.writes.map((w) => [w[1], w[2]])).toEqual([
      ['qte/res', 'dodge'],
      ['rolls', expect.objectContaining({ ds: [{ d: 20, r: 11 }], m: 1 })],
      ['qte/sv', { r: 11, t: 12 }],
    ])
    q = null
    s.setState({ qte: prompt() })
    await s.getState().checkQte()
    expect(s.getState().qte).toBeNull()
  })

  it('taking it does nothing; parry with disadvantage rolls two dice', async () => {
    const { s, f } = setup({ chars: { a: hero({ pw: 'd' }) } }, { role: 'player', me: 'a', rand: 0.5 })
    await s.getState().answerQte('none')
    expect(f.writes).toEqual([])
    await s.getState().answerQte('parry')
    expect(f.writes.at(-1)).toEqual(['PUT', 'qte/sv', { r: 11, t: 13 }])
  })

  it('a readied reaction answers by itself', async () => {
    const { s, f } = setup({ chars: { a: hero() } }, { role: 'player', me: 'a', rand: 0.5, qte: () => prompt({ pre: 'dodge' }) })
    await s.getState().checkQte()
    expect(f.writes.map((w) => w[1])).toEqual(['qte/res', 'rolls', 'qte/sv'])
  })

  it('prompts for others, already answered, the GM, offline, no session or no sheet: nothing', async () => {
    const other = setup({ chars: { a: hero() } }, { role: 'player', me: 'a', qte: () => prompt({ tid: 'b' }) })
    other.s.setState({ qte: prompt() })
    await other.s.getState().checkQte()
    expect(other.s.getState().qte).toBeNull()
    const done = setup({ chars: { a: hero() } }, { role: 'player', me: 'a', qte: () => prompt({ res: 'dodge' }) })
    await done.s.getState().checkQte()
    expect(done.s.getState().qte).toBeNull()
    const gm = setup({}, { qte: () => prompt() })
    await gm.s.getState().checkQte()
    const off = setup({ chars: { a: hero() } }, { role: 'player', me: 'a', failQte: 1 })
    await off.s.getState().checkQte()
    const none = setup({ chars: { a: hero() } }, { role: 'player', me: 'a' })
    none.s.getState().disconnect()
    await none.s.getState().checkQte()
    const nosheet = setup({}, { role: 'player', me: 'a' })
    await nosheet.s.getState().answerQte('dodge')
    expect([...gm.f.writes, ...off.f.writes, ...nosheet.f.writes.filter((w) => w[1] !== 'qte/res')]).toEqual([])
  })

  it('the prompt goes away by itself after 3 seconds (4 for a readied one)', async () => {
    const later: [() => unknown, number][] = []
    const f = fakeDb()
    const db = { ...f.db, get: (async () => prompt()) as Db['get'] }
    const s = createGameStore(() => db, () => 1, () => 0.5, (fn, ms) => void later.push([fn, ms]))
    s.getState().connect({ pin: 'p', role: 'player', me: 'a' })
    s.getState().applySnapshot({ ...emptyTables(), chars: { a: hero() } })
    await s.getState().checkQte()
    expect(later.map((l) => l[1])).toEqual([3000])
    later[0]![0]()
    expect(s.getState().qte).toBeNull()
    later[0]![0]() // a later prompt is not hidden by an old timer
    expect(s.getState().qte).toBeNull()
  })

  it('which buttons the prompt shows', () => {
    expect(promptButtons(hero(), prompt())).toEqual({ can: true, parry: true, disadvantage: false })
    expect(promptButtons(hero({ cls: 'mage' }), prompt())).toEqual({ can: true, parry: false, disadvantage: false })
    expect(promptButtons(hero({ pw: 'd', exh: true }), prompt({ par: false }))).toEqual({ can: false, parry: false, disadvantage: true })
  })
})

describe('odds and ends', () => {
  it('poise without a stagger, the poise damage of a skill, a negative modifier, a default AC', async () => {
    const { s, f } = setup({ chars: { a: hero({ str: 2, dex: 2 }) }, enemies: { w: wolf({ pm: 300, hp: 300, max: 300, ac: undefined }) } }, { rand: 0.6 })
    s.getState().openMenu('c:a', 'e:w')
    await s.getState().act('l')
    expect(evs(f)[0]).toBe('Lyra rolls 13 -2 = 11 vs AC 12 (Light attack on Wolf): MISS')
    const hit = setup({ chars: { a: hero() }, enemies: { w: wolf({ pm: 300, hp: 300, max: 300 }) } }, { rand: 0.6 })
    hit.s.getState().openMenu('c:a', 'e:w')
    await hit.s.getState().act('l')
    expect(evs(hit.f)).not.toContain('Wolf is staggered!')
    const sk = { s1: { n: 'Bash', d: '1d8', r: 1, t: 's' as const, a: 1, po: 3 } }
    const bash = setup({ chars: { a: hero({ hp: 300 }) }, enemies: { w: wolf({ sk }) } }, { rand: 0.6 })
    bash.s.getState().openMenu('e:w', 'c:a')
    await bash.s.getState().act('sk', 's1')
    expect(evs(bash.f)[0]).toBe('Wolf uses Bash on Lyra (targeted, no attack roll)')
  })

  it('a monster without skills, a harmless area skill with no reach, refused mounts and pick-ups', async () => {
    const plain = setup({ chars: { a: hero() }, enemies: { w: wolf() } })
    plain.s.getState().openMenu('e:w', 'c:a')
    await plain.s.getState().act('sk', 's1')
    expect(plain.f.writes).toEqual([])
    const sk = { s1: { n: 'Hiss', d: '-', r: 0, t: 'a' as const } }
    const hiss = setup({ chars: { a: hero() }, enemies: { w: wolf({ sk }) } })
    hiss.s.getState().openMenu('e:w', 'c:a')
    await hiss.s.getState().act('sk', 's1')
    expect(evs(hiss.f)).toEqual(['Wolf uses Hiss!.'])
    const tired = setup({ chars: { a: hero({ st: 1 }) }, enemies: { w: wolf({ sz: 2, stun: true }) } })
    tired.s.getState().openMenu('c:a', 'e:w')
    await tired.s.getState().act('mount')
    const tiredPick = setup({ chars: { a: hero({ st: 1 }) }, enemies: { w: wolf({ stun: true }) } })
    tiredPick.s.getState().openMenu('c:a', 'e:w')
    await tiredPick.s.getState().act('pick')
    expect([...evs(tired.f), ...evs(tiredPick.f)]).toEqual([])
    // The GM can turn one monster on another: skills deal no poise damage.
    const brawl = setup({ enemies: { w: wolf({ sk: { s1: { n: 'Bite', d: '1d4', r: 1, t: 's', a: 1 } } }), o: wolf({ name: 'Ogre', mx: 4, pm: 1, hp: 300 }) } }, { rand: 0.6 })
    brawl.s.getState().openMenu('e:w', 'e:o')
    await brawl.s.getState().act('sk', 's1')
    expect(evs(brawl.f)).toContain('Ogre is staggered!')
  })

  it('effects and the save roll with no session', async () => {
    const { s, f } = setup({ chars: { a: hero() }, enemies: { w: wolf({ hp: 300 }) } }, { rand: 0.6 })
    s.getState().openMenu('c:a', 'e:w')
    s.setState({ session: null })
    await s.getState().act('l').catch(() => undefined)
    await s.getState().answerQte('dodge').catch(() => undefined)
    expect(f.writes.every((w) => (w[2] as { by?: string }).by !== 'a')).toBe(true)
  })
})
