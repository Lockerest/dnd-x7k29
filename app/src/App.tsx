import { useEffect, useState } from 'react'
import { APP_VERSION, LEGACY_URL } from './config'
import { DbError, dbGet } from './db/client'
import { Game } from './ui/Game'
import { errorText } from './util/errors'

/** How long to wait before checking again after a failed check. */
export const RETRY_MS = 10_000

type Status = { kind: 'checking' } | { kind: 'ok' } | { kind: 'error'; message: string }

// The new app: the game, plus a footer with the version, a database check and a
// link to the live page (which stays the real game until the cutover).
export default function App() {
  const [status, setStatus] = useState<Status>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined
    let latest = 0
    const check = () => {
      clearTimeout(retry)
      const n = ++latest // only the newest check's answer counts
      dbGet<Record<string, true>>('', { query: { shallow: true } })
        .then(() => alive && n === latest && setStatus({ kind: 'ok' }))
        .catch((e: unknown) => {
          if (!alive || n !== latest) return
          // An HTTP error still means the database answered (e.g. rules block the root).
          if (e instanceof DbError) return setStatus({ kind: 'ok' })
          setStatus({ kind: 'error', message: errorText(e) })
          // A phone waking up or a brief drop in signal: check again shortly.
          retry = setTimeout(check, RETRY_MS)
        })
    }
    const again = () => document.visibilityState === 'visible' && check()
    check()
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', again)
    return () => {
      alive = false
      clearTimeout(retry)
      window.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', again)
    }
  }, [])

  return (
    <>
      <Game />
      <footer className="foot">
        <span>Version {APP_VERSION}</span>
        <span className={`status ${status.kind}`} data-testid="db-status">
          {status.kind === 'checking' && 'Checking the database connection...'}
          {status.kind === 'ok' && 'Database reachable.'}
          {status.kind === 'error' && `Database not reachable right now (${status.message}). Trying again...`}
        </span>
        <span>
          Need the old page? Open the <a href={LEGACY_URL}>backup</a>.
        </span>
      </footer>
    </>
  )
}
