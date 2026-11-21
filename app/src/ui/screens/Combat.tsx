// Combat pieces on the table: the action menu under the map, the defender's
// 3-second dodge/parry prompt, and the "Roll for initiative!" call to players.
// Same wording and buttons as the live page.
import { actionMenu, type U } from '../../logic/attack'
import { boardOrDefault, goldenHidden, type Board } from '../../logic/board'
import { unitOf, type Initiative } from '../../logic/initiative'
import { isMyTurn, type Sheet } from '../../logic/sheet'
import { abilityCost } from '../../logic/stamina'
import { abilitySlug } from '../../logic/text'
import { promptButtons, type Qte } from '../../state/attackActions'
import type { GameState, Tables } from '../../state/store'

/** The icon key of a monster's skill. */
const skillSlug = (a: U, k: unknown) => abilitySlug((a.o.sk as Record<string, { n?: string }>)[k as string]!.n)

export type MenuProps = {
  tables: Tables
  dm: boolean
  menu: { a: string; t: string } | null
  actions: Pick<GameState, 'act' | 'closeMenu'>
  /** Asks for the name of a special attack (the browser's box by default). */
  ask?: (q: string) => string | null
  /** Monster skill icons by skill slug, shown on their buttons. */
  skillIcons?: Record<string, string>
}

export function ActionMenu({ tables, dm, menu, actions, ask = (q) => window.prompt(q), skillIcons = {} }: MenuProps) {
  if (!menu) return null
  const chars = tables.chars as Record<string, Sheet>
  const a = unitOf(chars, tables.enemies, menu.a) as U | null
  const t = unitOf(chars, tables.enemies, menu.t) as U | null
  if (!a || !t || a.o.mx == null || t.o.mx == null) return null
  const m = actionMenu(a, t, { dm, myTurn: isMyTurn(tables.ini, a.key), board: boardOrDefault(tables.board as Board | null), hideGolden: goldenHidden(dm, tables.sp), enemies: tables.enemies })
  return (
    <div className="menu" aria-label="Actions">
      <b>{m.title}</b>
      <div className="row mini">
        {m.buttons.map((b) => (
          <button
            key={`${b.k}${b.i ?? ''}`}
            className={b.primary ? 'pri' : b.warn ? 'warn' : ''}
            disabled={b.disabled}
            onClick={() => {
              if (b.k !== 'sp') return void actions.act(b.k, b.i)
              const nm = ask('Name of the special attack?')
              if (nm) void actions.act('sp', nm)
              else actions.closeMenu()
            }}
          >
            {b.k === 'sk' && skillIcons[skillSlug(a, b.i)] && <img className="abi" src={skillIcons[skillSlug(a, b.i)]} alt="" />}
            {b.label}
          </button>
        ))}
        <button onClick={actions.closeMenu}>Cancel</button>
      </div>
      {m.notes.map((n) => (
        <p className="note" key={n}>
          {n}
        </p>
      ))}
    </div>
  )
}

/** The defender's prompt: pick a reaction within 3 seconds, then the save is rolled. */
export function QtePrompt({ qte, me, tables, onAnswer }: { qte: Qte | null; me: string; tables: Tables; onAnswer: (k: 'dodge' | 'parry' | 'none') => void }) {
  const c = tables.chars[me] as Sheet | undefined
  if (!qte || !c) return null
  if (qte.pre)
    return (
      <div className="qte" role="alert">
        <h2>⚠ {qte.from} attacks!</h2>
        <p className="note">Your readied {qte.pre} goes off. Rolling your save...</p>
      </div>
    )
  const { can, parry, disadvantage } = promptButtons(c, qte)
  return (
    <div className="qte" role="alert">
      <h2>⚠ {qte.from} is attacking you!</h2>
      <p className="note">Pick a reaction within 3 seconds, then roll your save</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="pri" disabled={!can} onClick={() => onAnswer('dodge')}>
          Dodge · {abilityCost(c, 3)} St
        </button>
        {parry && (
          <button className="pri" disabled={!can} onClick={() => onAnswer('parry')}>
            Parry{disadvantage ? ' (disadvantage)' : ''} · {abilityCost(c, 2)} St
          </button>
        )}
        <button onClick={() => onAnswer('none')}>Take it</button>
      </div>
      <div className="qbar" />
    </div>
  )
}

/** "Roll for initiative!" for a player whose roll the GM is waiting on. */
export function InitiativeCall({ tables, dm, me, onRoll }: { tables: Tables; dm: boolean; me: string; onRoll: (i: number) => void }) {
  const ini = tables.ini as Initiative | null
  const i = !dm && ini && ini.ph === 'roll' && tables.chars[me] ? ini.l.findIndex((u) => u.k === `c:${me}` && u.v == null) : -1
  if (i < 0) return null
  return (
    <div className="ask" role="alert">
      <h2>⚔ Roll for initiative!</h2>
      <p className="note">Your Game Master is waiting on you.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="pri" onClick={() => onRoll(i)}>
          Roll initiative
        </button>
      </div>
    </div>
  )
}
