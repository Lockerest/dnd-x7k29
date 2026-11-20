// The game container: joining, staying in step with the table, and picking the
// screen. Screens that are not moved yet show a summary with a link to the live page.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { LEGACY_URL, STORAGE_PREFIX } from '../config'
import { createDb, type Db } from '../db/client'
import { approvedIds, claimRequest, newCharacter } from '../logic/characters'
import { newPlayerId, planJoin, type JoinKind } from '../logic/join'
import { headerFor, screenFor, type View } from '../logic/screens'
import type { ClassId } from '../logic/types'
import { clearSession, loadSession, saveSession, type Session } from '../state/session'
import { createGameStore } from '../state/store'
import { startSync } from '../state/sync'
import { errorText } from '../util/errors'
import { ClaimForm, ClaimWait, CreateCharacter, WaitApproval } from './screens/Characters'
import { JoinScreen } from './screens/JoinScreen'
import { TableSummary } from './screens/TableSummary'

type Storage_ = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type GameProps = {
  fetchImpl?: typeof fetch
  storage?: Storage_
  hash?: string
  every?: number
  newId?: () => string
  now?: () => number
}

export function Game({ fetchImpl, storage = window.localStorage, hash = window.location.hash, every = 3000, newId = newPlayerId, now = Date.now }: GameProps) {
  const [conn, setConn] = useState<{ db: Db; session: Session } | null>(null)
  const db = conn?.db ?? null
  const store = useMemo(() => createGameStore(() => db, now), [db, now])
  const session = useStore(store, (s) => s.session)
  const tables = useStore(store, (s) => s.tables)
  const dm = useStore(store, (s) => s.dm)
  const storeError = useStore(store, (s) => s.error)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('table')
  const [claimMode, setClaimMode] = useState(false)

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
    return startSync(store, conn.db, { every })
  }, [conn, store, every])

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

  const role = session?.role ?? ''
  const me = session?.me ?? ''
  const mine = tables.chars[me]
  const header = headerFor({ role, dm, canGM: role === 'gm', view, mine })
  const screen = screenFor({ role, dm, me, chars: tables.chars, view, claimPending: !!myClaim && !!myClaim.st, claimMode })

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
  else
    body = (
      <TableSummary
        screen={screen}
        tables={tables}
        dm={dm}
        pin={session!.pin}
        legacyUrl={LEGACY_URL}
        onApprove={(id, ok) => void store.getState().updateCharacter(id, { ap: ok ? true : 'no' }, ok ? 'Approved by the GM' : 'Declined by the GM')}
        onClaim={(id, ok) => void store.getState().decideClaim(id, ok ? 'ok' : 'no')}
      />
    )

  return (
    <>
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
    </>
  )
}
