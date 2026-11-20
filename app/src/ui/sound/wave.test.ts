// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { playWave, WAVE_MS, waveCenter } from './wave'

function ctx() {
  return { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(), lineWidth: 0, strokeStyle: '', fillStyle: '', globalAlpha: 1 }
}

describe('the Golden Wave', () => {
  it('draws a growing golden ring with motes, then removes itself', () => {
    const c = ctx()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(c as unknown as CanvasRenderingContext2D)
    const frames: ((t: number) => void)[] = []
    const later: (() => void)[] = []
    let i = 0
    const rs = [0.1, 0.9, 0.2, 0.8, 0.5, 0.95, 0.05]
    playWave({ doc: document, width: 400, height: 300, dpr: 2, center: { x: 100, y: 100 }, random: () => rs[i++ % rs.length]!, frame: (f) => void frames.push(f), now: () => 0, setTimeout: (f) => void later.push(f) })
    const cv = document.querySelector('canvas.gwave') as HTMLCanvasElement
    expect([cv.width, cv.height]).toEqual([800, 600])
    for (const t of [100, 2000, 4000, WAVE_MS + 10]) frames.shift()!(t)
    expect(c.arc).toHaveBeenCalled()
    expect(c.fillRect).toHaveBeenCalled()
    expect(frames).toHaveLength(0) // done: no next frame
    expect(document.querySelector('canvas.gwave')).toBeNull()
    later[0]!() // the safety removal is harmless
    vi.restoreAllMocks()
  })

  it('without a 2D canvas nothing is shown', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    playWave({ doc: document, width: 10, height: 10, dpr: 1, center: { x: 0, y: 0 }, random: Math.random, frame: vi.fn(), now: () => 0, setTimeout: vi.fn() })
    expect(document.querySelector('canvas.gwave')).toBeNull()
    vi.restoreAllMocks()
  })

  it('starts at the altar on the shown map, else in the middle of the screen', () => {
    const r = { left: 10, top: 20, width: 500 }
    expect(waveCenter({ m: 'm', x: 2, y: 3 }, 'm', r, 10, 800, 600)).toEqual({ x: 110, y: 170 })
    expect(waveCenter({ x: 2, y: 3 }, 'm', r, 10, 800, 600)).toEqual({ x: 110, y: 170 })
    expect(waveCenter({ m: 'n', x: 2, y: 3 }, 'm', r, 10, 800, 600)).toEqual({ x: 400, y: 300 })
    expect(waveCenter({ m: 'm', x: 2, y: 3 }, 'm', { ...r, width: 40 }, 10, 800, 600)).toEqual({ x: 400, y: 300 })
    expect(waveCenter({ m: 'm', x: 2, y: 3 }, 'm', null, 10, 800, 600)).toEqual({ x: 400, y: 300 })
  })
})
