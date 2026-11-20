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
  return { get, keys: vi.fn(async () => []) } as unknown as Db & { get: typeof get }
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
  return <>{r.scene}</>
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
    expect(box.latest!.fx).toEqual({ scenes: false, s25: true, sound: false, volume: 0.5, reverb: 0.5 })
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
