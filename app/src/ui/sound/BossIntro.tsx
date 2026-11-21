// The boss intro: letterbox bars, the boss's art (or token), its title and name,
// for three to five seconds (the length of its theme's opening). Same markup as
// the live page, whose CSS animates it.
import { useEffect, useState } from 'react'
import type { BossIntro } from '../../state/enemyExtras'

export type BossIntroProps = {
  b: BossIntro
  /** The boss art (when uploaded) or its token picture. */
  image: string | null
  /** True when the image is boss art (it is shown larger). */
  art: boolean
  /** Seconds on screen. */
  seconds: number
  onDone: () => void
  setTimer?: (f: () => void, ms: number) => unknown
}

export function BossIntroOverlay({ b, image, art, seconds, onDone, setTimer = (f, ms) => setTimeout(f, ms) }: BossIntroProps) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    setTimer(() => setOut(true), (seconds - 0.6) * 1000)
    setTimer(onDone, seconds * 1000)
    // An intro plays once: its timers are set on the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={`bos${out ? ' out' : ''}`} role="img" aria-label={`Boss: ${b.n}`}>
      <div className="bbar t" />
      <div className="bbar b" />
      <div className="bwrap">
        {image ? <img className={`bimg${art ? ' art' : ''}`} src={image} alt="" /> : <div className="bimg em">{(b.n || '?').slice(0, 1).toUpperCase()}</div>}
        <div className="btx">
          {b.t && <small>{b.t}</small>}
          <i />
          <b>{b.n}</b>
        </div>
      </div>
    </div>
  )
}
