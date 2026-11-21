// The Game Master's Enemies panel: the list (phase sheets indented under their
// boss), HP buttons, and the editor for each enemy.
import { useState } from 'react'
import { AETHELRIC_75 } from '../../data/cinematics'
import { SKILL_SETS } from '../../data/skillSets'
import { enemyFieldChange, enemyPills, hpStep, NEW_SKILL, newEnemy, randomKey, rankOf, RANKS, skillFieldValue, type NewEnemyForm } from '../../logic/enemies'
import { enemyListOrder } from '../../logic/phases'
import { addSkillSet } from '../../logic/skills'
import type { Enemy } from '../../logic/types'
import type { GameState, Tables } from '../../state/store'
import { Field, Meter } from '../parts'
import { PictureButton } from '../PictureButton'
import { bossArtImage, portraitImage, squareIcon, tokenIcon } from '../images'
import { abilitySlug } from '../../logic/text'

type Actions = Pick<
  GameState,
  | 'updateEnemy'
  | 'addEnemy'
  | 'removeEnemy'
  | 'setSkills'
  | 'putSkill'
  | 'setSkillField'
  | 'deleteSkill'
  | 'addNextPhase'
  | 'switchPhase'
  | 'setIcon'
  | 'setPortrait'
  | 'setBossArt'
  | 'setSkillIcon'
  | 'notice'
  | 'autoTurn'
  | 'bossIntro'
  | 'setSpawn'
>

export type EnemiesPanelProps = {
  tables: Tables
  actions: Actions
  open: string[]
  onToggle: (id: string) => void
  /** Theme keys stored for this table, with display names. */
  themes: { key: string; name: string }[]
  onPlayCinematic: (id: string) => void
  /** Asked before removing an enemy (the live page uses the browser's confirm box). */
  confirm?: (question: string) => boolean
  rand?: () => number
  /** Token pictures by enemy id (when loaded), and skill icons by skill slug. */
  icons?: Record<string, string>
  skillIcons?: Record<string, string>
  /** Plays a skill's ability sound here; false when it has none. */
  onPlaySkill?: (name: string) => Promise<boolean>
}

const EMPTY_FORM: NewEnemyForm = { name: '', type: '', size: '1', hp: '', speed: '', poise: '', ac: '', attack: '', damage: '' }

export function EnemiesPanel({ tables, actions, open, onToggle, themes, onPlayCinematic, confirm = (q) => window.confirm(q), rand = Math.random, icons = {}, skillIcons = {}, onPlaySkill = async () => false }: EnemiesPanelProps) {
  const { enemies, chars, maps } = tables
  const order = enemyListOrder(enemies, Object.keys(enemies))
  const [form, setForm] = useState<NewEnemyForm>(EMPTY_FORM)
  const set = (k: keyof NewEnemyForm) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const field = (id: string, e: Enemy, f: string, v: string | boolean) => void actions.updateEnemy(id, enemyFieldChange(e, f, v))

  return (
    <div className="card" aria-label="Enemies">
      <h2>Enemies</h2>
      {!order.length && <p className="note">None in sight.</p>}
      {order.map(([id, depth]) => {
        const e = enemies[id]!
        const isOpen = open.includes(id)
        const mapName = e.mp && maps[e.mp] ? String((maps[e.mp] as { name?: string }).name ?? '') : ''
        const sz = e.sz || 1
        const pills = enemyPills(id, e, chars)
        const k = (f: string) => `${id}-${f}-${String(e[f] ?? '')}` // re-read a box when the saved value changes
        return (
          <div className="ab enemy" key={id} style={depth ? { marginLeft: depth * 12, borderLeft: '3px solid #8a7a3a', paddingLeft: 6 } : undefined}>
            <div className="grow">
              <div className="row mini">
                {e.iv && icons[id] ? <img className="av" src={icons[id]} alt="" /> : null}
                <button className="tgl" aria-expanded={isOpen} aria-label={`Show or hide ${e.name ?? 'this enemy'}'s settings`} onClick={() => onToggle(id)}>
                  {isOpen ? '▾' : '▸'}
                </button>
                <b>{e.name}</b>
              </div>
              {e.pl ? <small>{e.pl}</small> : depth ? <small>Phase {depth + 1} sheet</small> : null}
              <small>
                {e.type} · {sz}×{sz}
                {e.mx == null ? ' · not placed' : mapName ? ` · on ${mapName}` : ''}
              </small>
              {pills.length > 0 && (
                <div className="pills">
                  {pills.map((p) => (
                    <i className="pill bad" key={p}>
                      {p}
                    </i>
                  ))}
                </div>
              )}
              <Meter v={e.hp ?? 0} max={e.max ?? 0} kind="hp" />
              {(e.pm ?? 0) > 0 && (
                <>
                  <small>Poise</small>
                  <Meter v={e.po ?? e.pm!} max={e.pm!} kind="st" />
                </>
              )}
              <div className="row mini">
                {[-50, -10, 10, 50].map((n) => (
                  <button key={n} aria-label={`${n > 0 ? '+' : ''}${n} HP for ${e.name}`} onClick={() => void actions.updateEnemy(id, hpStep(e, n))}>
                    {n > 0 ? '+' : ''}
                    {n}
                  </button>
                ))}
              </div>
              {isOpen && (
                <div className="eedit">
                  <div className="efld">
                    <Field key={k('name')} label="Name" value={e.name ?? ''} width={140} onSave={(v) => field(id, e, 'name', v)} />
                    <Field key={k('type')} label="Type" value={e.type ?? ''} width={120} onSave={(v) => field(id, e, 'type', v)} />
                    <Field key={k('sz')} label="Size" type="number" value={sz} onSave={(v) => field(id, e, 'sz', v)} />
                    <Field key={k('max')} label="Max HP" type="number" value={e.max ?? 0} onSave={(v) => field(id, e, 'max', v)} />
                  </div>
                  <div className="efld">
                    <Field key={k('spd')} label="Speed" type="number" value={(e.spd as number) || 6} onSave={(v) => field(id, e, 'spd', v)} />
                    <Field key={k('bon')} label="Bonus" type="number" value={(e.bon as number) || 0} onSave={(v) => field(id, e, 'bon', v)} />
                    <Field key={k('pm')} label="Poise" type="number" value={e.pm || 0} onSave={(v) => field(id, e, 'pm', v)} />
                    <Field key={k('ac')} label="AC" type="number" value={(e.ac as number) ?? 12} onSave={(v) => field(id, e, 'ac', v)} />
                    <Field key={k('ab')} label="Atk +" type="number" value={e.ab ?? 4} onSave={(v) => field(id, e, 'ab', v)} />
                    <Field key={k('dm')} label="Damage" value={e.dm || '1d8'} width={84} onSave={(v) => field(id, e, 'dm', v)} />
                    <Field key={k('er')} label="Range" type="number" value={e.er || 1} onSave={(v) => field(id, e, 'er', v)} />
                    <Field key={k('ib')} label="Init +" type="number" value={(e.ib as number) || 0} onSave={(v) => field(id, e, 'ib', v)} />
                    <label>
                      Rank
                      <select value={rankOf(e)} onChange={(x) => field(id, e, 'rk', x.target.value)}>
                        {Object.entries(RANKS).map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Swap at 0 HP
                      <input type="checkbox" checked={!!e.sw} onChange={(x) => field(id, e, 'sw', x.target.checked)} />
                    </label>
                    <Field key={k('pg')} label="Phase gate (% HP, 0 = off)" type="number" value={e.pg || 0} width={70} onSave={(v) => field(id, e, 'pg', v)} />
                    <label>
                      Next phase
                      <select value={e.nx ?? ''} onChange={(x) => field(id, e, 'nx', x.target.value)}>
                        <option value="">None</option>
                        {e.nx && !enemies[e.nx] && <option value={e.nx}>(removed monster: pick again)</option>}
                        {Object.keys(enemies)
                          .filter((o) => o !== id)
                          .map((o) => (
                            <option key={o} value={o}>
                              {enemies[o]!.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Field key={k('pl')} label="Phase label" value={e.pl ?? ''} width={130} placeholder="First encounter" onSave={(v) => field(id, e, 'pl', v)} />
                    <Field key={k('bt')} label="Title" value={(e.bt as string) ?? ''} width={150} placeholder="Guardian of Frost" onSave={(v) => field(id, e, 'bt', v)} />
                    <label>
                      Theme
                      <select value={e.th ?? ''} onChange={(x) => field(id, e, 'th', x.target.value)}>
                        <option value="">Auto (by name)</option>
                        {themes.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Field
                    key={k('gt')}
                    area={6}
                    label="Gate cinematic text (plays when you press Play cinematic, for an event gate)"
                    value={e.gt ?? ''}
                    placeholder="One line per beat. Start a line with effects in brackets."
                    onSave={(v) => field(id, e, 'gt', v)}
                  />
                  <div className="row mini">
                    <button onClick={() => void actions.updateEnemy(id, { gt: AETHELRIC_75 })}>Load the Aethelric 75% scene</button>
                  </div>
                  <p className="note">
                    Effects at the start of a line: [portrait] shows his picture, [stagger], [glow], [flash], [shake], [slam], [crack], [collapse], [black], [big] for shouted text, [wait=3] seconds.
                    Plain text with no effects just fades in on black.
                  </p>
                  <label className="sub">
                    <input type="checkbox" checked={!!e.gv} onChange={(x) => field(id, e, 'gv', x.target.checked)} /> He vanishes from the board when the cinematic ends
                  </label>
                  <Field key={k('nt')} area={2} label="GM notes (only you see this)" value={(e.nt as string) ?? ''} onSave={(v) => field(id, e, 'nt', v)} />
                  <div className="row mini">
                    <button onClick={() => void actions.addNextPhase(id, randomKey('e', 6, rand), (key) => themes.some((t) => t.key === key))}>+ Add next phase sheet</button>
                    {e.gt && (
                      <button className="pri" onClick={() => onPlayCinematic(id)}>
                        Play cinematic
                      </button>
                    )}
                  </div>
                  <h3>Skills</h3>
                  {Object.entries(e.sk || {}).map(([sk, q]) => {
                    const sv = (f: string, v: string | boolean) => void actions.setSkillField(id, sk, f, skillFieldValue(f, v))
                    const kk = (f: string) => `${id}-${sk}-${f}-${String((q as Record<string, unknown>)[f] ?? '')}`
                    return (
                      <div className="efld" key={sk} aria-label={`Skill ${q.n}`}>
                        <Field key={kk('n')} label="Name" value={q.n} width={100} onSave={(v) => sv('n', v)} />
                        <Field key={kk('d')} label="Damage" value={q.d} width={70} onSave={(v) => sv('d', v)} />
                        <Field key={kk('r')} label="Range" type="number" value={q.r || 1} width={56} onSave={(v) => sv('r', v)} />
                        <label>
                          Type
                          <select value={q.t === 'a' ? 'a' : 's'} onChange={(x) => sv('t', x.target.value)}>
                            <option value="s">Single</option>
                            <option value="a">Area</option>
                          </select>
                        </label>
                        <label>
                          Auto-hit
                          <input type="checkbox" checked={!!q.a} onChange={(x) => sv('a', x.target.checked)} />
                        </label>
                        {skillIcons[abilitySlug(q.n)] && <img className="abi" src={skillIcons[abilitySlug(q.n)]} alt="" />}
                        <button
                          onClick={() =>
                            void onPlaySkill(q.n).then(
                              (ok) => ok || actions.notice(`No custom sound for ${q.n} yet. The skill name must match an imported ability name, and sound must be on.`),
                            )
                          }
                        >
                          Play sound
                        </button>
                        <PictureButton process={(kit, src) => squareIcon(kit, src, 96)} onPicture={(d) => actions.setSkillIcon(abilitySlug(q.n), d)} onError={actions.notice}>
                          {skillIcons[abilitySlug(q.n)] ? 'Change icon' : 'Icon'}
                        </PictureButton>
                        {skillIcons[abilitySlug(q.n)] && <button onClick={() => void actions.setSkillIcon(abilitySlug(q.n), null)}>No icon</button>}
                        <button aria-label={`Delete skill ${q.n}`} onClick={() => void actions.deleteSkill(id, sk)}>
                          x
                        </button>
                      </div>
                    )
                  })}
                  <div className="row mini">
                    <button onClick={() => void actions.putSkill(id, randomKey('s', 4, rand), NEW_SKILL)}>+ Add skill</button>
                    <select
                      aria-label="Load a skill set"
                      value=""
                      onChange={(x) => {
                        const preset = SKILL_SETS[x.target.value]
                        if (preset) void actions.setSkills(id, addSkillSet(e.sk, preset, (ix) => randomKey('s', 4, rand) + ix))
                      }}
                    >
                      <option value="">Load a skill set...</option>
                      {Object.keys(SKILL_SETS).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  {!!e.gr && (
                    <p className="note">
                      <b>Gate reached at {e.pg}% HP: run your scripted event.</b> <button onClick={() => void actions.updateEnemy(id, { gr: 0 })}>Done</button>
                    </p>
                  )}
                  <div className="row mini">
                    {e.nx && enemies[e.nx] && (
                      <button className="pri" onClick={() => void actions.switchPhase(id, null)}>
                        Start phase 2: {enemies[e.nx]!.name}
                      </button>
                    )}
                    <button onClick={() => void actions.autoTurn(id)}>Auto turn</button>
                    <button onClick={() => void actions.bossIntro(id)}>Boss intro</button>
                    <button onClick={() => void actions.setSpawn(id)}>Set spawn</button>
                    <button onClick={() => void actions.updateEnemy(id, { stun: !e.stun })}>{e.stun ? 'Unstun' : 'Stun'}</button>
                    <PictureButton process={tokenIcon} onPicture={(d) => actions.setIcon(`e:${id}`, d)} onError={actions.notice}>
                      Icon
                    </PictureButton>
                    <PictureButton process={portraitImage} onPicture={(d) => actions.setPortrait(id, d)} onError={actions.notice}>
                      Portrait
                    </PictureButton>
                    <PictureButton process={bossArtImage} onPicture={(d) => actions.setBossArt(id, d)} onError={actions.notice}>
                      Boss art
                    </PictureButton>
                    <button onClick={() => confirm('Remove this enemy?') && void actions.removeEnemy(id)}>Remove</button>
                  </div>
                  
                </div>
              )}
            </div>
          </div>
        )
      })}
      <h3>Add enemy</h3>
      <div className="addform">
        <input aria-label="Name" maxLength={30} placeholder="Name" value={form.name} onChange={set('name')} />
        <input aria-label="Type" maxLength={30} placeholder="Type" list="enemy-types" value={form.type} onChange={set('type')} />
        <datalist id="enemy-types">
          {['Goblin', 'Troll', 'Ogre', 'Griffin', 'Dragon', 'Wolf'].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <select aria-label="Size" value={form.size} onChange={set('size')}>
          <option value="1">Small/Medium (1×1)</option>
          <option value="2">Large (2×2)</option>
          <option value="3">Huge (3×3)</option>
          <option value="4">Gargantuan (4×4)</option>
        </select>
        <input aria-label="HP" type="number" placeholder="HP" value={form.hp} onChange={set('hp')} />
        <input aria-label="Speed" type="number" placeholder="Speed in squares (default 6)" value={form.speed} onChange={set('speed')} />
        <input aria-label="Poise" type="number" placeholder="Poise (0 = no stagger)" value={form.poise} onChange={set('poise')} />
        <input aria-label="AC" type="number" placeholder="AC (default 12)" value={form.ac} onChange={set('ac')} />
        <input aria-label="Attack bonus" type="number" placeholder="Attack bonus (default 4)" value={form.attack} onChange={set('attack')} />
        <input aria-label="Damage" placeholder="Damage, e.g. 2d6 (default 1d8)" value={form.damage} onChange={set('damage')} />
        <div className="row">
          <button
            onClick={() => {
              const sheet = newEnemy(form)
              if (!sheet) return
              void actions.addEnemy(randomKey('e', 6, rand), sheet)
              setForm(EMPTY_FORM)
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
