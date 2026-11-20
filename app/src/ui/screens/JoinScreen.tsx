import { useState } from 'react'
import type { JoinKind } from '../../logic/join'

/** Join a table as a player, as the table display (projector) or as the Game Master. */
export function JoinScreen({ onJoin, busy }: { onJoin: (kind: JoinKind, pin: string, gmPin: string) => void; busy?: boolean }) {
  const [pin, setPin] = useState('')
  const [gmPin, setGmPin] = useState('')
  return (
    <div className="solo">
      <div className="card">
        <h2>Join a table</h2>
        <label className="field">
          <span>Table PIN (6+ letters or numbers)</span>
          <input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={30} autoComplete="off" placeholder="e.g. dragon4821" />
        </label>
        <div className="row">
          <button className="pri" disabled={busy} onClick={() => onJoin('player', pin, '')}>
            Join as player
          </button>
        </div>
        <div className="row">
          <button disabled={busy} onClick={() => onJoin('table', pin, '')}>
            Open table view (projector)
          </button>
        </div>
        <label className="field">
          <span>Game Master PIN (sets it if the table is new)</span>
          <input value={gmPin} onChange={(e) => setGmPin(e.target.value)} type="password" autoComplete="off" placeholder="GM PIN" />
        </label>
        <div className="row">
          <button disabled={busy} onClick={() => onJoin('gm', pin, gmPin)}>
            Open as Game Master
          </button>
        </div>
      </div>
    </div>
  )
}
