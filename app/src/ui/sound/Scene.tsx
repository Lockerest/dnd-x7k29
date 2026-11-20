// The attack scene: the attacker lunges or casts at the target, the hit, parry or
// dodge shows with its effect and number, about three seconds in all. Same markup
// and timing as the live page (whose CSS does the animating).
import { useEffect, useRef, useState } from 'react'
import { GLYPHS } from '../../data/abilityIcons'
import { EFFECT_EMOJI } from '../../data/effects'
import { glyphOf, keyByName } from '../../logic/abilityBoard'
import type { Board } from '../../logic/board'
import { AbilityIcon } from '../screens/Board'
import { elementOf, SCENE_SLOW, type FxEvent } from './engine'

export type SceneProps = {
  scene: FxEvent
  /** The 2.5D camera (sky, floor, mist and a slow push in). */
  s25: boolean
  board: Board
  abilityImages: Record<string, string>
  drawnIcons: boolean
  /** A token's picture by its key ("c:id" or "e:id"). */
  picture: (key: string) => string | null
  onDone: () => void
  /** Timers (tests pass fake ones). */
  setTimer?: (f: () => void, ms: number) => unknown
}

const emoji = EFFECT_EMOJI as Record<string, string>

function Figure({ k, name, cls, picture }: { k: string; name: string; cls: string; picture: SceneProps['picture'] }) {
  const im = picture(k)
  return (
    <div className={`fig ${cls}`}>
      {im ? <img src={im} alt="" /> : <div className="em">{(name || '?').slice(0, 1).toUpperCase()}</div>}
      <b>{name}</b>
    </div>
  )
}

export function SceneOverlay({ scene: f, s25, board, abilityImages, drawnIcons, picture, onDone, setTimer = (fn, ms) => setTimeout(fn, ms) }: SceneProps) {
  const [out, setOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Everything but the fade-out runs a little slower, like the live page.
    try {
      for (const an of ref.current!.getAnimations({ subtree: true })) if (!/^scout$/.test((an as CSSAnimation).animationName || '')) an.playbackRate = 1 / SCENE_SLOW
    } catch {
      // Older browsers (and tests) have no getAnimations.
    }
    setTimer(() => setOut(true), 2650)
    setTimer(onDone, 3050)
    // A scene plays once: its timers are set on the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const k = f.k || 'slash'
  const o = f.o || 'hit'
  const ranged = k !== 'slash' && k !== 'heavy' && k !== 'bash'
  const tc = o === 'hit' ? 'hit' : o === 'parry' ? 'parry' : 'dodge'
  const el = elementOf(f.l)
  let fx: React.ReactNode = null
  if (o === 'hit')
    fx =
      k === 'slash' ? (
        <div className="fx slash">
          <i />
        </div>
      ) : k === 'heavy' ? (
        <div className="fx slash">
          <i />
          <u />
        </div>
      ) : k === 'arrow' ? (
        <>
          <div className="fx arrow">
            <span>➤</span>
          </div>
          {el && (
            <div className="fx em">
              <span>{emoji[el]}</span>
            </div>
          )}
        </>
      ) : (
        <div className="fx em">
          <span>{emoji[k] || '💥'}</span>
        </div>
      )
  else if (o === 'parry')
    fx = (
      <div className="fx em">
        <span>🛡️</span>
      </div>
    )
  const tx = o === 'hit' ? `${f.c ? 'CRIT! ' : ''}${(f.d ?? 0) > 0 ? `-${f.d}` : '✦'}` : o === 'miss' ? 'MISS' : o === 'dodge' ? 'DODGED' : 'PARRIED'
  const abKey = f.l ? keyByName(board)[f.l] : undefined
  // The ability's icon and name, when it has an icon (like the live page).
  const badge = abKey && (abilityImages[abKey] || drawnIcons || board[abKey]!.ic) && (
    <div className="abadge">
      <AbilityIcon board={board} name={f.l!} images={abilityImages} drawn={drawnIcons} />
      <span className="nm">{f.l}</span>
    </div>
  )
  const g = s25 && abKey && o !== 'parry' ? glyphOf(board, abKey) : null
  const glyph = g && (
    <div className={`fxg ${ranged ? 'fly' : 'pop'}`} style={{ ['--gc' as string]: g.color }}>
      <svg viewBox="0 0 48 48" dangerouslySetInnerHTML={{ __html: GLYPHS[g.glyph]! }} />
    </div>
  )
  const body = (
    <>
      <Figure k={f.t!} name={f.tn || ''} cls={`R tgt ${tc}`} picture={picture} />
      <Figure k={f.a!} name={f.an || ''} cls={`L atk${ranged ? ' cast' : ''}`} picture={picture} />
      {s25 && <div className="mist" />}
      {badge}
      {fx}
      {glyph}
      <div className={`dmg ${o}${f.c ? ' crit' : ''}`}>{tx}</div>
    </>
  )
  return (
    <div ref={ref} className={`scn${s25 ? ' s25' : ''}${out ? ' out' : ''}`} role="img" aria-label={`${f.an || ''} attacks ${f.tn || ''}`}>
      <div className="stage">
        <div className="cap">
          {f.an || ''} ➜ {f.tn || ''}
          {f.l ? ` · ${f.l}` : ''}
        </div>
        {s25 ? (
          <>
            <div className="cam">
              <div className="sky" />
              <div className="far" />
              <div className="mid" />
              <div className="flr" />
              {body}
            </div>
            <div className="vig" />
            {o === 'hit' && <div className="flash" />}
          </>
        ) : (
          body
        )}
      </div>
    </div>
  )
}
