// The sheet's Weapon & accessories section: the hero's one signature weapon (a name
// the GM gives as a reward at its first reforge, a tier the GM raises after the big falls) and the rings and
// amulets the GM gives out, any two of them worn.
import { ACCESSORIES, idList, WEAPON_TIERS, weaponTier } from '../../data/gear'
import { CLASS_STAT } from '../../data/rules'
import { giveChange, takeChange, wearChange } from '../../logic/gear'
import type { Change, Sheet } from '../../logic/sheet'
import { Field } from '../parts'

export type GearProps = {
  c: Sheet
  /** The GM (sets the tier, gives and takes accessories). */
  dm: boolean
  /** The GM or the hero's player (puts accessories on and off). */
  own: boolean
  upd: (p: Change) => void
  patch: (p: Record<string, unknown>) => void
}

const label = (id: string) => `${ACCESSORIES[id]!.n} (${ACCESSORIES[id]!.kind})`

export function Gear({ c, dm, own, upd, patch }: GearProps) {
  const w = weaponTier(c)
  const stat = (CLASS_STAT[c.cls as keyof typeof CLASS_STAT] ?? 'str').toUpperCase()
  const bag = idList(c.ao)
  const change = (x: Change | null) => x && upd(x)
  return (
    <section aria-label="Weapon and accessories">
      <h3>Weapon & accessories</h3>
      <div className="row mini">
        <Field
          label="Weapon"
          value={c.wn as string | undefined}
          placeholder={dm ? 'Name it at its first reforge' : 'Unnamed until its first reforge'}
          disabled={!dm}
          onSave={(v) => patch({ wn: v.trim() || null })}
        />
        {dm ? (
          <label>
            Tier{' '}
            <select aria-label="Weapon tier" value={w.t} onChange={(e) => upd([{ wt: Number(e.target.value) }, `Weapon reforged: ${WEAPON_TIERS[Number(e.target.value) - 1]!.label}`])}>
              {WEAPON_TIERS.map((t) => (
                <option key={t.t} value={t.t}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="sub">{w.label}</span>
        )}
      </div>
      <p className="note">
        Light attack {w.light} + {stat} (free) · Heavy attack {w.heavy} + {stat} (10 St). Abilities keep their own dice: the weapon is already counted in them.
      </p>
      {(['a1', 'a2'] as const).map((slot, i) => {
        const on = c[slot] as string | undefined
        return (
          <div className="gslot" key={slot}>
            <div>
              {own ? (
                <select aria-label={`Accessory slot ${i + 1}`} value={on && on in ACCESSORIES ? on : ''} onChange={(e) => change(wearChange(c, slot, e.target.value || null))}>
                  <option value="">Slot {i + 1}: empty</option>
                  {bag.map((id) => (
                    <option key={id} value={id} disabled={id !== on && (c.a1 === id || c.a2 === id)}>
                      {label(id)}
                    </option>
                  ))}
                </select>
              ) : (
                <b>{on && on in ACCESSORIES ? label(on) : `Slot ${i + 1}: empty`}</b>
              )}
              {on && on in ACCESSORIES && <small>{ACCESSORIES[on]!.text}</small>}
            </div>
          </div>
        )
      })}
      {own && !bag.length && <p className="note">No rings or amulets yet. The GM gives them out; any two can be worn.</p>}
      {dm && (
        <div className="row mini">
          <select aria-label="Give an accessory" value="" onChange={(e) => change(giveChange(c, e.target.value))}>
            <option value="">Give a ring or amulet...</option>
            {Object.keys(ACCESSORIES)
              .filter((id) => !bag.includes(id))
              .map((id) => (
                <option key={id} value={id}>
                  {label(id)}: {ACCESSORIES[id]!.text}
                </option>
              ))}
          </select>
          {bag.length > 0 && (
            <select aria-label="Take an accessory back" value="" onChange={(e) => change(takeChange(c, e.target.value))}>
              <option value="">Take one back...</option>
              {bag.map((id) => (
                <option key={id} value={id}>
                  {label(id)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </section>
  )
}
