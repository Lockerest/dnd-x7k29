// The turn order card on the table: everyone's initiative roll, then whose turn it is.
// Same rows and buttons as the live page's initiative panel.
import { allRolled, unitOf, type Initiative } from '../../logic/initiative'
import type { Sheet } from '../../logic/sheet'
import { enemyHidden, grid, shownMapId, type Maps } from '../../logic/table'
import type { GameState, Tables } from '../../state/store'

export type InitiativeProps = {
  tables: Tables
  dm: boolean
  me: string
  gmMap: string | null
  actions: Pick<GameState, 'startInitiative' | 'rollInitiative' | 'rollMonsters' | 'beginCombat' | 'passTurn' | 'endCombat' | 'autoTurn'>
}

const approved = (c: { ap?: unknown }) => c.ap !== false && c.ap !== 'no'

/** On a monster's turn: the GM can let the computer play it. */
function AutoButton({ tables, ini, onRun }: { tables: Tables; ini: Initiative; onRun: (id: string) => void }) {
  const u = ini.l[ini.t]
  const e = u && u.k[0] === 'e' ? tables.enemies[u.k.slice(2)] : undefined
  if (!e || !((e.hp as number) > 0)) return null
  return (
    <button className="pri" onClick={() => onRun(u!.k.slice(2))}>
      Run {e.name}'s turn
    </button>
  )
}

export function InitiativePanel({ tables, dm, me, gmMap, actions }: InitiativeProps) {
  const ini = tables.ini as Initiative | null
  const chars = tables.chars as Record<string, Sheet>
  if (!ini || !ini.l) {
    if (!dm) return null
    return (
      <div className="card sb">
        <h2>Initiative</h2>
        <div className="row mini">
          <button className="pri" onClick={() => void actions.startInitiative()}>
            Start initiative
          </button>
        </div>
        <p className="note">Everyone rolls initiative first. Combat starts once all have rolled.</p>
      </div>
    )
  }
  const rolling = ini.ph === 'roll'
  const mine = `c:${me}`
  const g = grid(tables.maps as Maps, shownMapId(tables.maps as Maps, tables.cur, dm, gmMap))
  const seers = Object.values(chars).filter(approved)
  return (
    <div className="card sb" aria-label="Turn order">
      <h2>{rolling ? 'Roll initiative' : `Turn order · Round ${ini.r}`}</h2>
      <ul className="rl">
        {ini.l.map((u, i) => {
          const t = unitOf(chars, tables.enemies, u.k)
          if (!t) return null
          const seen = dm || !t.e || (t.o.mx != null && !enemyHidden(g, seers, t.o))
          const cur = !rolling && i === ini.t
          const showValue = dm || u.k[0] === 'c'
          return (
            <li key={u.k} className={cur ? 'now' : undefined}>
              {cur ? '▶ ' : ''}
              {seen ? t.o.name : 'Unseen enemy'}{' '}
              {rolling ? (
                u.v == null ? (
                  <>
                    <span className="sub">waiting</span>{' '}
                    {(u.k === mine || (dm && t.e)) && (
                      <span className="mini">
                        <button onClick={() => void actions.rollInitiative(i)}>Roll</button>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="sub">{showValue ? `(${u.v})` : '✓'}</span>
                )
              ) : (
                showValue && <span className="sub">({u.v})</span>
              )}
            </li>
          )
        })}
      </ul>
      {dm &&
        (rolling ? (
          <div className="row mini">
            <button onClick={() => void actions.rollMonsters()}>Roll enemies</button>
            <button className="pri" disabled={!allRolled(ini, chars, tables.enemies)} onClick={() => void actions.beginCombat()}>
              Begin combat
            </button>
            <button onClick={() => void actions.endCombat()}>Cancel</button>
          </div>
        ) : (
          <div className="row mini">
            <AutoButton tables={tables} ini={ini} onRun={(id) => void actions.autoTurn(id)} />
            <button className="pri" onClick={() => void actions.passTurn()}>
              Next turn
            </button>
            <button onClick={() => void actions.startInitiative()}>New initiative</button>
            <button onClick={() => void actions.endCombat()}>End combat</button>
          </div>
        ))}
    </div>
  )
}
