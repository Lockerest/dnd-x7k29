// The GM's map tools under the map, and the "you are here" overview. Same
// buttons, prompts and wording as the live page.
import { useRef } from 'react'
import { DANGER_COLORS, parentOf, parseDungeondraft, revealAll, rowsOf, type DdExport, type MapEntry, type Tool } from '../../logic/mapTools'
import { liveMapId, type Maps } from '../../logic/table'
import type { GameState, Tables } from '../../state/store'
import { readFile, shrinkImage, squareIcon, type ImageKit } from '../images'

export type MapToolActions = Pick<
  GameState,
  'setTool' | 'dzs' | 'dzc' | 'setDanger' | 'setMap' | 'setCols' | 'addMap' | 'renameMap' | 'deleteMap' | 'setMarkerIcon' | 'showMap' | 'setGmMap' | 'notice'
>

export type MapToolsProps = {
  tables: Tables
  /** The map on screen (null when there are none). */
  id: string | null
  tool: Tool
  actions: MapToolActions
  images: ImageKit
  ask: (q: string, def?: string) => string | null
  confirm: (q: string) => boolean
}

const TOOLS: [Tool, string][] = [
  ['move', 'Move tokens'],
  ['wall', 'Draw walls'],
]
const FOG_TOOLS: [Tool, string][] = [
  ['rev', 'Reveal'],
  ['hid', 'Hide'],
  ['al', 'Altar'],
  ['bf', 'Bonfire'],
  ['gd', 'Guild'],
  ['dr', 'Doors'],
  ['nd', 'Place door'],
  ['pin', 'Pins'],
  ['en', 'Entry'],
  ['dz', 'Danger zone'],
]

function FileInput({ inputRef, accept, label, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; accept: string; label: string; onFile: (f: File) => unknown }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      hidden
      aria-label={label}
      onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (f) void onFile(f)
      }}
    />
  )
}

export function MapTools({ tables, id, tool, actions, images, ask, confirm }: MapToolsProps) {
  const maps = tables.maps as Record<string, MapEntry>
  const ids = Object.keys(maps)
  const live = liveMapId(maps as Maps, tables.cur)
  const m = id ? maps[id] : undefined
  const mapFile = useRef<HTMLInputElement>(null)
  const ddFile = useRef<HTMLInputElement>(null)
  const iconFile = useRef<HTMLInputElement>(null)
  const iconFor = useRef<'al' | 'bf' | 'gd'>('al')
  const toolBtn = ([k, label]: [Tool, string]) => (
    <button key={k} className={tool === k ? 'pri' : ''} onClick={() => actions.setTool(k)}>
      {label}
    </button>
  )

  const newMap = async (f: File) => {
    try {
      const { data, w, h } = await shrinkImage(images, await readFile(f, 'dataUrl'), 1400, 700000)
      await actions.addMap(data, w, h, f.name || 'Map')
    } catch {
      actions.notice("Couldn't read that map image.")
    }
  }
  const importDd = async (f: File) => {
    let j: DdExport
    try {
      j = JSON.parse(await readFile(f, 'text')) as DdExport
    } catch {
      return actions.notice("That file isn't a valid Dungeondraft (.dd2vtt) export.")
    }
    const q = parseDungeondraft(j)
    if (!q) return actions.notice('This file has no map image or grid information.')
    actions.notice(`Importing ${f.name}...`)
    try {
      const { data, w, h } = await shrinkImage(images, q.src, 2000, 1300000)
      actions.notice('')
      await actions.addMap(data, w, h, f.name, {
        cols: q.cols,
        ew: q.ew,
        dr: q.dr,
      })
    } catch {
      actions.notice("Couldn't read that map image.")
    }
  }
  const markerIcon = async (f: File) => {
    try {
      await actions.setMarkerIcon(iconFor.current, await squareIcon(images, await readFile(f, 'dataUrl'), 128))
    } catch {
      actions.notice("Couldn't read that image.")
    }
  }

  return (
    <>
      <div className="row">
        {ids.length > 0 && (
          <select aria-label="Map" value={id!} onChange={(e) => actions.setGmMap(e.target.value)} style={{ width: 'auto', flex: 1 }}>
            {ids.map((i) => (
              <option key={i} value={i}>
                {String(maps[i]!.name ?? i)}
                {i === live ? ' (live)' : ''}
              </option>
            ))}
          </select>
        )}
        <button onClick={() => mapFile.current!.click()}>New map</button>
        <FileInput inputRef={mapFile} accept="image/*" label="Map picture" onFile={newMap} />
        <button onClick={() => ddFile.current!.click()}>Import Dungeondraft</button>
        <FileInput inputRef={ddFile} accept=".dd2vtt,.uvtt,.df2vtt,.json" label="Dungeondraft file" onFile={importDd} />
        {ids.length > 0 && (
          <>
            <button onClick={() => void actions.showMap(id!)}>Show to players</button>
            <button
              onClick={() => {
                const n = ask('Map name', String(m!.name ?? ''))
                if (n) void actions.renameMap(n)
              }}
            >
              Rename
            </button>
            <button onClick={() => confirm('Delete this map?') && void actions.deleteMap()}>Delete</button>
          </>
        )}
      </div>
      {m && (
        <div className="row">
          <label className="sub">
            Squares across{' '}
            <input
              key={`${id}:${m.cols || 24}`}
              type="number"
              min={5}
              max={200}
              defaultValue={m.cols || 24}
              style={{ width: 72 }}
              onBlur={(e) => e.target.value !== String(m.cols || 24) && void actions.setCols(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </label>
          <button onClick={() => void actions.setMap({ grid: m.grid === false })}>Grid: {m.grid === false ? 'off' : 'on'}</button>
          {TOOLS.map(toolBtn)}
          <button onClick={() => confirm('Remove all walls on this map?') && void actions.setMap({ walls: [] })}>Clear walls</button>
          <button onClick={() => confirm('Remove all imported walls and doors from this map?') && void actions.setMap({ ew: [], dr: {} })}>Clear imported walls</button>
          <button onClick={() => void actions.setMap({ fog: !m.fog })}>Fog: {m.fog ? 'on' : 'off'}</button>
          {FOG_TOOLS.map(toolBtn)}
          <button onClick={() => void actions.setMap({ ov: m.ov === false })}>Overview: {m.ov === false ? 'off' : 'on'}</button>
          <button onClick={() => void actions.setMap(revealAll(m))}>Reveal all</button>
          <button onClick={() => void actions.setMap({ fog: true, fg: '' })}>Hide all</button>
          {(
            [
              ['al', 'Altar icon'],
              ['bf', 'Bonfire icon'],
              ['gd', 'Guild icon'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                iconFor.current = k
                iconFile.current!.click()
              }}
            >
              {label}
            </button>
          ))}
          <button onClick={() => confirm('Go back to the default altar, bonfire and guild icons?') && void actions.setMarkerIcon(null)}>Default icons</button>
          <FileInput inputRef={iconFile} accept="image/*" label="Icon picture" onFile={markerIcon} />
        </div>
      )}
      {m && tool === 'dz' && (
        <div className="row" aria-label="Danger zone">
          <span className="sub">Tap the top-left square to paint a zone; tap a zone to remove it.</span>
          <label className="sub">
            Size{' '}
            <select aria-label="Danger zone size" value={actions.dzs} onChange={(e) => actions.setDanger({ dzs: Number(e.target.value) })} style={{ width: 'auto' }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}x{n}
                </option>
              ))}
            </select>
          </label>
          {DANGER_COLORS.map(([n, c]) => (
            <button key={c} aria-label={`${n} zone`} aria-pressed={actions.dzc === c} className={actions.dzc === c ? 'pri' : ''} onClick={() => actions.setDanger({ dzc: c })}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, marginRight: 4, verticalAlign: 'middle' }} />
              {n}
            </button>
          ))}
          <input type="color" aria-label="Any colour" value={actions.dzc} onChange={(e) => actions.setDanger({ dzc: e.target.value })} style={{ width: 40, padding: 0 }} />
          {Object.keys(m.dz || {}).length > 0 && <button onClick={() => void actions.setMap({ dz: {} })}>Clear danger zones</button>}
        </div>
      )}
    </>
  )
}

/** "You are here": the parent map with a ping where this map's pin is. */
export function Overview({ maps, id, images }: { maps: Record<string, MapEntry>; id: string | null; images: Record<string, string> }) {
  const m = id ? maps[id] : undefined
  const par = m && m.ov !== false ? parentOf(maps, id!) : null
  if (!par || !images[par.map]) return null
  const pm = maps[par.map]!
  const cols = pm.cols || 24
  const rows = Math.max(1, rowsOf(pm))
  return (
    <div id="ovw" aria-label="Overview">
      <div className="ovt">You are here: {par.pin.l || m!.name}</div>
      <div className="ovi">
        <img src={images[par.map]} alt="" />
        <i
          style={{
            left: `${(par.pin.x / cols) * 100}%`,
            top: `${(par.pin.y / rows) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
