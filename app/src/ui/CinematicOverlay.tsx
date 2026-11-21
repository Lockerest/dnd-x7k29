// Full-screen cinematic: the cutscene video first (when there is one), then the
// script beat by beat (same timing and effects and beat sounds as the live page).
import { useEffect, useRef, useState } from 'react'
import { cinematicSeconds, parseCinematic, type CinematicEvent } from '../logic/cinematic'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function cracksSvg(rand: () => number) {
  let h = ''
  for (let n = 0; n < 9; n++) {
    let x = 50
    let y = 74
    let d = 'M50 74'
    const a = (n - 4) * 0.5 + (rand() - 0.5) * 0.3
    for (let k = 0; k < 6; k++) {
      x += Math.sin(a) * (7 + rand() * 7) + (rand() - 0.5) * 5
      y += Math.cos(a) * (4 + rand() * 6) + (rand() - 0.5) * 5
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    h += `<path d="${d}" style="animation-delay:${(n * 0.05).toFixed(2)}s"/>`
  }
  return h
}

function rocksHtml(rand: () => number) {
  let h = ''
  for (let n = 0; n < 46; n++) {
    const w = 14 + rand() * 46
    h += `<i class="rk" style="left:${(rand() * 100).toFixed(1)}%;width:${w.toFixed(0)}px;height:${(w * 0.8).toFixed(0)}px;--d:${(rand() * 2.2).toFixed(2)}s;--t:${(0.9 + rand() * 0.9).toFixed(2)}s;--r:${Math.round(rand() * 540 - 270)}deg"></i>`
  }
  return h
}

/** Plays one cinematic. portrait is the boss picture for [portrait] beats (if any). */
/** The beat sounds (the sound engine's cinematic set). */
export type CinematicSounds = { thunk: () => void; glow: () => void; slam: () => void; crack: () => void; collapse: () => void }

/** Longest a cutscene video may hold the screen before the script goes on anyway. */
export const MAX_VIDEO_MS = 40000

export function CinematicOverlay({
  cin,
  portrait,
  onDone,
  rand = Math.random,
  sound,
  volume = 1,
}: {
  cin: CinematicEvent
  portrait?: string | null
  onDone: () => void
  rand?: () => number
  sound?: CinematicSounds
  /** The video's volume on this device (0 with sound off). */
  volume?: number
}) {
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(!!cin.v)
  const done = useRef(onDone)
  const snd = useRef(sound)
  useEffect(() => {
    done.current = onDone
    snd.current = sound
  })

  // The video: with sound if this browser allows it, muted if not; it gives way to
  // the script when it ends, fails, is clicked, or runs too long.
  useEffect(() => {
    if (!playing) return
    const v = video.current!
    const end = () => setPlaying(false)
    v.volume = Math.max(0, Math.min(1, volume))
    v.muted = volume <= 0
    const t = setTimeout(end, MAX_VIDEO_MS)
    Promise.resolve()
      .then(() => v.play())
      .catch(() => {
        v.muted = true
        return v.play()
      })
      .catch(end)
    return () => clearTimeout(t)
  }, [playing, volume])

  useEffect(() => {
    if (playing) return
    const el = root.current!
    const q = (s: string) => el.querySelector(s) as HTMLElement | null
    const st = q('.cs')!
    const tx = q('.ct')!
    const cg = q('.cg')!
    const cf = q('.cf')!
    const cc = q('.cc')!
    const cd = q('.cd')!
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, f: () => void) => timers.push(setTimeout(f, ms))
    const restart = (node: HTMLElement, cls: string, remove: string[] = [cls]) => {
      node.classList.remove(...remove)
      void node.offsetWidth
      node.classList.add(cls)
    }
    const beats = parseCinematic(cin.t)
    for (const b of beats) {
      const g = b.tags
      at(b.at, () => {
        const ci = q('.ci')
        if (g.portrait && ci) ci.classList.add('on')
        if (b.text) tx.innerHTML = `<p class="${g.big ? 'big' : ''}">${esc(b.text)}</p>`
        else if (g.black || g.collapse) tx.innerHTML = ''
        if (g.stagger) {
          ci?.classList.add('bk')
          restart(st, 'sh', ['sh', 'sl'])
          snd.current?.thunk()
        }
        if (g.glow) {
          cg.classList.add('on')
          snd.current?.glow()
        }
        if (g.flash) restart(cf, 'on')
        if (g.shake) {
          restart(st, 'sh', ['sh', 'sl'])
          snd.current?.thunk()
        }
        if (g.slam) {
          restart(cf, 'on')
          restart(st, 'sh', ['sh', 'sl'])
          snd.current?.slam()
        }
        if (g.crack) {
          cc.innerHTML = cracksSvg(rand)
          snd.current?.crack()
        }
        if (g.collapse) {
          st.insertAdjacentHTML('beforeend', rocksHtml(rand))
          restart(st, 'sl', ['sh', 'sl'])
          cd.classList.add('on')
          snd.current?.collapse()
        }
        if (g.black) {
          st.style.transition = 'opacity 1.8s'
          st.style.opacity = '0'
        }
      })
    }
    // A video with no script after it just fades out.
    const D = !beats.length && cin.v ? 1.6 : cinematicSeconds(beats)
    at((D - 1.6) * 1000, () => el.classList.add('out'))
    at(D * 1000, () => done.current())
    return () => timers.forEach(clearTimeout)
  }, [cin, rand, playing])

  const hasPortrait = parseCinematic(cin.t).some((b) => b.tags.portrait)
  return (
    <div className="cin" ref={root} role="dialog" aria-label={`Cinematic: ${cin.n}`}>
      {playing && (
        <video
          ref={video}
          className="cv"
          src={cin.v}
          playsInline
          preload="auto"
          aria-label="Cutscene video"
          onEnded={() => setPlaying(false)}
          onError={() => setPlaying(false)}
          onClick={() => setPlaying(false)}
        />
      )}
      <div className="cs">
        {hasPortrait && portrait && <img className="ci" src={portrait} alt="" />}
        <div className="cg" />
        <svg className="cc" viewBox="0 0 100 100" preserveAspectRatio="none" />
        <div className="cd" />
        <div className="cf" />
        <div className={`ct${hasPortrait ? '' : ' mid'}`} />
      </div>
    </div>
  )
}
