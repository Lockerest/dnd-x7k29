// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { bossArtImage, browserImages, portraitImage, readFile, shrinkImage, squareIcon, tokenIcon, type ImageKit } from './images'

/** Pictures of a given size; each canvas encodes to a length that shrinks with size and quality. */
function kit(width: number, height: number, size: (w: number, q: number) => number) {
  const drawn: unknown[][] = []
  const k: ImageKit = {
    load: async () => ({ width, height, source: {} as CanvasImageSource }),
    canvas: (w, h) => ({
      draw: (...a) => void drawn.push([w, h, ...a.filter((x) => typeof x !== 'object' || x === null)]),
      crop: (_p, ...a) => void drawn.push([w, h, 'crop', ...a]),
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

describe('token icons, portraits and boss art', () => {
  it('a token icon is the middle square at 96 px, as a JPEG', async () => {
    const { k, drawn } = kit(300, 100, () => 5)
    expect(await tokenIcon(k, 'src')).toBe('image/jpeg:xxxxx')
    expect(drawn[0]).toEqual([96, 96, 'crop', 100, 0, 100, 100])
  })

  it('a portrait covers 420 x 560, kept near its top; a big one is saved at lower quality', async () => {
    const wide = kit(840, 560, (_w, q) => (q > 0.7 ? 200000 : 9))
    expect(await portraitImage(wide.k, 'src')).toBe(`image/jpeg:${'x'.repeat(9)}`)
    expect(wide.drawn[0]).toEqual([420, 560, null, -210, 0, 840, 560])
    const tall = kit(420, 1120, () => 7)
    expect(await portraitImage(tall.k, 'src')).toBe('image/jpeg:xxxxxxx')
    expect(tall.drawn[0]).toEqual([420, 560, null, 0, -112, 420, 1120])
  })

  it('boss art fits 900 x 1100 as WebP (PNG when the browser has no WebP), shrinking until under 1.4 MB', async () => {
    const webp: ImageKit = { load: async () => ({ width: 1800, height: 1100, source: {} as CanvasImageSource }), canvas: (w) => ({ draw: () => {}, crop: () => {}, toDataURL: (t) => `data:${t};${'x'.repeat(w * 2000)}` }) }
    const d = await bossArtImage(webp, 'src')
    expect(d.startsWith('data:image/webp')).toBe(true)
    expect(d.length).toBeLessThan(1400000)
    const sizes: number[] = []
    const png: ImageKit = { load: async () => ({ width: 10, height: 10, source: {} as CanvasImageSource }), canvas: (w) => (sizes.push(w), { draw: () => {}, crop: () => {}, toDataURL: (t) => (t === 'image/webp' ? 'data:image/png;nope' : 'data:image/png;'.padEnd(2000000, 'x')) }) }
    expect((await bossArtImage(png, 'src')).startsWith('data:image/png')).toBe(true)
    expect(sizes).toEqual([10, 8, 6, 5, 4, 3, 3]) // gives up once below 30 %
    const tiny: ImageKit = { load: async () => ({ width: 1, height: 1, source: {} as CanvasImageSource }), canvas: (w, h) => (sizes.push(w * 100 + h), { draw: () => {}, crop: () => {}, toDataURL: () => 'data:image/webp;x' }) }
    await bossArtImage(tiny, 'src')
    expect(sizes.at(-1)).toBe(101)
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
    c.crop(p, 1, 2, 3, 4)
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage).toHaveBeenCalledTimes(3)
    expect(ctx.drawImage).toHaveBeenLastCalledWith(p.source, 1, 2, 3, 4, 0, 0, 4, 2)
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
