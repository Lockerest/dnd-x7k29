// Stand-in for the screens not moved yet (table, sheets, abilities): the GM's
// request panels, which are moved, and a live summary of the table, with a link
// to the live page for everything else.
import { CLASSES } from '../../data/classes'
import { pendingIds } from '../../logic/characters'
import type { Screen } from '../../logic/screens'
import type { Tables } from '../../state/store'

const NAMES: Partial<Record<Screen, string>> = { table: 'The table', sheet: 'Character sheets', board: 'Ability board', ref: 'Reference', 'table-display': 'Table display' }

export function TableSummary({
  screen,
  tables,
  dm,
  pin,
  legacyUrl,
  onApprove,
  onClaim,
  children,
}: {
  screen: Screen
  tables: Tables
  dm: boolean
  pin: string
  legacyUrl: string
  onApprove: (id: string, ok: boolean) => void
  onClaim: (id: string, ok: boolean) => void
  /** Moved panels shown on this screen (the GM's Enemies panel). */
  children?: React.ReactNode
}) {
  return (
    <div className="solo wide">
      <RequestPanels tables={tables} dm={dm} onApprove={onApprove} onClaim={onClaim} />
      {children}
      <div className="card">
        <h2>{NAMES[screen]}</h2>
        <p className="muted">
          This screen is still being moved to the new app. Use the <a href={legacyUrl}>live table</a> (PIN <b>{pin}</b>) for it meanwhile.
        </p>
        <h3>On this table now</h3>
        <ul>
          {Object.entries(tables.chars).map(([id, c]) => (
            <li key={id}>
              {c.name ?? id}: HP {c.hp ?? '?'} / {c.maxHp ?? '?'}, stamina {c.st ?? '?'} / {c.maxSt ?? '?'}
            </li>
          ))}
          {Object.entries(tables.enemies).map(([id, e]) => (
            <li key={id}>
              {e.name ?? id}: HP {e.hp ?? '?'} / {e.max ?? '?'}
              {e.pl ? `, ${e.pl}` : ''}
              {e.mx != null ? ', on the map' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export type RequestPanelsProps = {
  tables: Tables
  dm: boolean
  onApprove: (id: string, ok: boolean) => void
  onClaim: (id: string, ok: boolean) => void
}

/** The GM's device takeover and join requests (shown on the table and sheet screens). */
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
