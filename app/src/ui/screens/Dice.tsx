// The Dice card: dice buttons, how many, the bonus (and a player's stat), the
// dice style, the GM's Secret box, and the shared log. Same as the live page.
import { useState, type ReactNode } from 'react'
import { DIE_SIZES, SKINS } from '../../data/dice'
import { diceLog, rollLine, type RollEntry } from '../../logic/dice'
import type { Sheet } from '../../logic/sheet'
import { mod } from '../../logic/stats'
import type { DiceSettings } from '../../state/diceActions'
import type { GameState, Tables } from '../../state/store'
import type { FxSettings } from '../sound/settings'

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export type DicePanelProps = {
  tables: Tables
  dm: boolean
  me: string
  dice: DiceSettings
  /** My roll is still on screen: the dice buttons wait. */
  busy?: boolean
  secretRolls: RollEntry[]
  actions: Pick<GameState, 'setDice' | 'rollDie'>
  /** This device's scene and sound settings (not shown when missing). */
  fx?: FxSettings
  onFx?: (p: Partial<FxSettings>) => void
  /** The GM's test lab, behind its Show test lab button. */
  lab?: ReactNode
}

function LogLine({ r }: { r: RollEntry }) {
  if (r.ev) return <i>{r.ev}</i>
  const l = rollLine(r)
  return (
    <>
      {l.secret && '🔒 '}
      {l.swatch && <i className="sw" style={{ background: l.swatch }} />}
      {l.who} rolled {l.what}: <b>{l.dice}</b>
      {l.extra}
      {l.total != null && (
        <>
          {' = '}
          <b>{l.total}</b>
        </>
      )}
    </>
  )
}

export function DicePanel({ tables, dm, me, dice, busy = false, secretRolls, actions, fx, onFx = () => {}, lab }: DicePanelProps) {
  const [showLab, setShowLab] = useState(false)
  const c = tables.chars[me] as Sheet | undefined
  const gates = Object.values(tables.enemies).filter((e) => e?.gr)
  const log = diceLog(tables.rolls as Record<string, RollEntry | null>, secretRolls, dm)
  return (
    <>
      {dm && gates.length > 0 && (
        <div className="card" style={{ borderColor: '#f2c14e' }}>
          <b>Gate reached:</b> {gates.map((e) => e.name).join(', ')}. Run the scripted event (open the enemy to clear this).
        </div>
      )}
      <div className="card" aria-label="Dice">
        <h2>Dice</h2>
        <div className="row mini">
          {DIE_SIZES.map((n) => (
            <button key={n} disabled={busy} onClick={() => void actions.rollDie(n)}>
              d{n}
            </button>
          ))}
        </div>
        <div className="row mini">
          <label className="sub">
            How many <input type="number" min={1} max={10} value={dice.count} style={{ width: 64 }} onChange={(e) => actions.setDice({ count: Math.max(1, Math.min(10, +e.target.value || 1)) })} />
          </label>
          <span className="sub">Tap a die to throw it now</span>
        </div>
        <div className="row">
          <input type="number" value={dice.bonus} style={{ width: 80 }} aria-label="Bonus" onChange={(e) => actions.setDice({ bonus: +e.target.value || 0 })} />
          {!dm && c && (
            <select aria-label="Stat" style={{ width: 'auto' }} value={dice.stat} onChange={(e) => actions.setDice({ stat: e.target.value })}>
              <option value="">No stat</option>
              {STATS.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()} {signed(mod(c[s] as number | undefined))}
                </option>
              ))}
            </select>
          )}
          <select title="Dice style" aria-label="Dice style" style={{ width: 'auto' }} value={dice.skin} onChange={(e) => actions.setDice({ skin: e.target.value })}>
            {SKINS.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          {fx && (
            <>
              <label className="sub">
                <input type="checkbox" checked={fx.scenes} style={{ width: 'auto' }} onChange={(e) => onFx({ scenes: e.target.checked })} /> Attack scenes
              </label>
              <label className="sub">
                <input type="checkbox" checked={fx.s25} style={{ width: 'auto' }} onChange={(e) => onFx({ s25: e.target.checked })} /> 2.5D camera
              </label>
              <label className="sub">
                <input type="checkbox" checked={fx.music} style={{ width: 'auto' }} onChange={(e) => onFx({ music: e.target.checked })} /> Battle music
              </label>
              <label className="sub">
                <input type="checkbox" checked={fx.sound} style={{ width: 'auto' }} onChange={(e) => onFx({ sound: e.target.checked })} /> Sound
              </label>
              <input type="range" min={0} max={100} value={Math.round(fx.volume * 100)} style={{ width: 90 }} aria-label="Volume" onChange={(e) => onFx({ volume: +e.target.value / 100 })} />
            </>
          )}
          {dm && lab && <button onClick={() => setShowLab((v) => !v)}>{showLab ? 'Hide' : 'Show'} test lab</button>}
          {dm && (
            <label className="sub">
              <input type="checkbox" checked={dice.secret} style={{ width: 'auto' }} onChange={(e) => actions.setDice({ secret: e.target.checked })} /> Secret
            </label>
          )}
        </div>
        {dm && showLab && lab}
        <ul className="dlog" aria-label="Dice log">
          {log.length ? (
            log.map((r, i) => (
              <li key={`${r.ts}-${i}`}>
                <LogLine r={r} />
              </li>
            ))
          ) : (
            <li>No rolls yet.</li>
          )}
        </ul>
      </div>
    </>
  )
}
