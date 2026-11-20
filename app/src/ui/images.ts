// Reading uploaded files and resizing pictures in the browser, like the live page:
// maps are shrunk to fit the database (JPEG, lower quality until small enough),
// marker icons become small square PNGs.

export type Picture = {
  width: number
  height: number
  source: CanvasImageSource
}
export type Canvas = {
  draw: (fill: string | null, p: Picture, x: number, y: number, w: number, h: number) => void
  toDataURL: (type: string, q?: number) => string
}
export type ImageKit = {
  load: (src: string) => Promise<Picture>
  canvas: (w: number, h: number) => Canvas
}

export const browserImages = (doc: Document = document): ImageKit => ({
  load: (src) =>
    new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve({ width: i.width, height: i.height, source: i })
      i.onerror = () => reject(new Error('unreadable image'))
      i.src = src
    }),
  canvas: (w, h) => {
    const c = doc.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    return {
      draw: (fill, p, x, y, dw, dh) => {
        if (fill) {
          g.fillStyle = fill
          g.fillRect(0, 0, w, h)
        }
        g.drawImage(p.source, x, y, dw, dh)
      },
      toDataURL: (type, q) => c.toDataURL(type, q),
    }
  },
})

export const readFile = (f: Blob, as: 'dataUrl' | 'text'): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    if (as === 'text') r.readAsText(f)
    else r.readAsDataURL(f)
  })

/** A map picture at most maxW wide and under limit characters as a JPEG data URL. */
export async function shrinkImage(kit: ImageKit, src: string, maxW: number, limit: number): Promise<{ data: string; w: number; h: number }> {
  const p = await kit.load(src)
  let sc = Math.min(1, maxW / p.width)
  for (;;) {
    const w = Math.round(p.width * sc)
    const h = Math.round(p.height * sc)
    const c = kit.canvas(w, h)
    c.draw('#1a1a1a', p, 0, 0, w, h)
    for (const q of [0.8, 0.65, 0.5, 0.35]) {
      const d = c.toDataURL('image/jpeg', q)
      if (d.length < limit) return { data: d, w, h }
    }
    sc *= 0.8
  }
}

/** A picture fitted into a size × size transparent PNG (altar, bonfire and guild icons). */
export async function squareIcon(kit: ImageKit, src: string, size: number): Promise<string> {
  const p = await kit.load(src)
  const c = kit.canvas(size, size)
  const q = Math.min(size / p.width, size / p.height)
  c.draw(null, p, (size - p.width * q) / 2, (size - p.height * q) / 2, p.width * q, p.height * q)
  return c.toDataURL('image/png')
}
