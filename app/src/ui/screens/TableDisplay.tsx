// The projector view (#table): the live map filling the screen, either fitted or
// at real size for miniatures, following the party. A small gear opens the settings.
import { useEffect, useRef, useState } from 'react'
import type { Sheet } from '../../logic/sheet'
import { grid, liveMapId, onMap, type Maps } from '../../logic/table'
import type { Tables } from '../../state/store'
import { MapView } from '../map/MapView'
import { realSizeBox, type TvSettings } from '../../logic/projector'

const read = (s: Pick<Storage, 'getItem'>): TvSettings => {
  try {
    return JSON.parse(s.getItem('tv') || '{}') as TvSettings
  } catch {
    return {}
  }
}


export function TableDisplay({
  tables,
  mapImages,
  icons,
  markers,
  now,
  storage,
  onLeave,
  size = () => ({ w: window.innerWidth, h: window.innerHeight }),
}: {
  tables: Tables
  mapImages: Record<string, string>
  icons: Record<string, string>
  markers: Record<string, string>
  now: () => number
  storage: Pick<Storage, 'getItem' | 'setItem'>
  onLeave: () => void
  size?: () => { w: number; h: number }
}) {
  const [tv, setTv] = useState<TvSettings>(() => read(storage))
  const [panel, setPanel] = useState(false)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const drag = useRef<[number, number] | null>(null)
  const save = (t: TvSettings) => {
    setTv(t)
    try {
      storage.setItem('tv', JSON.stringify(t))
    } catch {
      // Storage blocked: the setting lasts until the page closes.
    }
  }
  useEffect(() => {
    const up = () => (drag.current = null)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])
  const id = liveMapId(tables.maps as Maps, tables.cur)
  const g = grid(tables.maps as Maps, id)
  const image = id ? mapImages[id] : undefined
  const chars = tables.chars as Record<string, Sheet>
  let style: React.CSSProperties = { width: '100vw', height: '100vh', left: 0, top: 0 }
  if (g && tv.mode === 'real') {
    const party = Object.values(chars).filter((c) => c.ap !== false && c.ap !== 'no' && c.mx != null && onMap(c, id)) as { mx: number; my: number }[]
    const { w, h } = size()
    const b = realSizeBox(tv, w, h, g.cols, g.rows, g.m.w as number, g.m.h as number, party, pan)
    style = { width: `${b.width}px`, height: `${b.height}px`, left: `${b.left}px`, top: `${b.top}px` }
  }
  return (
    <>
      <div
        className="tv"
        id="tv"
        onPointerDown={(e) => tv.mode === 'real' && (drag.current = [e.clientX, e.clientY])}
        onPointerMove={(e) => {
          if (!drag.current) return
          const [x, y] = drag.current
          drag.current = [e.clientX, e.clientY]
          setPan(([a, b]) => [a + e.clientX - x, b + e.clientY - y])
        }}
      >
        {g && image ? (
          <MapView g={g} image={image} chars={chars} enemies={tables.enemies} dm={false} selected="c:" combat={tables.combat} icons={icons} markers={markers} now={now()} style={style} />
        ) : (
          <p style={{ color: '#bbb', padding: 24 }}>Waiting for the GM to show a map…</p>
        )}
      </div>
      <button id="tvg" title="Table settings" aria-label="Table settings" onClick={() => setPanel(!panel)}>
        ⚙
      </button>
      {panel && (
        <div id="tvp">
          <b>Table view</b>
          <div className="row">
            <label className="sub">
              <input type="radio" name="tvm" checked={tv.mode !== 'real'} onChange={() => save({ ...tv, mode: 'fit' })} style={{ width: 'auto' }} /> Fit the map to the screen
            </label>
          </div>
          <div className="row">
            <label className="sub">
              <input type="radio" name="tvm" checked={tv.mode === 'real'} onChange={() => save({ ...tv, mode: 'real' })} style={{ width: 'auto' }} /> Real size (for miniatures)
            </label>
          </div>
          <div className="row">
            <label className="sub">
              Square size (mm) <input type="number" value={tv.sq || 25} onChange={(e) => save({ ...tv, sq: Number(e.target.value) || 25 })} style={{ width: 80 }} />
            </label>
            <label className="sub">
              Projected width (mm) <input type="number" value={tv.pw || 1200} onChange={(e) => save({ ...tv, pw: Number(e.target.value) || 1200 })} style={{ width: 90 }} />
            </label>
          </div>
          <p className="note">Measure the width of the projected picture on the table, in millimetres. In real size the view follows the party, and you can drag it to move.</p>
          <div className="row">
            <button onClick={() => setPan([0, 0])}>Center on party</button>
            <button onClick={() => setPanel(false)}>Close</button>
            <button onClick={onLeave}>Leave table view</button>
          </div>
        </div>
      )}
    </>
  )
}
