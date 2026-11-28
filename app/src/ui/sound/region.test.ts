import { describe, expect, it, vi } from 'vitest'
import { REGION_TRACKS, themeUrl } from '../../data/audio'
import { createRegionPlayer, type Track } from './region'

const flush = () => new Promise((r) => setTimeout(r, 0))

function setup(o: { refuse?: boolean } = {}) {
  const made: (Omit<Track, 'paused'> & { paused: boolean; url: string; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> })[] = []
  let tick: (() => void) | null = null
  const vol = { v: 0.5 }
  const stop = vi.fn(() => void (tick = null))
  const p = createRegionPlayer({
    make: (url) => {
      const t = {
        url,
        loop: false,
        volume: 1,
        paused: true,
        play: vi.fn(() => {
          if (o.refuse) return Promise.reject(new Error('needs a tap'))
          t.paused = false
          return undefined
        }),
        pause: vi.fn(() => void (t.paused = true)),
      }
      made.push(t)
      return t
    },
    volume: () => vol.v,
    every: (f) => ((tick = f), 7),
    stop,
  })
  /** Runs the fade to its end; returns how many steps it took. */
  const run = () => {
    let n = 0
    while (tick && n < 100) {
      tick()
      n++
    }
    return n
  }
  return { p, made, vol, stop, run, step: () => tick?.(), ticking: () => !!tick }
}

describe('region music', () => {
  it('picking a track streams it on loop and fades it in over 2 seconds', async () => {
    const { p, made, run, stop } = setup()
    expect(p.key()).toBeNull()
    p.select('ifstrid', false)
    expect(p.key()).toBe('ifstrid')
    const t = made[0]!
    expect(t.url).toBe(themeUrl(REGION_TRACKS.find((x) => x.key === 'ifstrid')!.id))
    expect(t.loop).toBe(true)
    expect(t.volume).toBe(0)
    await flush()
    expect(t.play).toHaveBeenCalledTimes(1)
    expect(run()).toBe(20)
    expect(t.volume).toBeCloseTo(0.5)
    expect(stop).toHaveBeenCalledWith(7)
    // Picking it again changes nothing.
    p.select('ifstrid', false)
    await flush()
    expect(made).toHaveLength(1)
    expect(t.play).toHaveBeenCalledTimes(1)
  })

  it('a boss theme fades it out and pauses it; when the theme stops it fades back in', async () => {
    const { p, made, run, step, ticking } = setup()
    p.select('frozennorth', false)
    await flush()
    run()
    const t = made[0]!
    p.sync(true)
    p.sync(true) // one fade at a time
    expect(run()).toBe(20)
    expect(t.volume).toBe(0)
    expect(t.pause).toHaveBeenCalledTimes(1)
    p.sync(true)
    expect(ticking()).toBe(false)
    p.sync(false)
    await flush()
    expect(t.play).toHaveBeenCalledTimes(2)
    run()
    expect(t.volume).toBeCloseTo(0.5)
    // Half-way through a fade out, the boss theme ends: it turns back without pausing.
    p.sync(true)
    for (let i = 0; i < 5; i++) step()
    expect(t.volume).toBeCloseTo(0.375)
    p.sync(false)
    expect(run()).toBe(5)
    expect(t.volume).toBeCloseTo(0.5)
    expect(t.pause).toHaveBeenCalledTimes(1)
  })

  it('with a boss theme already playing, a new pick waits silently', async () => {
    const { p, made, ticking } = setup()
    p.select('dreamwing', true)
    await flush()
    expect(made[0]!.play).not.toHaveBeenCalled()
    expect(ticking()).toBe(false)
  })

  it('follows the volume, and pauses with sound off', async () => {
    const { p, made, run, vol } = setup()
    p.select('caldenskeep', false)
    await flush()
    run()
    const t = made[0]!
    vol.v = 0.2
    p.sync(false)
    expect(t.volume).toBeCloseTo(0.2)
    vol.v = 0
    p.sync(false)
    run()
    expect(t.pause).toHaveBeenCalled()
    // Already silent but still playing (paused from outside cannot happen): it pauses at once.
    t.paused = false
    p.sync(false)
    expect(t.pause).toHaveBeenCalledTimes(2)
  })

  it('switching tracks stops the old one; none (or an unknown key) stops it all', async () => {
    const { p, made, run } = setup()
    p.select('ifstrid', false)
    await flush()
    p.select('frozennorth', false)
    expect(made[0]!.pause).toHaveBeenCalled()
    expect(made).toHaveLength(2)
    await flush()
    run()
    p.select(null, false)
    expect(made[1]!.pause).toHaveBeenCalled()
    expect(p.key()).toBeNull()
    p.sync(false) // nothing to play
    p.select('nowhere', false)
    expect(p.key()).toBeNull()
    expect(made).toHaveLength(2)
  })

  it('when the browser refuses to play before a tap, the next sync tries again', async () => {
    const { p, made } = setup({ refuse: true })
    p.select('ifstrid', false)
    await flush()
    p.sync(false)
    await flush()
    expect(made[0]!.play).toHaveBeenCalledTimes(2)
  })
})
