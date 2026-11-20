// The Golden Wave: a ring of golden motes sweeping out from the altar across the
// whole screen for about 4.6 seconds, drawn on a canvas. Same as the live page.

export type WaveEnv = {
  doc: Document
  width: number
  height: number
  dpr: number
  /** Where the altar is on screen (the centre when the map is not showing it). */
  center: { x: number; y: number }
  random: () => number
  frame: (f: (t: number) => void) => void
  now: () => number
  setTimeout: (f: () => void, ms: number) => void
}

export const WAVE_MS = 4600

export function playWave(env: WaveEnv): void {
  const { doc, width: W, height: H, dpr, random: R } = env
  const cv = doc.createElement('canvas')
  cv.width = W * dpr
  cv.height = H * dpr
  cv.className = 'gwave'
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:68;pointer-events:none'
  const ctx = cv.getContext('2d')
  if (!ctx) return
  doc.body.appendChild(cv)
  const { x: cx, y: cy } = env.center
  const Rm = 1.08 * Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy))
  const trail = Math.min(Rm * 0.55, 680)
  const N = Math.min(8000, Math.round((W * H) / 200))
  const P = Array.from({ length: N }, () => ({ a: R() * 6.2832, o: Math.pow(R(), 2.4), s: 0.7 + R() * 1.2, p: R() * 6.28, j: (R() - 0.5) * 14, h: R() }))
  const t0 = env.now()
  const fr = (now: number) => {
    const t = Math.min(1, (now - t0) / WAVE_MS)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const front = Rm * (1 - Math.pow(1 - t, 2.2))
    const envl = t < 0.08 ? t / 0.08 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1
    ctx.lineWidth = 34
    ctx.strokeStyle = `rgba(176,136,56,${0.16 * envl})`
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(1, front), 0, 6.2832)
    ctx.stroke()
    ctx.lineWidth = 9
    ctx.strokeStyle = `rgba(214,176,92,${0.3 * envl})`
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(1, front), 0, 6.2832)
    ctx.stroke()
    for (const q of P) {
      const rr = front - q.o * trail
      if (rr < 2) continue
      const al = Math.min(1, Math.pow(1 - q.o, 1.5) * envl * (0.7 + 0.3 * Math.sin(now * 0.006 + q.p)) * 1.05)
      if (al < 0.02) continue
      const x = cx + Math.cos(q.a) * rr + Math.sin(q.p + now * 0.001) * q.j * q.o
      const y = cy + Math.sin(q.a) * rr + Math.cos(q.p + now * 0.001) * q.j * q.o
      ctx.globalAlpha = al
      ctx.fillStyle = q.h > 0.75 ? '#ecd28c' : '#c49840'
      const r2 = q.s * (1.1 - q.o * 0.5)
      ctx.fillRect(x - r2, y - r2, r2 * 2, r2 * 2)
    }
    ctx.globalAlpha = 1
    if (t < 1) env.frame(fr)
    else cv.remove()
  }
  env.frame(fr)
  env.setTimeout(() => cv.remove(), WAVE_MS + 800)
}

/**
 * Where the wave starts on screen: the altar's square on the shown map (w.x, w.y in
 * squares), or the middle of the screen when that map is not shown.
 */
export function waveCenter(w: { m?: string | null; x: number; y: number }, shownMap: string | null, mapRect: { left: number; top: number; width: number } | null, cols: number, width: number, height: number) {
  if (mapRect && mapRect.width > 50 && (!w.m || w.m === shownMap)) return { x: mapRect.left + (w.x / cols) * mapRect.width, y: mapRect.top + (w.y / cols) * mapRect.width }
  return { x: width / 2, y: height / 2 }
}
