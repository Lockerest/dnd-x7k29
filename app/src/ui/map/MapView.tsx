// The map on screen: the picture from mapSvg, and taps turned into squares.
import { useRef } from 'react'
import type { Grid } from '../../logic/table'
import { cellAt } from '../../logic/table'
import { mapSvg, type MapPicture } from './mapSvg'

type Handlers = {
  onTap?: (x: number, y: number) => void
  /** While pressed: each square the pointer moves over (the GM's wall and fog painting). */
  onDrag?: (x: number, y: number) => void
  /** The pointer is released (or the drag cancelled). */
  onRelease?: () => void
}

export function MapView({ onTap, onDrag, onRelease, style, ...p }: MapPicture & Handlers & { style?: React.CSSProperties }) {
  const g: Grid = p.g
  const pressed = useRef(false)
  const cell = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return cellAt(g, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
  }
  const release = () => {
    if (!pressed.current) return
    pressed.current = false
    onRelease?.()
  }
  return (
    <svg
      id="map"
      role="img"
      aria-label={`Map: ${g.m.name ?? ''}`}
      viewBox={`0 0 ${g.m.w} ${g.m.h}`}
      style={style}
      onPointerDown={(e) => {
        if (!onTap) return
        const c = cell(e)
        if (!c) return
        pressed.current = true
        // Keep receiving the moves while dragging, even outside the map.
        e.currentTarget.setPointerCapture?.(e.pointerId)
        onTap(c[0], c[1])
      }}
      onPointerMove={(e) => {
        if (!pressed.current || !onDrag) return
        const c = cell(e)
        if (c) onDrag(c[0], c[1])
      }}
      onPointerUp={release}
      onPointerCancel={release}
      dangerouslySetInnerHTML={{ __html: mapSvg(p) }}
    />
  )
}
