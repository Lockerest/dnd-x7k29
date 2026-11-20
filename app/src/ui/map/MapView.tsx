// The map on screen: the picture from mapSvg, and taps turned into squares.
import type { Grid } from '../../logic/table'
import { cellAt } from '../../logic/table'
import { mapSvg, type MapPicture } from './mapSvg'

export function MapView({ onTap, style, ...p }: MapPicture & { onTap?: (x: number, y: number) => void; style?: React.CSSProperties }) {
  const g: Grid = p.g
  return (
    <svg
      id="map"
      role="img"
      aria-label={`Map: ${g.m.name ?? ''}`}
      viewBox={`0 0 ${g.m.w} ${g.m.h}`}
      style={style}
      onPointerDown={(e) => {
        if (!onTap) return
        const r = e.currentTarget.getBoundingClientRect()
        const cell = cellAt(g, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
        if (cell) onTap(cell[0], cell[1])
      }}
      dangerouslySetInnerHTML={{ __html: mapSvg(p) }}
    />
  )
}
