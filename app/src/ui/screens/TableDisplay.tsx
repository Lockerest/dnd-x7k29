// The projector view (#table): the live map filling the screen, either fitted or
// at real size for miniatures, following the party. A small gear opens the settings.
import { useEffect, useRef, useState } from 'react'
import type { Sheet } from '../../logic/sheet'
import { grid, liveMapId, onMap, type Maps } from '../../logic/table'
import type { Tables } from '../../state/store'
import { MapView } from '../map/MapView'
import { realSizeBox, turnedDrag, turnedSize, type TvSettings } from '../../logic/projector'

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
  const rot = tv.rot || 0
  const screen = size()
  const area = turnedSize(rot, screen.w, screen.h)
  // The turned area: a quarter turn lays the picture along the other side of the table.
  const turn: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${area.w}px`,
    height: `${area.h}px`,
    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
    overflow: 'hidden',
  }
  let style: React.CSSProperties = { width: '100%', height: '100%', left: 0, top: 0 }
  if (g && tv.mode === 'real') {
    const party = Object.values(chars).filter((c) => c.ap !== false && c.ap !== 'no' && c.mx != null && onMap(c, id)) as { mx: number; my: number }[]
    const b = realSizeBox(tv, area.w, area.h, g.cols, g.rows, g.m.w as number, g.m.h as number, party, pan, screen.w)
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
          const [dx, dy] = turnedDrag(rot, e.clientX - x, e.clientY - y)
          setPan(([a, b]) => [a + dx, b + dy])
        }}
      >
        {g && image ? (
          <div style={turn}>
            <MapView
              g={g}
              image={image}
              chars={chars}
              enemies={tables.enemies}
              dm={false}
              selected="c:"
              combat={tables.combat}
              icons={icons}
              markers={markers}
              now={now()}
              style={style}
              minis={!!tv.bk}
            />
          </div>
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
            <label className="sub">
              <input type="checkbox" checked={!!tv.bk} onChange={(e) => save({ ...tv, bk: e.target.checked })} style={{ width: 'auto' }} /> Miniatures on the table: every token is a black square, so
              no light lands on the painted minis
            </label>
          </div>
          <div className="row">
            <label className="sub">
              Turn the picture{' '}
              <select aria-label="Turn the picture" value={rot} onChange={(e) => save({ ...tv, rot: Number(e.target.value) as TvSettings['rot'] })}>
                <option value={0}>Not turned</option>
                <option value={90}>A quarter turn right (90°)</option>
                <option value={180}>Upside down (180°)</option>
                <option value={270}>A quarter turn left (270°)</option>
              </select>
            </label>
          </div>
          <p className="note">Turn it a quarter when the projector's long side runs along the table's length, so the map reads the right way from your seat.</p>
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
