// Region music: one track looping in the background on the GM's screen, picked
// on the Dice card. It streams from the audio host (an <audio> element, so long
// tracks need no decoding), fades out and pauses while a boss theme plays, and
// fades back in when the boss theme stops.
import { REGION_TRACKS, themeUrl } from '../../data/audio'

/** The parts of an <audio> element the player uses. */
export type Track = { loop: boolean; volume: number; readonly paused: boolean; play: () => Promise<void> | void; pause: () => void }

export type RegionEnv = {
  /** A new track for this URL (an <audio> element in the browser). */
  make: (url: string) => Track
  /** Full loudness now: 0 when sound is off. */
  volume: () => number
  every: (f: () => void, ms: number) => unknown
  stop: (h: unknown) => void
}

export type RegionPlayer = ReturnType<typeof createRegionPlayer>

/** Fade steps: 20 steps of 100 ms (2 seconds) from silent to full. */
const STEP_MS = 100
const STEP = 0.05

export function createRegionPlayer(env: RegionEnv) {
  let key: string | null = null
  let el: Track | null = null
  let level = 0 // fade position, 0..1
  let ducked = false
  let timer: unknown = null

  const goal = () => (!ducked && env.volume() > 0 ? 1 : 0)
  // Only called with a track (switching tracks halts the fade first).
  const apply = () => void (el!.volume = Math.max(0, Math.min(1, level * env.volume())))
  const halt = () => {
    if (timer != null) env.stop(timer)
    timer = null
  }
  const tick = () => {
    const g = goal()
    level = g > level ? Math.min(g, level + STEP) : Math.max(g, level - STEP)
    apply()
    if (level !== g) return
    halt()
    if (g === 0) el!.pause()
  }
  /** Fades toward where the music should be now (playing, or paused). */
  const sync = (boss: boolean) => {
    ducked = boss
    if (!el) return
    const g = goal()
    if (g === 1 && el.paused) {
      // The browser may refuse until the first tap: the next sync tries again.
      void Promise.resolve()
        .then(() => el?.play())
        .catch(() => {})
    }
    if (level === g) {
      apply()
      if (g === 0 && !el.paused) el.pause()
    } else if (timer == null) timer = env.every(tick, STEP_MS)
  }

  return {
    /** The region track playing (or waiting to), or null. */
    key: () => key,
    /** Picks a region track (null: none); boss says a boss theme is playing now. */
    select: (k: string | null, boss: boolean) => {
      if (k === key) return sync(boss)
      halt()
      el?.pause()
      el = null
      level = 0
      const t = REGION_TRACKS.find((x) => x.key === k)
      key = t ? t.key : null
      if (t) {
        el = env.make(themeUrl(t.id))
        el.loop = true
        el.volume = 0
      }
      sync(boss)
    },
    sync,
  }
}
