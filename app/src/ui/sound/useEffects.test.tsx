// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../../db/client'
import { createGameStore } from '../../state/store'
import type { SoundEngine } from './engine'
import { useEffectsPlayer, type EffectsOptions } from './useEffects'

afterEach(cleanup)
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 }))))
afterEach(() => vi.unstubAllGlobals())

const AUDIO = `data:audio/mpeg;base64,${btoa('abc')}`

function fakeEngine(live = true) {
  const clips = new Set<string>()
  return {
    unlock: vi.fn(() => (live ? ({} as AudioContext) : null)),
    live: vi.fn(() => live),
    sfx: vi.fn(),
    wave: vi.fn(),
    boss: vi.fn(),
    bgStart: vi.fn((_b: unknown, _id: string) => true),
    bgStop: vi.fn(),
    bgId: vi.fn((): string | null => null),
    playTheme: vi.fn((_b: unknown, _d: number) => true),
    playClip: vi.fn((_k: string) => true),
    preview: vi.fn(),
    volumeTest: vi.fn(),
    setReverb: vi.fn(),
    cinematic: { thunk: vi.fn(), glow: vi.fn(), slam: vi.fn(), crack: vi.fn(), collapse: vi.fn() },
    decode: vi.fn(async () => ({ tag: 'buf' }) as unknown as AudioBuffer),
    setClip: vi.fn((k: string, b: AudioBuffer | null) => (b ? clips.add(k) : clips.delete(k))),
    hasClip: vi.fn((k: string) => clips.has(k)),
    clearSlots: vi.fn(() => clips.clear()),
  }
}

function fakeDb(tree: Record<string, unknown>, fail = false) {
  const get = vi.fn(async (p: string) => {
    if (fail) throw new Error('offline')
    return (tree[p] ?? null) as never
  })
  return { get, keys: vi.fn(async () => (tree.__keys as string[]) ?? []) } as unknown as Db & { get: typeof get }
}

const mem = (o: Record<string, string> = {}) => {
  const m = new Map(Object.entries(o))
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

const box: { latest?: ReturnType<typeof useEffectsPlayer> } = {}
function Harness(p: EffectsOptions) {
  const r = useEffectsPlayer(p)
  useEffect(() => {
    box.latest = r
  })
  return (
    <>
      {r.scene}
      {r.bossIntro}
    </>
  )
}

function setup(o: Partial<EffectsOptions> & { live?: boolean } = {}) {
  const engine = fakeEngine(o.live ?? true)
  const store = createGameStore()
  const props: EffectsOptions = {
    store,
    db: fakeDb({}),
    storage: mem(),
    soundVersion: null,
    board: { b: { n: 'Cleave', v: 'any', l: 1, c: 1, k: 'atk', d: '1d8', r: 1 } },
    abilityImages: {},
    drawnIcons: false,
    picture: () => null,
    shownMap: 'm',
    cols: 10,
    engine: engine as unknown as SoundEngine,
    maxWaiting: 2,
    ...o,
  }
  const r = render(<Harness {...props} />)
  return { engine, store, r, props, rerender: (p: Partial<EffectsOptions>) => r.rerender(<Harness {...props} {...p} />) }
}
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))))

describe('settings', () => {
  it("read from this device; changing them saves; turning sound on starts audio; the volume slider plays a test sound", () => {
    const storage = mem({ sc: '0', sn: '0' })
    const { engine } = setup({ storage })
    expect(box.latest!.fx).toEqual({ scenes: false, s25: true, sound: false, volume: 0.5, reverb: 0.5, music: true })
    act(() => box.latest!.setFx({ sound: true }))
    expect(engine.unlock).toHaveBeenCalled()
    act(() => box.latest!.setFx({ volume: 0.8 }))
    expect(engine.volumeTest).toHaveBeenCalled()
    act(() => box.latest!.setFx({ sound: false }))
    expect(box.latest!.fx).toMatchObject({ sound: false, volume: 0.8 })
    expect(storage.m.get('sv')).toBe('0.8')
    expect(box.latest!.cinematicSounds).toBe(engine.cinematic)
  })

  it('uses the browser engine when none is given', () => {
    const { r } = setup({ engine: undefined })
    expect(box.latest!.engine.live()).toBe(false)
    r.unmount()
  })
})

describe("the GM's clips", () => {
  it('load when their version changes and decode at once when audio runs', async () => {
    const db = fakeDb({ sounds: { slash: { data: AUDIO }, bad: null, empty: {} } })
    const { engine, rerender } = setup({ db })
    expect(db.get).not.toHaveBeenCalledWith('sounds')
    rerender({ soundVersion: 5 })
    await flush()
    expect(engine.clearSlots).toHaveBeenCalled()
    expect(engine.setClip).toHaveBeenCalledWith('slash', { tag: 'buf' })
    expect(engine.decode).toHaveBeenCalledTimes(1)
  })

  it('wait for the first tap while audio is not running; with sound off a tap does nothing', async () => {
    const db = fakeDb({ sounds: { slash: { data: AUDIO }, parry: { data: AUDIO } } })
    const engine = fakeEngine(false)
    engine.decode.mockResolvedValueOnce(null as unknown as AudioBuffer)
    setup({ db, soundVersion: 1, engine: engine as unknown as SoundEngine, storage: mem({ sn: '0' }) })
    await flush()
    document.dispatchEvent(new Event('pointerdown'))
    expect(engine.unlock).not.toHaveBeenCalled()
    act(() => box.latest!.setFx({ sound: true }))
    document.dispatchEvent(new Event('keydown'))
    await flush()
    expect(engine.decode).toHaveBeenCalledTimes(2)
    expect(engine.setClip).toHaveBeenCalledTimes(1) // one failed to decode
    document.dispatchEvent(new Event('touchend'))
    await flush()
    expect(engine.decode).toHaveBeenCalledTimes(3) // only the missing one again
  })

  it('a failed download keeps the old clips; none uploaded is an empty set', async () => {
    const { engine } = setup({ db: fakeDb({}, true), soundVersion: 1 })
    await flush()
    expect(engine.clearSlots).not.toHaveBeenCalled()
    const none = setup({ db: fakeDb({}), soundVersion: 2 })
    await flush()
    expect(none.engine.clearSlots).toHaveBeenCalled()
    setup({ db: null, soundVersion: 3 })
  })
})

describe('scenes', () => {
  it('play one at a time with their sound (and the ability sound, looked for once)', async () => {
    const db = fakeDb({ 'absnd/cleave': { data: AUDIO } })
    const { engine, store, r } = setup({ db })
    act(() => store.getState().effects!.scene({ a: 'c:a', t: 'e:w', an: 'Lyra', tn: 'Wolf', l: 'Cleave' }))
    expect(r.container.querySelector('.scn')).not.toBeNull()
    await flush()
    expect(engine.setClip).toHaveBeenCalledWith('ab:cleave', { tag: 'buf' })
    expect(engine.sfx).toHaveBeenCalledWith(expect.objectContaining({ l: 'Cleave' }))
    // Up to two waiting behind the one playing (here); more are dropped.
    act(() => {
      for (let i = 0; i < 4; i++) store.getState().effects!.scene({ a: 'c:a', t: 'e:w', an: `N${i}`, l: 'Cleave' })
    })
    expect(r.container.querySelector('.scn')).not.toBeNull()
    await flush()
    expect(engine.sfx).toHaveBeenCalledTimes(1)
    for (const name of ['N0', 'N1']) {
      await act(async () => void (await new Promise((res) => setTimeout(res, 3100))))
      await flush()
      expect(engine.sfx).toHaveBeenLastCalledWith(expect.objectContaining({ an: name }))
    }
    await act(async () => void (await new Promise((res) => setTimeout(res, 3100))))
    expect(r.container.querySelector('.scn')).toBeNull()
    expect(db.get.mock.calls.filter((c) => c[0] === 'absnd/cleave')).toHaveLength(1)
  }, 15000)

  it('no scene when scenes are off or a side is missing; odd ability names and no audio skip the ability sound', async () => {
    const off = setup({ storage: mem({ sc: '0' }) })
    act(() => off.store.getState().effects!.scene({ a: 'c:a', t: 'e:w' }))
    expect(off.r.container.querySelector('.scn')).toBeNull()
    cleanup()
    const { store, r } = setup()
    act(() => store.getState().effects!.scene({ a: 'c:a' }))
    expect(r.container.querySelector('.scn')).toBeNull()
    const looked: string[] = []
    for (const l of [undefined, 'Test', '!!!', 'Cleave']) {
      cleanup()
      const db = fakeDb({})
      const x = setup({ db })
      act(() => x.store.getState().effects!.scene({ a: 'c:a', t: 'e:w', l }))
      await flush()
      expect(x.engine.sfx).toHaveBeenCalledTimes(1)
      looked.push(...db.get.mock.calls.map((c) => c[0] as string))
    }
    expect(looked).toEqual(['absnd/cleave']) // only Cleave was looked for
    cleanup()
    const silent = setup({ live: false })
    act(() => silent.store.getState().effects!.scene({ a: 'c:a', t: 'e:w', l: 'Cleave' }))
    await flush()
    expect(silent.engine.sfx).toHaveBeenCalled()
    expect(silent.engine.setClip).not.toHaveBeenCalled()
  })

  it('a slow ability sound is not waited for more than 0.7 s; without a database there is none', async () => {
    const db = fakeDb({})
    db.get.mockImplementation(() => new Promise(() => {}))
    const { store, engine } = setup({ db })
    act(() => store.getState().effects!.scene({ a: 'c:a', t: 'e:w', l: 'Cleave' }))
    await act(async () => void (await new Promise((res) => setTimeout(res, 800))))
    expect(engine.sfx).toHaveBeenCalled()
    cleanup()
    const nodb = setup({ db: null })
    act(() => nodb.store.getState().effects!.scene({ a: 'c:a', t: 'e:w', l: 'Cleave' }))
    await flush()
    expect(nodb.engine.sfx).toHaveBeenCalled()
  })
})

describe('waves and other screens', () => {
  it("my Golden Wave plays here; others' recent scenes and waves too, not mine or old ones", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const map = document.createElement('div')
    map.setAttribute('aria-label', 'Map: Crypt')
    document.body.appendChild(map)
    const { store, engine, r } = setup()
    act(() => store.getState().effects!.wave({ m: 'm', x: 1, y: 1 }))
    expect(engine.wave).toHaveBeenCalledTimes(1)
    map.remove()
    act(() => box.latest!.remote({ wave: { x: 1, y: 1 }, by: 'b', ts: 0 }, 'a', 19999))
    act(() => box.latest!.remote({ wave: { x: 1, y: 1 }, by: 'b', ts: 0 }, 'a', 20000))
    act(() => box.latest!.remote({ wave: { x: 1, y: 1 }, by: 'a', ts: 0 }, 'a', 0))
    expect(engine.wave).toHaveBeenCalledTimes(2)
    act(() => box.latest!.remote({ fx: { a: 'c:a', t: 'e:w' }, by: 'b', ts: 0 }, 'a', 15000))
    expect(r.container.querySelector('.scn')).toBeNull()
    act(() => box.latest!.remote({ fx: { a: 'c:a', t: 'e:w' }, by: 'b' }, 'a', 14999))
    expect(r.container.querySelector('.scn')).not.toBeNull()
    r.unmount()
    expect(store.getState().effects).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('the wave on this window', () => {
  it('draws on the window it is given', () => {
    const ctx = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(), fillRect: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const frames: ((t: number) => void)[] = []
    const timers: (() => void)[] = []
    const win = {
      document,
      innerWidth: 100,
      innerHeight: 80,
      devicePixelRatio: 0,
      requestAnimationFrame: (f: (t: number) => void) => frames.push(f),
      performance: { now: () => 0 },
      setTimeout: (f: () => void) => timers.push(f),
      setInterval: () => 1,
      clearInterval: () => {},
    } as unknown as Window
    const { store } = setup({ win })
    act(() => store.getState().effects!.wave({ x: 1, y: 1 }))
    frames.shift()!(100)
    expect(ctx.arc).toHaveBeenCalled()
    timers[0]!()
    expect(document.querySelector('canvas.gwave')).toBeNull()
    vi.restoreAllMocks()
  })
})

describe('boss intros and battle music', () => {
  const themes = { __keys: ['aethelric', 'firstdefier'], 'themes/aethelric': { data: AUDIO }, 'themes/firstdefier': { data: AUDIO } }
  const withBosses = (o: Partial<EffectsOptions> & { live?: boolean } = {}) => {
    const x = setup({ db: fakeDb(themes), ...o })
    act(() => {
      x.store.getState().applySnapshot({ ...x.store.getState().tables, enemies: { a: { name: 'Aethelric', rk: 'u', hp: 9, mx: 1 }, d: { name: 'Defier', th: 'firstdefier', hp: 0 }, n: { name: 'Rat', hp: 9 } } })
    })
    x.engine.decode.mockResolvedValue({ tag: 'theme', duration: 4.2 } as unknown as AudioBuffer)
    return x
  }

  it("themes for the bosses on the table are ready before their intro: it starts the boss's battle music", async () => {
    const { store, engine, r, props } = withBosses({ bossArt: { a: 'data:art' } })
    await flush()
    await flush()
    expect((props.db as unknown as { get: ReturnType<typeof vi.fn> }).get.mock.calls.map((c) => c[0])).toEqual(['themes/aethelric', 'themes/firstdefier'])
    act(() => store.getState().effects!.boss({ k: 'e:a', n: 'Aethelric', t: 'The First', th: '' }))
    expect(engine.bgStart).toHaveBeenCalledWith({ tag: 'theme', duration: 4.2 }, 'a')
    const el = r.getByRole('img', { name: 'Boss: Aethelric' })
    expect(el.querySelector('img')).toHaveAttribute('src', 'data:art')
    await act(async () => void (await new Promise((res) => setTimeout(res, 4300))))
    expect(r.queryByRole('img', { name: 'Boss: Aethelric' })).toBeNull()
  }, 10000)

  it("with battle music off the theme's opening plays once; without a theme, the boss sting; scenes off, nothing", async () => {
    const { store, engine, r } = withBosses({ picture: (k) => (k === 'e:n' ? 'data:rat' : null) })
    await flush()
    await flush()
    engine.bgStart.mockReturnValueOnce(false)
    act(() => store.getState().effects!.boss({ k: 'e:a', n: 'Aethelric', t: '', th: '' }))
    expect(engine.playTheme).toHaveBeenCalledWith({ tag: 'theme', duration: 4.2 }, 4.2)
    act(() => store.getState().effects!.boss({ k: 'e:n', n: 'Rat', t: '', th: '' }))
    expect(engine.boss).toHaveBeenCalledTimes(1)
    expect(r.getByRole('img', { name: 'Boss: Rat' }).querySelector('img')).toHaveAttribute('src', 'data:rat')
    engine.bgStart.mockReturnValueOnce(false)
    engine.playTheme.mockReturnValueOnce(false)
    act(() => store.getState().effects!.boss({ k: 'e:a', n: 'Aethelric', t: '', th: '' }))
    expect(engine.boss).toHaveBeenCalledTimes(2)
    act(() => box.latest!.remote({ boss: { k: 'e:n', n: 'Rat', t: '', th: '' }, by: 'gm', ts: 0 } as never, 'a', 14999))
    expect(engine.boss).toHaveBeenCalledTimes(3)
    act(() => box.latest!.remote({ boss: { k: 'e:n', n: 'Rat', t: '', th: '' }, by: 'gm', ts: 0 } as never, 'a', 15000))
    expect(engine.boss).toHaveBeenCalledTimes(3)
    act(() => box.latest!.setFx({ scenes: false }))
    act(() => store.getState().effects!.boss({ k: 'e:n', n: 'Rat', t: '', th: '' }))
    expect(engine.boss).toHaveBeenCalledTimes(3)
  })

  it('new themes from the GM are fetched again; no database, no bosses or no audio: nothing to fetch', async () => {
    const x = withBosses()
    await flush()
    await flush()
    const get = (x.props.db as unknown as { get: ReturnType<typeof vi.fn> }).get
    const before = get.mock.calls.length
    x.rerender({ themeVersion: 2 })
    await flush()
    await flush()
    expect(get.mock.calls.length).toBeGreaterThan(before)
    cleanup()
    const silent = withBosses({ live: false })
    await flush()
    expect((silent.props.db as unknown as { get: ReturnType<typeof vi.fn> }).get).not.toHaveBeenCalled()
    cleanup()
    const nodb = setup({ db: null })
    act(() => nodb.store.getState().effects!.boss({ k: 'e:n', n: 'Rat', t: '', th: '' }))
    expect(nodb.engine.boss).toHaveBeenCalled()
    cleanup()
    const none = setup({ db: fakeDb(themes) })
    await flush()
    expect((none.props.db as unknown as { get: ReturnType<typeof vi.fn> }).get).not.toHaveBeenCalled()
  })

  it('the music stops when its boss falls or leaves, or when sound stops; previews and silence are left alone; turning it off stops it', () => {
    let tick = () => {}
    const win = { document, setInterval: (f: () => void) => ((tick = f), 1), clearInterval: vi.fn() } as unknown as Window
    const { store, engine } = setup({ win })
    act(() => store.getState().applySnapshot({ ...store.getState().tables, enemies: { a: { name: 'A', hp: 5, mx: 1 }, b: { name: 'B', hp: 0, mx: 1 }, c: { name: 'C', hp: 5 } } }))
    tick()
    for (const id of ['pv', 'a']) {
      engine.bgId.mockReturnValueOnce(id)
      tick()
    }
    expect(engine.bgStop).not.toHaveBeenCalled()
    for (const id of ['b', 'c', 'gone']) {
      engine.bgId.mockReturnValueOnce(id)
      tick()
    }
    expect(engine.bgStop.mock.calls).toEqual([[2], [2], [2]])
    engine.bgId.mockReturnValueOnce('a')
    engine.live.mockReturnValueOnce(false)
    tick()
    expect(engine.bgStop).toHaveBeenLastCalledWith(0.3)
    act(() => box.latest!.setFx({ music: false }))
    expect(engine.bgStop).toHaveBeenLastCalledWith(0.8)
    act(() => box.latest!.setFx({ music: true }))
    expect(engine.bgStop).toHaveBeenCalledTimes(5)
  })

  it("a skill's sound: looked for, then played", async () => {
    const { engine } = setup({ db: fakeDb({ 'absnd/bite': { data: AUDIO } }) })
    let ok: boolean | undefined
    await act(async () => void (ok = await box.latest!.playSkillSound('Bite')))
    expect(engine.playClip).toHaveBeenCalledWith('ab:bite')
    expect(ok).toBe(true)
  })
})
