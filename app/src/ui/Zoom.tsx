// A picture that opens big when clicked (ability and boss move icons), so the art
// can be seen properly. A click anywhere, or Escape, closes it.
import { useEffect, useState } from 'react'

export type ZoomProps = {
  /** The small picture shown in place. */
  src: string
  /** A sharper copy to show big, when there is one. */
  full?: string | null
  /** What it is (the name under the big picture). */
  name: string
  className?: string
}

export function Zoom({ src, full, name, className }: ZoomProps) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])
  return (
    <>
      <button className="zoomb" aria-label={`View ${name} larger`} onClick={() => setOpen(true)}>
        <img className={className} src={src} alt="" />
      </button>
      {open && (
        <div className="zoomv" role="dialog" aria-label={name} onClick={() => setOpen(false)}>
          <img src={full || src} alt={name} />
          <b>{name}</b>
        </div>
      )}
    </>
  )
}
