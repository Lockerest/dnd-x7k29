// The projector view's sizing: real-size squares for miniatures, following the party.

/** Projector settings, kept on this device (the live page uses the same "tv" key). */
export type TvSettings = { mode?: 'fit' | 'real'; sq?: number; pw?: number }

/** Where the map goes in real-size mode: squares of sq mm on a picture pw mm wide, centred on the party. */
export function realSizeBox(tv: TvSettings, screenW: number, screenH: number, cols: number, rows: number, mapW: number, mapH: number, party: { mx: number; my: number }[], pan: [number, number]) {
  const ppm = screenW / (Number(tv.pw) || 1200)
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
