import { useEffect, useState } from 'react'
import { APP_VERSION, LEGACY_URL } from './config'
import { DbError, dbGet } from './db/client'

type Status = { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; message: string }

// Phase 2 placeholder: proves the build, the /next/ deploy and the database
// connection work. Screens move here one at a time in later phases.
export default function App() {
  const [status, setStatus] = useState<Status>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    dbGet<Record<string, true>>('', { query: { shallow: true } })
      .then(() => alive && setStatus({ kind: 'ok' }))
      .catch((e: unknown) => {
        if (!alive) return
        // An HTTP error still means the database answered (e.g. rules block the root).
        if (e instanceof DbError) setStatus({ kind: 'ok' })
        else setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="card">
      <h1>Curse of the Golden Wave</h1>
      <p className="muted">New app preview, version {APP_VERSION}</p>
      <p>
        This is the start of the React version. Nothing here changes your game yet: keep playing on the{' '}
        <a href={LEGACY_URL}>live table</a>.
      </p>
      <p className={`status ${status.kind}`} data-testid="db-status">
        {status.kind === 'checking' && 'Checking the database connection...'}
        {status.kind === 'ok' && 'Database reachable.'}
        {status.kind === 'error' && `Database check failed: ${status.message}`}
      </p>
    </main>
  )
}
