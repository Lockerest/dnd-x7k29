// The GM's Boss abilities list (on the Reference tab): every boss's moves, phase by
// phase, with the icon, damage, reach and what each move does, plus the GM's own
// note per move (saved for the table) so nothing is forgotten months later.
import { useState } from 'react'
import { ICON_BASE, SKILL_ICONS } from '../../data/icons'
import { SKILL_SETS } from '../../data/skillSets'
import { bossSections } from '../../logic/bossRef'
import { Field } from '../parts'

export type BossAbilitiesProps = {
  /** Skill icons saved for the table, by skill slug (the built-in ones are used otherwise). */
  icons?: Record<string, string>
  /** The GM's notes by skill slug. */
  notes: Record<string, string>
  onNote: (slug: string, text: string) => void
}

export function BossAbilities({ icons = {}, notes, onNote }: BossAbilitiesProps) {
  const bosses = bossSections(SKILL_SETS)
  const [picked, setPicked] = useState(bosses[0]!.boss)
  const b = bosses.find((x) => x.boss === picked)!
  const icon = (slug: string) => icons[slug] ?? (SKILL_ICONS[slug] ? ICON_BASE + SKILL_ICONS[slug] : null)
  return (
    <div className="card ref" aria-label="Boss abilities">
      <h2>Boss abilities</h2>
      <p className="note">Only you see this. Every boss move by phase; add your own notes under any move.</p>
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
          <table>
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
                        {src && <img className="bai" src={src} alt="" />}
                        <b>{r.name}</b>
                      </div>
                    </td>
                    <td>{r.damage}</td>
                    <td>{r.reach}</td>
                    <td>
                      {r.text && <p>{r.text}</p>}
                      <Field key={`${r.slug}-${notes[r.slug] ?? ''}`} area={2} label={`Notes: ${r.name}`} value={notes[r.slug] ?? ''} placeholder="Your notes" onSave={(v) => onNote(r.slug, v)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
