// The game container: joining, staying in step with the table, and picking the
// screen. Screens that are not moved yet show a summary with a link to the live page.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { LEGACY_URL, STORAGE_PREFIX } from '../config'
import { createDb, type Db } from '../db/client'
import { THEMES } from '../data/audio'
import { approvedIds, claimRequest, newCharacter } from '../logic/characters'
import { cinematicSeconds, freshCinematics, parseCinematic, type CinematicEvent } from '../logic/cinematic'
import { newPlayerId, planJoin, type JoinKind } from '../logic/join'
import { headerFor, screenFor, type View } from '../logic/screens'
import type { ClassId } from '../logic/types'
import { clearSession, loadPrefs, loadSession, savePrefs, saveSession, type Session } from '../state/session'
import { createGameStore } from '../state/store'
import { startSync, type AssetVersions } from '../state/sync'
import { errorText } from '../util/errors'
import { ClaimForm, ClaimWait, CreateCharacter, WaitApproval } from './screens/Characters'
import { JoinScreen } from './screens/JoinScreen'
import { TableScreen } from './screens/Table'
import { TableDisplay } from './screens/TableDisplay'
import { useMarkers, usePictures } from './usePictures'
import { liveMapId, shownMapId, type Maps } from '../logic/table'
import { EnemiesPanel } from './screens/EnemiesPanel'
import { SheetScreen } from './screens/Sheet'
import { BoardScreen } from './screens/Board'
import { CinematicOverlay } from './CinematicOverlay'

type Storage_ = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type GameProps = {
  fetchImpl?: typeof fetch
  storage?: Storage_
  hash?: string
  every?: number
  newId?: () => string
  now?: () => number
  /** Asked before removing an enemy. */
  confirm?: (question: string) => boolean
  rand?: () => number
}

export function Game({ fetchImpl, storage = window.localStorage, hash = window.location.hash, every = 3000, newId = newPlayerId, now = Date.now, confirm, rand }: GameProps) {
  const [conn, setConn] = useState<{ db: Db; session: Session } | null>(null)
  const db = conn?.db ?? null
  // The clock is fixed at the first render (a new function on every render must not
  // replace the store and lose the game state); the store changes only with the table.
  const [clock] = useState(() => now)
  const store = useMemo(() => createGameStore(() => db, clock), [db, clock])
  const status = useStore(store, (s) => s.status)
  const session = useStore(store, (s) => s.session)
  const role = session?.role ?? ''
  const tables = useStore(store, (s) => s.tables)
  const dm = useStore(store, (s) => s.dm)
  const storeError = useStore(store, (s) => s.error)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('table')
  const [claimMode, setClaimMode] = useState(false)

  const [open, setOpen] = useState<string[]>(() => loadPrefs(storage).openEnemies)
  const toggleOpen = (id: string) => {
    const next = open.includes(id) ? open.filter((x) => x !== id) : [...open, id]
    setOpen(next)
    savePrefs(storage, { openEnemies: next })
  }
  const [themeKeys, setThemeKeys] = useState<string[]>([])
  const [markerVersion, setMarkerVersion] = useState<AssetVersions['mapIcons']>(null)
  const [cin, setCin] = useState<{ c: CinematicEvent; portrait: string | null } | null>(null)
  const seen = useRef<{ keys: Set<string>; seeded: boolean }>({ keys: new Set(), seeded: false })

  // Character portraits, downloaded once per version (pv) when a sheet shows them.
  const [portraits, setPortraits] = useState<Record<string, string>>({})
  const portraitVersions = useRef<Record<string, unknown>>({})

  const remember = useCallback((s: Session) => saveSession(storage, hash, s, STORAGE_PREFIX), [storage, hash])

  // Come back to the saved table, if it still exists.
  useEffect(() => {
    const s = loadSession(storage, hash, STORAGE_PREFIX)
    if (!s.pin || !s.role) return
    const saved: Session = { pin: s.pin, role: s.role, me: s.me ?? '' }
    const d = createDb(s.pin, { fetch: fetchImpl })
    d.get('meta').then(
      (meta) => (meta ? setConn({ db: d, session: saved }) : clearSession(storage, hash, STORAGE_PREFIX)),
      () => {}, // Offline: stay on the join screen and keep the saved session for next time.
    )
  }, [storage, hash, fetchImpl])

  // Once a database is open, connect and keep in step.
  useEffect(() => {
    if (!conn) return
    store.getState().connect(conn.session)
    seen.current = { keys: new Set(), seeded: false }
    conn.db.keys('themes').then(setThemeKeys, () => setThemeKeys([]))
    return startSync(store, conn.db, { every, onVersions: (v) => setMarkerVersion(v.mapIcons) })
  }, [conn, store, every])

  useEffect(() => {
    if (!db || view !== 'sheet') return
    for (const [id, c] of Object.entries(tables.chars)) {
      const pv = (c as { pv?: unknown }).pv
      if (!pv || portraitVersions.current[id] === pv) continue
      portraitVersions.current[id] = pv
      db.get<{ data?: string }>(`portraits/${id}`).then(
        (d) => d?.data && setPortraits((p) => ({ ...p, [id]: d.data! })),
        () => delete portraitVersions.current[id], // try again on the next refresh
      )
    }
  }, [db, view, tables.chars])

  // Uploaded ability pictures: downloaded again whenever the GM changes one (iv stamps).
  const [abilityImages, setAbilityImages] = useState<Record<string, string>>({})
  const imageStamps = useRef('')
  const boardStamps = useMemo(() => {
    const b = (tables.board || {}) as Record<string, { iv?: unknown }>
    return Object.keys(b)
      .filter((k) => b[k]?.iv)
      .map((k) => `${k}:${b[k]!.iv}`)
      .join(',')
  }, [tables.board])
  useEffect(() => {
    if (!db || (view !== 'board' && view !== 'ref') || !boardStamps || boardStamps === imageStamps.current) return
    imageStamps.current = boardStamps
    db.get<Record<string, { data?: string }>>('abicons').then(
      (d) => setAbilityImages(Object.fromEntries(Object.entries(d || {}).flatMap(([k, v]) => (v?.data ? [[k, v.data]] : [])))),
      () => (imageStamps.current = ''), // try again on the next refresh (any change to the board)
    )
  }, [db, view, boardStamps, tables.board])

  // Map pictures, token icons and custom markers for the table and the projector.
  const gmMap = useStore(store, (s) => s.gmMap)
  const jump = useStore(store, (s) => s.jump)
  const mapId = role === 'table' ? liveMapId(tables.maps as Maps, tables.cur) : shownMapId(tables.maps as Maps, tables.cur, dm, gmMap)
  const onTable = view === 'table'
  const wantedMap = useMemo(() => (onTable && mapId ? { [mapId]: String((tables.maps[mapId] as { iv?: unknown }).iv ?? '') } : {}), [onTable, mapId, tables.maps])
  const mapImages = usePictures(db, wantedMap, mapImagePath, tables)
  const wantedIcons = useMemo(() => {
    const o: Record<string, unknown> = {}
    if (onTable) for (const sheets of [tables.chars, tables.enemies]) for (const [i, x] of Object.entries(sheets as Record<string, { iv?: unknown }>)) if (x.iv) o[i] = x.iv
    return o
  }, [onTable, tables.chars, tables.enemies])
  const icons = usePictures(db, wantedIcons, iconPath, tables)
  const markers = useMarkers(db, onTable ? markerVersion : null, tables)

  // Shows a cinematic, with the boss picture when the script asks for it.
  const show = useCallback(
    async (c: CinematicEvent) => {
      const id = c.k.slice(2)
      let portrait: string | null = null
      if (db && parseCinematic(c.t).some((b) => b.tags.portrait)) {
        for (const p of [`bossart/${id}`, `icons/${id}`]) {
          const d = await db.get<{ data?: string }>(p).catch(() => null)
          if (d?.data) {
            portrait = d.data
            break
          }
        }
      }
      setCin({ c, portrait })
    },
    [db],
  )

  // Cinematics started on another device play here too.
  useEffect(() => {
    if (!session || status !== 'live') return // the first real read seeds what was already there
    const fresh = freshCinematics(tables.rolls as Parameters<typeof freshCinematics>[0], seen.current.keys, seen.current.seeded, session.me, now())
    seen.current.seeded = true
    if (fresh.length) void show(fresh[fresh.length - 1]!)
  }, [tables.rolls, session, status, now, show])

  const playCinematic = async (id: string) => {
    const c = await store.getState().shareCinematic(id)
    /* v8 ignore next -- the button only shows when there is a script; this guards a race with its removal */
    if (!c) return
    void show(c)
    if (tables.enemies[id]?.gv) setTimeout(() => void store.getState().vanish(id), cinematicSeconds(parseCinematic(c.t)) * 1000)
  }

  // A takeover the GM allowed: this device becomes that character.
  const myClaim = session && !dm && session.role === 'player' ? (tables.claims as { st?: string; target?: string } | null) : null
  useEffect(() => {
    if (!session || myClaim?.st !== 'ok' || !myClaim.target) return
    const target = myClaim.target
    // Withdraw the request (under the old id) first, then become that character.
    void store
      .getState()
      .setMyClaim(null)
      .then(() => {
        store.getState().setMe(target)
        remember({ ...session, me: target })
      })
  }, [myClaim?.st, myClaim?.target, session, store, remember])

  const join = async (kind: JoinKind, pin: string, gmPin: string) => {
    setBusy(true)
    setError('')
    try {
      const d = createDb(pin.trim(), { fetch: fetchImpl })
      const meta = /^[A-Za-z0-9]{6,30}$/.test(pin.trim()) ? await d.get<{ dm?: string }>('meta') : null
      const plan = await planJoin(kind, pin, gmPin, meta, loadSession(storage, hash, STORAGE_PREFIX), newId)
      if ('error' in plan) return setError(plan.error)
      if (plan.createTable) await d.put('meta', plan.createTable)
      remember(plan.session)
      setView('table')
      setClaimMode(false)
      setConn({ db: d, session: plan.session })
    } catch (e) {
      setError(`Connection problem: ${errorText(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    clearSession(storage, hash, STORAGE_PREFIX)
    store.getState().disconnect()
    setConn(null)
    setView('table')
    setClaimMode(false)
  }

  const me = session?.me ?? ''
  const mine = tables.chars[me]
  const header = headerFor({ role, dm, canGM: role === 'gm', view, mine })
  const screen = screenFor({ role, dm, me, chars: tables.chars, view, claimPending: !!myClaim && !!myClaim.st, claimMode })

  const approve = (id: string, ok: boolean) => void store.getState().updateCharacter(id, { ap: ok ? true : 'no' }, ok ? 'Approved by the GM' : 'Declined by the GM')
  const decideClaim = (id: string, ok: boolean) => void store.getState().decideClaim(id, ok ? 'ok' : 'no')

  let body: React.ReactNode
  if (screen === 'join') body = <JoinScreen onJoin={(k, p, g) => void join(k, p, g)} busy={busy} />
  else if (screen === 'create')
    body = (
      <CreateCharacter
        onCreate={(cls: ClassId, name) => void store.getState().putCharacter(me, newCharacter(cls, name, me))}
        onClaimMode={() => setClaimMode(true)}
      />
    )
  else if (screen === 'claim-form')
    body = (
      <ClaimForm
        characters={approvedIds(tables.chars).map((id) => ({ id, name: tables.chars[id]!.name ?? id }))}
        onBack={() => setClaimMode(false)}
        onSend={(who, target) => {
          const c = claimRequest(who, target, now())
          if ('error' in c) return setError(c.error)
          setError('')
          setClaimMode(false)
          void store.getState().setMyClaim(c)
        }}
      />
    )
  else if (screen === 'claim-wait')
    body = <ClaimWait declined={myClaim?.st === 'no'} target={(myClaim?.target && tables.chars[myClaim.target]?.name) || 'that character'} onDismiss={() => void store.getState().setMyClaim(null)} />
  else if (screen === 'wait-approval') body = <WaitApproval name={mine?.name ?? ''} declined={mine?.ap === 'no'} />
  else if (screen === 'board' || screen === 'ref')
    body = (
      <BoardScreen
        view={screen}
        onView={setView}
        tables={tables}
        dm={dm}
        me={me}
        actions={store.getState()}
        images={boardStamps ? abilityImages : {}}
        confirm={confirm ?? ((q) => window.confirm(q))}
        rand={rand}
      />
    )
  else if (screen === 'sheet')
    body = (
      <SheetScreen
        tables={tables}
        dm={dm}
        me={me}
        actions={store.getState()}
        portraits={portraits}
        gmMap={gmMap}
        confirm={confirm ?? ((q) => window.confirm(q))}
        onJump={() => setView('table')}
        onApprove={approve}
        onClaim={decideClaim}
      />
    )
  else if (screen === 'table-display')
    body = <TableDisplay tables={tables} mapImages={mapImages} icons={icons} markers={markers} now={now} storage={storage} onLeave={leave} />
  else
    body = (
      <TableScreen
        tables={tables}
        dm={dm}
        me={me}
        pin={session!.pin}
        gmMap={gmMap}
        jump={jump}
        actions={store.getState()}
        mapImages={mapImages}
        icons={icons}
        abilityImages={boardStamps ? abilityImages : {}}
        markers={markers}
        now={now}
        storage={storage}
        legacyUrl={LEGACY_URL}
        onApprove={approve}
        onClaim={decideClaim}
        enemiesPanel={
          <EnemiesPanel
            tables={tables}
            actions={store.getState()}
            open={open}
            onToggle={toggleOpen}
            themes={themeKeys.map((key) => ({ key, name: THEMES.find((t) => t.key === key)?.name ?? key }))}
            onPlayCinematic={(id) => void playCinematic(id)}
            confirm={confirm}
            rand={rand}
          />
        }
      />
    )

  return (
    <div className={screen === 'table-display' ? 'tblv' : undefined}>
      <header className="top">
        <h1>Curse of the Golden Wave</h1>
        <span className="row mini">
          {header.roleLabel && <span className="tag">{header.roleLabel}</span>}
          {header.sheetTab && <button onClick={() => setView(view === 'sheet' ? 'table' : 'sheet')}>{header.sheetTab}</button>}
          {header.boardTab && <button onClick={() => setView(view === 'board' || view === 'ref' ? 'table' : 'board')}>{header.boardTab}</button>}
          {header.switchRole && <button onClick={() => store.getState().setDm(!dm)}>{header.switchRole}</button>}
          {header.leave && <button onClick={leave}>Leave</button>}
        </span>
      </header>
      {(error || storeError) && (
        <p className="err" role="alert">
          {error || storeError}
        </p>
      )}
      {body}
      {cin && <CinematicOverlay key={cin.c.t + cin.c.k} cin={cin.c} portrait={cin.portrait} onDone={() => setCin(null)} />}
    </div>
  )
}

const mapImagePath = (id: string) => `mapimg/${id}`
const iconPath = (id: string) => `icons/${id}`
