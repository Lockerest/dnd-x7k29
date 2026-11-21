// The play table: side panel (the GM's controls and everyone's status, or the
// player's own status, quick actions and abilities), the map, and the enemies.
// Same layout and buttons as the live page's table view.
import { useState } from 'react'
import { CLASSES } from '../../data/classes'
import { boardIndex, boardOrDefault, DEFAULT_SPOILERS, equippedIds, goldenHidden, sheetAbilities, spoilerList, type Board } from '../../logic/board'
import { approvedIds } from '../../logic/characters'
import { altarsOf, bonfiresOf, nearSpot } from '../../logic/geometry'
import { abilityLocked, characterPills, cleanses, dismount, drinkFlask, hpChange, isMyTurn, lightHit, netRegen, signed, toggleFoeDown, type Sheet } from '../../logic/sheet'
import { abilityCost, startTurn } from '../../logic/stamina'
import { shortText } from '../../logic/text'
import { alliesDown, doorsNear, enemyHidden, grid, liveMapId, onMap, shownMapId, type Maps } from '../../logic/table'
import { enemyPills } from '../../logic/enemies'
import type { Enemy } from '../../logic/types'
import type { GameState, Tables } from '../../state/store'
import { MapView } from '../map/MapView'
import { Meter } from '../parts'
import { AbilityIcon } from './Board'
import { RequestPanels } from './RequestPanels'
import { InitiativePanel } from './Initiative'
import { ActionMenu } from './Combat'
import { canEndTurn, type Initiative } from '../../logic/initiative'
import { paintFog, paintWalls, type MapEntry, type Tool } from '../../logic/mapTools'
import { browserImages, type ImageKit } from '../images'
import { MapTools } from './MapTools'
import { PictureButton } from '../PictureButton'
import { tokenIcon } from '../images'
import { pinPrompts, toolNote } from './mapPrompts'

export type TableActions = Pick<
  GameState,
  | 'updateCharacter'
  | 'updateEnemy'
  | 'log'
  | 'notice'
  | 'rest'
  | 'reviveAt'
  | 'putDown'
  | 'castAbility'
  | 'tapMap'
  | 'nextRoundAll'
  | 'restAll'
  | 'setCombat'
  | 'toggleDoor'
  | 'helpUp'
  | 'saveSpoilers'
  | 'showMap'
  | 'setGmMap'
  | 'startJump'
  | 'cancelJump'
  | 'startInitiative'
  | 'rollInitiative'
  | 'rollMonsters'
  | 'beginCombat'
  | 'passTurn'
  | 'endCombat'
  | 'openMenu'
  | 'closeMenu'
  | 'act'
  | 'setTool'
  | 'toolTap'
  | 'paint'
  | 'setMap'
  | 'setCols'
  | 'addMap'
  | 'renameMap'
  | 'deleteMap'
  | 'setMarkerIcon'
  | 'travel'
  | 'addPin'
  | 'renamePin'
  | 'deletePin'
  | 'setIcon'
>

export type TableProps = {
  tables: Tables
  dm: boolean
  me: string
  pin: string
  gmMap: string | null
  /** A jump off a monster waiting for the landing square. */
  jump: { id: string; on: string } | null
  /** The open action menu (attacker and target). */
  menu?: { a: string; t: string } | null
  /** Asks for a special attack's name. */
  ask?: (q: string, def?: string) => string | null
  /** Asked before deleting or clearing (the browser's box by default). */
  confirm?: (q: string) => boolean
  /** The GM's current map tool. */
  tool: Tool
  /** Reads and resizes uploaded pictures. */
  images?: ImageKit
  /** Monster skill icons by skill slug. */
  skillIcons?: Record<string, string>
  actions: TableActions
  /** Pictures: map images by map id, token icons by sheet id, ability pictures, custom altar/bonfire/guild markers. */
  mapImages: Record<string, string>
  icons: Record<string, string>
  abilityImages: Record<string, string>
  markers: Record<string, string>
  now: () => number
  /** The GM's Enemies panel (already built), shown on the right. */
  enemiesPanel?: React.ReactNode
  /** The Dice card (already built), under it. */
  dicePanel?: React.ReactNode
  onApprove: (id: string, ok: boolean) => void
  onClaim: (id: string, ok: boolean) => void
  /** Remembers whether the GM hid the side panel. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

const approved = (c: { ap?: unknown }) => c.ap !== false && c.ap !== 'no'
const safe = <T,>(f: () => T, fallback: T) => {
  try {
    return f()
  } catch {
    return fallback
  }
}

export function TableScreen(p: TableProps) {
  const { tables, dm, me, actions } = p
  const [hideL, setHideL] = useState(() => safe(() => p.storage?.getItem('hl') === '1', false))
  const [sel, setSel] = useState<string | null>(null)
  const hide = (h: boolean) => {
    setHideL(h)
    safe(() => p.storage?.setItem('hl', h ? '1' : '0'), undefined)
  }
  const chars = tables.chars as Record<string, Sheet>
  const left = dm ? (
    hideL ? (
      <button onClick={() => hide(false)}>Show side panel</button>
    ) : (
      <>
        <RequestPanels tables={tables} dm={dm} onApprove={p.onApprove} onClaim={p.onClaim} />
        <div className="card sb">
          <div className="row">
            <button onClick={() => hide(true)}>Hide panel</button>
            <button className="pri" onClick={() => void actions.nextRoundAll()}>
              Next round: all
            </button>
            <button onClick={() => void actions.restAll('al')}>Altar: all</button>
            <button onClick={() => void actions.restAll('bf')}>Bonfire: all</button>
            <button className={tables.combat ? 'pri' : ''} onClick={() => void actions.setCombat(!tables.combat)}>
              Combat: {tables.combat ? 'on' : 'off'}
            </button>
          </div>
        </div>
        <HiddenWords sp={tables.sp} onSave={(w) => void actions.saveSpoilers(w)} />
        {approvedIds(chars).length ? (
          approvedIds(chars).map((id) => <StatusBox key={id} id={id} {...p} />)
        ) : (
          <p className="note">
            No characters yet. Table PIN: <b>{p.pin}</b>
          </p>
        )}
      </>
    )
  ) : (
    chars[me] && (
      <>
        <StatusBox id={me} {...p} />
        <QuickActions id={me} {...p} />
        <AbilitySummary id={me} {...p} />
        <AlliesDown {...p} />
      </>
    )
  )
  return (
    <div className={`tbl${dm && hideL ? ' hl' : ''}`}>
      <div>{left}</div>
      <div className="mid">
        <MapPanel {...p} sel={sel} onSelect={setSel} />
      </div>
      <div>
        <InitiativePanel tables={tables} dm={dm} me={me} gmMap={p.gmMap} actions={actions} />
        {dm ? p.enemiesPanel : <PlayerEnemies {...p} />}
        {p.dicePanel}
      </div>
    </div>
  )
}

/** One hero's status: bars, labels, and their quick buttons. */
function StatusBox({ id, tables, dm, me, gmMap, actions, icons }: TableProps & { id: string }) {
  const c = tables.chars[id] as Sheet
  const own = dm || id === me
  const dead = (c.hp as number) <= 0
  const m = shownMap(tables, dm, gmMap)
  const altars = altarsOf(m)
  const upd = (q: [Record<string, unknown>, string?] | null) => q && void actions.updateCharacter(id, q[0], q[1])
  const pills = characterPills(c)
  const carried = Object.keys(tables.enemies).filter((i) => tables.enemies[i]!.hd === `c:${id}`)
  const altar = nearSpot(c, altars)
  const bonfire = nearSpot(c, bonfiresOf(m))
  const cl = cleanses(c, altar)
  const doors = dead ? [] : doorsNear(m, c)
  const cls = CLASSES[c.cls as keyof typeof CLASSES] ?? CLASSES.fighter
  return (
    <div className="card sb" aria-label={`Status: ${c.name}`}>
      <div className="top">
        <h2>
          {c.iv && icons[id] ? <img className="av" src={icons[id]} alt="" /> : null}
          {c.name}
        </h2>
        <span className="sub">
          {cls.name} · Actions {c.used || 0}/2
        </span>
      </div>
      <Meter v={c.hp as number} max={c.maxHp as number} kind="hp" />
      <Meter v={c.st as number} max={c.maxSt as number} kind="st" />
      {pills.length > 0 && (
        <div className="pills">
          {pills.map((q, i) => (
            <i key={i} className={`pill${q.bad ? ' bad' : ''}`}>
              {q.text}
            </i>
          ))}
        </div>
      )}
      {own && dead && (
        <div className="row mini">
          {altars.length ? (
            altars.map((k, i) => (
              <button key={k} className="pri" onClick={() => void actions.reviveAt(id, k)}>
                Revive at altar {i + 1}
              </button>
            ))
          ) : (
            <span className="sub">No altar on the map to revive at.</span>
          )}
        </div>
      )}
      {own && !dead && (
        <>
          <div className="row mini">
            {dm && (
              <button className="pri" onClick={() => upd(startTurn(c as Parameters<typeof startTurn>[0]))}>
                Start of turn {signed(netRegen(c))}
              </button>
            )}
            <button disabled={(c.fl as number) < 1} onClick={() => upd(drinkFlask(c))}>
              Flask {c.fl}/{c.maxFl}
            </button>
            {canEndTurn(tables.ini as Initiative | null, id, dm) && (
              <button className="pri" onClick={() => void actions.passTurn()}>
                End turn
              </button>
            )}
            {dm &&
              [-50, -10, 10, 50].map((n) => (
                <button key={n} onClick={() => upd(hpChange(c, n))}>
                  {signed(n)}
                </button>
              ))}
            <PictureButton process={tokenIcon} onPicture={(d) => actions.setIcon(`c:${id}`, d)} onError={actions.notice}>
              Icon
            </PictureButton>
          </div>
          {(c.mt || carried.length > 0) && (
            <div className="row mini">
              {c.mt && (
                <>
                  <button
                    onClick={() => {
                      if (dm || !tables.enemies[c.mon as string]) {
                        upd(dismount(dm))
                        if (dm) void actions.log(`${c.name} is dropped from the monster. The GM decides where they land.`)
                      } else actions.startJump(id)
                    }}
                  >
                    {dm ? 'Drop rider' : 'Jump off'}
                  </button>
                  <button onClick={() => upd(toggleFoeDown(c))}>{c.mt === 'climb' ? 'Foe is down' : 'Foe is up'}</button>
                </>
              )}
              {carried.map((i) => (
                <button key={i} onClick={() => void actions.putDown(i)}>
                  Put down {tables.enemies[i]!.name}
                </button>
              ))}
            </div>
          )}
          {(altar || bonfire || c.dth || c.ft) && (
            <div className="row mini">
              {altar && (
                <button className={cl ? 'pri' : ''} onClick={() => void actions.rest(id, 'al')}>
                  {cl ? 'Rest at altar & cleanse curse' : 'Rest at altar (resets the world)'}
                </button>
              )}
              {bonfire && <button onClick={() => void actions.rest(id, 'bf')}>Rest at bonfire (clears fatigue)</button>}
              {c.dth && !cl && (
                <span className="sub">
                  {altar ? 'This is the altar you were revived at. Find a different altar to cleanse the curse.' : 'Find a different altar than the one you were revived at to cleanse the curse.'}
                </span>
              )}
            </div>
          )}
          {doors.length > 0 && (
            <div className="row mini">
              {doors.map(([k, q]) => (
                <button key={k} onClick={() => void actions.toggleDoor(id, k)}>
                  {q.o ? 'Close' : 'Open'} door
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {dm && c.exh && (
        <div className="row mini">
          <button onClick={() => upd(lightHit(c, 'l'))}>Light hit ({c.lh || 0}/3)</button>
          <button onClick={() => upd(lightHit(c, 'h'))}>Heavy hit</button>
        </div>
      )}
    </div>
  )
}

const shownMap = (t: Tables, dm: boolean, gmMap: string | null) => {
  const id = shownMapId(t.maps as Maps, t.cur, dm, gmMap)
  return id ? (t.maps as Maps)[id]! : null
}

/** The player's non-attack abilities as buttons (attacks are used from the map). */
function QuickActions({ id, tables, dm, actions, abilityImages }: TableProps & { id: string }) {
  const c = tables.chars[id] as Sheet
  const board = boardOrDefault(tables.board as Board | null)
  const ix = boardIndex(board)
  const myTurn = isMyTurn(tables.ini, `c:${id}`)
  return (
    <div className="card sb">
      <h3>Quick actions (2 per round)</h3>
      <div className="row mini">
        {sheetAbilities(c, board, goldenHidden(dm, tables.sp)).map(([name, cost, , r], i) =>
          ix.attack[name] || r === 'r' ? null : (
            <button
              key={`${i}${name}`}
              className={(c.st as number) < abilityCost(c, cost) ? 'warn' : ''}
              disabled={abilityLocked(c, false, dm, myTurn)}
              onClick={() => void actions.castAbility(id, name, cost, false)}
            >
              <AbilityIcon board={board} name={name} images={abilityImages} drawn={tables.drawnIcons} />
              {name} · {abilityCost(c, cost)}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/** The player's equipped abilities with their numbers. */
function AbilitySummary({ id, tables, dm, abilityImages }: TableProps & { id: string }) {
  const c = tables.chars[id] as Sheet
  const board = boardOrDefault(tables.board as Board | null)
  const list = equippedIds(c, board, goldenHidden(dm, tables.sp)).map((k) => board[k]!)
  if (!list.length) return null
  return (
    <div className="card sb">
      <h3>Your abilities</h3>
      {list.map((e) => {
        const info = e.k === 'atk' ? `${e.d || ''}${e.r ? ` · range ${e.r}` : ''}${e.a ? ' · auto-hit' : ''}` : e.k === 'heal' ? `heals ${e.d || ''}` : e.k === 'check' ? 'd20 check' : ''
        return (
          <div className="ab" key={e.n}>
            <div>
              <AbilityIcon board={board} name={e.n} images={abilityImages} drawn={tables.drawnIcons} />
              <b>{e.n}</b>{' '}
              <span className="sub">
                {abilityCost(c, Number(e.c) || 0)} St
                {e.hc ? ` + ${e.hc}% HP` : ''}
                {info ? ` · ${info}` : ''}
              </span>
              <small>{e.sd || shortText(e.t)}</small>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AlliesDown({ tables, me, actions }: TableProps) {
  const m = tables.chars[me] as Sheet
  const list = alliesDown(tables.chars as Record<string, Sheet>, me)
  if (!list.length) return null
  return (
    <div className="card sb">
      <h3>Allies down</h3>
      {list.map((i) => (
        <button key={i} disabled={!!m.exh || (m.used || 0) >= 2} onClick={() => void actions.helpUp(i)}>
          Help {tables.chars[i]!.name} up (uses an action)
        </button>
      ))}
    </div>
  )
}

/** Words players see as black bars. */
function HiddenWords({ sp, onSave }: { sp: string | null; onSave: (words: string[]) => void }) {
  const ws = spoilerList(sp)
  const [text, setText] = useState<string | null>(null)
  return (
    <div className="card sb">
      <h3>Hidden words (players see black bars)</h3>
      <div className="row mini">
        {ws.length ? (
          ws.map((w) => (
            <button key={w} onClick={() => onSave(ws.filter((x) => x !== w))}>
              {w} · reveal
            </button>
          ))
        ) : (
          <span className="sub">Nothing is hidden.</span>
        )}
      </div>
      <label className="sub">
        Word list, separated by commas
        <input value={text ?? ws.join(', ')} onChange={(e) => setText(e.target.value)} style={{ width: '100%' }} />
      </label>
      <div className="row mini">
        <button
          onClick={() => {
            onSave((text ?? ws.join(', ')).split(','))
            setText(null)
          }}
        >
          Save list
        </button>
        <button onClick={() => onSave([])}>Reveal all</button>
        <button onClick={() => onSave(DEFAULT_SPOILERS.split(','))}>Hide the default words</button>
      </div>
      <p className="note">Use "View as player" to check. Players cannot uncover a word themselves. While "golden" is hidden, players also do not see the Golden versions of abilities.</p>
    </div>
  )
}

/** Enemies the player can see on the map. */
function PlayerEnemies({ tables, icons }: TableProps) {
  const id = liveMapId(tables.maps as Maps, tables.cur)
  const g = grid(tables.maps as Maps, id)
  const seers = Object.values(tables.chars).filter(approved) as Sheet[]
  const ids = Object.keys(tables.enemies).filter((i) => {
    const e = tables.enemies[i]!
    return e.mx != null && onMap(e, id) && !enemyHidden(g, seers, e)
  })
  return (
    <div className="card">
      <h2>Enemies</h2>
      {ids.length ? (
        ids.map((i) => {
          const e = tables.enemies[i] as Enemy & { iv?: unknown }
          const pills = enemyPills(i, e, tables.chars)
          return (
            <div className="ab" key={i}>
              <div>
                {e.iv && icons[i] ? <img className="av" src={icons[i]} alt="" /> : null}
                <b>{e.name}</b>
                {e.pl && <small>{e.pl}</small>}
                <small>
                  {e.type} · {e.sz || 1}×{e.sz || 1}
                </small>
                {pills.length > 0 && (
                  <div className="pills">
                    {pills.map((t) => (
                      <i key={t} className="pill bad">
                        {t}
                      </i>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })
      ) : (
        <p className="note">None in sight.</p>
      )}
    </div>
  )
}

/** The map card: the GM's unit chips and map choice, the map, and what a tap will do. */
function MapPanel(p: TableProps & { sel: string | null; onSelect: (k: string | null) => void }) {
  const { tables, dm, me, actions, gmMap, sel } = p
  const maps = tables.maps as Maps
  const ids = Object.keys(maps)
  const id = shownMapId(maps, tables.cur, dm, gmMap)
  const live = liveMapId(maps, tables.cur)
  const tool: Tool = dm ? p.tool : 'move'
  const ask = p.ask ?? ((q: string, def?: string) => window.prompt(q, def))
  const m = id ? (maps[id] as MapEntry) : undefined
  // A wall or fog drag shows on the map as it goes, and saves when released.
  const [draft, setDraft] = useState<[number, number][] | null>(null)
  const painting = tool === 'wall' || tool === 'rev' || tool === 'hid'
  const shown =
    draft && m
      ? {
          ...maps,
          [id!]: tool === 'wall' ? { ...m, walls: paintWalls(m, draft) } : { ...m, fog: true, fg: paintFog(m, draft, tool === 'rev') },
        }
      : maps
  const g = grid(shown as Maps, id)
  const image = id ? p.mapImages[id] : undefined
  const picker = dm && <MapTools tables={tables} id={id} tool={tool} actions={actions} images={p.images ?? browserImages()} ask={ask} confirm={p.confirm ?? ((q) => window.confirm(q))} />
  if (!ids.length)
    return (
      <div className="card">
        <p className="note">{dm ? 'No maps yet. Upload one to begin.' : "The GM hasn't set a map yet."}</p>
        {picker}
      </div>
    )
  if (!g || !image)
    return (
      <div className="card">
        <p className="note">Loading map…</p>
        {picker}
      </div>
    )
  const chars = tables.chars as Record<string, Sheet>
  const selected = dm ? sel : `c:${me}`
  const sid = selected?.slice(2) ?? ''
  const so = selected ? (selected[0] === 'e' ? tables.enemies[sid] : chars[sid]) : undefined
  const c = so && selected![0] === 'c' ? (so as Sheet & { spd?: number }) : null
  const sp = c ? c.spd || 6 : 6
  const lim = c ? (c.stn ? 0 : c.exh ? 2 : sp) - (tables.combat ? c.mvd || 0 : 0) : 0
  const e = so && selected![0] === 'e' ? (so as Enemy & { spd?: number; bon?: number }) : null
  const info = !so
    ? dm
      ? 'Pick a unit, then tap the map to move it, or tap another token to act on it.'
      : 'Tap an enemy token to attack or interact.'
    : so.mx == null
      ? 'Tap the map to place it.'
      : e
        ? `Red squares: this enemy can move up to ${(e.spd || 6) + (e.bon || 0)} squares (speed ${e.spd || 6} + bonus ${e.bon || 0}). Tap the map to move it, or tap a character to act on it.`
        : c!.exh
          ? `Exhausted (${c!.exn || 2} rounds left): you can only move 2 squares at a time, free of stamina.`
          : tables.combat
            ? `Combat: moving costs 1 stamina per square, ${lim} squares left this round. Green is affordable, amber means you'd run out of stamina and become exhausted.`
            : `Out of combat: move up to ${sp} squares for free (green). Tap an enemy token to attack or interact.`
  const chips = dm
    ? [
        ...approvedIds(chars)
          .filter((i) => onMap(chars[i]!, id))
          .map((i) => [`c:${i}`, chars[i]!.name ?? i] as const),
        ...Object.keys(tables.enemies)
          .filter((i) => onMap(tables.enemies[i]!, id))
          .map((i) => [`e:${i}`, `👹 ${tables.enemies[i]!.name}`] as const),
      ]
    : []
  return (
    <div className="card">
      {chips.length > 0 && (
        <div className="row mini">
          {chips.map(([k, t]) => (
            <button key={k} className={k === sel ? 'pri' : ''} onClick={() => p.onSelect(k)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <MapView
        g={g}
        image={image}
        chars={chars}
        enemies={tables.enemies}
        dm={dm}
        selected={selected}
        combat={tables.combat}
        icons={p.icons}
        markers={p.markers}
        now={p.now()}
        onTap={(x, y) => {
          // Any tap closes the menu; tapping another token opens it on that token.
          actions.closeMenu()
          if (painting) return setDraft([[x, y]])
          if (tool !== 'move') return void actions.toolTap(x, y).then((r) => r && pinPrompts(maps as Record<string, MapEntry>, id!, r, ask, actions))
          void actions.tapMap(x, y, selected).then((r) => r && actions.openMenu(selected!, r.target))
        }}
        onDrag={(x, y) => draft && setDraft((d) => (d!.some(([a, b]) => a === x && b === y) ? d : [...d!, [x, y]]))}
        onRelease={() => {
          if (!draft) return
          void actions.paint(draft)
          setDraft(null)
        }}
      />
      <ActionMenu tables={tables} dm={dm} menu={p.menu ?? null} actions={actions} ask={p.ask} skillIcons={p.skillIcons} />
      <p className="note">
        {info}
        {dm ? toolNote(tool, m!) : ''}
        {dm && id !== live ? " You're editing a map players can't see yet." : ''}
        {p.jump ? ' Tap a free square within 3 squares of the monster to jump there.' : ''}
      </p>
      {p.jump && (
        <div className="row mini">
          <button onClick={actions.cancelJump}>Cancel jump</button>
        </div>
      )}
      {picker}
    </div>
  )
}
