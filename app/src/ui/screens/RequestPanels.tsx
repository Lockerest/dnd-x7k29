// The GM's device takeover and join requests (shown on the table and sheet screens).
import { CLASSES } from '../../data/classes'
import { pendingIds } from '../../logic/characters'
import type { Tables } from '../../state/store'

export type RequestPanelsProps = {
  tables: Tables
  dm: boolean
  onApprove: (id: string, ok: boolean) => void
  onClaim: (id: string, ok: boolean) => void
}

export function RequestPanels({ tables, dm, onApprove, onClaim }: RequestPanelsProps) {
  const pending = dm ? pendingIds(tables.chars) : []
  const claims = dm ? Object.entries((tables.claims || {}) as Record<string, { who?: string; target?: string; st?: string }>).filter(([, c]) => c?.st === 'pending') : []
  return (
    <>
      {claims.length > 0 && (
        <div className="card" aria-label="Device requests">
          <h2>Device requests</h2>
          {claims.map(([k, c]) => (
            <div className="ab" key={k}>
              <div>
                <b>{c.who}</b> wants to take over <b>{(c.target && tables.chars[c.target]?.name) || 'a deleted character'}</b>
              </div>
              <span className="row mini">
                <button className="pri" onClick={() => onClaim(k, true)}>
                  Allow
                </button>
                <button onClick={() => onClaim(k, false)}>Deny</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <div className="card" aria-label="Join requests">
          <h2>Join requests</h2>
          {pending.map((i) => {
            const c = tables.chars[i]!
            const cls = CLASSES[c.cls as keyof typeof CLASSES] ?? CLASSES.fighter
            return (
              <div className="ab" key={i}>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {cls.name}
                    {c.ap === 'no' ? ' · declined' : ''}
                  </small>
                </div>
                <span className="row mini">
                  <button className="pri" onClick={() => onApprove(i, true)}>
                    Allow
                  </button>
                  <button onClick={() => onApprove(i, false)}>Deny</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
