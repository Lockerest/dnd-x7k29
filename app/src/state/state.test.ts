import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../db/client'
import { clearSession, loadPrefs, loadSession, savePrefs, saveSession, sessionKey } from './session'
import { createGameStore, emptyTables, type Tables } from './store'
import { mapMigration, refresh, refreshPaths, startSync } from './sync'
import { characterChange, enemyChange } from './updates'

describe('characterChange', () => {
  it('logs the message, keeping the last 10 lines', () => {
    const log = Array.from({ length: 12 }, (_, i) => `l${i}`)
    const { patch, next } = characterChange({ name: 'A', st: 50, log }, { st: 40 }, 'Used X')
    expect(patch.log).toEqual([...log.slice(-9), 'Used X'])
    expect(next).toMatchObject({ name: 'A', st: 40 })
  })
  it('no message, no new line; a missing log starts empty', () => expect(characterChange({}, { hp: 5 }).patch).toEqual({ hp: 5, log: [] }))
  it('empty stamina exhausts and drops off a climb', () => {
    const { patch } = characterChange({ st: 10, mt: 'climb' }, { st: 0 }, 'Run')
    expect(patch).toEqual({ st: 0, exh: true, mt: '', mon: null, log: ['Run - stamina empty: EXHAUSTED'] })
    expect(characterChange({}, { st: -5 }).patch.log).toEqual(['stamina empty: EXHAUSTED'])
  })
  it('already exhausted, or exhaustion set explicitly: no extra message', () => {
    expect(characterChange({ exh: true }, { st: 0 }).patch).toEqual({ st: 0, log: [] })
    expect(characterChange({}, { st: 0, exh: true }).patch).toEqual({ st: 0, exh: true, log: [] })
  })
  it('clearing exhaustion resets its countdown', () => expect(characterChange({ exh: true, exn: 2 }, { exh: false, st: 0 }).patch).toEqual({ exh: false, st: 0, exn: 0, log: [] }))
})

describe('enemyChange', () => {
  const live = () => 'm1'
  it('remembers the home spot the first time it is placed', () => {
    expect(enemyChange({ name: 'W' }, { mx: 3, my: 4 }, {}, 'w', live).patch).toEqual({ mx: 3, my: 4, hx: 3, hy: 4, hm: 'm1' })
    expect(enemyChange({ name: 'W', mp: 'm2' }, { mx: 3, my: 4 }, {}, 'w', live).patch.hm).toBe('m2')
    expect(enemyChange({ name: 'W' }, { mx: 3, my: 4, mp: 'm3' }, {}, 'w', live).patch.hm).toBe('m3')
  })
  it('not again once it has a home, nor when unplacing or for new sheets', () => {
    expect(enemyChange({ hx: 1 }, { mx: 3, my: 4 }, {}, 'w', live).patch).toEqual({ mx: 3, my: 4 })
    expect(enemyChange({}, { mx: 3, hx: 9 }, {}, 'w', live).patch).toEqual({ mx: 3, hx: 9 })
    expect(enemyChange({}, { mx: null }, {}, 'w', live).patch).toEqual({ mx: null })
    expect(enemyChange(undefined, { mx: 1, my: 1 }, {}, 'w', live).patch).toEqual({ mx: 1, my: 1 })
  })
  it('climbers move with it', () => {
    const chars = { a: { mon: 'w', mt: 'climb' }, b: { mon: 'w', mt: '' }, c: { mon: 'x', mt: 'climb' } }
    expect(enemyChange({ hx: 0 }, { mx: 5, my: 6 }, chars, 'w', live).riders).toEqual({ a: { mx: 5, my: 6 } })
    expect(enemyChange({ hx: 0 }, { hp: 1 }, chars, 'w', live).riders).toEqual({})
  })
})

describe('session and prefs', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
  }
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  it('table screens keep a separate session, and the new app uses its own names', () => {
    expect(sessionKey('#table')).toBe('stT')
    expect(sessionKey('')).toBe('st')
    expect(sessionKey('', 'next.')).toBe('next.st')
  })
  it('clears a session', () => {
    const s = { ...mem(), removeItem: (k: string) => void s.m.delete(k) }
    saveSession(s, '', { pin: 'p', role: 'gm', me: 'gm' }, 'next.')
    expect(s.m.get('next.st')).toBeDefined()
    clearSession(s, '', 'next.')
    expect(s.m.has('next.st')).toBe(false)
    expect(() => clearSession({ removeItem: () => { throw new Error('x') } }, '')).not.toThrow()
  })
  it('saves and loads', () => {
    const s = mem()
    saveSession(s, '', { pin: 'p', role: 'gm', me: 'gm' })
    expect(loadSession(s, '')).toEqual({ pin: 'p', role: 'gm', me: 'gm' })
    expect(loadSession(s, '#table')).toEqual({})
  })
  it('survives blocked or broken storage', () => {
    expect(loadSession(broken, '')).toEqual({})
    expect(() => saveSession(broken, '', { pin: 'p', role: 'gm', me: 'gm' })).not.toThrow()
    const s = mem()
    s.setItem('st', '{bad')
    expect(loadSession(s, '')).toEqual({})
  })
  it('prefs defaults and round trip', () => {
    const s = mem()
    expect(loadPrefs(s)).toEqual({ sound: true, volume: 0.5, music: true, openEnemies: [] })
    savePrefs(s, { sound: false, volume: 0.8, music: false, openEnemies: ['a'] })
    expect(loadPrefs(s)).toEqual({ sound: false, volume: 0.8, music: false, openEnemies: ['a'] })
    savePrefs(s, { sound: true, music: true })
    expect(loadPrefs(s)).toMatchObject({ sound: true, music: true })
    savePrefs(s, {})
  })
  it('prefs clamp volume and ignore junk', () => {
    const s = mem()
    s.setItem('sv', '7')
    s.setItem('eop', '{"x":1}')
    expect(loadPrefs(s)).toMatchObject({ volume: 1, openEnemies: [] })
    s.setItem('sv', 'abc')
    s.setItem('eop', '[1,"b"]')
    expect(loadPrefs(s)).toMatchObject({ volume: 0, openEnemies: ['1', 'b'] })
    expect(loadPrefs(broken)).toEqual({ sound: true, volume: 0.5, music: true, openEnemies: [] })
    expect(() => savePrefs(broken, { sound: true })).not.toThrow()
  })
})

/** A fake Db over an in-memory tree, recording writes. */
function fakeDb(tree: Record<string, unknown> = {}) {
  const writes: [string, string, unknown][] = []
  const at = (path: string) => path.split('/').filter(Boolean).reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), tree) ?? null
  let fail = false
  const w = async (m: string, p: string, v: unknown) => {
    if (fail) throw new Error('offline')
    writes.push([m, p, v])
    return null
  }
  const db: Db = {
    pin: 't',
    url: (p) => p,
    get: async <T,>(p: string) => {
      if (fail) throw new Error('offline')
      return at(p) as T | null
    },
    keys: async (p) => Object.keys((at(p) as object) || {}),
    put: (p, v) => w('PUT', p, v),
    patch: (p, v) => w('PATCH', p, v),
    post: async (p, v) => (await w('POST', p, v), '-k'),
    del: (p) => w('DELETE', p, null),
  }
  return { db, writes, setFail: (f: boolean) => (fail = f), tree }
}

describe('game store', () => {
  const tables = (t: Partial<Tables>): Tables => ({ ...emptyTables(), ...t })
  it('connects, applies snapshots once, and disconnects', () => {
    const s = createGameStore(() => null)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    expect(s.getState()).toMatchObject({ dm: true, status: 'connecting' })
    expect(s.getState().applySnapshot(tables({ cur: 'm' }))).toBe(true)
    expect(s.getState().applySnapshot(tables({ cur: 'm' }))).toBe(false)
    expect(s.getState().status).toBe('live')
    s.getState().disconnect()
    expect(s.getState()).toMatchObject({ session: null, dm: false, status: 'idle' })
  })
  it('updates a character locally and saves the same change', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'player', me: 'a' })
    s.getState().applySnapshot(tables({ chars: { a: { name: 'A', st: 10 }, b: { name: 'B' } } }))
    await s.getState().updateCharacter('a', { st: 0 }, 'Dash')
    expect(s.getState().tables.chars.a).toMatchObject({ st: 0, exh: true })
    expect(f.writes).toEqual([['PATCH', 'chars/a', { st: 0, exh: true, mt: '', mon: null, log: ['Dash - stamina empty: EXHAUSTED'] }]])
  })
  it('players can only change their own character; nobody changes missing ones', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'player', me: 'a' })
    s.getState().applySnapshot(tables({ chars: { b: { name: 'B' } } }))
    await s.getState().updateCharacter('b', { hp: 1 })
    await s.getState().updateCharacter('zz', { hp: 1 })
    expect(f.writes).toEqual([])
  })
  it('the GM can change anyone; nothing is saved without a database', async () => {
    const s = createGameStore()
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().applySnapshot(tables({ chars: { b: { name: 'B' } } }))
    await s.getState().updateCharacter('b', { hp: 1 })
    expect(s.getState().tables.chars.b!.hp).toBe(1)
  })
  it('updates an enemy, moves climbers and saves both', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().applySnapshot(tables({ maps: { m1: {} }, chars: { a: { mon: 'w', mt: 'climb', mx: 0 } }, enemies: { w: { name: 'W' } } }))
    await s.getState().updateEnemy('w', { mx: 2, my: 3 })
    expect(s.getState().tables.enemies.w).toMatchObject({ mx: 2, hx: 2, hm: 'm1' })
    expect(s.getState().tables.chars.a).toMatchObject({ mx: 2, my: 3 })
    expect(f.writes).toEqual([
      ['PATCH', 'chars/a', { mx: 2, my: 3 }],
      ['PATCH', 'enemies/w', { mx: 2, my: 3, hx: 2, hy: 3, hm: 'm1' }],
    ])
  })
  it('the live map is cur when it exists', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().applySnapshot(tables({ maps: { m1: {}, m2: {} }, cur: 'm2', enemies: { w: {} } }))
    await s.getState().updateEnemy('w', { mx: 1, my: 1 })
    expect(s.getState().tables.enemies.w!.hm).toBe('m2')
  })
  it('logs events with a timestamp and shows save errors', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db, () => 42)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    await s.getState().log('Hello')
    expect(f.writes).toEqual([['POST', 'rolls', { ev: 'Hello', ts: 42 }]])
    f.setFail(true)
    await s.getState().log('Again')
    expect(s.getState().error).toBe('Connection problem: offline')
    s.getState().setError('weird')
    expect(s.getState().error).toBe('Connection problem: weird')
  })
})

describe('store: sessions, characters and takeovers', () => {
  const tables = (t: Partial<Tables>): Tables => ({ ...emptyTables(), ...t })
  it('the GM can look as a player; the device can switch character', () => {
    const s = createGameStore()
    s.getState().setMe('x') // nothing joined: ignored
    expect(s.getState().session).toBeNull()
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().setDm(false)
    expect(s.getState().dm).toBe(false)
    s.getState().setMe('c2')
    expect(s.getState().session).toEqual({ pin: 'p', role: 'gm', me: 'c2' })
  })
  it('puts a whole character', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'player', me: 'p1' })
    await s.getState().putCharacter('p1', { name: 'Lyra' })
    expect(s.getState().tables.chars.p1).toEqual({ name: 'Lyra' })
    expect(f.writes).toEqual([['PUT', 'chars/p1', { name: 'Lyra' }]])
  })
  it('a player sends and withdraws a takeover request', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    await s.getState().setMyClaim({ who: 'x' }) // not joined: ignored
    s.getState().connect({ pin: 'p', role: 'player', me: 'p1' })
    await s.getState().setMyClaim({ who: 'Sam', target: 'c1', st: 'pending' })
    expect(s.getState().tables.claims).toEqual({ who: 'Sam', target: 'c1', st: 'pending' })
    await s.getState().setMyClaim(null)
    expect(s.getState().tables.claims).toBeNull()
    expect(f.writes).toEqual([
      ['PUT', 'claims/p1', { who: 'Sam', target: 'c1', st: 'pending' }],
      ['DELETE', 'claims/p1', null],
    ])
  })
  it('the GM allows or refuses a request', async () => {
    const f = fakeDb()
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    s.getState().applySnapshot(tables({ claims: { p9: { who: 'Sam', st: 'pending' } } }))
    await s.getState().decideClaim('p9', 'ok')
    await s.getState().decideClaim('gone', 'no')
    const empty = createGameStore()
    empty.getState().connect({ pin: 'p', role: 'gm', me: 'gm' })
    await empty.getState().decideClaim('p1', 'ok') // no requests loaded yet
    expect(empty.getState().tables.claims).toBeNull()
    expect(s.getState().tables.claims).toEqual({ p9: { who: 'Sam', st: 'ok' } })
    expect(f.writes).toEqual([
      ['PATCH', 'claims/p9', { st: 'ok' }],
      ['PATCH', 'claims/gone', { st: 'no' }],
    ])
  })
})

describe('sync', () => {
  it('reads the same small paths as the live page', () => {
    expect(refreshPaths(true, 'gm').map((p) => p.path)).toContain('claims')
    expect(refreshPaths(false, 'c1').map((p) => p.path)).toContain('claims/c1')
    expect(refreshPaths(true, 'gm')).toHaveLength(17)
  })
  it('migrates old maps', () => {
    expect(mapMigration({ bf: { a: { x: 1 } } })).toEqual({ v2: 1, al: [{ x: 1 }], bf: null })
    expect(mapMigration({})).toEqual({ v2: 1 })
    expect(mapMigration({ v2: 1 })).toBeNull()
    expect(mapMigration(null)).toBeNull()
  })
  const tree = () => ({
    chars: { a: { name: 'A', hp: 12, maxHp: 12 }, b: { name: 'B', hp: 100, x10: true } },
    enemies: { w: { name: 'W', hp: 5, max: 5 } },
    maps: { m1: { bf: { x: { n: 1 } } } },
    cur: 'm1',
    combat: true,
    init: { l: [{ k: 'c:a' }] },
    board: {},
    meta: { build: 63, thv: 7, snd: 2, skiv: 3, mki: 4 },
  })
  it('a refresh applies the tables and reports asset versions', async () => {
    const f = fakeDb(tree())
    const s = createGameStore(() => f.db)
    expect(await refresh(s, f.db, new Set())).toBeNull()
    s.getState().connect({ pin: 't', role: 'player', me: 'a' })
    const r = await refresh(s, f.db, new Set())
    expect(r).toEqual({ changed: true, versions: { build: 63, themes: 7, sounds: 2, skillIcons: 3, mapIcons: 4 } })
    expect(s.getState().tables).toMatchObject({ cur: 'm1', combat: true, board: null, ini: { l: [{ k: 'c:a' }] } })
    expect(f.writes).toEqual([]) // players never migrate
  })
  it('the GM migrates old sheets once, and only once', async () => {
    const f = fakeDb(tree())
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
    const done = new Set<string>()
    await refresh(s, f.db, done)
    expect(s.getState().tables.chars.a).toMatchObject({ hp: 120, x10: true })
    expect(s.getState().tables.enemies.w).toMatchObject({ hp: 50, x10: true })
    expect(s.getState().tables.maps.m1).toMatchObject({ v2: 1, al: [{ n: 1 }], bf: null })
    expect(f.writes.map((w) => w[1]).sort()).toEqual(['chars/a', 'enemies/w', 'maps/m1'])
    await refresh(s, f.db, done)
    expect(f.writes).toHaveLength(3)
  })
  it('migration save failures are shown', async () => {
    const f = fakeDb(tree())
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
    const realPatch = f.db.patch
    f.db.patch = async () => {
      throw new Error('denied')
    }
    await refresh(s, f.db, new Set())
    expect(s.getState().error).toBe('Connection problem: denied')
    f.db.patch = realPatch
  })
  it('keeps a board that has entries', async () => {
    const f = fakeDb({ board: { fighter_power_strike: { n: 'Power Strike' } } })
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'player', me: 'a' })
    await refresh(s, f.db, new Set())
    expect(s.getState().tables.board).toEqual({ fighter_power_strike: { n: 'Power Strike' } })
  })
  it('startSync with defaults does nothing before a table is joined', async () => {
    const f = fakeDb(tree())
    const s = createGameStore(() => f.db)
    const get = vi.spyOn(f.db, 'get')
    const stop = startSync(s, f.db)
    await new Promise((r) => setTimeout(r, 0))
    stop()
    expect(get).not.toHaveBeenCalled()
  })
  it('empty tables and missing meta', async () => {
    const f = fakeDb({})
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'gm', me: 'gm' })
    expect(await refresh(s, f.db, new Set())).toEqual({ changed: true, versions: { build: null, themes: null, sounds: null, skillIcons: null, mapIcons: null } })
  })
  it('startSync refreshes now, on every tick without overlapping, and stops', async () => {
    const f = fakeDb(tree())
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'player', me: 'a' })
    let tick: () => void = () => {}
    const clear = vi.fn()
    const versions = vi.fn()
    const stop = startSync(s, f.db, { every: 10, onVersions: versions, timers: { set: ((fn: () => void) => ((tick = fn), 1)) as unknown as typeof setInterval, clear: clear as unknown as typeof clearInterval } })
    tick() // overlaps the first refresh: skipped
    await vi.waitFor(() => expect(versions).toHaveBeenCalledTimes(1))
    tick()
    await vi.waitFor(() => expect(versions).toHaveBeenCalledTimes(2))
    stop()
    expect(clear).toHaveBeenCalledWith(1)
  })
  it('startSync shows errors and keeps going; real timers by default', async () => {
    const f = fakeDb(tree())
    f.setFail(true)
    const s = createGameStore(() => f.db)
    s.getState().connect({ pin: 't', role: 'player', me: 'a' })
    const stop = startSync(s, f.db, { every: 5 })
    await vi.waitFor(() => expect(s.getState().error).toBe('Connection problem: offline'))
    f.setFail(false)
    await vi.waitFor(() => expect(s.getState().status).toBe('live'))
    stop()
  })
})
