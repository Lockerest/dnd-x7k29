// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { browserImages, readFile, shrinkImage, squareIcon, type ImageKit } from './images'

/** Pictures of a given size; each canvas encodes to a length that shrinks with size and quality. */
function kit(width: number, height: number, size: (w: number, q: number) => number) {
  const drawn: unknown[][] = []
  const k: ImageKit = {
    load: async () => ({ width, height, source: {} as CanvasImageSource }),
    canvas: (w, h) => ({
      draw: (...a) => void drawn.push([w, h, ...a.filter((x) => typeof x !== 'object' || x === null)]),
      toDataURL: (type, q) => `${type}:${'x'.repeat(size(w, q ?? 1))}`,
    }),
  }
  return { k, drawn }
}

describe('map pictures', () => {
  it('fit the width, then lower the quality until small enough', async () => {
    const { k, drawn } = kit(2800, 1400, (w, q) => Math.round(w * q))
    const r = await shrinkImage(k, 'src', 1400, 900)
    expect([r.w, r.h]).toEqual([1400, 700])
    expect(r.data).toMatch(/^image\/jpeg:x{700}$/) // quality 0.5
    expect(drawn[0]).toEqual([1400, 700, '#1a1a1a', 0, 0, 1400, 700])
  })

  it('a small picture keeps its size; when even the lowest quality is too big it gets smaller', async () => {
    const { k } = kit(500, 300, (w) => w)
    expect(await shrinkImage(k, 'src', 1400, 1000)).toMatchObject({ w: 500, h: 300 })
    const r = await shrinkImage(k, 'src', 1400, 300)
    expect([r.w, r.h]).toEqual([256, 154]) // 500 x 0.8^3
  })
})

describe('marker icons', () => {
  it('fit the picture in a square, centred', async () => {
    const { k, drawn } = kit(200, 100, () => 3)
    expect(await squareIcon(k, 'src', 128)).toBe('image/png:xxx')
    expect(drawn[0]).toEqual([128, 128, null, 0, 32, 128, 64])
  })
})

describe('in the browser', () => {
  it('loads pictures and draws on a canvas', async () => {
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:out')
    const b = browserImages()
    const c = b.canvas(4, 2)
    const p = { width: 1, height: 1, source: {} as CanvasImageSource }
    c.draw('#000', p, 0, 0, 4, 2)
    c.draw(null, p, 1, 1, 2, 2)
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage).toHaveBeenCalledTimes(2)
    expect(c.toDataURL('image/png')).toBe('data:out')
    // Images load (or fail) as the browser reports.
    const imgs: HTMLImageElement[] = []
    const Real = window.Image
    vi.stubGlobal(
      'Image',
      class {
        width = 7
        height = 3
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(v: string) {
          imgs.push(this as unknown as HTMLImageElement)
          void v
        }
      },
    )
    const ok = b.load('a')
    imgs[0]!.onload!(new Event('load'))
    expect(await ok).toMatchObject({ width: 7, height: 3 })
    const bad = b.load('b')
    imgs[1]!.onerror!(new Event('error'))
    await expect(bad).rejects.toThrow('unreadable image')
    vi.stubGlobal('Image', Real)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reads files as text or as a data URL; a failed read rejects', async () => {
    expect(await readFile(new Blob(['hi']), 'text')).toBe('hi')
    expect(await readFile(new Blob(['hi'], { type: 'text/plain' }), 'dataUrl')).toBe('data:text/plain;base64,aGk=')
    const spy = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
      this.onerror!(new ProgressEvent('error') as ProgressEvent<FileReader>)
    })
    await expect(readFile(new Blob(['x']), 'text')).rejects.toBeDefined()
    spy.mockRestore()
  })
})
