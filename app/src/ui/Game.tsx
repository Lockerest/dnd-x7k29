// The game container: joining, staying in step with the table, and picking the
// screen. Screens that are not moved yet show a summary with a link to the live page.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { STORAGE_PREFIX } from '../config'
import { createDb, type Db } from '../db/client'
import { THEMES } from '../data/audio'
import { approvedIds, claimRequest, newCharacter } from '../logic/characters'
import { cinematicSeconds, othersCinematic, parseCinematic, type CinematicEvent } from '../logic/cinematic'
import { freshRolls, replayable, type RollEntry } from '../logic/dice'
import { defaultDicePlayer, type DicePlayer } from './dice/player'
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
import { useIconSet, useMarkers, usePictures } from './usePictures'
import { liveMapId, shownMapId, type Maps } from '../logic/table'
import { EncountersPanel } from './screens/EncountersPanel'
import { EnemiesPanel } from './screens/EnemiesPanel'
import { SheetScreen } from './screens/Sheet'
import { InitiativeCall, QtePrompt } from './screens/Combat'
import { BoardScreen } from './screens/Board'
import { BossAbilities } from './screens/BossAbilities'
import { CinematicOverlay } from './CinematicOverlay'
import { DicePanel } from './screens/Dice'
import { TestLab } from './screens/TestLab'
import type { Sheet } from '../logic/sheet'
import { Overview } from './screens/MapTools'
import { parentOf, type MapEntry } from '../logic/mapTools'
import { boardOrDefault, type Board } from '../logic/board'
import { useEffectsPlayer } from './sound/useEffects'
import type { SoundEngine } from './sound/engine'

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
  /** Asks for a special attack's name. */
  ask?: (question: string) => string | null
  /** How often a player checks for an attack aimed at them (ms). */
  qteEvery?: number
  rand?: () => number
  /** Shows rolls on screen (the 3D dice by default); null shows nothing. */
  dicePlayer?: DicePlayer | null
  /** The sound engine (this window's by default). */
  soundEngine?: SoundEngine
}

export function Game({
  fetchImpl,
  storage = window.localStorage,
  hash = window.location.hash,
  every = 3000,
  newId = newPlayerId,
  now = Date.now,
  confirm,
  rand,
  ask,
  qteEvery = 500,
  dicePlayer,
  soundEngine,
}: GameProps) {
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
  const dice = useStore(store, (s) => s.dice)
  const secretRolls = useStore(store, (s) => s.secretRolls)
  const diceBusy = useStore(store, (s) => s.diceBusy)
  const encounters = useStore(store, (s) => s.encounters)

  // Rolls are shown on screen; the dice style is remembered (shared with the live page).
  const [player] = useState(() => (dicePlayer === undefined ? defaultDicePlayer(window) : dicePlayer))
  useEffect(() => {
    store.getState().setDiceView(player)
    store.getState().setDice({ skin: storage.getItem('sk') || 'classic' })
  }, [store, player, storage])
  const diceActions = {
    rollDie: (n: number) => store.getState().rollDie(n),
    setDice: (p: Parameters<ReturnType<typeof store.getState>['setDice']>[0]) => {
      store.getState().setDice(p)
      if (p.skin) storage.setItem('sk', p.skin)
    },
  }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('table')
  const [claimMode, setClaimMode] = useState(false)

  const [open, setOpen] = useState<string[]>(() => loadPrefs(storage).openEnemies)
  const [enemiesShut, setEnemiesShut] = useState(() => loadPrefs(storage).enemiesShut)
  const [bossList, setBossList] = useState(() => loadPrefs(storage).bossList)
  const [refShut, setRefShut] = useState(() => loadPrefs(storage).refShut)
  const toggleOpen = (id: string) => {
    const next = open.includes(id) ? open.filter((x) => x !== id) : [...open, id]
    setOpen(next)
    savePrefs(storage, { openEnemies: next })
  }
  const [themeKeys, setThemeKeys] = useState<string[]>([])
  const [markerVersion, setMarkerVersion] = useState<AssetVersions['mapIcons']>(null)
  const [skillVersion, setSkillVersion] = useState<AssetVersions['skillIcons']>(null)
  const [themeVersion, setThemeVersion] = useState<AssetVersions['themes']>(null)
  const [soundVersion, setSoundVersion] = useState<AssetVersions['sounds']>(null)
  const [cin, setCin] = useState<{
    c: CinematicEvent
    portrait: string | null
  } | null>(null)
  const seen = useRef<{ keys: Set<string>; seeded: boolean }>({
    keys: new Set(),
    seeded: false,
  })

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
    return startSync(store, conn.db, {
      every,
      onVersions: (v) => {
        setMarkerVersion(v.mapIcons)
        setSoundVersion(v.sounds)
        setSkillVersion(v.skillIcons)
        setThemeVersion(v.themes)
      },
    })
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
  const tool = useStore(store, (s) => s.tool)
  const menu = useStore(store, (s) => s.menu)
  const qte = useStore(store, (s) => s.qte)
  const mapId = role === 'table' ? liveMapId(tables.maps as Maps, tables.cur) : shownMapId(tables.maps as Maps, tables.cur, dm, gmMap)
  const onTable = view === 'table'
  // The map on screen, and the map its pin is on (for the "you are here" overview).
  const wantedMap = useMemo(() => {
    const o: Record<string, string> = {}
    if (!onTable || !mapId) return o
    const maps = tables.maps as Record<string, MapEntry>
    o[mapId] = String(maps[mapId]!.iv ?? '')
    const par = maps[mapId]!.ov !== false && parentOf(maps, mapId)
    if (par) o[par.map] = String(maps[par.map]!.iv ?? '')
    return o
  }, [onTable, mapId, tables.maps])
  const mapImages = usePictures(db, wantedMap, mapImagePath, tables)
  const wantedIcons = useMemo(() => {
    const o: Record<string, unknown> = {}
    if (onTable) for (const sheets of [tables.chars, tables.enemies]) for (const [i, x] of Object.entries(sheets as Record<string, { iv?: unknown }>)) if (x.iv) o[i] = x.iv
    return o
  }, [onTable, tables.chars, tables.enemies])
  const icons = usePictures(db, wantedIcons, iconPath, tables)
  const markers = useMarkers(db, onTable ? markerVersion : null, tables)
  // Boss art for the boss intros (downloaded once per version, ba).
  const wantedArt = useMemo(() => {
    const o: Record<string, unknown> = {}
    if (onTable) for (const [i, x] of Object.entries(tables.enemies)) if (x.ba) o[i] = x.ba
    return o
  }, [onTable, tables.enemies])
  const bossArt = usePictures(db, wantedArt, bossArtPath, tables)
  // Monster skill icons (the GM's Enemies panel and the action menu).
  const skillIcons = useIconSet(db, 'skicons', onTable ? skillVersion : null, tables)
  // The GM's notes on boss moves (read when the Reference tab opens).
  const [bossNotes, setBossNotes] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!db || !dm || view !== 'ref') return
    void db
      .get<Record<string, string>>('skdesc')
      .then((n) => setBossNotes(n ?? {}))
      .catch(() => {})
  }, [db, dm, view])

  // Players watch for an attack aimed at them (the 3-second dodge/parry prompt).
  useEffect(() => {
    if (!conn || conn.session.role !== 'player') return
    const h = setInterval(() => void store.getState().checkQte(), qteEvery)
    return () => clearInterval(h)
  }, [conn, store, qteEvery])

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

  // Attack scenes, the Golden Wave and sound.
  const fxp = useEffectsPlayer({
    store,
    db,
    storage,
    soundVersion,
    board: boardOrDefault(tables.board as Board | null),
    abilityImages,
    drawnIcons: tables.drawnIcons,
    picture: (k) => portraits[k.slice(2)] ?? icons[k.slice(2)] ?? null,
    shownMap: mapId,
    cols: Number((tables.maps[mapId ?? ''] as { cols?: number } | undefined)?.cols) || 24,
    engine: soundEngine,
    themeVersion,
    bossArt,
  })

  // A cinematic stops the battle music.
  useEffect(() => {
    if (cin) fxp.engine.bgStop(2)
  }, [cin, fxp.engine])

  const remoteFx = fxp.remote

  // Rolls, scenes, waves and cinematics from other devices play here too.
  useEffect(() => {
    if (!session || status !== 'live') return // the first real read seeds what was already there
    const fresh = freshRolls(tables.rolls as Record<string, RollEntry | null>, seen.current.keys, seen.current.seeded)
    seen.current.seeded = true
    const t = now()
    const cins = fresh.filter((e) => othersCinematic(e as { cin?: CinematicEvent }, session.me, t))
    if (cins.length) void show(cins[cins.length - 1]!.cin as CinematicEvent)
    for (const e of fresh) remoteFx(e, session.me, t)
    for (const e of fresh)
      if (player && replayable(e, session.me, t))
        void player.play({
          ds: e.ds!.map((x) => x.d),
          res: e.ds!,
          m: e.m || 0,
          sk: e.sk || 'classic',
          who: e.n ?? null,
          remote: true,
        })
  }, [tables.rolls, session, status, now, show, player, remoteFx])

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
  const screen = screenFor({
    role,
    dm,
    me,
    chars: tables.chars,
    view,
    claimPending: !!myClaim && !!myClaim.st,
    claimMode,
  })

  const approve = (id: string, ok: boolean) => void store.getState().updateCharacter(id, { ap: ok ? true : 'no' }, ok ? 'Approved by the GM' : 'Declined by the GM')
  const decideClaim = (id: string, ok: boolean) => void store.getState().decideClaim(id, ok ? 'ok' : 'no')

  let body: React.ReactNode
  if (screen === 'join') body = <JoinScreen onJoin={(k, p, g) => void join(k, p, g)} busy={busy} />
  else if (screen === 'create') body = <CreateCharacter onCreate={(cls: ClassId, name) => void store.getState().putCharacter(me, newCharacter(cls, name, me))} onClaimMode={() => setClaimMode(true)} />
  else if (screen === 'claim-form')
    body = (
      <ClaimForm
        characters={approvedIds(tables.chars).map((id) => ({
          id,
          name: tables.chars[id]!.name ?? id,
        }))}
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
        refShut={refShut}
        onPlay={(name) => void fxp.playSkillSound(name)}
        onRefShut={(v) => {
          setRefShut(v)
          savePrefs(storage, { refShut: v })
        }}
        bossAbilities={
          <BossAbilities
            open={bossList}
            onOpen={(v) => {
              setBossList(v)
              savePrefs(storage, { bossList: v })
            }}
            onPlay={(name) => void fxp.playSkillSound(name)}
            icons={skillIcons}
            notes={bossNotes}
            onNote={(slug, t) => {
              setBossNotes((n) => ({ ...n, [slug]: t.trim() }))
              void store.getState().setSkillNote(slug, t)
            }}
          />
        }
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
  else if (screen === 'table-display') body = <TableDisplay tables={tables} mapImages={mapImages} icons={icons} markers={markers} now={now} storage={storage} onLeave={leave} />
  else
    body = (
      <TableScreen
        tables={tables}
        dm={dm}
        me={me}
        pin={session!.pin}
        gmMap={gmMap}
        jump={jump}
        menu={menu}
        ask={ask}
        confirm={confirm}
        tool={tool}
        actions={store.getState()}
        mapImages={mapImages}
        icons={icons}
        abilityImages={boardStamps ? abilityImages : {}}
        markers={markers}
        skillIcons={skillIcons}
        now={now}
        storage={storage}
        dicePanel={
          <DicePanel
            tables={tables}
            dm={dm}
            me={me}
            dice={dice}
            busy={diceBusy}
            secretRolls={secretRolls}
            actions={diceActions}
            fx={fxp.fx}
            onFx={fxp.setFx}
            region={{ key: fxp.regionKey, pick: fxp.setRegion }}
            lab={
              <TestLab
                chars={tables.chars as Record<string, Sheet>}
                enemies={tables.enemies}
                board={boardOrDefault(tables.board as Board | null)}
                tools={fxp.tools}
                lab={fxp.lab}
                reverb={fxp.fx.reverb}
                onReverb={fxp.lab.reverb}
                ask={ask}
              />
            }
          />
        }
        onApprove={approve}
        onClaim={decideClaim}
        enemiesPanel={
          <EnemiesPanel
            tables={tables}
            actions={store.getState()}
            open={open}
            onToggle={toggleOpen}
            shut={enemiesShut}
            onShut={(v) => {
              setEnemiesShut(v)
              savePrefs(storage, { enemiesShut: v })
            }}
            themes={themeKeys.map((key) => ({
              key,
              name: THEMES.find((t) => t.key === key)?.name ?? key,
            }))}
            onPlayCinematic={(id) => void playCinematic(id)}
            confirm={confirm}
            rand={rand}
            icons={icons}
            skillIcons={skillIcons}
            onPlaySkill={fxp.playSkillSound}
          />
        }
        encountersPanel={<EncountersPanel tables={tables} actions={{ ...store.getState(), encounters }} confirm={confirm} rand={rand} />}
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
      {screen === 'table' && (
        <>
          <QtePrompt qte={qte} me={me} tables={tables} onAnswer={(k) => void store.getState().answerQte(k)} />
          <InitiativeCall tables={tables} dm={dm} me={me} onRoll={(i) => void store.getState().rollInitiative(i)} />
        </>
      )}
      {onTable && (screen === 'table' || role === 'table') && <Overview maps={tables.maps as Record<string, MapEntry>} id={mapId} images={mapImages} />}
      {fxp.scene}
      {fxp.bossIntro}
      {cin && (
        <CinematicOverlay
          key={cin.c.t + cin.c.k + (cin.c.v ?? '')}
          cin={cin.c}
          portrait={cin.portrait}
          onDone={() => setCin(null)}
          sound={fxp.cinematicSounds}
          volume={Number(fxp.fx.sound) * fxp.fx.volume /* 0 with sound off */}
        />
      )}
    </div>
  )
}

const mapImagePath = (id: string) => `mapimg/${id}`
const iconPath = (id: string) => `icons/${id}`
const bossArtPath = (id: string) => `bossart/${id}`
