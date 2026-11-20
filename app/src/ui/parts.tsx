// Small pieces shared by the screens: HP and stamina bars, and boxes that save
// when you leave them.

export const Meter = ({ v, max, kind }: { v: number; max: number; kind: 'hp' | 'st' }) => (
  <div className="meter" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={max}>
    <i className={kind} style={{ width: `${max ? Math.max(0, Math.min(100, (v / max) * 100)) : 0}%` }} />
    <b>
      {v} / {max}
    </b>
  </div>
)

export type FieldProps = {
  label: string
  value: string | number | undefined | null
  type?: string
  onSave: (v: string) => void
  width?: number
  placeholder?: string
  /** Rows: a multi-line box. */
  area?: number
  disabled?: boolean
  className?: string
}

/**
 * A text or number box that saves when you leave it (like the page's "change" event).
 * A new value from another device replaces what is shown.
 */
export function Field({ label, value, type = 'text', onSave, width, placeholder, area, disabled, className }: FieldProps) {
  const shown = value == null ? '' : String(value) // a missing value is an empty box, never "undefined"
  const common = { defaultValue: shown, placeholder, disabled, onBlur: (e: { target: { value: string } }) => e.target.value !== shown && onSave(e.target.value) }
  return (
    <label className={className ?? (area ? 'sub' : undefined)}>
      {label}
      {area ? <textarea key={shown} rows={area} style={{ width: '100%' }} {...common} /> : <input key={shown} type={type} style={width ? { width } : undefined} {...common} />}
    </label>
  )
}
