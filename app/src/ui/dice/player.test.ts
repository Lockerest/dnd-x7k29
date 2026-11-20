// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browserDicePlayer, createDicePlayer, defaultDicePlayer, loadDiceLib, type DiceBox, type DiceEnv, type DiceJob, type DiceLib } from './player'

type Box = DiceBox & { sel: string; opts: Record<string, unknown>; init: () => void; fail: () => void; roll: ReturnType<typeof vi.fn<DiceBox['roll']>>; updateConfig: ReturnType<typeof vi.fn>; clearDice: ReturnType<typeof vi.fn> }

/** A stand-in for the 3D dice library: boxes start when told to; rolls answer as scripted. */
function fakeLib(o: { roll?: (n: string) => Promise<{ sets?: { type: string; rolls: { value: number }[] }[] }>; config?: () => Promise<unknown>; throws?: boolean; clearThrows?: boolean } = {}) {
  const boxes: Box[] = []
  const lib = class {
    sel: string
    opts: Record<string, unknown>
    init!: () => void
    fail!: () => void
    updateConfig = vi.fn(o.config ?? (async () => {}))
    roll = vi.fn(o.roll ?? (async () => ({ sets: [] })))
    clearDice = vi.fn(() => {
      if (o.clearThrows) throw new Error('gone')
    })
    constructor(sel: string, opts: Record<string, unknown>) {
      if (o.throws) throw new Error('no WebGL')
      this.sel = sel
      this.opts = opts
      boxes.push(this as unknown as Box)
    }
    initialize() {
      return new Promise<void>((res, rej) => {
        this.init = res
        this.fail = () => rej(new Error('bad'))
      })
    }
  }
  return { lib: lib as unknown as DiceLib, boxes }
}

function env(o: { lib?: DiceLib | null; reduced?: boolean; random?: () => number } = {}): DiceEnv {
  return {
    doc: document,
    width: () => 1000,
    height: () => 800,
    reducedMotion: () => !!o.reduced,
    setTimeout: (f, ms) => setTimeout(f, ms) as unknown as number,
    clearTimeout: (h) => clearTimeout(h),
    frame: (f) => void setTimeout(() => f(Date.now()), 16),
    now: () => Date.now(),
    random: o.random ?? (() => 0.5),
    lib: () => o.lib ?? null,
  }
}

const job = (o: Partial<DiceJob> = {}): DiceJob => ({ ds: [20], res: [{ d: 20, r: 17 }], m: 0, sk: 'classic', who: null, remote: false, ...o })
const overlays = () => document.querySelectorAll('.dov')
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})
afterEach(() => vi.useRealTimers())

describe('CSS dice (no 3D library)', () => {
  it('tumble, land on the results, show the result card for two seconds, then go', async () => {
    const p = createDicePlayer(env())
    const onLand = vi.fn()
    let done = false
    void p.play(job({ ds: [6, 6], res: [{ d: 6, r: 2 }, { d: 6, r: 5 }], m: 3, sk: 'lava', onLand })).then(() => (done = true))
    const ov = overlays()[0] as HTMLElement
    expect(ov.className).toBe('dov sk-lava')
    expect(ov.dataset.sk).toBe('lava')
    expect(ov.style.getPropertyValue('--tile')).toBe('#f43c04')
    expect(ov.querySelectorAll('.d3')).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(300)
    expect(ov.querySelector('.d3')!.getAttribute('style')).toContain('rotateZ(')
    expect(ov.querySelector('.f1')!.textContent).toMatch(/^[1-6]$/)
    await vi.advanceTimersByTimeAsync(1300)
    expect([...ov.querySelectorAll('.d3')].map((d) => [d.classList.contains('land'), d.querySelector('.f1')!.textContent])).toEqual([
      [true, '2'],
      [true, '5'],
    ])
    expect(onLand).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onLand).toHaveBeenCalledTimes(1)
    expect(ov.querySelector('.dres')!.textContent).toBe('d62d652 + 5 + 3 = 10')
    await vi.advanceTimersByTimeAsync(2000)
    expect(overlays()).toHaveLength(0)
    expect(done).toBe(true)
  })

  it("someone else's roll says who; a single die without bonus has no total; a minus bonus; gradients set no tile", async () => {
    const p = createDicePlayer(env({ reduced: true }))
    void p.play(job({ who: 'Bo & "x" <b>', sk: 'rainbow' }))
    void p.play(job({ m: -2 }))
    const [a, b] = [...overlays()] as HTMLElement[]
    expect(a!.style.getPropertyValue('--tile')).toBe('')
    expect(a!.querySelector('.dw')!.textContent).toBe('Bo & "x" <b> rolls')
    expect(a!.querySelector('.dw b')).toBeNull()
    expect(a!.querySelector('.dt')).toBeNull()
    expect(a!.querySelector('.dres')!.getAttribute('style')).toBe('top:calc(50% + 0px)')
    // A second result at the same time sits below the first.
    expect(b!.querySelector('.dres')!.getAttribute('style')).toBe('top:calc(50% + 170px)')
    expect(b!.querySelector('.dt')!.textContent).toBe('17 - 2 = 15')
  })

  it('dice bounce off the edges of the screen', async () => {
    let i = 0
    const seq = [0, 0, 0, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    const p = createDicePlayer(env({ random: () => seq[i++ % seq.length]! }))
    void p.play(job())
    await vi.advanceTimersByTimeAsync(1400)
    const t = (overlays()[0]!.querySelector('.d3') as HTMLElement).style.transform
    const [, x, y] = /translate3d\(([\d.]+)px,\s*([\d.]+)px/.exec(t)!
    expect(+x!).toBeGreaterThanOrEqual(0)
    expect(+x!).toBeLessThanOrEqual(1000 - 84)
    expect(+y!).toBeLessThanOrEqual(800 - 84)
  })
})

describe('3D dice', () => {
  it('start two boxes; once ready they roll with the style and the forced results, and read my d4s back', async () => {
    const { lib, boxes } = fakeLib({ roll: async () => ({ sets: [{ type: 'd4', rolls: [{ value: 3 }] }, { type: 'd8', rolls: [{ value: 8 }] }] }) })
    const p = createDicePlayer(env({ lib }))
    p.init()
    expect(boxes.map((b) => b.sel)).toEqual(['#dicebox0', '#dicebox1'])
    expect([...document.querySelectorAll('.dicebox')].map((e) => (e as HTMLElement).style.zIndex)).toEqual(['48', '49'])
    expect(boxes[0]!.opts).toMatchObject({ assetPath: 'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box-threejs@0.0.12/public/', baseScale: 150, theme_surface: 'green-felt' })
    expect(p.physics()).toBe(false)
    boxes[0]!.init()
    await flush()
    expect(p.physics()).toBe(true)
    const res = [
      { d: 4, r: 1 },
      { d: 8, r: 8 },
    ]
    const onLand = vi.fn(() => expect(res[0]!.r).toBe(3))
    let done = false
    void p.play(job({ ds: [4, 8], res, sk: 'red', onLand })).then(() => (done = true))
    await flush()
    expect(boxes[0]!.updateConfig).toHaveBeenCalledWith({ theme_colorset: 'white', theme_material: 'plastic', theme_customColorset: expect.objectContaining({ name: 'red' }) })
    expect(boxes[0]!.roll).toHaveBeenCalledWith('1d8+1d4@8')
    await vi.advanceTimersByTimeAsync(1000)
    expect(onLand).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(boxes[0]!.clearDice).toHaveBeenCalled()
    expect(done).toBe(true)
  })

  it("someone else's d4s are not thrown (a short pause instead); their d4 results stay", async () => {
    const { lib, boxes } = fakeLib()
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes[0]!.init()
    await flush()
    const res = [{ d: 4, r: 2 }]
    void p.play(job({ ds: [4], res, remote: true }))
    await flush()
    expect(boxes[0]!.roll).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1499)
    expect(document.querySelector('.dres')).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(document.querySelector('.dres')!.textContent).toBe('d42')
    // A remote roll with other dice keeps its results too.
    const r2 = [{ d: 4, r: 2 }, { d: 6, r: 6 }]
    boxes[0]!.roll.mockResolvedValueOnce({ sets: [{ type: 'd4', rolls: [{ value: 4 }] }] })
    await vi.advanceTimersByTimeAsync(2000)
    void p.play(job({ ds: [4, 6], res: r2, remote: true }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(r2[0]!.r).toBe(2)
  })

  it('a roll that fails or takes over 10 s falls back to CSS dice; a result without sets reads nothing', async () => {
    const { lib, boxes } = fakeLib({ roll: () => Promise.reject(new Error('lost')) })
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes[0]!.init()
    await flush()
    void p.play(job())
    await flush()
    expect(overlays()[0]!.querySelectorAll('.d3')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(5000)
    boxes[0]!.roll.mockImplementationOnce(() => new Promise(() => {}))
    void p.play(job())
    await vi.advanceTimersByTimeAsync(9999)
    expect(overlays()[0]!.querySelector('.d3')).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(overlays()[0]!.querySelectorAll('.d3')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(5000)
    boxes[0]!.roll.mockResolvedValueOnce({})
    const res = [{ d: 4, r: 2 }]
    void p.play(job({ ds: [4], res }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(res[0]!.r).toBe(2)
  })

  it('a box that never answers is cut short after 14 s; the late answer changes nothing', async () => {
    const { lib, boxes } = fakeLib({ config: () => new Promise((r) => setTimeout(r, 13900)) })
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes[0]!.init()
    await flush()
    const onLand = vi.fn()
    void p.play(job({ onLand }))
    await vi.advanceTimersByTimeAsync(14000)
    expect(onLand).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.dres')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onLand).toHaveBeenCalledTimes(1)
  })

  it('several rolls at once: a free box each, a third box when both are busy, at most four', async () => {
    const { lib, boxes } = fakeLib({ roll: () => new Promise(() => {}) })
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes.forEach((b) => b.init())
    await flush()
    for (let i = 0; i < 6; i++) void p.play(job())
    await flush()
    expect(boxes).toHaveLength(3) // two busy, a third starting
    boxes[2]!.init()
    await flush()
    expect(boxes).toHaveLength(4)
    boxes[3]!.init()
    await flush()
    expect(boxes).toHaveLength(4) // never more than four
    expect(boxes.every((b) => b.roll.mock.calls.length === 1)).toBe(true)
    // When the 10 s limit passes they fall back to CSS dice and free up for the rest.
    await vi.advanceTimersByTimeAsync(10000 + 2500 + 2000 + 10)
    expect(boxes[0]!.roll).toHaveBeenCalledTimes(2)
  })

  it('a box that fails to start is dropped; when all fail, CSS dice; a broken library too', async () => {
    const { lib, boxes } = fakeLib()
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes[0]!.fail()
    await flush()
    expect(p.physics()).toBe(false)
    boxes[1]!.fail()
    await flush()
    void p.play(job())
    expect(overlays()[0]!.querySelectorAll('.d3')).toHaveLength(1)
    p.init() // the library is given up on: no new boxes
    expect(boxes).toHaveLength(2)
    const broken = fakeLib({ throws: true })
    const q = createDicePlayer(env({ lib: broken.lib }))
    q.init()
    void q.play(job())
    expect(overlays()[1]!.querySelectorAll('.d3')).toHaveLength(1)
  })

  it('reduced motion uses no 3D dice; nothing breaks when the box or the save fails', async () => {
    const { lib, boxes } = fakeLib({ clearThrows: true })
    const reduced = createDicePlayer(env({ lib, reduced: true }))
    reduced.init()
    boxes[0]!.init()
    await flush()
    void reduced.play(job())
    expect(document.querySelector('.dres')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2000)
    const p = createDicePlayer(env({ lib }))
    p.init()
    boxes[2]!.init()
    await flush()
    let done = false
    void p.play(
      job({
        onLand: () => {
          throw new Error('offline')
        },
      }),
    ).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(3000)
    expect(done).toBe(true)
  })

  it('without the library, init does nothing', () => {
    const p = createDicePlayer(env())
    p.init()
    expect(document.querySelectorAll('.dicebox')).toHaveLength(0)
  })
})

describe('loading the library', () => {
  it('uses it when already there, otherwise adds the script once and waits for it', async () => {
    const { lib } = fakeLib()
    expect(await loadDiceLib(document, { 'dice-box-threejs': lib })).toBe(lib)
    const win: Record<string, unknown> = {}
    const p = loadDiceLib(document, win)
    const s = document.head.querySelector('script')!
    expect(s.src).toBe('https://cdn.jsdelivr.net/npm/@3d-dice/dice-box-threejs@0.0.12/dist/dice-box-threejs.umd.js')
    win['dice-box-threejs'] = lib
    s.onload!(new Event('load'))
    expect(await p).toBe(lib)
    const q = loadDiceLib(document, {})
    const s2 = document.head.querySelectorAll('script')[1]!
    s2.onerror!(new Event('error'))
    expect(await q).toBeNull()
    const r = loadDiceLib(document, {})
    document.head.querySelectorAll('script')[2]!.onload!(new Event('load'))
    expect(await r).toBeNull()
  })

  it("the browser window's player, starting its boxes once the library loads", async () => {
    const { lib, boxes } = fakeLib()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    defaultDicePlayer(window)
    ;(window as unknown as Record<string, unknown>)['dice-box-threejs'] = lib
    document.head.querySelector('script')!.onload!(new Event('load'))
    await flush()
    expect(boxes).toHaveLength(2)
    expect(boxes[0]!.opts.baseScale).toBe(Math.round(Math.max(80, Math.min(150, Math.min(innerWidth, innerHeight) / 3.6))))
    // Rolls use the window's timers and frames (CSS dice until a box is ready).
    vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => setTimeout(() => f(performance.now()), 16))
    const q = browserDicePlayer(window, () => null)
    let done = false
    void q.play(job()).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(5000)
    expect(done).toBe(true)
    vi.unstubAllGlobals()
    delete (window as unknown as Record<string, unknown>)['dice-box-threejs']
  })
})
