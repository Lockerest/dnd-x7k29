import { describe, expect, it } from 'vitest'
import type { Sheet } from '../logic/sheet'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import type { BossIntro } from './enemyExtras'
import { createGameStore, emptyTables, type Tables } from './store'

const MAP = { name: 'Crypt', w: 500, h: 400, cols: 10 }
const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', hp: 10, mx: 1, my: 1, ...o })
const wolf = (o: Partial<Enemy> = {}): Enemy => ({ name: 'Wolf', hp: 10, mx: 2, my: 1, ...o })

function setup(t: Partial<Tables>, role: 'gm' | 'player' = 'gm') {
  const f = fakeDb()
  const later: [() => unknown, number][] = []
  const s = createGameStore(() => f.db, () => 5, () => 0.9, (fn, ms) => void later.push([fn, ms]))
  s.getState().connect({ pin: 'p', role, me: role === 'gm' ? 'gm' : 'a' })
  s.getState().applySnapshot({ ...emptyTables(), maps: { m: MAP }, cur: 'm', ...t })
  const intros: BossIntro[] = []
  s.getState().setEffects({ scene: () => {}, wave: () => {}, boss: (b) => void intros.push(b) })
  return { s, f, later, intros }
}
const evs = (f: ReturnType<typeof fakeDb>) => f.writes.flatMap((w) => ((w[2] as { ev?: string })?.ev ? [(w[2] as { ev: string }).ev] : []))

describe('auto turn', () => {
  it('stunned or with nobody to attack: says so', async () => {
    const st = setup({ chars: { a: hero() }, enemies: { w: wolf({ stun: true }) } })
    await st.s.getState().autoTurn('w')
    const no = setup({ chars: {}, enemies: { w: wolf() } })
    await no.s.getState().autoTurn('w')
    expect([...evs(st.f), ...evs(no.f)]).toEqual(['Wolf is stunned and cannot act', 'Wolf finds no one to attack'])
  })

  it('walks into reach (saying so), then attacks; out of reach it only walks', async () => {
    const { s, f } = setup({ chars: { a: hero({ mx: 5, my: 1, ac: 99 }) }, enemies: { w: wolf({ mx: 1, my: 1 }) } })
    await s.getState().autoTurn('w')
    expect(f.writes[0]).toEqual(['PATCH', 'enemies/w', expect.objectContaining({ mx: 4, mp: 'm' })]) // next to her
    expect(evs(f)[0]).toBe('Wolf advances on Lyra')
    expect(evs(f).at(-1)).toMatch(/^Wolf misses Lyra/)
    const far = setup({ chars: { a: hero({ mx: 9, my: 7 }) }, enemies: { w: wolf({ mx: 0, my: 0, spd: 1 }) } })
    await far.s.getState().autoTurn('w')
    expect(evs(far.f)).toEqual(['Wolf advances on Lyra'])
    // Already next to her: no walk.
    const near = setup({ chars: { a: hero({ ac: 99 }) }, enemies: { w: wolf() } })
    await near.s.getState().autoTurn('w')
    expect(evs(near.f)[0]).toMatch(/^Wolf misses Lyra/)
  })

  it('only the GM, a living placed monster that nobody carries, on a map', async () => {
    const cases: [Partial<Tables>, 'gm' | 'player'][] = [
      [{ chars: { a: hero() }, enemies: { w: wolf() } }, 'player'],
      [{ chars: { a: hero() }, enemies: {} }, 'gm'],
      [{ chars: { a: hero() }, enemies: { w: wolf({ hp: 0 }) } }, 'gm'],
      [{ chars: { a: hero() }, enemies: { w: wolf({ mx: null }) } }, 'gm'],
      [{ chars: { a: hero() }, enemies: { w: wolf({ hd: 'c:a' }) } }, 'gm'],
      [{ chars: { a: hero() }, enemies: { w: wolf() }, maps: {} }, 'gm'],
    ]
    for (const [t, role] of cases) {
      const x = setup(t, role)
      await x.s.getState().autoTurn('w')
      expect(x.f.writes).toEqual([])
    }
  })
})

describe('spawn point', () => {
  it('where it stands now; nothing when it is not placed', async () => {
    const { s, f } = setup({ enemies: { w: wolf({ mx: 3, my: 4 }), o: wolf({ mx: null }) } })
    await s.getState().setSpawn('w')
    await s.getState().setSpawn('o')
    await s.getState().setSpawn('gone')
    expect(f.writes).toEqual([['PATCH', 'enemies/w', { hx: 3, hy: 4 }]])
  })
})

describe('boss intros', () => {
  it('plays here and is shared; a missing enemy has none', async () => {
    const { s, f, intros } = setup({ enemies: { w: wolf({ bt: 'The Fallen', th: 'aethelric' }), o: wolf({ name: 'Ogre' }) } })
    await s.getState().bossIntro('w')
    await s.getState().bossIntro('o')
    await s.getState().bossIntro('gone')
    expect(intros).toEqual([
      { k: 'e:w', n: 'Wolf', t: 'The Fallen', th: 'aethelric' },
      { k: 'e:o', n: 'Ogre', t: '', th: '' },
    ])
    expect(f.writes[0]).toEqual(['POST', 'rolls', { boss: intros[0], ts: 5, by: 'gm' }])
    const nameless = setup({ enemies: { x: { hp: 1 } as Enemy } })
    nameless.s.setState({ session: null })
    await nameless.s.getState().bossIntro('x')
    expect(nameless.intros[0]!.n).toBe('')
    expect(nameless.f.writes[0]![2]).toMatchObject({ by: '' })
  })

  it('when combat begins: the first unseen boss in sight, once (not normal monsters, the dead, the unplaced, the hidden or elsewhere)', async () => {
    const enemies = {
      a: wolf({ rk: 'n' }),
      b: wolf({ rk: 'm', bi: true }),
      c: wolf({ rk: 'u', hp: 0 }),
      d: wolf({ rk: 'm', mx: null }),
      e: wolf({ rk: 'm', mp: 'n' }),
      f: wolf({ name: 'Drake', sz: 4, mx: 6, my: 4 }),
    }
    const { s, f, intros } = setup({ enemies, chars: { a: hero() } })
    await s.getState().introBosses()
    expect(intros.map((b) => b.n)).toEqual(['Drake'])
    expect(f.writes.at(-1)).toEqual(['PATCH', 'enemies/f', { bi: true }])
    // Hidden in the fog: no intro yet.
    const fog = setup({ enemies: { f: wolf({ rk: 'u', mx: 9, my: 7 }) }, chars: { a: hero({ mx: 0, my: 0 }) }, maps: { m: { ...MAP, fog: 1 } } })
    await fog.s.getState().introBosses()
    expect(fog.intros).toEqual([])
    // No maps at all: nothing hides it.
    const nomap = setup({ enemies: { f: wolf({ rk: 'u' }) }, maps: {}, cur: null })
    await nomap.s.getState().introBosses()
    expect(nomap.intros).toHaveLength(1)
  })

  it('begin combat and a phase change call for intros a moment later', async () => {
    const ini = { ph: 'roll' as const, t: 0, r: 1, l: [{ k: 'c:a', v: 5 }] }
    const { s, later, intros } = setup({ chars: { a: hero() }, enemies: { w: wolf({ nx: 'p', rk: 'm' }), p: wolf({ name: 'Wolf King', rk: 'u', mx: null }) }, ini })
    await s.getState().beginCombat()
    expect(later.map((l) => l[1])).toEqual([500])
    await later[0]![0]()
    expect(s.getState().tables.enemies.w!.bi).toBe(true)
    await s.getState().switchPhase('w', null)
    expect(later.at(-1)![1]).toBe(400)
    await later.at(-1)![0]()
    expect(intros.map((b) => b.n)).toEqual(['Wolf', 'Wolf King'])
  })
})
