// The ability board (the GM's editor, or a player equipping abilities) and the
// reference table. Same layout and rules as the live page.
import { Fragment, useState, type ReactNode } from 'react'
import { BONUSES, GLYPHS, KINDS, VOCATIONS } from '../../data/abilityIcons'
import { CLASS_RULES } from '../../data/classRules'
import { CLASSES } from '../../data/classes'
import { ABILITY_SOUNDS } from '../../data/audio'
import { ICON_BASE } from '../../data/icons'
import { availableAbilities, editorOrder, equipRow, glyphOf, keyByName, missingAbilities, referenceRows, usedSlots, vocationBoard } from '../../logic/abilityBoard'
import { attunedSet, boardOrDefault, defaultBoard, equippedIds, goldenHidden, slotsOf, spoilerList, spoilerParts, type Board } from '../../logic/board'
import { randomKey } from '../../logic/enemies'
import { classIcon } from '../../logic/iconImport'
import { abilitySlug } from '../../logic/text'
import { abilityCost } from '../../logic/stamina'
import type { Sheet } from '../../logic/sheet'
import { atRestSpot } from '../../state/boardActions'
import type { GameState, Tables } from '../../state/store'
import { Field } from '../parts'
import { IconImport } from '../IconImport'
import { PictureButton } from '../PictureButton'
import { Zoom } from '../Zoom'
import { squareIcon } from '../images'

/** An ability's icon: the GM's uploaded picture, else the drawn icon, else its emoji. */
export function AbilityIcon({
  board,
  name,
  images,
  drawn,
  zoom = false,
}: {
  board: Board
  name: string
  images: Record<string, string>
  drawn: boolean
  /** Click the picture to see it big. */ zoom?: boolean
}) {
  const k = keyByName(board)[name]
  const e = k ? board[k] : undefined
  if (!k || !e) return null
  const full = classIcon(name, !!e.gb)
  if (images[k]) return zoom ? <Zoom className="abi" src={images[k]} full={full && ICON_BASE + full} name={name} /> : <img className="abi" src={images[k]} alt="" />
  if (drawn) {
    const { glyph, color, golden } = glyphOf(board, k)
    const id = `g${k.replace(/[^a-z0-9]/gi, '').slice(0, 18)}`
    const gold = '#f2c14e'
    return (
      <svg className="abi" viewBox="0 0 64 64" role="img" aria-label={name}>
        <defs>
          <radialGradient id={id} cx="50%" cy="35%" r="80%">
            <stop offset="0" stopColor={color} stopOpacity=".5" />
            <stop offset="1" stopColor="#0d0b10" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="12" fill={`url(#${id})`} stroke={golden ? gold : color} strokeWidth={golden ? 3 : 1.6} />
        {golden && <rect x="6" y="6" width="52" height="52" rx="9" fill="none" stroke={gold} strokeOpacity=".45" strokeDasharray="3 4" />}
        <g
          transform="translate(10 10) scale(.89)"
          fill={golden ? gold : color}
          fillOpacity=".22"
          stroke={golden ? '#ffe9a8' : '#f3ead6'}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: GLYPHS[glyph]! }}
        />
      </svg>
    )
  }
  return e.ic ? <span className="abe">{e.ic}</span> : null
}

export type BoardScreenProps = {
  view: 'board' | 'ref'
  onView: (v: 'board' | 'ref') => void
  tables: Tables
  dm: boolean
  me: string
  actions: Pick<GameState, 'setAbilityField' | 'addAbility' | 'removeAbility' | 'replaceBoard' | 'setBoardSetting' | 'equip' | 'attune' | 'setAbilityIcon' | 'setSkillIcon' | 'notice'>
  /** Uploaded ability pictures by board key (when loaded). */
  images: Record<string, string>
  confirm: (q: string) => boolean
  rand?: () => number
  /** The GM's Boss abilities list, shown under the Reference. */
  bossAbilities?: ReactNode
  /** The class Reference folded to its title (this device). */
  refShut?: boolean
  onRefShut?: (shut: boolean) => void
  /** Plays an ability's sound (the ▶ on the Reference). */
  onPlay?: (name: string) => void
}

/** A text with each clause that holds a hidden word shown as a black bar. */
function Masked({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {spoilerParts(text, words, true).map((p, i) =>
        p.hide ? (
          <span key={i} className="spl" aria-label="hidden word">
            {p.t}
          </span>
        ) : (
          p.t
        ),
      )}
    </>
  )
}

/** The ▶ that plays an ability's sound, for abilities that have one. */
function Play({ name, onPlay }: { name: string; onPlay?: (name: string) => void }) {
  if (!onPlay || !ABILITY_SOUNDS[abilitySlug(name)]) return null
  return (
    <button className="snd" aria-label={`Play the sound of ${name}`} onClick={() => onPlay(name)}>
      ▶
    </button>
  )
}

/** The two tabs above both screens. */
function Tabs({ view, onView, dm }: Pick<BoardScreenProps, 'view' | 'onView' | 'dm'>) {
  return (
    <div className="row mini tabs">
      <button className={view === 'board' ? 'pri' : ''} onClick={() => onView('board')}>
        {dm ? 'Ability board' : 'Equip abilities'}
      </button>
      <button className={view === 'ref' ? 'pri' : ''} onClick={() => onView('ref')}>
        Reference
      </button>
    </div>
  )
}

export function BoardScreen(p: BoardScreenProps) {
  return (
    <div className={p.dm && p.view === 'board' ? 'sheets' : 'solo'}>
      <Tabs view={p.view} onView={p.onView} dm={p.dm} />
      {p.view === 'ref' ? <Reference {...p} /> : p.dm ? <Editor {...p} /> : <Equip {...p} />}
      {p.view === 'ref' && p.dm && p.bossAbilities}
    </div>
  )
}

function Editor({ tables, actions, images, confirm, rand = Math.random }: BoardScreenProps) {
  const board = boardOrDefault(tables.board as Board | null)
  const [filter, setFilter] = useState('')
  const ids = editorOrder(board)
  const shown = filter ? ids.filter((k) => (board[k]!.v || 'any') === filter) : ids
  const field = (id: string, f: string) => (v: string) => void actions.setAbilityField(id, f, v)
  const pick = (id: string, f: string, label: string, value: string, options: [string, string][]) => (
    <label>
      {label}
      <select value={value} onChange={(e) => field(id, f)(e.target.value)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  )
  const check = (id: string, f: string, label: string, on: unknown) => (
    <label>
      {label}
      <input type="checkbox" checked={!!on} onChange={(e) => void actions.setAbilityField(id, f, e.target.checked)} />
    </label>
  )
  return (
    <>
      <div className="card">
        <h2>Ability board</h2>
        <p className="note">
          Players pick from these when they level up. Cost is in tens: 2 means 20 stamina. Abilities above a player's level stay hidden from them. Players can change abilities only next to a altar, a
          bonfire or a guild (use the Guild map tool). Each level gives one more slot.
        </p>
        <div className="row">
          <button className="pri" onClick={() => void actions.addAbility(randomKey('x', 5, rand))}>
            Add ability
          </button>
          <button onClick={() => confirm('Replace the whole board with the default abilities?') && void actions.replaceBoard(defaultBoard())}>Load default abilities</button>
          <button
            onClick={() =>
              confirm('Replace the whole board with the class abilities (levels 1 to 10, with Golden and Crimson versions)? Characters keep their level, but their equipped abilities may change.') &&
              void actions.replaceBoard(vocationBoard())
            }
          >
            Load class abilities
          </button>
          <button
            onClick={() => {
              const add = missingAbilities(board)
              if (add) void actions.replaceBoard({ ...board, ...add })
            }}
          >
            Add new class abilities
          </button>
          <button onClick={() => void actions.setBoardSetting('drawnIcons', !tables.drawnIcons)}>Icons: {tables.drawnIcons ? 'drawn' : 'emoji'}</button>
          <button onClick={() => void actions.setBoardSetting('showAll', !tables.showAll)}>Players see: {tables.showAll ? 'all abilities' : 'unlocked only'}</button>
          <IconImport board={board} enemies={tables.enemies} setAbilityIcon={actions.setAbilityIcon} setSkillIcon={actions.setSkillIcon} />
        </div>
        <p className="note">Import icons: pick many pictures at once. Each is matched by its file name to the abilities and monster skills of that name (for example "Frost Lance.png").</p>
        <div className="row mini">
          <span className="sub">Show:</span>
          <button className={filter ? '' : 'pri'} onClick={() => setFilter('')}>
            All ({ids.length})
          </button>
          {VOCATIONS.map(([v, t]) => (
            <button key={v} className={filter === v ? 'pri' : ''} onClick={() => setFilter(v)}>
              {t} ({ids.filter((k) => (board[k]!.v || 'any') === v).length})
            </button>
          ))}
        </div>
      </div>
      {shown.map((id) => {
        const e = board[id]!
        return (
          <div className="card sb" key={id} aria-label={`Ability: ${e.n}`}>
            <div className="efld">
              <Field label="Name" value={e.n} width={120} onSave={field(id, 'n')} />
              {pick(id, 'v', 'Vocation', e.v || 'any', VOCATIONS)}
              <Field label="Min level" value={e.l || 1} width={56} onSave={field(id, 'l')} />
              <Field label="Cost" value={e.c || 0} width={56} onSave={field(id, 'c')} />
              {pick(id, 'k', 'Kind', e.k || 'util', KINDS)}
              <Field label="Dice" value={e.d || ''} width={70} onSave={field(id, 'd')} />
              <Field label="Range" value={e.r || 0} width={56} onSave={field(id, 'r')} />
              <Field label="HP cost %" value={e.hc || 0} width={56} onSave={field(id, 'hc')} />
              {pick(id, 'gb', 'Needs equipped', e.gb || '', [['', 'nothing'], ...ids.filter((k) => k !== id).map((k): [string, string] => [k, board[k]!.n])])}
              <Field label="Icon (emoji)" value={e.ic} width={56} onSave={field(id, 'ic')} />
              {check(id, 'a', 'Auto-hit', e.a)}
              {check(id, 'ch', 'Charge a round', e.ch)}
              {pick(id, 'b', 'Bonus', e.b || '', BONUSES)}
              <Field label="Description" value={e.t || ''} width={220} onSave={field(id, 't')} />
              <Field label="Short summary (shown on the table)" value={e.sd || ''} width={260} onSave={field(id, 'sd')} />
            </div>
            <div className="row mini">
              <AbilityIcon board={board} name={e.n} images={images} drawn={tables.drawnIcons} />
              <PictureButton process={(kit, src) => squareIcon(kit, src, 96)} onPicture={(d) => actions.setAbilityIcon(id, d)} onError={actions.notice}>
                Custom icon image
              </PictureButton>
              {images[id] && <button onClick={() => void actions.setAbilityIcon(id, null)}>Clear image</button>}
              <button onClick={() => confirm('Remove this ability from the board?') && void actions.removeAbility(id)}>Remove</button>
            </div>
          </div>
        )
      })}
    </>
  )
}

function Equip({ tables, dm, me, actions, images }: BoardScreenProps) {
  const c = tables.chars[me] as Sheet | undefined
  if (!c) return null
  const board = boardOrDefault(tables.board as Board | null)
  const hide = goldenHidden(dm, tables.sp)
  const here = atRestSpot(tables, c)
  const eq = new Set(equippedIds(c, board, hide))
  const slots = slotsOf(c)
  const atn = Number(c.atn) || 0
  const avail = availableAbilities(c, board, tables.showAll, hide)
  return (
    <>
      <div className="card">
        <h2>Ability board</h2>
        <p className="note">
          Equipped {usedSlots(c, eq, board)} / {slots}.{atn ? ` Attuned ${attunedSet(c, board).length} / ${atn} (attuned Golden abilities use no slot).` : ''}{' '}
          {here ? 'You are at an altar, bonfire or guild: you can change your abilities.' : 'You can only change abilities next to an altar, a bonfire or at a guild.'} More slots and abilities unlock
          as you level up.
        </p>
      </div>
      <div className="card">
        {avail.length ? (
          avail.map((k) => {
            const e = board[k]!
            const r = equipRow(c, board, k, eq, here)
            return (
              <div className="ab" key={k}>
                <div className="abx">
                  <AbilityIcon board={board} name={e.n} images={images} drawn={tables.drawnIcons} />
                  <div className="abt">
                    <b>{e.n}</b>{' '}
                    <span className="sub">
                      Lv {e.l || 1} · {abilityCost(c, Number(e.c) || 0)} St{e.hc ? ` + ${e.hc}% HP` : ''}
                    </span>
                    <small>{r.text}</small>
                  </div>
                </div>
                {r.attune === 'attuned' && <span className="sub">Attuned</span>}
                {r.attune === 'button' && <button onClick={() => void actions.attune(k)}>Attune</button>}
                <button disabled={!r.canToggle} onClick={() => void actions.equip(k, !r.on)}>
                  {r.on ? 'Unequip' : 'Equip'}
                </button>
              </div>
            )
          })
        ) : (
          <p className="note">No abilities available yet.</p>
        )}
      </div>
    </>
  )
}

function Reference({ tables, dm, me, images, refShut = false, onRefShut = () => {}, onPlay }: BoardScreenProps) {
  const c = tables.chars[me]
  const board = boardOrDefault(tables.board as Board | null)
  const [picked, setPicked] = useState<string | null>(null)
  const cls = picked ?? (c && CLASSES[c.cls as keyof typeof CLASSES] ? (c.cls as string) : 'fighter')
  const info = CLASSES[cls as keyof typeof CLASSES]
  // Everyone sees every ability here; players do not see Golden versions or hidden words while those are hidden.
  const words = dm ? [] : spoilerList(tables.sp)
  const rows = referenceRows(board, cls, 99, goldenHidden(dm, tables.sp))
  return (
    <div className="card ref" aria-label="Class abilities">
      <div className="row mini">
        <button className="tgl" aria-expanded={!refShut} aria-label="Show or hide the class abilities" onClick={() => onRefShut(!refShut)}>
          {refShut ? '▸' : '▾'}
        </button>
        <h2>{info.name}</h2>
      </div>
      {!refShut && (
        <>
          <p className="note">
            <Masked text={info.description} words={words} />
          </p>
          <div className="row mini">
            {Object.entries(CLASSES).map(([k, v]) => (
              <button key={k} className={k === cls ? 'pri' : ''} onClick={() => setPicked(k)}>
                {v.name}
              </button>
            ))}
          </div>
          <ul className="rules" aria-label="Class rules">
            {CLASS_RULES[cls as keyof typeof CLASS_RULES]
              .filter((r) => dm || !r.gm)
              .map((r) => (
                <li key={r.name}>
                  <b>{r.name}.</b> <Masked text={r.text} words={words} />
                </li>
              ))}
          </ul>
          <p className="note">You can learn every ability here, but you can only equip 6 at a time. A cost of 1 is 10 stamina.</p>
          <table>
            <thead>
              <tr>
                <th>Lvl</th>
                <th>Ability</th>
                <th>Cost</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <Fragment key={r.key}>
                    <tr>
                      <td>{r.level}</td>
                      <td>
                        <div className="abx">
                          <AbilityIcon board={board} name={r.name} images={images} drawn={tables.drawnIcons} zoom />
                          <b>
                            <Masked text={r.name} words={words} />
                          </b>
                          <Play name={r.name} onPlay={onPlay} />
                        </div>
                      </td>
                      <td>{r.cost}</td>
                      <td>
                        <Masked text={r.effect} words={words} />
                      </td>
                    </tr>
                    {r.golden && (
                      <tr className={r.golden.name.endsWith('(Crimson)') ? 'gold crimson' : 'gold'}>
                        <td>{r.level}</td>
                        <td>
                          <div className="abx">
                            <AbilityIcon board={board} name={r.golden.name} images={images} drawn={tables.drawnIcons} zoom />
                            <b>{r.golden.name}</b>
                            <Play name={r.golden.name} onPlay={onPlay} />
                          </div>
                        </td>
                        <td>{r.golden.cost}</td>
                        <td>
                          {r.golden.dice ? `${r.golden.dice} damage. ` : ''}Costs {r.golden.hc}% max HP.
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="note">
                    Nothing to show yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
