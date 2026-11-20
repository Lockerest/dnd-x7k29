import { useEffect, useState } from 'react'
import { APP_VERSION, LEGACY_URL } from './config'
import { DbError, dbGet } from './db/client'
import { Game } from './ui/Game'
import { errorText } from './util/errors'

type Status = { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; message: string }

// The new app: the game, plus a footer with the version, a database check and a
// link to the live page (which stays the real game until the cutover).
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
        else setStatus({ kind: 'error', message: errorText(e) })
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <Game />
      <footer className="foot">
        <span>New app preview, version {APP_VERSION}</span>
        <span className={`status ${status.kind}`} data-testid="db-status">
          {status.kind === 'checking' && 'Checking the database connection...'}
          {status.kind === 'ok' && 'Database reachable.'}
          {status.kind === 'error' && `Database check failed: ${status.message}`}
        </span>
        <span>
          Still playing? Use the <a href={LEGACY_URL}>live table</a>.
        </span>
      </footer>
    </>
  )
}
