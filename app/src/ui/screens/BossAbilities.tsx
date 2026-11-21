// The GM's Boss abilities list (on the Reference tab, folded until opened): every
// boss's moves, phase by phase, with the icon, a button to hear its sound, damage,
// reach and what each move does, plus the GM's own note per move (saved for the table).
import { useState } from 'react'
import { ICON_BASE, SKILL_ICONS } from '../../data/icons'
import { SKILL_SETS } from '../../data/skillSets'
import { bossSections } from '../../logic/bossRef'
import { Zoom } from '../Zoom'

export type BossAbilitiesProps = {
  /** Shown or folded to its title (this device). */
  open: boolean
  onOpen: (open: boolean) => void
  /** Skill icons saved for the table, by skill slug (the built-in ones are used otherwise). */
  icons?: Record<string, string>
  /** The GM's notes by skill slug. */
  notes: Record<string, string>
  onNote: (slug: string, text: string) => void
  /** Plays a move's sound here. */
  onPlay: (name: string) => void
}

export function BossAbilities({ open, onOpen, icons = {}, notes, onNote, onPlay }: BossAbilitiesProps) {
  const bosses = bossSections(SKILL_SETS)
  const [picked, setPicked] = useState(bosses[0]!.boss)
  const b = bosses.find((x) => x.boss === picked)!
  const builtIn = (slug: string) => (SKILL_ICONS[slug] ? ICON_BASE + SKILL_ICONS[slug] : null)
  const icon = (slug: string) => icons[slug] ?? builtIn(slug)
  return (
    <div className="card ref" aria-label="Boss abilities">
      <div className="row mini">
        <button className="tgl" aria-expanded={open} aria-label="Show or hide the Boss abilities" onClick={() => onOpen(!open)}>
          {open ? '▾' : '▸'}
        </button>
        <h2>Boss abilities</h2>
      </div>
      {open && (
        <>
          <p className="note">Only you see this. Every boss move by phase. ▶ plays its sound; write your own notes under any move.</p>
          <div className="row mini">
            {bosses.map((x) => (
              <button key={x.boss} className={x.boss === b.boss ? 'pri' : ''} onClick={() => setPicked(x.boss)}>
                {x.boss}
              </button>
            ))}
          </div>
          {b.phases.map((ph) => (
            <div key={ph.label}>
              <h3>{ph.label}</h3>
              <table className="boss">
                <thead>
                  <tr>
                    <th>Ability</th>
                    <th>Damage</th>
                    <th>Reach</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {ph.rows.map((r) => {
                    const src = icon(r.slug)
                    return (
                      <tr key={r.slug} aria-label={`Boss ability ${r.name}`}>
                        <td>
                          <div className="abx">
                            {src && <Zoom className="bai" src={src} full={builtIn(r.slug)} name={r.name} />}
                            <b>{r.name}</b>
                            <button className="snd" aria-label={`Play the sound of ${r.name}`} onClick={() => onPlay(r.name)}>
                              ▶
                            </button>
                          </div>
                        </td>
                        <td>{r.damage}</td>
                        <td>{r.reach}</td>
                        <td>
                          <p>{r.text}</p>
                          <textarea
                            key={`${r.slug}-${notes[r.slug] ?? ''}`}
                            className="bnote"
                            rows={1}
                            aria-label={`Notes: ${r.name}`}
                            placeholder="Add a note"
                            defaultValue={notes[r.slug] ?? ''}
                            onBlur={(e) => e.target.value.trim() !== (notes[r.slug] ?? '') && onNote(r.slug, e.target.value)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
