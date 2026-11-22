// The Game Master's Encounters: groups of enemies prepared ahead of time, kept out
// of the game until deployed onto the map on screen in their saved formation.
import { useEffect, useState } from 'react'
import { byRegion, encounterSummary, liveDeploys, REGIONS } from '../../logic/encounters'
import { enemyListOrder } from '../../logic/phases'
import { randomKey } from '../../logic/enemies'
import type { GameState, Tables } from '../../state/store'

type Actions = Pick<GameState, 'encounters' | 'loadEncounters' | 'saveEncounter' | 'editEncounter' | 'deleteEncounter' | 'deployEncounter' | 'clearDeploy'>

export type EncountersPanelProps = {
  tables: Tables
  actions: Actions
  confirm?: (question: string) => boolean
  rand?: () => number
  /** Starts folded (this device remembers nothing: it is a short list). */
  startOpen?: boolean
}

export function EncountersPanel({ tables, actions, confirm = (q) => window.confirm(q), rand = Math.random, startOpen = false }: EncountersPanelProps) {
  const [open, setOpen] = useState(startOpen)
  const [name, setName] = useState('')
  const [region, setRegion] = useState<string>(REGIONS[0])
  const [pick, setPick] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { enemies } = tables
  const all = actions.encounters
  const { loadEncounters } = actions

  useEffect(() => {
    if (open && all == null) void loadEncounters()
  }, [open, all, loadEncounters])

  // Phase sheets come along with their boss, so only the first sheet is listed.
  const next = new Set(
    Object.values(enemies)
      .map((e) => e.nx)
      .filter(Boolean),
  )
  const live = enemyListOrder(enemies, Object.keys(enemies)).filter(([id]) => !next.has(id))
  const deploys = Object.entries(liveDeploys(enemies))

  const save = async () => {
    const id = randomKey('n', 8, rand)
    if (await actions.saveEncounter(id, name, region, pick)) {
      setName('')
      setPick([])
      setSaving(false)
    }
  }

  return (
    <div className="card" aria-label="Encounters">
      <div className="row mini">
        <button className="tgl" aria-expanded={open} aria-label="Show or hide the Encounters list" onClick={() => setOpen(!open)}>
          {open ? '▾' : '▸'}
        </button>
        <h2>Encounters</h2>
      </div>
      {!open && <p className="note">Ready-made groups of enemies. Open to deploy one.</p>}
      {open && (
        <>
          {deploys.length > 0 && (
            <div aria-label="Deployed encounters">
              <h3>On the table</h3>
              {deploys.map(([tag, d]) => (
                <div className="row mini" key={tag}>
                  <span>
                    {all?.[d.id]?.n ?? 'Encounter'} ({d.up}/{d.all} standing)
                  </span>
                  <button onClick={() => void actions.clearDeploy(tag)}>Clear</button>
                </div>
              ))}
            </div>
          )}
          {all == null && <p className="note">Loading…</p>}
          {all && !Object.keys(all).length && <p className="note">No encounters yet. Add enemies, place them in formation, then save them as an encounter below.</p>}
          {all &&
            byRegion(all).map(([rg, list]) => (
              <details key={rg} open aria-label={`Region ${rg}`}>
                <summary>
                  {rg} ({list.length})
                </summary>
                {list.map(([id, enc]) => (
                  <div className="ab" key={id} aria-label={`Encounter ${enc.n}`}>
                    <div className="row mini">
                      <b>{enc.n}</b>
                      <span className="note">{encounterSummary(enc)}</span>
                    </div>
                    <div className="row mini">
                      <button className="pri" onClick={() => void actions.deployEncounter(id)}>
                        Deploy
                      </button>
                      <select aria-label={`Region of ${enc.n}`} value={enc.rg} onChange={(e) => void actions.editEncounter(id, { rg: e.target.value })}>
                        {REGIONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <button onClick={() => confirm(`Delete the encounter ${enc.n}? Enemies on the table stay.`) && void actions.deleteEncounter(id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </details>
            ))}
          {!saving && (
            <button onClick={() => setSaving(true)} disabled={!live.length} title={live.length ? undefined : 'Add enemies first'}>
              Save enemies as an encounter
            </button>
          )}
          {saving && (
            <div className="ab" aria-label="New encounter">
              <p className="note">Their places on the map become the formation. Bosses keep their phase sheets and pictures.</p>
              <input aria-label="Encounter name" maxLength={60} placeholder="Name, e.g. Frozen Pass ambush" value={name} onChange={(e) => setName(e.target.value)} />
              <select aria-label="Encounter region" value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <div className="row mini">
                <button onClick={() => setPick(live.map(([id]) => id))}>All</button>
                <button onClick={() => setPick([])}>None</button>
              </div>
              {live.map(([id]) => (
                <label key={id} className="row mini">
                  <input type="checkbox" checked={pick.includes(id)} onChange={(e) => setPick(e.target.checked ? [...pick, id] : pick.filter((x) => x !== id))} />
                  {String(enemies[id]!.name ?? id)}
                  {enemies[id]!.mx == null ? ' (not on the map)' : ''}
                </label>
              ))}
              <div className="row mini">
                <button className="pri" disabled={!name.trim() || !pick.length} onClick={() => void save()}>
                  Save encounter
                </button>
                <button onClick={() => setSaving(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
