// The projector view's sizing: real-size squares for miniatures, following the party.

/** Projector settings, kept on this device (the live page uses the same "tv" key). */
export type TvSettings = {
  mode?: 'fit' | 'real'
  sq?: number
  pw?: number
  /** Miniatures on the table: tokens become black squares. */
  bk?: boolean
  /** Turns the picture (degrees), for a projector set across or along the table. */
  rot?: 0 | 90 | 180 | 270
}

/** The picture's size once turned: a quarter turn swaps width and height. */
export const turnedSize = (rot: number | undefined, w: number, h: number) => (rot === 90 || rot === 270 ? { w: h, h: w } : { w, h })

/** A drag on the screen, turned back into the picture's directions. */
export function turnedDrag(rot: number | undefined, dx: number, dy: number): [number, number] {
  if (rot === 90) return [dy, -dx]
  if (rot === 180) return [-dx, -dy]
  if (rot === 270) return [-dy, dx]
  return [dx, dy]
}

/**
 * Where the map goes in real-size mode: squares of sq mm on a picture pw mm wide, centred on the party.
 * physW is the projector's real width in pixels (the screen's width before any turn).
 */
export function realSizeBox(
  tv: TvSettings,
  screenW: number,
  screenH: number,
  cols: number,
  rows: number,
  mapW: number,
  mapH: number,
  party: { mx: number; my: number }[],
  pan: [number, number],
  physW = screenW,
) {
  const ppm = physW / (Number(tv.pw) || 1200)
  const sq = (Number(tv.sq) || 25) * ppm
  const w = cols * sq
  const h = (mapH / mapW) * w
  let cx = cols / 2
  let cy = rows / 2
  if (party.length) {
    cx = party.reduce((a, c) => a + c.mx + 0.5, 0) / party.length
    cy = party.reduce((a, c) => a + c.my + 0.5, 0) / party.length
  }
  return { width: w, height: h, left: screenW / 2 - cx * sq + pan[0], top: screenH / 2 - cy * sq + pan[1] }
}
