import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Board } from '../logic/board'
import type { Sheet } from '../logic/sheet'
import type { Enemy } from '../logic/types'
import { fakeDb } from '../testing/fakeDb'
import { currentMap, currentMapId } from './sheetActions'
import { createGameStore, emptyTables, type Tables } from './store'

afterEach(() => vi.useRealTimers())

const hero = (o: Partial<Sheet> = {}): Sheet => ({ name: 'Lyra', cls: 'archer', hp: 60, maxHp: 100, st: 50, maxSt: 120, rg: 15, fl: 2, maxFl: 4, int: 14, level: 3, ...o })

function setup(t: Partial<Tables>, opts: { role?: 'gm' | 'player'; me?: string; rand?: () => number; clock?: () => number; noDb?: boolean } = {}) {
  const f = fakeDb()
  const later: (() => unknown)[] = []
  let time = 100_000
  const s = createGameStore(
    () => (opts.noDb ? null : f.db),
    opts.clock ?? (() => time),
    opts.rand ?? (() => 0.5),
    (fn) => void later.push(fn),
  )
  s.getState().connect({ pin: 'p', role: opts.role ?? 'gm', me: opts.me ?? 'gm' })
  s.getState().applySnapshot({ ...emptyTables(), ...t })
  const runLater = async () => {
    for (const fn of later.splice(0)) await fn()
  }
  const tick = (ms: number) => (time += ms)
  return { s, f, runLater, tick, a: s.getState() }
}

const MAP = { w: 500, h: 500, cols: 10, fog: 1, al: { a: '1,1', b: '5,5' }, bf: { a: '8,8' } }

describe('which map the sheet looks at', () => {
  it('the live map, or else the first one', () => {
    const t = { ...emptyTables(), maps: { m1: { n: 1 }, m2: { n: 2 } } }
    expect(currentMapId({ ...t, cur: 'm2' })).toBe('m2')
    expect(currentMapId({ ...t, cur: 'gone' })).toBe('m1')
    expect(currentMap({ ...t, cur: null })).toEqual({ n: 1 })
    expect(currentMapId(emptyTables())).toBeNull()
    expect(currentMap(emptyTables())).toBeNull()
  })
})

describe('typed boxes and removing', () => {
  it('saves fields without a log line, for the owner or the GM only', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero({ name: 'B' }) } }, { role: 'player', me: 'a' })
    await s.getState().patchCharacter('a', { notes: 'hi' })
    await s.getState().patchCharacter('b', { notes: 'no' })
    await s.getState().patchCharacter('zz', { notes: 'no' })
    expect(f.writes).toEqual([['PATCH', 'chars/a', { notes: 'hi' }]])
    expect(s.getState().tables.chars.a).toMatchObject({ notes: 'hi' })
    expect(s.getState().tables.chars.b).not.toHaveProperty('notes')
  })

  it('removes a character with its icon and portrait', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero() } })
    await s.getState().removeCharacter('a')
    expect(Object.keys(s.getState().tables.chars)).toEqual(['b'])
    expect(f.writes).toEqual([
      ['DELETE', 'chars/a', null],
      ['DELETE', 'icons/a', null],
      ['DELETE', 'portraits/a', null],
    ])
  })
})

describe('resting', () => {
  it('a bonfire: players must stand next to one; the GM can rest anyone', async () => {
    const far = setup({ chars: { a: hero({ mx: 0, my: 0 }) }, maps: { m: MAP }, cur: 'm' }, { role: 'player', me: 'a' })
    await far.a.rest('a', 'bf')
    expect(far.f.writes).toEqual([])
    expect(far.s.getState().error).toBe('You can only use a bonfire when standing next to one.')
    const near = setup({ chars: { a: hero({ mx: 7, my: 8 }) }, maps: { m: MAP }, cur: 'm' }, { role: 'player', me: 'a' })
    await near.a.rest('a', 'bf')
    expect(near.f.writes[0]).toEqual(['PATCH', 'chars/a', expect.objectContaining({ hp: 100, st: 120, log: ['Rested at a bonfire: fatigue cleared'] })])
    const gm = setup({ chars: { a: hero() } })
    await gm.a.rest('a', 'bf')
    expect(gm.f.writes).toHaveLength(1)
  })

  it('nothing happens for the dead or a missing sheet', async () => {
    const { a, f } = setup({ chars: { a: hero({ hp: 0 }) } })
    await a.rest('a', 'al')
    await a.rest('zz', 'bf')
    expect(f.writes).toEqual([])
  })

  it('an altar: refills, sends the Golden Wave, and the world resets 1.5 s later', async () => {
    const far = setup({ chars: { a: hero({ mx: 9, my: 0 }) }, maps: { m: MAP } }, { role: 'player', me: 'a' })
    await far.a.rest('a', 'al')
    expect(far.s.getState().error).toBe('You can only rest next to an altar.')
    expect(far.f.writes).toEqual([])

    const { s, f, runLater, tick } = setup(
      {
        chars: { a: hero({ mx: 2, my: 2, dth: 1, cb: '5,5' }) },
        maps: { m: MAP },
        cur: 'm',
        enemies: { w: { name: 'Wolf', hp: 0, max: 30, mx: 4, my: 4 }, d: { name: 'Drake', hp: 0, max: 99, sz: 4 } },
      },
      { role: 'player', me: 'a' },
    )
    await s.getState().rest('a', 'al')
    expect(f.writes).toEqual([
      ['PATCH', 'chars/a', expect.objectContaining({ dth: 0, log: ['Cleansed at a new altar: the curse lifts'] })],
      ['POST', 'rolls', { wave: { m: 'm', x: 1.5, y: 1.5 }, ts: 100_000, by: 'a' }],
      ['POST', 'rolls', { ev: 'The Golden Wave sweeps across the land...', ts: 100_000 }],
    ])
    await runLater()
    expect(f.writes.slice(3)).toEqual([
      ['PATCH', 'enemies/w', expect.objectContaining({ hp: 30, mx: 4, my: 4, hx: 4, hy: 4 })],
      ['POST', 'rolls', { ev: 'The monsters return to their posts (unique foes stay dead)', ts: 100_000 }],
    ])
    // A second rest within 8 seconds refills but sends no second wave.
    f.writes.length = 0
    tick(5000)
    await s.getState().rest('a', 'al')
    expect(f.writes.map((w) => w[1])).toEqual(['chars/a'])
    tick(3000)
    await s.getState().rest('a', 'al')
    expect(f.writes.map((w) => w[1])).toEqual(['chars/a', 'chars/a', 'rolls', 'rolls'])
  })

  it('the GM resting someone away from any altar: the wave starts mid-map, and nothing to reset says nothing', async () => {
    const { s, f, runLater } = setup({ chars: { a: hero() }, maps: { m: MAP } })
    const waves: unknown[] = []
    s.getState().setEffects({ scene: () => {}, wave: (w) => void waves.push(w), boss: () => {} })
    await s.getState().rest('a', 'al')
    expect(f.writes[1]).toEqual(['POST', 'rolls', { wave: { m: 'm', x: 5, y: 5 }, ts: 100_000, by: 'gm' }])
    expect(waves).toEqual([{ m: 'm', x: 5, y: 5 }]) // shown here too
    await runLater()
    expect(f.writes).toHaveLength(3)
  })

  it('the real store waits 1.5 s before resetting the world', async () => {
    vi.useFakeTimers()
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().applySnapshot({ ...emptyTables(), chars: { a: hero() }, enemies: { w: { name: 'W', hp: 0, max: 5 } } })
    await s.getState().rest('a', 'al')
    expect(f.writes.some((w) => w[1] === 'enemies/w')).toBe(false)
    await vi.advanceTimersByTimeAsync(1500)
    expect(f.writes.some((w) => w[1] === 'enemies/w')).toBe(true)
  })
})

describe('reviving', () => {
  const party = (bHp: number): Partial<Tables> => ({
    chars: { a: hero({ hp: 0, mx: 9, my: 9 }), b: hero({ name: 'Bo', hp: bHp }), c: hero({ name: 'New', hp: 50, ap: false }) },
    maps: { m: MAP },
    cur: 'm',
    enemies: { w: { name: 'W', hp: 0, max: 5 } },
  })

  it('rises at the altar, reveals the fog there, and only a whole-party wipe resets the world', async () => {
    const one = setup(party(20))
    await one.a.reviveAt('a', '1,1')
    expect(one.f.writes.map((w) => w[1])).toEqual(['chars/a', 'rolls', 'maps/m'])
    expect(one.f.writes[1]![2]).toEqual({ ev: 'Lyra rises again at an altar, weaker than before (curse x1)', ts: 100_000 })
    expect((one.f.writes[2]![2] as { fg: string }).fg.slice(0, 10)).toBe('1111100000')
    expect(one.s.getState().tables.maps.m!.fg).toHaveLength(100)

    const wipe = setup(party(0))
    await wipe.a.reviveAt('a', '1,1')
    expect(wipe.f.writes.map((w) => (w[2] as { ev?: string }).ev ?? w[1])).toEqual([
      'chars/a',
      'Lyra rises again at an altar, weaker than before (curse x1)',
      'maps/m',
      'The whole party has fallen...',
      'rolls',
      'The Golden Wave sweeps across the land...',
    ])
  })

  it('no fog on the map, no map, the living and missing sheets', async () => {
    const noFog = setup({ chars: { a: hero({ hp: 0 }) }, maps: { m: { ...MAP, fog: 0 } } })
    await noFog.a.reviveAt('a', '1,1')
    expect(noFog.f.writes.map((w) => w[1])).toEqual(['chars/a', 'rolls', 'rolls', 'rolls', 'rolls'])
    const noMap = setup({ chars: { a: hero({ hp: 0 }) } })
    await noMap.a.reviveAt('a', '1,1')
    expect(noMap.f.writes[3]![2]).toMatchObject({ wave: { m: null, x: 1.5, y: 1.5 } })
    const alive = setup({ chars: { a: hero() } })
    await alive.a.reviveAt('a', '1,1')
    await alive.a.reviveAt('zz', '1,1')
    expect(alive.f.writes).toEqual([])
  })
})

describe('putting down a carried monster', () => {
  it('by a hero or a monster, with a log line; nothing to say without a carrier', async () => {
    const { s, f } = setup({
      chars: { a: hero() },
      enemies: { w: { name: 'Imp', hd: 'c:a' }, x: { name: 'Rat', hd: 'e:t' }, t: { name: 'Troll' }, y: { name: 'Bat', hd: 'c:gone' }, z: { name: 'Elk' } } as Record<string, Enemy>,
    })
    await s.getState().putDown('w')
    await s.getState().putDown('x')
    await s.getState().putDown('y')
    await s.getState().putDown('z')
    await s.getState().putDown('missing')
    expect(f.writes.map((w) => [w[1], (w[2] as { ev?: string }).ev ?? w[2]])).toEqual([
      ['enemies/w', { hd: null }],
      ['rolls', 'Lyra puts down Imp'],
      ['enemies/x', { hd: null }],
      ['rolls', 'Troll puts down Rat'],
      ['enemies/y', { hd: null }],
      ['enemies/z', { hd: null }],
    ])
  })
})

describe('using abilities', () => {
  const board: Board = {
    s: { n: 'Smoke', k: 'util', c: 2 },
    h: { n: 'Mend', k: 'heal', d: '2d6', b: 'int' },
    c: { n: 'Sneak', k: 'check', b: 'dex' },
    g: { n: 'Smoke (Golden)', k: 'util', hc: 10, gb: 's' },
  }

  it('pays for a plain ability and is ignored when locked', async () => {
    const { s, f } = setup({ chars: { a: hero(), b: hero({ exh: true }) }, board }, { role: 'player', me: 'a' })
    await s.getState().castAbility('a', 'Smoke', 2, false)
    await s.getState().castAbility('b', 'Smoke', 2, false)
    await s.getState().castAbility('zz', 'Smoke', 2, false)
    expect(f.writes).toEqual([['PATCH', 'chars/a', { st: 30, used: 1, ua: true, log: ['Used Smoke (-20 St)'] }]])
    await s.getState().castAbility('a', 'Smoke (Golden)', 1, false)
    expect(f.writes[1]![2]).toMatchObject({ st: 20, hp: 50, used: 2 })
  })

  it('a player in combat can only act on their turn', async () => {
    const { s, f } = setup({ chars: { a: hero() }, board, ini: { ph: 'go', t: 0, l: [{ k: 'e:w' }] } }, { role: 'player', me: 'a' })
    await s.getState().castAbility('a', 'Smoke', 2, false)
    expect(f.writes).toEqual([])
  })

  it('a heal rolls its dice (shared by players) and heals the total x10', async () => {
    const { s, f } = setup({ chars: { a: hero({ hp: 20 }) }, board }, { role: 'player', me: 'a', rand: () => 0.5 })
    await s.getState().castAbility('a', 'Mend', 1, false)
    expect(f.writes.map((w) => w[2])).toEqual([
      { st: 40, used: 1, ua: true, log: ['Used Mend (-10 St)'] },
      {
        n: 'Lyra',
        ds: [
          { d: 6, r: 4 },
          { d: 6, r: 4 },
        ],
        m: 2,
        ts: 100_000,
        sk: 'classic',
        by: 'a',
      },
      { hp: 100, log: ['Used Mend (-10 St)', 'Healed 100'] },
      { ev: 'Lyra heals 100 with Mend', ts: 100_000 },
    ])
  })

  it("the Saint's Medal adds 10 to a heal", async () => {
    const { s, f } = setup({ chars: { a: hero({ hp: 20, a1: 'am_medal' }) }, board }, { role: 'player', me: 'a', rand: () => 0.5 })
    await s.getState().castAbility('a', 'Mend', 1, false)
    expect(f.writes.map((w) => (w[2] as { ev?: string }).ev).filter(Boolean)).toEqual(['Lyra heals 110 with Mend'])
  })

  it("a check rolls d20 + bonus + proficiency; the GM's rolls stay secret", async () => {
    const { s, f } = setup({ chars: { a: hero({ dex: 16 }) }, board }, { rand: () => 0 })
    await s.getState().castAbility('a', 'Sneak', 1, false)
    expect(f.writes.map((w) => w[2])).toEqual([
      { st: 40, used: 1, ua: true, log: ['Used Sneak (-10 St)'] },
      { ev: 'Lyra tries Sneak: 6', ts: 100_000 },
    ])
  })

  it('the default board is used when the table has none', async () => {
    const { s, f } = setup({ chars: { a: hero({ cls: 'fighter', level: 1 }) } })
    await s.getState().castAbility('a', 'Second Wind', 2, false)
    expect(f.writes.map((w) => (w[2] as { ev?: string }).ev).filter(Boolean)).toEqual(['Lyra heals 70 with Second Wind'])
  })

  it('a roll from a player without a sheet is signed "?"', async () => {
    const { s, f } = setup({}, { role: 'player', me: 'nobody', rand: () => 0 })
    expect(await s.getState().roll([20, 4], 1)).toEqual([1, 1])
    expect(f.writes[0]![2]).toMatchObject({
      n: '?',
      ds: [
        { d: 20, r: 1 },
        { d: 4, r: 1 },
      ],
      m: 1,
      by: 'nobody',
    })
  })

  it('without a session a roll is signed by nobody', async () => {
    const { s, f } = setup({}, { role: 'player' })
    s.getState().disconnect()
    await s.getState().roll([6], 0)
    expect(f.writes[0]![2]).toMatchObject({ by: '' })
  })
})

it('notices show as the message, and the wave works without a session', async () => {
  const { s, f } = setup({ chars: { a: hero() } })
  s.getState().notice('Hello')
  expect(s.getState().error).toBe('Hello')
  // Signed out mid-rest: the wave still goes out, signed by nobody.
  const t = s.getState().tables
  s.getState().disconnect()
  s.getState().applySnapshot(t)
  s.setState({ dm: true })
  await s.getState().rest('a', 'al')
  expect(f.writes[1]![2]).toMatchObject({ by: '' })
})
