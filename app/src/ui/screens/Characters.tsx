// Getting a character: create one, take over one from another device, and the
// waiting screens while the GM decides.
import { useState } from 'react'
import { CLASSES } from '../../data/classes'
import type { ClassId } from '../../logic/types'

export function CreateCharacter({ onCreate, onClaimMode }: { onCreate: (cls: ClassId, name: string) => void; onClaimMode: () => void }) {
  const [name, setName] = useState('')
  return (
    <div className="solo">
      <div className="card">
        <h2>Create your character</h2>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Character name" />
        </label>
        <h3>Vocation</h3>
        <div className="cls">
          {(Object.entries(CLASSES) as [ClassId, (typeof CLASSES)[ClassId]][]).map(([k, v]) => (
            <button key={k} onClick={() => onCreate(k, name)}>
              <b>{v.name}</b>
              <small>{v.description}</small>
            </button>
          ))}
        </div>
        <h3>Played here before, on another device?</h3>
        <button onClick={onClaimMode}>I already have a character</button>
      </div>
    </div>
  )
}

export function ClaimForm({
  characters,
  onSend,
  onBack,
}: {
  characters: { id: string; name: string }[]
  onSend: (who: string, target: string) => void
  onBack: () => void
}) {
  const [who, setWho] = useState('')
  const [target, setTarget] = useState(characters[0]?.id ?? '')
  return (
    <div className="solo">
      <div className="card">
        <h2>Take over your character</h2>
        <label className="field">
          <span>Your name (so the GM knows who is asking)</span>
          <input value={who} onChange={(e) => setWho(e.target.value)} maxLength={30} placeholder="e.g. Sam" />
        </label>
        <label className="field">
          <span>Which character is yours?</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button className="pri" disabled={!characters.length} onClick={() => onSend(who, target)}>
            Ask the GM
          </button>
          <button onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  )
}

export function ClaimWait({ declined, target, onDismiss }: { declined: boolean; target: string; onDismiss: () => void }) {
  return (
    <div className="solo">
      <div className="card">
        <h2>{declined ? 'Request declined' : 'Waiting for the GM'}</h2>
        <p className="muted">
          {declined ? "The GM didn't approve linking this device." : `You asked to take over ${target}. This page updates by itself once the GM allows it.`}
        </p>
        {declined && <button onClick={onDismiss}>Back</button>}
      </div>
    </div>
  )
}

export function WaitApproval({ name, declined }: { name: string; declined: boolean }) {
  return (
    <div className="solo">
      <div className="card">
        <h2>{declined ? 'Request declined' : 'Waiting to be allowed to play'}</h2>
        <p className="muted">
          {declined
            ? "The GM hasn't approved this character. If that's a mistake, ask your GM. This page updates by itself if they allow you."
            : `Your Game Master needs to approve ${name} before you can join the table. This page updates by itself once you're in.`}
        </p>
      </div>
    </div>
  )
}
