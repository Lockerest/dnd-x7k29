// Character sheets: the player's own sheet, or every approved sheet for the GM.
// Same sections, buttons and rules as the live page's sheet view.
import { CLASS_FRAMES, STAT_FIELDS } from '../../data/abilities'
import { CLASSES } from '../../data/classes'
import { boardIndex, boardOrDefault, goldenHidden, PARRY_LABELS, sheetAbilities, type Board } from '../../logic/board'
import { approvedIds } from '../../logic/characters'
import { isHeavy } from '../../logic/combat'
import { altarsOf, bonfiresOf, nearSpot } from '../../logic/geometry'
import {
  abilityLocked,
  attunedKeys,
  characterPills,
  cleanses,
  cycleParry,
  dismount,
  drinkFlask,
  fieldValue,
  hpChange,
  isMyTurn,
  netRegen,
  releaseAttunement,
  signed,
  staminaChange,
  toggleArmor,
  toggleFoeDown,
  toggleShield,
  type Sheet,
} from '../../logic/sheet'
import { abilityCost, startTurn } from '../../logic/stamina'
import { currentMap } from '../../state/sheetActions'
import type { GameState, Tables } from '../../state/store'
import { Field, Meter } from '../parts'
import { RequestPanels } from './RequestPanels'
import { PictureButton } from '../PictureButton'
import { portraitImage, tokenIcon } from '../images'

export type SheetActionsProps = Pick<
  GameState,
  'updateCharacter' | 'patchCharacter' | 'removeCharacter' | 'rest' | 'reviveAt' | 'putDown' | 'castAbility' | 'log' | 'notice' | 'startJump' | 'setIcon' | 'setPortrait'
>

type CardProps = {
  id: string
  tables: Tables
  dm: boolean
  me: string
  /** The map the GM has on screen (its altars and bonfires count). */
  gmMap?: string | null
  actions: SheetActionsProps
  /** Portrait pictures by character id (when loaded). */
  portraits: Record<string, string>
  confirm: (q: string) => boolean
  /** A jump off a monster started: show the map to pick the landing square. */
  onJump?: () => void
}

function Splash({ c, portrait }: { c: Sheet; portrait?: string }) {
  const [col, em] = CLASS_FRAMES[c.cls as string] ?? CLASS_FRAMES.fighter!
  const k = CLASSES[c.cls as keyof typeof CLASSES] ?? CLASSES.fighter
  const img = c.pv && portrait
  return (
    <div className="splash" style={{ ['--fr' as string]: col }}>
      <div className="art" style={img ? { backgroundImage: `url(${portrait})` } : undefined}>
        {!img && <span className="ph">{em}</span>}
      </div>
      <div className="shade" />
      <div className="lvb">
        <small>LV</small>
        {c.level || 1}
      </div>
      <div className="vc">{em}</div>
      <div className="meta">
        <h2>{c.name}</h2>
        <div className="sub2">
          {k.name} · AC {c.ac}
        </div>
        <div className="vit">
          <span>
            ❤ {c.hp}/{c.maxHp}
          </span>
          <span>
            ⚡ {c.st}/{c.maxSt}
          </span>
        </div>
      </div>
    </div>
  )
}

/** One character sheet. */
export function CharacterCard({ id, tables, dm, me, gmMap = null, actions, portraits, confirm, onJump }: CardProps) {
  const c = tables.chars[id] as Sheet
  const own = dm || id === me
  const board = boardOrDefault(tables.board as Board | null)
  const ix = boardIndex(board)
  const m = currentMap(tables, { dm, gmMap })
  const altars = altarsOf(m)
  const altar = nearSpot(c, altars)
  const bonfire = nearSpot(c, bonfiresOf(m))
  const dead = (c.hp as number) <= 0
  const myTurn = isMyTurn(tables.ini, `c:${id}`)
  const upd = (p: [Record<string, unknown>, string?]) => void actions.updateCharacter(id, p[0], p[1])
  const carried = Object.keys(tables.enemies).filter((i) => tables.enemies[i]!.hd === `c:${id}`)
  const attuned = dm ? attunedKeys(c, board) : []
  const log = (c.log || []).slice(-5).reverse()

  const unmount = () => {
    if (dm || !tables.enemies[c.mon as string]) {
      upd(dismount(dm))
      if (dm) void actions.log(`${c.name} is dropped from the monster. The GM decides where they land.`)
    } else {
      actions.startJump(id)
      onJump?.()
    }
  }

  return (
    <div className="card" aria-label={`Sheet: ${c.name}`}>
      <Splash c={c} portrait={portraits[id]} />
      {own && (
        <div className="row mini">
          <PictureButton process={portraitImage} onPicture={(d) => actions.setPortrait(id, d)} onError={actions.notice}>
            Set portrait
          </PictureButton>
        </div>
      )}
      <Pills c={c} />
      <h3>Health</h3>
      <Meter v={c.hp as number} max={c.maxHp as number} kind="hp" />
      {own && (
        <div className="row">
          {[-50, -10, 10, 50].map((n) => (
            <button key={n} onClick={() => upd(hpChange(c, n))}>
              {signed(n)}
            </button>
          ))}
          <button
            disabled={(c.fl as number) < 1}
            onClick={() => {
              const f = drinkFlask(c)
              if (f) upd(f)
            }}
          >
            Flask ({c.fl}/{c.maxFl})
          </button>
        </div>
      )}
      <h3>Stamina · Actions used {c.used || 0}/2</h3>
      <Meter v={c.st as number} max={c.maxSt as number} kind="st" />
      {own && dead && (
        <div className="row mini">
          {altars.length ? (
            altars.map((k, i) => (
              <button key={k} className="pri" onClick={() => void actions.reviveAt(id, k)}>
                Revive at altar {i + 1}
              </button>
            ))
          ) : (
            <span className="sub">No altar on the map to revive at.</span>
          )}
        </div>
      )}
      {own && (
        <>
          <div className="row">
            {dm && (
              <button className="pri" onClick={() => upd(startTurn(c as Parameters<typeof startTurn>[0]))}>
                Start of turn {signed(netRegen(c))}
              </button>
            )}
            <button disabled={dead || (!dm && !altar)} onClick={() => void actions.rest(id, 'al')}>
              {cleanses(c, altar) ? 'Altar rest & cleanse curse' : 'Altar rest'}
              {!dm && !altar ? ' (stand by an altar)' : ''}
            </button>
            <button disabled={dead || (!dm && !bonfire)} onClick={() => void actions.rest(id, 'bf')}>
              Bonfire rest{!dm && !bonfire ? ' (stand by a bonfire)' : ''}
            </button>
            <PictureButton process={tokenIcon} onPicture={(d) => actions.setIcon(`c:${id}`, d)} onError={actions.notice}>
              Set icon
            </PictureButton>
            <button onClick={() => upd(toggleShield(c))}>Shield: {c.shield ? 'on' : 'off'}</button>
            {dm && <button onClick={() => upd(cycleParry(c))}>Parry: {PARRY_LABELS[c.pw || '']}</button>}
            <button onClick={() => upd(toggleArmor(c))}>Armor: {isHeavy(c) ? 'heavy' : 'light'}</button>
            {dm && (
              <>
                <button onClick={() => upd(staminaChange(c, -10))}>-10 St</button>
                <button onClick={() => upd(staminaChange(c, 10))}>+10 St</button>
              </>
            )}
          </div>
          {(c.mt || carried.length > 0) && (
            <div className="row mini">
              {c.mt && (
                <>
                  <button onClick={unmount}>{dm ? 'Drop rider' : 'Jump off'}</button>
                  <button onClick={() => upd(toggleFoeDown(c))}>{c.mt === 'climb' ? 'Foe is down' : 'Foe is up'}</button>
                </>
              )}
              {carried.map((i) => (
                <button key={i} onClick={() => void actions.putDown(i)}>
                  Put down {tables.enemies[i]!.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <h3>Abilities (basic attacks are free)</h3>
      {sheetAbilities(c, board, goldenHidden(dm, tables.sp)).map(([name, cost, text, r], i) => {
        const reaction = r === 'r'
        const st = abilityCost(c, cost)
        return (
          <div className="ab" key={`${i}-${name}`}>
            <div>
              {name}
              {r ? ' (reaction)' : ''}
              <small>{text}</small>
            </div>
            {!own ? (
              <span className="sub">{cost} St</span>
            ) : ix.attack[name] ? (
              <span className="sub">attack: tap a target</span>
            ) : (
              <button className={(c.st as number) < st ? 'warn' : ''} disabled={abilityLocked(c, reaction, dm, myTurn)} onClick={() => void actions.castAbility(id, name, cost, reaction)}>
                {st} St
              </button>
            )}
          </div>
        )
      })}
      {attuned.length > 0 && (
        <div className="row mini">
          <span className="sub">Attuned:</span>
          {attuned.map((k) => (
            <button key={k} onClick={() => upd(releaseAttunement(c, k, board))}>
              Release {board[k]!.n}
            </button>
          ))}
        </div>
      )}
      <h3>Stats</h3>
      <div className="stats">
        {STAT_FIELDS.map(([f, l]) =>
          dm ? (
            <Field key={f} label={l} type="number" value={(c[f] as number) ?? 0} onSave={(v) => void actions.patchCharacter(id, { [f]: fieldValue(v, true) })} />
          ) : (
            <span key={f}>
              {l}
              <b>{(c[f] as number) ?? 0}</b>
            </span>
          ),
        )}
      </div>
      <Field className="blk" label="Conditions" value={c.conds} placeholder="e.g. Poisoned" disabled={!own} onSave={(v) => void actions.patchCharacter(id, { conds: v })} />
      <Field className="blk" label="Notes" value={c.notes} area={2} disabled={!own} onSave={(v) => void actions.patchCharacter(id, { notes: v })} />
      {log.length > 0 && (
        <ul className="log">
          {log.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      {dm && (
        <div className="row">
          <button onClick={() => confirm(`Remove ${c.name}?`) && void actions.removeCharacter(id)}>Remove character</button>
        </div>
      )}
    </div>
  )
}

function Pills({ c }: { c: Sheet }) {
  const x = characterPills(c)
  if (!x.length) return null
  return (
    <div className="pills">
      {x.map((p, i) => (
        <i key={i} className={`pill${p.bad ? ' bad' : ''}`}>
          {p.text}
        </i>
      ))}
    </div>
  )
}

export type SheetScreenProps = Omit<CardProps, 'id'> & {
  onApprove: (id: string, ok: boolean) => void
  onClaim: (id: string, ok: boolean) => void
}

/** The sheet view: the GM's requests and every approved sheet, or the player's own sheet. */
export function SheetScreen(p: SheetScreenProps) {
  const { tables, dm, me, onApprove, onClaim } = p
  if (!dm) {
    return <div className="solo">{tables.chars[me] && <CharacterCard id={me} {...p} />}</div>
  }
  const ids = approvedIds(tables.chars)
  return (
    <div className="sheets">
      <RequestPanels tables={tables} dm={dm} onApprove={onApprove} onClaim={onClaim} />
      {ids.length ? (
        <div className="grid">
          {ids.map((id) => (
            <CharacterCard key={id} id={id} {...p} />
          ))}
        </div>
      ) : (
        <p className="note">No approved characters yet.</p>
      )}
    </div>
  )
}
